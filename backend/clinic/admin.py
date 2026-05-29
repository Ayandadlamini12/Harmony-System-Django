from django.contrib import admin

from .models import Appointment, AuditLog, ElevatedAccessRequest, FormDraft, Patient, PatientCheckIn, PatientCondition, PatientDocument, PatientJourney, PatientJourneyEvent, PatientProfile, Visit, Vital


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


@admin.register(Appointment)
class AppointmentAdmin(admin.ModelAdmin):
    list_display = ("patient", "appointment_type", "appointment_date", "appointment_time", "source", "assigned_clinician", "status")
    search_fields = ("patient__full_name_display", "patient__patient_code", "patient__national_id", "patient__primary_phone", "notes")
    list_filter = ("appointment_type", "appointment_date", "source", "status", "assigned_clinician")


@admin.register(PatientJourney)
class PatientJourneyAdmin(admin.ModelAdmin):
    list_display = ("patient", "service_date", "current_stage", "flow_type", "queue_number", "appointment", "is_active")
    search_fields = ("patient__full_name_display", "patient__patient_code", "patient__national_id", "patient__primary_phone")
    list_filter = ("current_stage", "flow_type", "service_date", "is_active")


@admin.register(PatientJourneyEvent)
class PatientJourneyEventAdmin(admin.ModelAdmin):
    list_display = ("journey", "stage", "recorded_by", "created_at")
    search_fields = ("journey__patient__full_name_display", "journey__patient__patient_code", "note")
    list_filter = ("stage", "created_at")


@admin.register(FormDraft)
class FormDraftAdmin(admin.ModelAdmin):
    list_display = ("draft_key", "owner_user", "form_type", "current_stage", "status", "last_saved_at")
    search_fields = ("draft_key", "owner_user__username", "owner_user__email", "related_patient__full_name_display")
    list_filter = ("form_type", "status", "created_at", "last_saved_at")
    readonly_fields = ("draft_key", "created_at", "updated_at", "last_saved_at", "submitted_at")


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


@admin.register(PatientDocument)
class PatientDocumentAdmin(admin.ModelAdmin):
    list_display = ("title", "patient", "document_type", "status", "generated_by", "created_at")
    search_fields = ("title", "document_id", "patient__full_name_display", "patient__patient_code")
    list_filter = ("document_type", "status", "created_at")
    readonly_fields = ("document_id", "verification_payload", "created_at", "updated_at")


admin.site.register(Vital)
@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ("entity_type", "entity_id", "action", "user", "created_at", "ip_address")
    search_fields = ("entity_type", "action", "user__username", "details")
    list_filter = ("entity_type", "action", "created_at")
    readonly_fields = ("created_at",)

# Register your models here.
