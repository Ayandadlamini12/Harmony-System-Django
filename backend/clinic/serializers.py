from django.db import models, transaction
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import serializers

from .access import has_patient_clinical_access
from .models import Appointment, AuditLog, Case, ElevatedAccessRequest, FormDraft, Message, MessageDelivery, MessageParticipant, MessageThread, PartnerCompany, Patient, PatientCheckIn, PatientCondition, PatientDocument, PatientJourney, PatientJourneyEvent, PatientProfile, SupportTicket, Visit, VisitSymptomProblem, Vital, ZulipOutboundEvent
from .zulip import zulip_message_url
from .workflow import build_patient_workflow_actions

User = get_user_model()


class PatientProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = PatientProfile
        fields = (
            "id",
            "family_medical_history",
            "past_medical_history",
            "allopathic_medication",
            "hiv_status",
            "other_important_information",
            "children_count",
        )


class PatientConditionSerializer(serializers.ModelSerializer):
    class Meta:
        model = PatientCondition
        fields = (
            "id",
            "condition_code",
            "condition_label",
            "present",
            "is_confidential",
            "status",
            "notes",
            "recorded_at",
        )
        read_only_fields = ("id", "recorded_at")


class PatientDocumentSerializer(serializers.ModelSerializer):
    document_type_label = serializers.CharField(source="get_document_type_display", read_only=True)
    status_label = serializers.CharField(source="get_status_display", read_only=True)
    file_url = serializers.SerializerMethodField()
    generated_by_name = serializers.CharField(source="generated_by.get_full_name", read_only=True)

    class Meta:
        model = PatientDocument
        fields = (
            "id",
            "document_id",
            "patient",
            "document_type",
            "document_type_label",
            "title",
            "status",
            "status_label",
            "file",
            "file_url",
            "verification_payload",
            "signed_at",
            "generated_by",
            "generated_by_name",
            "verified_by",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "document_id",
            "patient",
            "document_type_label",
            "status_label",
            "file_url",
            "generated_by",
            "generated_by_name",
            "verified_by",
            "created_at",
            "updated_at",
        )

    def get_file_url(self, obj):
        if not obj.file:
            return ""
        request = self.context.get("request")
        url = obj.file.url
        return request.build_absolute_uri(url) if request else url


class VitalSerializer(serializers.ModelSerializer):
    patient = serializers.PrimaryKeyRelatedField(queryset=Patient.objects.all(), required=False, allow_null=True)
    patient_name = serializers.CharField(source="patient.full_name_display", read_only=True)
    patient_code = serializers.CharField(source="patient.patient_code", read_only=True)
    visit_label = serializers.SerializerMethodField()

    class Meta:
        model = Vital
        fields = (
            "id",
            "visit",
            "patient",
            "patient_name",
            "patient_code",
            "visit_label",
            "bp_first_reading",
            "bp_second_reading",
            "pulse",
            "resp_rate",
            "temperature",
            "weight",
            "glucose_mmol_l",
            "glucose_context",
            "glucose_food_type",
            "medication_taken_status",
            "recorded_at",
            "created_at",
        )
        read_only_fields = ("id", "patient_name", "patient_code", "visit_label", "created_at")
        extra_kwargs = {
            "glucose_mmol_l": {"required": False, "allow_null": True},
        }

    def get_visit_label(self, obj):
        if obj.visit:
            return f"{obj.visit.get_visit_type_display()} - {obj.visit.visit_date}"
        return "No Visit Link"

    def create(self, validated_data):
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            validated_data["recorded_by"] = request.user
            
        visit = validated_data.get("visit")
        patient = validated_data.get("patient")
        if visit and not patient:
            validated_data["patient"] = visit.patient
            
        return super().create(validated_data)


class CaseSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source="patient.full_name_display", read_only=True)
    patient_code = serializers.CharField(source="patient.patient_code", read_only=True)
    patient_public_id = serializers.UUIDField(source="patient.public_id", read_only=True)
    visit_date = serializers.DateField(source="visit.visit_date", read_only=True)
    parent_case_title = serializers.CharField(source="parent_case.title", read_only=True)

    class Meta:
        model = Case
        fields = (
            "id", "patient", "patient_name", "patient_code",
            "patient_public_id",
            "visit", "visit_date",
            "parent_case", "parent_case_title",
            "title", "main_complaint",
            "physical_examination", "diagnosis", "remedy",
            "reason_for_remedy", "dietary_recommendation",
            "lifestyle_recommendation",
            "previous_consult_symptoms", "dietary_changes",
            "lifestyle_changes", "exercise_notes", "energy_notes",
            "evaluation_notes", "notes",
            "status", "resolved_at", "practitioner",
            "created_at", "updated_at",
        )
        read_only_fields = ("id", "patient_name", "patient_code", "patient_public_id",
                           "visit_date", "parent_case_title", "created_at", "updated_at")

    def create(self, validated_data):
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            validated_data["practitioner"] = request.user
        return super().create(validated_data)


class VisitSymptomProblemSerializer(serializers.ModelSerializer):
    opened_visit_date = serializers.DateField(source="opened_visit.visit_date", read_only=True)
    resolved_visit_date = serializers.DateField(source="resolved_visit.visit_date", read_only=True)

    class Meta:
        model = VisitSymptomProblem
        fields = (
            "id",
            "patient",
            "opened_visit",
            "opened_visit_date",
            "resolved_visit",
            "resolved_visit_date",
            "description",
            "note",
            "status",
            "resolved_at",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "patient",
            "opened_visit",
            "opened_visit_date",
            "resolved_visit",
            "resolved_visit_date",
            "resolved_at",
            "created_at",
            "updated_at",
        )


class VisitSerializer(serializers.ModelSerializer):
    vitals = VitalSerializer(many=True, read_only=True)
    patient_name = serializers.CharField(source="patient.full_name_display", read_only=True)
    patient_code = serializers.CharField(source="patient.patient_code", read_only=True)
    symptom_problems = serializers.SerializerMethodField()
    symptom_problem_updates = serializers.ListField(child=serializers.DictField(), write_only=True, required=False)
    follow_up_evaluation = serializers.DictField(write_only=True, required=False)

    class Meta:
        model = Visit
        fields = (
            "id",
            "patient",
            "patient_name",
            "patient_code",
            "visit_type",
            "visit_date",
            "visit_time",
            "main_complaint",
            "initial_complaints",
            "physical_examination",
            "diagnosis",
            "remedy",
            "reason_for_remedy",
            "dietary_recommendation",
            "lifestyle_recommendation",
            "digestive_review",
            "general_review",
            "reproductive_review",
            "sleep_mental_review",
            "follow_up_review",
            "symptom_problems",
            "symptom_problem_updates",
            "follow_up_evaluation",
            "vitals",
            "created_at",
        )
        read_only_fields = ("created_at",)

    def get_symptom_problems(self, obj):
        problems = obj.patient.symptom_problems.filter(
            models.Q(status=VisitSymptomProblem.Status.OPEN) | models.Q(opened_visit=obj) | models.Q(resolved_visit=obj)
        ).order_by("status", "created_at")
        return VisitSymptomProblemSerializer(problems, many=True).data

    @transaction.atomic
    def create(self, validated_data):
        symptom_updates = validated_data.pop("symptom_problem_updates", [])
        follow_up_evaluation = validated_data.pop("follow_up_evaluation", {})
        if follow_up_evaluation:
            validated_data["initial_complaints"] = follow_up_evaluation.get("previous_consult_symptoms", validated_data.get("initial_complaints", ""))
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            validated_data["practitioner"] = request.user
        visit = Visit.objects.create(**validated_data)
        self._apply_symptom_problem_updates(visit, symptom_updates)
        return visit

    def _apply_symptom_problem_updates(self, visit, symptom_updates):
        for item in symptom_updates:
            description = str(item.get("description") or "").strip()
            note = str(item.get("note") or "").strip()
            status_value = str(item.get("status") or VisitSymptomProblem.Status.OPEN).strip()
            problem_id = item.get("id")

            if problem_id:
                problem = VisitSymptomProblem.objects.filter(id=problem_id, patient=visit.patient).first()
                if not problem:
                    continue
                if description:
                    problem.description = description
                problem.note = note
                if status_value == VisitSymptomProblem.Status.RESOLVED:
                    problem.status = VisitSymptomProblem.Status.RESOLVED
                    problem.resolved_at = timezone.now()
                    problem.resolved_visit = visit
                else:
                    problem.status = VisitSymptomProblem.Status.OPEN
                    problem.resolved_at = None
                    problem.resolved_visit = None
                problem.save(update_fields=["description", "note", "status", "resolved_at", "resolved_visit", "updated_at"])
                continue

            if not description:
                continue
            VisitSymptomProblem.objects.create(
                patient=visit.patient,
                opened_visit=visit,
                description=description,
                note=note,
                status=VisitSymptomProblem.Status.OPEN,
            )


class PatientCheckInSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source="patient.full_name_display", read_only=True)
    patient_code = serializers.CharField(source="patient.patient_code", read_only=True)
    patient_phone = serializers.CharField(source="patient.primary_phone", read_only=True)

    class Meta:
        model = PatientCheckIn
        fields = (
            "id",
            "patient",
            "patient_name",
            "patient_code",
            "patient_phone",
            "visit_type",
            "status",
            "method",
            "identifier_type",
            "source_label",
            "note",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("status", "created_at", "updated_at")

    def create(self, validated_data):
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            validated_data["checked_in_by"] = request.user
            if not validated_data.get("method"):
                validated_data["method"] = PatientCheckIn.Method.RECEPTION
        return super().create(validated_data)


class AppointmentSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source="patient.full_name_display", read_only=True)
    patient_code = serializers.CharField(source="patient.patient_code", read_only=True)
    patient_phone = serializers.CharField(source="patient.primary_phone", read_only=True)
    appointment_type_label = serializers.CharField(source="get_appointment_type_display", read_only=True)
    source_label = serializers.CharField(source="get_source_display", read_only=True)
    status_label = serializers.CharField(source="get_status_display", read_only=True)
    assigned_clinician_name = serializers.CharField(source="assigned_clinician.get_full_name", read_only=True)

    class Meta:
        model = Appointment
        fields = (
            "id",
            "patient",
            "patient_name",
            "patient_code",
            "patient_phone",
            "appointment_type",
            "appointment_type_label",
            "appointment_date",
            "appointment_time",
            "source",
            "source_label",
            "assigned_clinician",
            "assigned_clinician_name",
            "notes",
            "status",
            "status_label",
            "checked_in_at",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "patient_name",
            "patient_code",
            "patient_phone",
            "appointment_type_label",
            "source_label",
            "assigned_clinician_name",
            "status",
            "status_label",
            "checked_in_at",
            "created_at",
            "updated_at",
        )


class PatientJourneyEventSerializer(serializers.ModelSerializer):
    recorded_by_name = serializers.CharField(source="recorded_by.get_full_name", read_only=True)
    stage_label = serializers.CharField(source="get_stage_display", read_only=True)

    class Meta:
        model = PatientJourneyEvent
        fields = ("id", "stage", "stage_label", "note", "recorded_by", "recorded_by_name", "created_at")
        read_only_fields = ("id", "stage_label", "recorded_by", "recorded_by_name", "created_at")


class PatientJourneySerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source="patient.full_name_display", read_only=True)
    patient_code = serializers.CharField(source="patient.patient_code", read_only=True)
    patient_phone = serializers.CharField(source="patient.primary_phone", read_only=True)
    current_stage_label = serializers.CharField(source="get_current_stage_display", read_only=True)
    flow_type_label = serializers.CharField(source="get_flow_type_display", read_only=True)
    events = PatientJourneyEventSerializer(many=True, read_only=True)

    class Meta:
        model = PatientJourney
        fields = (
            "id",
            "patient",
            "patient_name",
            "patient_code",
            "patient_phone",
            "check_in",
            "appointment",
            "visit",
            "service_date",
            "current_stage",
            "current_stage_label",
            "flow_type",
            "flow_type_label",
            "queue_number",
            "appointment_matched",
            "is_active",
            "notes",
            "events",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "patient_name",
            "patient_code",
            "patient_phone",
            "current_stage_label",
            "flow_type_label",
            "queue_number",
            "appointment_matched",
            "events",
            "created_at",
            "updated_at",
        )


