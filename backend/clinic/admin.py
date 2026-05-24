from django.contrib import admin

from .models import AuditLog, ElevatedAccessRequest, FollowUpEvaluation, Patient, PatientCheckIn, PatientCondition, PatientProfile, Visit, Vital


class PatientProfileInline(admin.StackedInline):
    model = PatientProfile
    extra = 0


@admin.register(Patient)
class PatientAdmin(admin.ModelAdmin):
    inlines = [PatientProfileInline]
    list_display = ("patient_code", "full_name_display", "primary_phone", "email", "gender", "status", "created_at")
    search_fields = (
        "patient_code",
        "national_id",
        "email",
        "full_name_display",
        "primary_phone",
        "next_of_kin_full_name",
        "next_of_kin_phone",
    )
    list_filter = ("gender", "status", "created_at")


@admin.register(Visit)
class VisitAdmin(admin.ModelAdmin):
    list_display = ("patient", "visit_type", "visit_date", "practitioner")
    search_fields = ("patient__full_name_display", "patient__patient_code", "main_complaint")
    list_filter = ("visit_type", "visit_date")


@admin.register(PatientCheckIn)
class PatientCheckInAdmin(admin.ModelAdmin):
    list_display = ("patient", "visit_type", "status", "method", "checked_in_by", "created_at")
    search_fields = ("patient__full_name_display", "patient__patient_code", "patient__national_id", "patient__primary_phone")
    list_filter = ("status", "method", "visit_type", "created_at")


@admin.register(ElevatedAccessRequest)
class ElevatedAccessRequestAdmin(admin.ModelAdmin):
    list_display = ("patient", "requested_by", "status", "reviewed_by", "expires_at", "created_at")
    search_fields = ("patient__full_name_display", "patient__patient_code", "requested_by__username")
    list_filter = ("status", "scope", "created_at", "expires_at")


@admin.register(PatientCondition)
class PatientConditionAdmin(admin.ModelAdmin):
    list_display = ("patient", "condition_label", "present", "is_confidential", "status", "recorded_at")
    search_fields = ("patient__full_name_display", "patient__patient_code", "condition_label", "condition_code")
    list_filter = ("present", "is_confidential", "status", "recorded_at")


admin.site.register(Vital)
admin.site.register(FollowUpEvaluation)
admin.site.register(AuditLog)

# Register your models here.
