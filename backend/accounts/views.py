import mimetypes
import os
import random
import secrets

from django.contrib.sessions.models import Session
from django.contrib.auth import get_user_model
from django.conf import settings
from django.utils import timezone
from django.utils.dateparse import parse_datetime
from django.http import FileResponse, Http404
from rest_framework import generics, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from clinic.audit import write_audit_log
from clinic.models import AuditLog

from .emailing import send_enrollment_under_review_email, send_system_email
from .keycloak import HarmonyTokenSerializer
from .models import (
    ClinicianProfile,
    EmailDeliveryLog,
    EmployeeEnrollmentRequest,
    RoleModulePermission,
    SystemEmailSettings,
    UserNotificationChannel,
)
from .tasks import dispatch_n8n_webhook_task
from .role_modules import ROLE_CHOICES, module_definition_map
from .serializers import (
    ChangePasswordSerializer,
    ClinicianProfileSerializer,
    EmployeeEnrollmentRequestSerializer,
    EmailDeliveryLogSerializer,
    NotificationSettingsSerializer,
    RoleModulePermissionSerializer,
    SystemEmailSettingsSerializer,
    build_role_module_matrix,
    RegisterSerializer,
    UserSerializer,
)

User = get_user_model()


def _generate_verification_code() -> str:
    return str(random.randint(100000, 999999))


def _verification_expiry() -> timezone.datetime:
    return timezone.now() + timezone.timedelta(minutes=15)


def _generate_verification_token() -> str:
    return secrets.token_urlsafe(18)


def _token_is_expired(expires_at_str: str | None) -> bool:
    if not expires_at_str:
        return False
    expires_at = parse_datetime(expires_at_str)
    return bool(expires_at and timezone.now() > expires_at)


def _mark_channel_verified(
    channel: UserNotificationChannel,
    value: str | None = None,
    extra_metadata: dict | None = None,
) -> None:
    if value is not None and value != "":
        channel.value = value
    if extra_metadata:
        channel.metadata.update(extra_metadata)
    channel.verification_status = UserNotificationChannel.VerificationStatus.VERIFIED
    channel.verified_at = timezone.now()
    channel.metadata.pop("verification_code", None)
    channel.metadata.pop("verification_code_expires_at", None)
    channel.metadata.pop("verification_token", None)
    channel.metadata.pop("verification_token_expires_at", None)
    channel.save(update_fields=["value", "verification_status", "verified_at", "metadata", "updated_at"])


def _resolve_channel_for_callback(username: str | None, channel_name: str, verification_token: str | None):
    if username:
        try:
            user = User.objects.get(username=username)
            channel, _ = UserNotificationChannel.objects.get_or_create(user=user, channel=channel_name)
            return channel
        except User.DoesNotExist:
            pass

    if verification_token:
        channel = (
            UserNotificationChannel.objects.select_related("user")
            .filter(
                channel=channel_name,
                verification_status=UserNotificationChannel.VerificationStatus.PENDING,
            )
            .filter(metadata__verification_token=verification_token)
            .first()
        )
        if channel:
            if _token_is_expired(channel.metadata.get("verification_token_expires_at")):
                return "expired"
            return channel

    return None


class IsAdminUserRole(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == "admin")


class HasHarmonyWebhookSecret(permissions.BasePermission):
    def has_permission(self, request, view):
        expected_secret = getattr(settings, "HARMONY_WEBHOOK_SECRET", "")
        provided_secret = request.headers.get("X-Harmony-Webhook-Secret", "")
        return bool(expected_secret and provided_secret and provided_secret == expected_secret)


class HasN8NCallbackSecret(permissions.BasePermission):
    def has_permission(self, request, view):
        expected_secret = getattr(settings, "N8N_CALLBACK_SECRET", "") or getattr(settings, "HARMONY_WEBHOOK_SECRET", "")
        provided_secret = request.headers.get("X-Harmony-N8N-Callback-Secret", "") or request.headers.get(
            "X-Harmony-Webhook-Secret",
            "",
        )
        return bool(expected_secret and provided_secret and provided_secret == expected_secret)