class FormDraftSerializer(serializers.ModelSerializer):
    owner_name = serializers.CharField(source="owner_user.get_full_name", read_only=True)
    form_type_label = serializers.CharField(source="get_form_type_display", read_only=True)
    status_label = serializers.CharField(source="get_status_display", read_only=True)
    related_patient_name = serializers.CharField(source="related_patient.full_name_display", read_only=True)

    class Meta:
        model = FormDraft
        fields = (
            "id",
            "draft_key",
            "owner_user",
            "owner_name",
            "form_type",
            "form_type_label",
            "related_patient",
            "related_patient_name",
            "related_visit",
            "current_stage",
            "payload",
            "status",
            "status_label",
            "created_at",
            "updated_at",
            "last_saved_at",
            "submitted_at",
        )
        read_only_fields = (
            "id",
            "draft_key",
            "owner_user",
            "owner_name",
            "form_type_label",
            "status_label",
            "related_patient_name",
            "created_at",
            "updated_at",
            "last_saved_at",
            "submitted_at",
        )

    def validate_status(self, value):
        if value not in {FormDraft.Status.DRAFT, FormDraft.Status.ABANDONED}:
            raise serializers.ValidationError("Use submit action to mark a draft as submitted.")
        return value


class MessageRecipientSerializer(serializers.ModelSerializer):
    name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ("id", "username", "email", "first_name", "last_name", "name", "role", "is_active")

    def get_name(self, obj):
        return obj.get_full_name() or obj.username


class MessageParticipantSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()
    user_role = serializers.CharField(source="user.role", read_only=True)

    class Meta:
        model = MessageParticipant
        fields = ("id", "user", "user_name", "user_role", "role", "last_read_at", "is_muted", "created_at")
        read_only_fields = ("id", "user_name", "user_role", "created_at")

    def get_user_name(self, obj):
        return obj.user.get_full_name() or obj.user.username


class MessageDeliverySerializer(serializers.ModelSerializer):
    recipient_name = serializers.SerializerMethodField()

    class Meta:
        model = MessageDelivery
        fields = (
            "id",
            "message",
            "channel",
            "status",
            "recipient_user",
            "recipient_name",
            "destination",
            "provider",
            "provider_message_id",
            "error",
            "sent_at",
            "delivered_at",
            "read_at",
            "created_at",
        )
        read_only_fields = ("id", "recipient_name", "created_at")

    def get_recipient_name(self, obj):
        if not obj.recipient_user:
            return ""
        return obj.recipient_user.get_full_name() or obj.recipient_user.username


class MessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.SerializerMethodField()
    sender_role = serializers.CharField(source="sender.role", read_only=True)
    deliveries = MessageDeliverySerializer(many=True, read_only=True)

    class Meta:
        model = Message
        fields = (
            "id",
            "thread",
            "sender",
            "sender_name",
            "sender_role",
            "body",
            "message_type",
            "external_channel",
            "external_message_id",
            "metadata",
            "sent_at",
            "created_at",
            "deliveries",
        )
        read_only_fields = (
            "id",
            "sender",
            "sender_name",
            "sender_role",
            "message_type",
            "external_channel",
            "external_message_id",
            "metadata",
            "sent_at",
            "created_at",
            "deliveries",
        )

    def get_sender_name(self, obj):
        if not obj.sender:
            return "System"
        return obj.sender.get_full_name() or obj.sender.username


