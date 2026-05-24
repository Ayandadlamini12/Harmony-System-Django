import mimetypes

from django.contrib.auth import get_user_model
from django.http import FileResponse, Http404
from rest_framework import generics, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response

from .models import ClinicianProfile
from .serializers import ChangePasswordSerializer, ClinicianProfileSerializer, RegisterSerializer, UserSerializer

User = get_user_model()


class IsAdminUserRole(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == "admin")


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
