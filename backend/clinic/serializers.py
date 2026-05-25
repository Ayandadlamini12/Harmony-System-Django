from django.db import transaction
from rest_framework import serializers

from .access import has_patient_clinical_access
from .models import Appointment, AuditLog, ElevatedAccessRequest, FollowUpEvaluation, FormDraft, Patient, PatientCheckIn, PatientCondition, PatientJourney, PatientJourneyEvent, PatientProfile, Visit, Vital


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


class VitalSerializer(serializers.ModelSerializer):
    patient = serializers.IntegerField(source="visit.patient_id", read_only=True)
    patient_name = serializers.CharField(source="visit.patient.full_name_display", read_only=True)
    patient_code = serializers.CharField(source="visit.patient.patient_code", read_only=True)
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
        read_only_fields = ("id", "patient", "patient_name", "patient_code", "visit_label", "created_at")

    def get_visit_label(self, obj):
        return f"{obj.visit.get_visit_type_display()} - {obj.visit.visit_date}"

    def create(self, validated_data):
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            validated_data["recorded_by"] = request.user
        return super().create(validated_data)


class FollowUpEvaluationSerializer(serializers.ModelSerializer):
    class Meta:
        model = FollowUpEvaluation
        fields = (
            "id",
            "previous_consult_symptoms",
            "dietary_changes",
            "lifestyle_changes",
            "exercise_notes",
            "energy_notes",
            "evaluation_notes",
        )


class VisitSerializer(serializers.ModelSerializer):
    vitals = VitalSerializer(many=True, read_only=True)
    follow_up_evaluation = FollowUpEvaluationSerializer(required=False)
    patient_name = serializers.CharField(source="patient.full_name_display", read_only=True)
    patient_code = serializers.CharField(source="patient.patient_code", read_only=True)

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
            "vitals",
            "follow_up_evaluation",
            "created_at",
        )
        read_only_fields = ("created_at",)

    @transaction.atomic
    def create(self, validated_data):
        follow_up_data = validated_data.pop("follow_up_evaluation", None)
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            validated_data["practitioner"] = request.user
        visit = Visit.objects.create(**validated_data)
        if follow_up_data:
            FollowUpEvaluation.objects.create(visit=visit, **follow_up_data)
        return visit


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


class PatientListSerializer(serializers.ModelSerializer):
    last_visit_date = serializers.SerializerMethodField()
    current_journey = serializers.SerializerMethodField()

    class Meta:
        model = Patient
        fields = (
            "id",
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
            "region",
            "town_or_locality",
            "village",
            "next_of_kin_full_name",
            "next_of_kin_phone",
            "next_of_kin_email",
            "next_of_kin_relationship",
            "next_of_kin_relationship_other",
            "status",
            "last_visit_date",
            "current_journey",
            "created_at",
        )

    def get_last_visit_date(self, obj):
        visit = obj.visits.order_by("-visit_date", "-created_at").first()
        return visit.visit_date if visit else None

    def get_current_journey(self, obj):
        journey = obj.journeys.filter(is_active=True).order_by("-service_date", "-created_at").first()
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


class PatientDetailSerializer(PatientListSerializer):
    profile = PatientProfileSerializer(required=False)
    conditions = PatientConditionSerializer(many=True, required=False)
    visits = VisitSerializer(many=True, read_only=True)

    class Meta(PatientListSerializer.Meta):
        fields = PatientListSerializer.Meta.fields + ("profile", "conditions", "visits")

    def to_representation(self, instance):
        data = super().to_representation(instance)
        request = self.context.get("request")
        user = request.user if request else None
        if not has_patient_clinical_access(user, instance.id):
            data.pop("profile", None)
            data.pop("conditions", None)
            data.pop("visits", None)
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
