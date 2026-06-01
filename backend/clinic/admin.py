from django.contrib import admin

from .models import Appointment, AuditLog, Case, ElevatedAccessRequest, FormDraft, Message, MessageDelivery, MessageParticipant, MessageThread, Patient, PatientCheckIn, PatientCondition, PatientDocument, PatientJourney, PatientJourneyEvent, PatientProfile, Visit, VisitSymptomProblem, Vital


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


@admin.register(VisitSymptomProblem)
class VisitSymptomProblemAdmin(admin.ModelAdmin):
    list_display = ("description", "patient", "status", "opened_visit", "resolved_visit", "resolved_at")
    search_fields = ("description", "note", "patient__full_name_display", "patient__patient_code")
    list_filter = ("status", "created_at", "resolved_at")
    autocomplete_fields = ("patient", "opened_visit", "resolved_visit")


@admin.register(Case)
class CaseAdmin(admin.ModelAdmin):
    list_display = ("title", "patient", "visit", "status", "practitioner", "created_at")
    search_fields = ("title", "patient__full_name_display", "patient__patient_code", "main_complaint", "diagnosis")
    list_filter = ("status", "created_at", "resolved_at")
    autocomplete_fields = ("patient", "visit", "parent_case", "practitioner")


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


class MessageParticipantInline(admin.TabularInline):
    model = MessageParticipant
    extra = 0
    autocomplete_fields = ("user",)


@admin.register(MessageThread)
class MessageThreadAdmin(admin.ModelAdmin):
    inlines = [MessageParticipantInline]
    list_display = ("subject", "thread_type", "patient", "appointment", "created_by", "last_message_at", "is_closed")
    search_fields = ("subject", "patient__full_name_display", "patient__patient_code", "messages__body")
    list_filter = ("thread_type", "is_closed", "created_at", "last_message_at")
    autocomplete_fields = ("patient", "appointment", "visit", "clinical_case", "document", "created_by")


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ("thread", "sender", "message_type", "external_channel", "sent_at")
    search_fields = ("thread__subject", "sender__username", "body")
    list_filter = ("message_type", "external_channel", "sent_at")
    autocomplete_fields = ("thread", "sender")


@admin.register(MessageDelivery)
class MessageDeliveryAdmin(admin.ModelAdmin):
    list_display = ("message", "channel", "status", "recipient_user", "created_at")
    search_fields = ("message__thread__subject", "recipient_user__username", "destination", "provider_message_id")
    list_filter = ("channel", "status", "created_at")
    autocomplete_fields = ("message", "recipient_user")


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
