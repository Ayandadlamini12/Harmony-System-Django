from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import (
    AuthenticationEventViewSet,
    ChangePasswordView,
    ChannelVerificationWebhookView,
    EmailDeliveryLogViewSet,
    EmployeeEnrollmentRequestViewSet,
    RegisterView,
    RoleModulePermissionViewSet,
    SystemEmailSettingsView,
    SystemSecurityStatusView,
    UserViewSet,
)

router = DefaultRouter()
router.register("authentication-events", AuthenticationEventViewSet, basename="authentication-events")
router.register("users", UserViewSet, basename="users")
router.register("employee-enrollment-requests", EmployeeEnrollmentRequestViewSet, basename="employee-enrollment-requests")
router.register("role-module-permissions", RoleModulePermissionViewSet, basename="role-module-permissions")
router.register("email-delivery-logs", EmailDeliveryLogViewSet, basename="email-delivery-logs")

urlpatterns = [
    path("auth/register/", RegisterView.as_view(), name="register"),
    path("auth/change-password/", ChangePasswordView.as_view(), name="change_password"),
    path("system/email-settings/", SystemEmailSettingsView.as_view(), name="system_email_settings"),
    path("system/security-status/", SystemSecurityStatusView.as_view(), name="system_security_status"),
    path("webhooks/verify-channel/", ChannelVerificationWebhookView.as_view(), name="channel_verification_webhook"),
] + router.urls
