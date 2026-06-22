from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import (
    AuthenticationEvent,
    ClinicianProfile,
    EmailDeliveryLog,
    EmployeeEnrollmentRequest,
    RoleModulePermission,
    SystemEmailSettings,
    User,
)


@admin.register(User)
class HarmonyUserAdmin(UserAdmin):
    fieldsets = UserAdmin.fieldsets + (("Harmony", {"fields": ("role", "profile_image")}),)
    list_display = ("username", "email", "first_name", "last_name", "role", "is_active")
    list_filter = UserAdmin.list_filter + ("role",)


@admin.register(AuthenticationEvent)
class AuthenticationEventAdmin(admin.ModelAdmin):
    list_display = ("attempted_identifier", "outcome", "method", "reason_code", "ip_address", "created_at")
    list_filter = ("outcome", "method", "reason_code", "created_at")
    search_fields = ("attempted_identifier", "ip_address", "user__username")
    readonly_fields = (
        "user",
        "attempted_identifier",
        "outcome",
        "method",
        "reason_code",
        "ip_address",
        "user_agent",
        "created_at",
    )


@admin.register(ClinicianProfile)
class ClinicianProfileAdmin(admin.ModelAdmin):
    list_display = ("user", "professional_title", "profile_completion", "updated_at")
    list_filter = ("profile_completion",)
    search_fields = ("user__username", "user__email", "display_name", "professional_title")
    readonly_fields = ("profile_completion", "completed_sections", "created_at", "updated_at")


@admin.register(EmployeeEnrollmentRequest)
class EmployeeEnrollmentRequestAdmin(admin.ModelAdmin):
    list_display = ("full_names", "email", "requested_role", "requested_team", "source", "status", "review_email_sent_at", "created_at")
    list_filter = ("status", "source", "requested_role", "requested_team")
    search_fields = ("full_names", "email", "phone_number", "telegram_username")
    readonly_fields = ("raw_payload", "created_at", "updated_at", "reviewed_at", "review_email_sent_at", "review_email_error")


@admin.register(RoleModulePermission)
class RoleModulePermissionAdmin(admin.ModelAdmin):
    list_display = ("role", "module_key", "enabled", "updated_at")
    list_filter = ("role", "enabled")
    search_fields = ("role", "module_key")


@admin.register(SystemEmailSettings)
class SystemEmailSettingsAdmin(admin.ModelAdmin):
    list_display = ("name", "is_enabled", "provider", "smtp_host", "smtp_port", "from_email", "updated_at")
    readonly_fields = ("updated_at",)


@admin.register(EmailDeliveryLog)
class EmailDeliveryLogAdmin(admin.ModelAdmin):
    list_display = ("template_key", "status", "provider", "subject", "from_email", "created_at", "sent_at")
    list_filter = ("status", "provider", "template_key")
    search_fields = ("subject", "from_email", "message_id")
    readonly_fields = ("created_at", "sent_at")