class MessageThreadSerializer(serializers.ModelSerializer):
    participant_ids = serializers.ListField(child=serializers.IntegerField(), write_only=True, required=False)
    initial_message = serializers.CharField(write_only=True, required=False, allow_blank=True, trim_whitespace=True)
    created_by_name = serializers.SerializerMethodField()
    patient_name = serializers.CharField(source="patient.full_name_display", read_only=True)
    patient_code = serializers.CharField(source="patient.patient_code", read_only=True)
    appointment_label = serializers.SerializerMethodField()
    participants = MessageParticipantSerializer(many=True, read_only=True)
    messages = MessageSerializer(many=True, read_only=True)
    latest_message = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()

    class Meta:
        model = MessageThread
        fields = (
            "id",
            "subject",
            "thread_type",
            "patient",
            "patient_name",
            "patient_code",
            "appointment",
            "appointment_label",
            "visit",
            "clinical_case",
            "document",
            "created_by",
            "created_by_name",
            "last_message_at",
            "is_closed",
            "external_reference",
            "metadata",
            "participants",
            "messages",
            "latest_message",
            "unread_count",
            "participant_ids",
            "initial_message",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "created_by",
            "created_by_name",
            "patient_name",
            "patient_code",
            "appointment_label",
            "last_message_at",
            "external_reference",
            "metadata",
            "participants",
            "messages",
            "latest_message",
            "unread_count",
            "created_at",
            "updated_at",
        )

    def get_created_by_name(self, obj):
        if not obj.created_by:
            return ""
        return obj.created_by.get_full_name() or obj.created_by.username

    def get_appointment_label(self, obj):
        if not obj.appointment:
            return ""
        return f"{obj.appointment.get_appointment_type_display()} on {obj.appointment.appointment_date}"

    def get_latest_message(self, obj):
        message = obj.messages.order_by("-sent_at", "-created_at").first()
        if not message:
            return None
        return MessageSerializer(message, context=self.context).data

    def get_unread_count(self, obj):
        request = self.context.get("request")
        user = request.user if request else None
        if not user or not user.is_authenticated:
            return 0
        participant = obj.participants.filter(user=user).first()
        if not participant:
            return 0
        messages = obj.messages.exclude(sender=user)
        if participant.last_read_at:
            messages = messages.filter(sent_at__gt=participant.last_read_at)
        return messages.count()

    def create(self, validated_data):
        validated_data.pop("participant_ids", None)
        validated_data.pop("initial_message", None)
        return super().create(validated_data)

    def update(self, instance, validated_data):
        validated_data.pop("participant_ids", None)
        validated_data.pop("initial_message", None)
        return super().update(instance, validated_data)


class PatientListSerializer(serializers.ModelSerializer):
    last_visit_date = serializers.SerializerMethodField()
    current_journey = serializers.SerializerMethodField()
    consent_status = serializers.SerializerMethodField()
    medical_aid_company_name = serializers.CharField(source="medical_aid_company.name", read_only=True)

    class Meta:
        model = Patient
        fields = (
            "id",
            "public_id",
            "patient_code",
            "national_id",
            "email",
            "primary_phone",
            "first_name",
            "middle_name",
            "last_name",
            "full_name_display",
            "date_of_birth",
            "gender",
            "marital_status",
            "occupation",
            "allergies",
            "smoking_status",
            "smoking_details",
            "smoking_years",
            "alcohol_status",
            "alcohol_details",
            "region",
            "town_or_locality",
            "village",
            "next_of_kin_full_name",
            "next_of_kin_phone",
            "next_of_kin_email",
            "next_of_kin_relationship",
            "next_of_kin_relationship_other",
            "has_medical_aid",
            "medical_aid_company",
            "medical_aid_company_name",
            "medical_aid_membership_ownership",
            "medical_aid_owner_full_name",
            "medical_aid_owner_national_id",
            "medical_aid_owner_relationship",
            "medical_aid_id_number",
            "status",
            "consent_status",
            "last_visit_date",
            "current_journey",
            "created_at",
        )

    def get_last_visit_date(self, obj):
        visit = obj.visits.order_by("-visit_date", "-created_at").first()
        return visit.visit_date if visit else None

    def get_current_journey(self, obj):
        journey = obj.journeys.filter(is_active=True, service_date=timezone.localdate()).order_by("-created_at").first()
        if not journey:
            return None
        return {
            "id": journey.id,
            "service_date": journey.service_date,
            "current_stage": journey.current_stage,
            "current_stage_label": journey.get_current_stage_display(),
            "flow_type": journey.flow_type,
            "flow_type_label": journey.get_flow_type_display(),
            "queue_number": journey.queue_number,
            "appointment_matched": journey.appointment_matched,
        }

    def get_consent_status(self, obj):
        from .workflow import consent_is_complete
        if consent_is_complete(obj):
            latest_consent = obj.documents.filter(
                document_type=PatientDocument.DocumentType.CONSENT_FORM,
                status__in=(PatientDocument.Status.SIGNED, PatientDocument.Status.VERIFIED),
            ).order_by("-signed_at", "-created_at").first()
            if latest_consent:
                return latest_consent.status
            return "signed"

        latest_consent = obj.documents.filter(
            document_type=PatientDocument.DocumentType.CONSENT_FORM
        ).order_by("-created_at").first()
        if latest_consent:
            if latest_consent.status in ("pending_signature", "generated", "invalidated"):
                return latest_consent.status

        return "pending"


