import mimetypes

from django.contrib.auth import get_user_model
from django.conf import settings
from django.utils import timezone
from django.http import FileResponse, Http404
from rest_framework import generics, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response

from clinic.audit import write_audit_log

from .emailing import send_enrollment_under_review_email, send_system_email
from .models import ClinicianProfile, EmailDeliveryLog, EmployeeEnrollmentRequest, RoleModulePermission, SystemEmailSettings
from .role_modules import ROLE_CHOICES, module_definition_map
from .serializers import (
    ChangePasswordSerializer,
    ClinicianProfileSerializer,
    EmployeeEnrollmentRequestSerializer,
    EmailDeliveryLogSerializer,
    RoleModulePermissionSerializer,
    SystemEmailSettingsSerializer,
    build_role_module_matrix,
    RegisterSerializer,
    UserSerializer,
)

User = get_user_model()


class IsAdminUserRole(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == "admin")


class HasHarmonyWebhookSecret(permissions.BasePermission):
    def has_permission(self, request, view):
        expected_secret = getattr(settings, "HARMONY_WEBHOOK_SECRET", "")
        provided_secret = request.headers.get("X-Harmony-Webhook-Secret", "")
        return bool(expected_secret and provided_secret and provided_secret == expected_secret)


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.order_by("first_name", "last_name", "username")
    serializer_class = UserSerializer
    permission_classes = [IsAdminUserRole]
    search_fields = ("first_name", "last_name", "email", "username")

    @action(detail=True, methods=["post"])
    def toggle_status(self, request, pk=None):
        user = self.get_object()
        user.is_active = not user.is_active
        user.save(update_fields=["is_active"])
        return Response(self.get_serializer(user).data)

    @action(detail=False, methods=["get"], permission_classes=[permissions.IsAuthenticated])
    def me(self, request):
        return Response(self.get_serializer(request.user).data)

    @action(
        detail=False,
        methods=["get", "patch"],
        permission_classes=[permissions.IsAuthenticated],
        url_path="me/clinician-profile",
    )
    def me_clinician_profile(self, request):
        if request.user.role not in {"admin", "clinician"}:
            return Response(
                {"detail": "Only clinicians and admins can maintain a clinician profile."},
                status=status.HTTP_403_FORBIDDEN,
            )
        profile, _ = ClinicianProfile.objects.get_or_create(
            user=request.user,
            defaults={
                "full_names": request.user.get_full_name() or request.user.username,
                "display_name": request.user.get_full_name() or request.user.username,
                "professional_email": request.user.email,
            },
        )
        if request.method == "GET":
            return Response(ClinicianProfileSerializer(profile).data)

        serializer = ClinicianProfileSerializer(profile, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    @action(
        detail=False,
        methods=["get", "post", "delete"],
        permission_classes=[permissions.IsAuthenticated],
        parser_classes=[MultiPartParser, FormParser],
        url_path="me/avatar",
    )
    def me_avatar(self, request):
        user = request.user

        if request.method == "GET":
            if not user.profile_image:
                raise Http404
            content_type = mimetypes.guess_type(user.profile_image.name)[0] or "application/octet-stream"
            response = FileResponse(user.profile_image.open("rb"), content_type=content_type)
            response["Cache-Control"] = "no-store"
            return response

        if request.method == "DELETE":
            if user.profile_image:
                user.profile_image.delete(save=False)
                user.profile_image = None
                user.save(update_fields=["profile_image"])
            return Response(self.get_serializer(user).data)

        uploaded = request.FILES.get("avatar")
        if not uploaded:
            return Response({"avatar": "Profile image is required."}, status=status.HTTP_400_BAD_REQUEST)

        allowed_types = {"image/jpeg", "image/png", "image/webp"}
        if uploaded.content_type not in allowed_types:
            return Response(
                {"avatar": "Use a JPG, PNG, or WebP image."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if uploaded.size > 2 * 1024 * 1024:
            return Response(
                {"avatar": "Profile image must be 2 MB or smaller."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if user.profile_image:
            user.profile_image.delete(save=False)
        user.profile_image.save(uploaded.name, uploaded, save=True)
        return Response(self.get_serializer(user).data)


class RoleModulePermissionViewSet(viewsets.ModelViewSet):
    queryset = RoleModulePermission.objects.order_by("role", "module_key")
    serializer_class = RoleModulePermissionSerializer
    permission_classes = [IsAdminUserRole]

    @action(detail=False, methods=["get", "post"], url_path="matrix")
    def matrix(self, request):
        if request.method == "GET":
            return Response(build_role_module_matrix())

        module_map = module_definition_map()
        permissions = request.data.get("permissions", {})
        if not isinstance(permissions, dict):
            return Response({"detail": "permissions must be an object."}, status=status.HTTP_400_BAD_REQUEST)

        for role, module_values in permissions.items():
            if role not in ROLE_CHOICES or not isinstance(module_values, dict):
                continue
            for module_key, enabled in module_values.items():
                module = module_map.get(module_key)
                if not module:
                    continue
                value = bool(enabled)
                if module.get("locked_admin") and role == "admin":
                    value = True
                RoleModulePermission.objects.update_or_create(
                    role=role,
                    module_key=module_key,
                    defaults={"enabled": value},
                )

        return Response(build_role_module_matrix())


class SystemEmailSettingsView(generics.GenericAPIView):
    serializer_class = SystemEmailSettingsSerializer
    permission_classes = [IsAdminUserRole]

    def get_object(self):
        return SystemEmailSettings.get_default()

    def get(self, request, *args, **kwargs):
        return Response(self.get_serializer(self.get_object()).data)

    def patch(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def post(self, request, *args, **kwargs):
        recipient = request.data.get("recipient") or request.user.email
        if not recipient:
            return Response(
                {"detail": "Provide a test recipient or set an email address on your account."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            send_system_email(
                subject="Harmony Health MIS email test",
                body=(
                    "This is a test email from Harmony Health MIS.\n\n"
                    "If you received this message, system email is configured correctly."
                ),
                to=[recipient],
            )
        except Exception as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response({"detail": f"Test email sent to {recipient}."})


class EmailDeliveryLogViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = EmailDeliveryLog.objects.order_by("-created_at")
    serializer_class = EmailDeliveryLogSerializer
    permission_classes = [IsAdminUserRole]
    filterset_fields = ("status", "provider", "template_key")
    search_fields = ("subject", "from_email", "message_id", "error")


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(
            {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "role": user.role,
            },
            status=status.HTTP_201_CREATED,
        )


class ChangePasswordView(generics.GenericAPIView):
    serializer_class = ChangePasswordSerializer
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = request.user
        if not user.check_password(serializer.validated_data["old_password"]):
            return Response({"old_password": "Wrong password."}, status=status.HTTP_400_BAD_REQUEST)
        user.set_password(serializer.validated_data["new_password"])
        user.save()
        return Response({"detail": "Password updated successfully."})


class EmployeeEnrollmentRequestViewSet(viewsets.ModelViewSet):
    queryset = EmployeeEnrollmentRequest.objects.order_by("-created_at")
    serializer_class = EmployeeEnrollmentRequestSerializer
    search_fields = ("full_names", "email", "phone_number", "telegram_username", "requested_role", "requested_team")
    filterset_fields = ("status", "source", "requested_role", "requested_team")

    def get_permissions(self):
        if self.action == "create":
            return [HasHarmonyWebhookSecret()]
        return [IsAdminUserRole()]

    def perform_create(self, serializer):
        request_obj = serializer.save(
            source=serializer.validated_data.get("source") or EmployeeEnrollmentRequest.Source.API,
            raw_payload=self.request.data,
        )
        send_enrollment_under_review_email(request_obj)
        write_audit_log(
            request=self.request,
            action="create",
            instance=request_obj,
            entity_type="employee_enrollment_request",
            after_data=EmployeeEnrollmentRequestSerializer(request_obj).data,
            details="Employee enrollment request created from external workflow.",
        )

    @action(detail=True, methods=["post"], permission_classes=[IsAdminUserRole])
    def approve(self, request, pk=None):
        enrollment_request = self.get_object()
        before = EmployeeEnrollmentRequestSerializer(enrollment_request).data
        enrollment_request.status = EmployeeEnrollmentRequest.Status.APPROVED
        enrollment_request.reviewed_by = request.user
        enrollment_request.reviewed_at = timezone.now()
        enrollment_request.save(update_fields=["status", "reviewed_by", "reviewed_at", "updated_at"])
        after = EmployeeEnrollmentRequestSerializer(enrollment_request).data
        write_audit_log(
            request=request,
            action="approve",
            instance=enrollment_request,
            entity_type="employee_enrollment_request",
            before_data=before,
            after_data=after,
        )
        return Response(after)

    @action(detail=True, methods=["post"], permission_classes=[IsAdminUserRole])
    def reject(self, request, pk=None):
        enrollment_request = self.get_object()
        before = EmployeeEnrollmentRequestSerializer(enrollment_request).data
        enrollment_request.status = EmployeeEnrollmentRequest.Status.REJECTED
        enrollment_request.reviewed_by = request.user
        enrollment_request.reviewed_at = timezone.now()
        enrollment_request.notes = request.data.get("notes", enrollment_request.notes)
        enrollment_request.save(update_fields=["status", "reviewed_by", "reviewed_at", "notes", "updated_at"])
        after = EmployeeEnrollmentRequestSerializer(enrollment_request).data
        write_audit_log(
            request=request,
            action="reject",
            instance=enrollment_request,
            entity_type="employee_enrollment_request",
            before_data=before,
            after_data=after,
        )
        return Response(after)
