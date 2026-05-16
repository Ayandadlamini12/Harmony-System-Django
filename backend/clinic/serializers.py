from django.db import transaction
from rest_framework import serializers

from .models import AuditLog, FollowUpEvaluation, Patient, PatientCondition, PatientProfile, Visit, Vital


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
            "status",
            "notes",
            "recorded_at",
        )


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


class PatientListSerializer(serializers.ModelSerializer):
    last_visit_date = serializers.SerializerMethodField()

    class Meta:
        model = Patient
        fields = (
            "id",
            "patient_code",
            "national_id",
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
            "status",
            "last_visit_date",
            "created_at",
        )

    def get_last_visit_date(self, obj):
        visit = obj.visits.order_by("-visit_date", "-created_at").first()
        return visit.visit_date if visit else None


class PatientDetailSerializer(PatientListSerializer):
    profile = PatientProfileSerializer(required=False)
    conditions = PatientConditionSerializer(many=True, read_only=True)
    visits = VisitSerializer(many=True, read_only=True)

    class Meta(PatientListSerializer.Meta):
        fields = PatientListSerializer.Meta.fields + ("profile", "conditions", "visits")

    @transaction.atomic
    def create(self, validated_data):
        profile_data = validated_data.pop("profile", {})
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            validated_data["created_by"] = request.user
        patient = Patient.objects.create(**validated_data)
        PatientProfile.objects.create(
            patient=patient,
            updated_by=patient.created_by,
            **profile_data,
        )
        return patient

    @transaction.atomic
    def update(self, instance, validated_data):
        profile_data = validated_data.pop("profile", None)
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
        return instance


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