class PatientDetailSerializer(PatientListSerializer):
    profile = PatientProfileSerializer(required=False)
    conditions = PatientConditionSerializer(many=True, required=False)
    documents = PatientDocumentSerializer(many=True, read_only=True)
    visits = VisitSerializer(many=True, read_only=True)
    vitals = VitalSerializer(many=True, read_only=True)
    patient_actions = serializers.SerializerMethodField()

    class Meta(PatientListSerializer.Meta):
        fields = PatientListSerializer.Meta.fields + ("profile", "conditions", "documents", "visits", "vitals", "patient_actions")

    def get_patient_actions(self, obj):
        request = self.context.get("request")
        user = request.user if request else None
        return build_patient_workflow_actions(obj, user)

    def to_representation(self, instance):
        data = super().to_representation(instance)
        request = self.context.get("request")
        user = request.user if request else None
        if not has_patient_clinical_access(user, instance.id):
            data.pop("profile", None)
            data.pop("conditions", None)
            data.pop("visits", None)
            data.pop("vitals", None)
            data["clinical_access"] = "approval_required"
        else:
            data["clinical_access"] = "active"
        return data

    @transaction.atomic
    def create(self, validated_data):
        profile_data = validated_data.pop("profile", {})
        conditions_data = validated_data.pop("conditions", [])
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            validated_data["created_by"] = request.user
        patient = Patient.objects.create(**validated_data)
        PatientProfile.objects.create(
            patient=patient,
            updated_by=patient.created_by,
            **profile_data,
        )
        self._sync_conditions(patient, conditions_data)
        return patient

    @transaction.atomic
    def update(self, instance, validated_data):
        profile_data = validated_data.pop("profile", None)
        conditions_data = validated_data.pop("conditions", None)
        for field, value in validated_data.items():
            setattr(instance, field, value)
        instance.save()
        if profile_data is not None:
            profile, _ = PatientProfile.objects.get_or_create(patient=instance)
            for field, value in profile_data.items():
                setattr(profile, field, value)
            request = self.context.get("request")
            if request and request.user.is_authenticated:
                profile.updated_by = request.user
            profile.save()
        if conditions_data is not None:
            self._sync_conditions(instance, conditions_data)
        return instance

    def _sync_conditions(self, patient, conditions_data):
        request = self.context.get("request")
        recorded_by = request.user if request and request.user.is_authenticated else None
        for condition_data in conditions_data:
            condition_code = condition_data.get("condition_code")
            if not condition_code:
                continue
            defaults = {
                "condition_label": condition_data.get("condition_label", condition_code),
                "present": condition_data.get("present", False),
                "is_confidential": condition_data.get("is_confidential", True),
                "status": condition_data.get("status", PatientCondition.Status.ACTIVE),
                "notes": condition_data.get("notes", ""),
                "recorded_by": recorded_by,
            }
            PatientCondition.objects.update_or_create(
                patient=patient,
                condition_code=condition_code,
                defaults=defaults,
            )


class AuditLogSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source="user.get_full_name", read_only=True)

    class Meta:
        model = AuditLog
        fields = (
            "id",
            "user",
            "user_name",
            "entity_type",
            "entity_id",
            "action",
            "change_summary",
            "before_data",
            "after_data",
            "changed_fields",
            "details",
            "ip_address",
            "user_agent",
            "created_at",
        )


class ElevatedAccessRequestSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source="patient.full_name_display", read_only=True)
    patient_code = serializers.CharField(source="patient.patient_code", read_only=True)
    requested_by_name = serializers.CharField(source="requested_by.get_full_name", read_only=True)
    reviewed_by_name = serializers.CharField(source="reviewed_by.get_full_name", read_only=True)

    class Meta:
        model = ElevatedAccessRequest
        fields = (
            "id",
            "patient",
            "patient_name",
            "patient_code",
            "requested_by",
            "requested_by_name",
            "reviewed_by",
            "reviewed_by_name",
            "scope",
            "status",
            "reason",
            "review_note",
            "reviewed_at",
            "expires_at",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "requested_by",
            "reviewed_by",
            "status",
            "review_note",
            "reviewed_at",
            "expires_at",
            "created_at",
            "updated_at",
        )

    def create(self, validated_data):
        request = self.context.get("request")
        validated_data["requested_by"] = request.user
        return super().create(validated_data)


class SupportTicketSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source="created_by.get_full_name", read_only=True)
    created_by_username = serializers.CharField(source="created_by.username", read_only=True)
    created_by_email = serializers.CharField(source="created_by.email", read_only=True)

    class Meta:
        model = SupportTicket
        fields = (
            "id",
            "title",
            "description",
            "status",
            "created_by",
            "created_by_name",
            "created_by_username",
            "created_by_email",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "created_by",
            "created_at",
            "updated_at",
        )

    def create(self, validated_data):
        request = self.context.get("request")
        if request and request.user and request.user.is_authenticated:
            validated_data["created_by"] = request.user
        return super().create(validated_data)


class ZulipOutboundEventSerializer(serializers.ModelSerializer):
    actor_name = serializers.SerializerMethodField()
    actor_role = serializers.CharField(source="actor.role", read_only=True)
    open_in_zulip_url = serializers.SerializerMethodField()

    class Meta:
        model = ZulipOutboundEvent
        fields = (
            "id",
            "actor",
            "actor_name",
            "actor_role",
            "channel",
            "topic",
            "linked_entity_type",
            "linked_entity_id",
            "raw_payload",
            "sanitized_payload",
            "template_key",
            "status",
            "response_metadata",
            "retry_count",
            "open_in_zulip_url",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "actor",
            "actor_name",
            "sanitized_payload",
            "status",
            "response_metadata",
            "retry_count",
            "open_in_zulip_url",
            "created_at",
            "updated_at",
        )

    def get_actor_name(self, obj):
        return obj.actor.get_full_name() or obj.actor.username

    def get_open_in_zulip_url(self, obj):
        return zulip_message_url(obj.channel, obj.topic)


class ZulipPostUpdateSerializer(serializers.Serializer):
    channel = serializers.CharField(max_length=80, required=False, allow_blank=True)
    topic = serializers.CharField(max_length=255, required=False, allow_blank=True)
    linked_entity_type = serializers.ChoiceField(choices=ZulipOutboundEvent.LinkedType.choices)
    linked_entity_id = serializers.CharField(max_length=100)
    raw_payload = serializers.CharField()
    template_key = serializers.CharField(max_length=80, required=False, allow_blank=True, default="generic_update")
    metadata = serializers.JSONField(required=False, default=dict)


class ZulipMessagesQuerySerializer(serializers.Serializer):
    channel = serializers.CharField(max_length=80)
    topic = serializers.CharField(max_length=255)
    limit = serializers.IntegerField(required=False, min_value=1, max_value=100, default=20)


class PartnerCompanySerializer(serializers.ModelSerializer):
    category_label = serializers.CharField(source="get_category_display", read_only=True)
    company_code = serializers.CharField(required=False, allow_blank=True, allow_null=True)

    def to_internal_value(self, data):
        if "website" in data and isinstance(data["website"], str):
            website = data["website"].strip()
            if website and not website.startswith(("http://", "https://")):
                if hasattr(data, "copy"):
                    data = data.copy()
                else:
                    data = dict(data)
                data["website"] = f"https://{website}"
        return super().to_internal_value(data)

    class Meta:
        model = PartnerCompany
        fields = (
            "id",
            "public_id",
            "company_code",
            "name",
            "category",
            "category_label",
            "address",
            "email",
            "website",
            "phone_number",
            "tax_number",
            "bank_name",
            "branch_code",
            "account_holder",
            "account_number",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "public_id",
            "created_at",
            "updated_at",
        )


