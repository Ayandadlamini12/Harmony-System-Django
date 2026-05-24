from django.db import transaction
from rest_framework import serializers

from .access import has_patient_clinical_access
from .models import AuditLog, ElevatedAccessRequest, FollowUpEvaluation, Patient, PatientCheckIn, PatientCondition, PatientProfile, Visit, Vital


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
    class Meta:
        model = Vital
        fields = (
            "id",
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
        )


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
    vitals = VitalSerializer(required=False)
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
        vitals_data = validated_data.pop("vitals", None)
        follow_up_data = validated_data.pop("follow_up_evaluation", None)
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            validated_data["practitioner"] = request.user
        visit = Visit.objects.create(**validated_data)
        Vital.objects.create(visit=visit, **(vitals_data or {}))
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


class PatientListSerializer(serializers.ModelSerializer):
    last_visit_date = serializers.SerializerMethodField()

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
            "created_at",
        )

    def get_last_visit_date(self, obj):
        visit = obj.visits.order_by("-visit_date", "-created_at").first()
        return visit.visit_date if visit else None


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
            "details",
            "ip_address",
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
