from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import ClinicianProfile, EmployeeEnrollmentRequest, User


@admin.register(User)
class HarmonyUserAdmin(UserAdmin):
    fieldsets = UserAdmin.fieldsets + (("Harmony", {"fields": ("role", "profile_image")}),)
    list_display = ("username", "email", "first_name", "last_name", "role", "is_active")
    list_filter = UserAdmin.list_filter + ("role",)


@admin.register(ClinicianProfile)
class ClinicianProfileAdmin(admin.ModelAdmin):
    list_display = ("user", "professional_title", "profile_completion", "updated_at")
    list_filter = ("profile_completion",)
    search_fields = ("user__username", "user__email", "display_name", "professional_title")
    readonly_fields = ("profile_completion", "completed_sections", "created_at", "updated_at")


@admin.register(EmployeeEnrollmentRequest)
class EmployeeEnrollmentRequestAdmin(admin.ModelAdmin):
    list_display = ("full_names", "requested_role", "requested_team", "source", "status", "created_at")
    list_filter = ("status", "source", "requested_role", "requested_team")
    search_fields = ("full_names", "email", "phone_number", "telegram_username")
    readonly_fields = ("raw_payload", "created_at", "updated_at", "reviewed_at")