class HarmonyTokenView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = HarmonyTokenSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return Response(serializer.validated_data)


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

    @action(
        detail=False,
        methods=["get", "patch"],
        permission_classes=[permissions.IsAuthenticated],
        url_path="me/notification-settings",
    )
    def me_notification_settings(self, request):
        if request.method == "GET":
            return Response(NotificationSettingsSerializer(request.user, context={"request": request}).data)

        serializer = NotificationSettingsSerializer(
            request.user,
            data=request.data,
            partial=True,
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(NotificationSettingsSerializer(request.user, context={"request": request}).data)

    @action(
        detail=False,
        methods=["post"],
        permission_classes=[permissions.IsAuthenticated],
        url_path="me/notification-settings/initiate-verification",
    )
    def me_initiate_verification(self, request):
        channel_name = request.data.get("channel")
        if channel_name not in {UserNotificationChannel.Channel.WHATSAPP, UserNotificationChannel.Channel.TELEGRAM}:
            return Response(
                {"error": "Invalid channel. Must be 'whatsapp' or 'telegram'."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            channel = UserNotificationChannel.objects.get(user=request.user, channel=channel_name)
        except UserNotificationChannel.DoesNotExist:
            return Response({"error": "Notification channel not configured."}, status=status.HTTP_400_BAD_REQUEST)

        if not channel.value or not channel.value.strip():
            return Response(
                {"error": f"{channel_name.capitalize()} contact value is empty."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        expiration = _verification_expiry()
        payload = {
            "username": request.user.username,
            "channel": channel.channel,
            "value": channel.value,
            "event_id": f"user-channel-{channel.pk}-{int(expiration.timestamp())}",
        }

        if channel.channel == UserNotificationChannel.Channel.TELEGRAM:
            verification_token = _generate_verification_token()
            channel.metadata["verification_token"] = verification_token
            channel.metadata["verification_token_expires_at"] = expiration.isoformat()
            payload["verification_token"] = verification_token
            payload["token_expires_at"] = expiration.isoformat()
        else:
            code = _generate_verification_code()
            channel.metadata["verification_code"] = code
            channel.metadata["verification_code_expires_at"] = expiration.isoformat()
            payload["code"] = code

        channel.verification_status = UserNotificationChannel.VerificationStatus.PENDING
        channel.verified_at = None
        channel.save(update_fields=["metadata", "verification_status", "verified_at", "updated_at"])
        dispatch_n8n_webhook_task.delay("user_verification_requested", payload)
        response_payload = {
            "status": "pending",
            "channel": channel.channel,
            "message": "Verification initiated successfully.",
        }
        if channel.channel == UserNotificationChannel.Channel.TELEGRAM:
            response_payload["verification_token"] = verification_token
            response_payload["token_expires_at"] = expiration.isoformat()
            if settings.TELEGRAM_VERIFICATION_BOT_USERNAME:
                response_payload["telegram_start_link"] = (
                    f"https://t.me/{settings.TELEGRAM_VERIFICATION_BOT_USERNAME}?start={verification_token}"
                )

        return Response(response_payload)

    @action(
        detail=False,
        methods=["post"],
        permission_classes=[permissions.IsAuthenticated],
        url_path="me/notification-settings/confirm-verification",
    )
    def me_confirm_verification(self, request):
        channel_name = request.data.get("channel")
        code = request.data.get("code")
        if not channel_name or not code:
            return Response(
                {"error": "Both 'channel' and 'code' are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            channel = UserNotificationChannel.objects.get(user=request.user, channel=channel_name)
        except UserNotificationChannel.DoesNotExist:
            return Response({"error": "Notification channel not configured."}, status=status.HTTP_400_BAD_REQUEST)

        stored_code = channel.metadata.get("verification_code")
        expires_at_str = channel.metadata.get("verification_code_expires_at")
        if not stored_code or str(stored_code) != str(code):
            return Response({"error": "Invalid verification code."}, status=status.HTTP_400_BAD_REQUEST)

        if expires_at_str:
            expires_at = parse_datetime(expires_at_str)
            if expires_at and timezone.now() > expires_at:
                return Response({"error": "Verification code has expired."}, status=status.HTTP_400_BAD_REQUEST)

        _mark_channel_verified(channel)
        return Response({"status": "verified", "message": "Channel verified successfully."})


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


class SystemSecurityStatusView(APIView):
    permission_classes = [IsAdminUserRole]

    keycloak_required_settings = (
        "KEYCLOAK_SERVER_URL",
        "KEYCLOAK_REALM",
        "KEYCLOAK_CLIENT_ID",
        "KEYCLOAK_CLIENT_SECRET",
        "KEYCLOAK_ADMIN_USERNAME",
        "KEYCLOAK_ADMIN_PASSWORD",
    )

    def get(self, request):
        missing_keycloak = [
            key
            for key in self.keycloak_required_settings
            if not str(getattr(settings, key, "") or "").strip()
        ]
        if not settings.KEYCLOAK_ENABLED:
            missing_keycloak = []

        access_lifetime = settings.SIMPLE_JWT["ACCESS_TOKEN_LIFETIME"]
        refresh_lifetime = settings.SIMPLE_JWT["REFRESH_TOKEN_LIFETIME"]
        cookie_policy = self._cookie_policy()
        session_activity = self._session_activity()
        authentication_activity = self._authentication_activity()
        policy_status = self._policy_status()
        deployment_status = {
            "required_keycloak_vars": list(self.keycloak_required_settings),
            "backend_keycloak_env_ok": settings.KEYCLOAK_ENABLED and not missing_keycloak,
            "worker_services_must_preserve_keycloak_env": True,
            "compose_env_contract": "backend, celery, and celery-beat must all preserve the full Keycloak env block.",
        }
        warnings = self._warnings(missing_keycloak, cookie_policy)

        return Response(
            {
                "tabs": [
                    "overview",
                    "keycloak",
                    "sessions",
                    "authentication_activity",
                    "deployment_contract",
                    "policies",
                ],
                "keycloak": {
                    "enabled": settings.KEYCLOAK_ENABLED,
                    "server_url": settings.KEYCLOAK_SERVER_URL,
                    "realm": settings.KEYCLOAK_REALM,
                    "client_id": settings.KEYCLOAK_CLIENT_ID,
                    "client_secret_configured": bool(settings.KEYCLOAK_CLIENT_SECRET),
                    "admin_username_configured": bool(settings.KEYCLOAK_ADMIN_USERNAME),
                    "admin_password_configured": bool(settings.KEYCLOAK_ADMIN_PASSWORD),
                    "allow_local_fallback": settings.KEYCLOAK_ALLOW_LOCAL_FALLBACK,
                    "action_email_lifespan": settings.KEYCLOAK_ACTION_EMAIL_LIFESPAN,
                    "missing_required": missing_keycloak,
                },
                "sessions": {
                    "access_token_lifetime_minutes": int(access_lifetime.total_seconds() // 60),
                    "refresh_token_lifetime_days": int(refresh_lifetime.total_seconds() // 86400),
                    "jwt_stateless": True,
                    "server_side_session_store": "django.contrib.sessions",
                    "active_django_sessions": session_activity["active_django_sessions"],
                    "expired_django_sessions": session_activity["expired_django_sessions"],
                    "active_authenticated_django_sessions": session_activity["active_authenticated_django_sessions"],
                    "instrumentation_note": (
                        "Harmony API authentication uses stateless JWT tokens. Django session counts only reflect "
                        "server-side browser/admin sessions and are not a full count of active JWT users."
                    ),
                    "cookie_policy": cookie_policy,
                },
                "authentication_activity": authentication_activity,
                "deployment": deployment_status,
                "policies": policy_status,
                "warnings": warnings,
                "overview": {
                    "keycloak_ready": settings.KEYCLOAK_ENABLED and not missing_keycloak,
                    "secret_values_exposed": False,
                    "active_warning_count": len(warnings),
                    "active_django_sessions": session_activity["active_django_sessions"],
                    "recent_successful_login_count": len(authentication_activity["recent_successful_logins"]),
                    "recent_security_event_count": len(authentication_activity["recent_security_events"]),
                    "local_fallback_enabled": settings.KEYCLOAK_ALLOW_LOCAL_FALLBACK,
                    "deployment_env_contract_ok": deployment_status["backend_keycloak_env_ok"],
                },
            }
        )

    def _cookie_policy(self):
        return {
            "session_cookie_secure": bool(getattr(settings, "SESSION_COOKIE_SECURE", False)),
            "session_cookie_httponly": bool(getattr(settings, "SESSION_COOKIE_HTTPONLY", True)),
            "session_cookie_samesite": getattr(settings, "SESSION_COOKIE_SAMESITE", "Lax"),
            "csrf_cookie_secure": bool(getattr(settings, "CSRF_COOKIE_SECURE", False)),
            "csrf_cookie_httponly": bool(getattr(settings, "CSRF_COOKIE_HTTPONLY", False)),
            "csrf_cookie_samesite": getattr(settings, "CSRF_COOKIE_SAMESITE", "Lax"),
            "secure_ssl_redirect": bool(getattr(settings, "SECURE_SSL_REDIRECT", False)),
            "hsts_seconds": int(getattr(settings, "SECURE_HSTS_SECONDS", 0) or 0),
            "proxy_cookie_secure_env": os.getenv("COOKIE_SECURE", "false").lower() == "true",
        }

    def _session_activity(self):
        now = timezone.now()
        sessions = Session.objects.all()
        active_sessions = sessions.filter(expire_date__gt=now)
        expired_sessions = sessions.filter(expire_date__lte=now)
        authenticated_count = 0
        sample_users = []
        for session in active_sessions.order_by("-expire_date").iterator():
            data = session.get_decoded()
            user_id = data.get("_auth_user_id")
            if user_id:
                authenticated_count += 1
                if len(sample_users) < 10:
                    sample_users.append({"user_id": str(user_id), "expires_at": session.expire_date})

        return {
            "active_django_sessions": active_sessions.count(),
            "expired_django_sessions": expired_sessions.count(),
            "active_authenticated_django_sessions": authenticated_count,
            "sample_authenticated_django_sessions": sample_users,
        }

    def _authentication_activity(self):
        recent_logins = [
            {
                "id": user.id,
                "username": user.username,
                "display_name": user.get_full_name() or user.username,
                "role": user.role,
                "last_login": user.last_login,
                "is_active": user.is_active,
            }
            for user in User.objects.exclude(last_login__isnull=True).order_by("-last_login")[:10]
        ]
        security_event_filters = [
            ("user", "create"),
            ("user", "update"),
            ("user_notification_channel", "verify"),
            ("user_notification_channel", "update"),
            ("employee_enrollment_request", "approve"),
            ("employee_enrollment_request", "reject"),
            ("role_module_permission", "update"),
        ]
        security_events = AuditLog.objects.select_related("user").filter(
            entity_type__in={entity_type for entity_type, _action in security_event_filters}
        )
        event_actions = {action for _entity_type, action in security_event_filters}
        recent_security_events = [
            {
                "id": event.id,
                "action": event.action,
                "entity_type": event.entity_type,
                "entity_id": event.entity_id,
                "actor": event.user.get_full_name() or event.user.username if event.user else "System",
                "created_at": event.created_at,
                "details": event.details,
            }
            for event in security_events.filter(action__in=event_actions).order_by("-created_at")[:20]
        ]

        return {
            "recent_successful_logins": recent_logins,
            "recent_failed_logins": [],
            "failed_login_instrumented": False,
            "recent_security_events": recent_security_events,
            "local_fallback_login_events": [],
            "local_fallback_login_instrumented": False,
            "instrumentation_note": (
                "Successful login visibility comes from user.last_login. Failed login and local fallback usage "
                "require dedicated authentication audit hooks before the UI can show real records."
            ),
        }

    def _policy_status(self):
        validators = getattr(settings, "AUTH_PASSWORD_VALIDATORS", [])
        return {
            "password_validators_enabled": bool(validators),
            "password_validator_count": len(validators),
            "password_validators": [
                validator.get("NAME", "").split(".")[-1]
                for validator in validators
                if validator.get("NAME")
            ],
            "mfa_status_source": "keycloak",
            "mfa_status_available": False,
            "account_lockout_status_source": "keycloak",
            "account_lockout_status_available": False,
            "admin_only": True,
            "read_only": True,
            "secret_values_exposed": False,
        }

    def _warnings(self, missing_keycloak, cookie_policy):
        warnings = []
        if settings.KEYCLOAK_ENABLED and missing_keycloak:
            warnings.append(
                {
                    "code": "keycloak_missing_required_env",
                    "severity": "critical",
                    "detail": "Keycloak is enabled but required identity configuration is missing.",
                    "fields": missing_keycloak,
                }
            )
        if settings.KEYCLOAK_ENABLED and settings.KEYCLOAK_ALLOW_LOCAL_FALLBACK:
            warnings.append(
                {
                    "code": "local_fallback_enabled",
                    "severity": "warning",
                    "detail": "Local fallback login is enabled. Keep this only as an operational recovery path.",
                    "fields": ["KEYCLOAK_ALLOW_LOCAL_FALLBACK"],
                }
            )
        if not settings.KEYCLOAK_ENABLED:
            warnings.append(
                {
                    "code": "keycloak_disabled",
                    "severity": "warning",
                    "detail": "Keycloak is disabled. Production MIS should normally authenticate through Keycloak.",
                    "fields": ["KEYCLOAK_ENABLED"],
                }
            )
        if not cookie_policy["session_cookie_secure"] and not cookie_policy["proxy_cookie_secure_env"]:
            warnings.append(
                {
                    "code": "session_cookie_secure_not_confirmed",
                    "severity": "warning",
                    "detail": "Secure session cookie handling is not confirmed by Django or the deployment cookie env.",
                    "fields": ["SESSION_COOKIE_SECURE", "COOKIE_SECURE"],
                }
            )
        return warnings


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


class ChannelVerificationWebhookView(APIView):
    permission_classes = [HasN8NCallbackSecret]

    def post(self, request):
        username = request.data.get("username")
        channel_name = request.data.get("channel")
        value = request.data.get("value")
        verification_code = request.data.get("verification_code")
        verification_token = request.data.get("verification_token")
        direct_verify = bool(request.data.get("direct_verify", False))
        telegram_metadata = {
            key: request.data.get(key)
            for key in ("telegram_chat_id", "telegram_username", "telegram_user_id", "token_resolution_mode")
            if request.data.get(key) not in (None, "")
        }

        if not channel_name:
            return Response(
                {"error": "'channel' is a required field."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if channel_name not in UserNotificationChannel.Channel.values:
            return Response(
                {"error": f"Invalid channel. Must be one of {UserNotificationChannel.Channel.values}."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        channel = _resolve_channel_for_callback(username, channel_name, verification_token)
        if channel == "expired":
            return Response({"error": "Verification token has expired."}, status=status.HTTP_400_BAD_REQUEST)
        if channel is None:
            return Response(
                {"error": "Unable to resolve notification channel from username or verification token."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if direct_verify:
            _mark_channel_verified(channel, value=value, extra_metadata=telegram_metadata)
            return Response({"status": "verified", "message": "Channel verified directly."})

        if not verification_code:
            return Response(
                {"error": "Either 'direct_verify=True' or 'verification_code' must be provided."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        stored_code = channel.metadata.get("verification_code")
        expires_at_str = channel.metadata.get("verification_code_expires_at")
        if not stored_code or str(stored_code) != str(verification_code):
            return Response({"error": "Invalid verification code."}, status=status.HTTP_400_BAD_REQUEST)

        if expires_at_str:
            expires_at = parse_datetime(expires_at_str)
            if expires_at and timezone.now() > expires_at:
                return Response({"error": "Verification code has expired."}, status=status.HTTP_400_BAD_REQUEST)

        _mark_channel_verified(channel, value=value, extra_metadata=telegram_metadata)
        return Response({"status": "verified", "message": "Channel verified via code."})
