from django.contrib import admin

from .models import AuditLog, FollowUpEvaluation, Patient, PatientCondition, PatientProfile, Visit, Vital


class PatientProfileInline(admin.StackedInline):
    model = PatientProfile
    extra = 0


@admin.register(Patient)
class PatientAdmin(admin.ModelAdmin):
    inlines = [PatientProfileInline]
    list_display = ("patient_code", "full_name_display", "primary_phone", "gender", "status", "created_at")
    search_fields = ("patient_code", "national_id", "full_name_display", "primary_phone")
    list_filter = ("gender", "status", "created_at")


@admin.register(Visit)
class VisitAdmin(admin.ModelAdmin):
    list_display = ("patient", "visit_type", "visit_date", "practitioner")
    search_fields = ("patient__full_name_display", "patient__patient_code", "main_complaint")
    list_filter = ("visit_type", "visit_date")


admin.site.register(PatientCondition)
admin.site.register(Vital)
admin.site.register(FollowUpEvaluation)
admin.site.register(AuditLog)

# Register your models here.
