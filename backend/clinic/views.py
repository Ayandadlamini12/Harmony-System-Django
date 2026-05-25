from django.conf import settings
from django.db import transaction
from django.utils import timezone
import re

from django.db.models import Max, Q
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response

from .access import has_patient_clinical_access, is_clinical_user
from .audit import snapshot_instance, write_audit_log
from .models import AuditLog, ElevatedAccessRequest, FormDraft, Patient, PatientCheckIn, PatientJourney, PatientJourneyEvent, PatientProfile, Visit, Vital
from .serializers import (
    AuditLogSerializer,
    ElevatedAccessRequestSerializer,
    FormDraftSerializer,
    PatientCheckInSerializer,
    PatientJourneySerializer,
    PatientDetailSerializer,
    PatientListSerializer,
    VisitSerializer,
    VitalSerializer,
)


def normalize_digits(value):
    return re.sub(r"\D", "", value or "")


def find_patient_by_identifier(identifier, identifier_type=""):
    text = (identifier or "").strip()
    digits = normalize_digits(text)
    if not text:
        return None

    identifier_type = (identifier_type or "").strip()
    if identifier_type == "cell_number":
        if not digits:
            return None
        query = Q(primary_phone__icontains=digits[-8:]) | Q(secondary_phone__icontains=digits[-8:])
    elif identifier_type == "patient_code":
        query = Q(patient_code__iexact=text)
    elif identifier_type == "national_passport_id":
        query = Q(national_id__iexact=text)
    else:
        query = Q(patient_code__iexact=text) | Q(national_id__iexact=text)
        if digits:
            query |= Q(primary_phone__icontains=digits[-8:]) | Q(secondary_phone__icontains=digits[-8:])

    return Patient.objects.filter(query).order_by("-created_at").first()


def next_queue_number(service_date):
    current = (
        PatientJourney.objects.filter(
            service_date=service_date,
            flow_type=PatientJourney.FlowType.WALK_IN_QUEUE,
        )
        .aggregate(max_queue=Max("queue_number"))
        .get("max_queue")
    )
    return (current or 0) + 1


def create_journey_event(journey, stage, request=None, note=""):
    user = request.user if request and request.user.is_authenticated else None
    return PatientJourneyEvent.objects.create(journey=journey, stage=stage, note=note, recorded_by=user)


def start_journey_for_registration(patient, request=None):
    service_date = timezone.localdate()
    user = request.user if request and request.user.is_authenticated else None
    journey, created = PatientJourney.objects.get_or_create(
        patient=patient,
        service_date=service_date,
        is_active=True,
        defaults={
            "current_stage": PatientJourney.Stage.REGISTERED,
            "flow_type": PatientJourney.FlowType.MANUAL,
            "created_by": user,
            "updated_by": user,
            "notes": "Created from patient registration.",
        },
    )
    if created:
        create_journey_event(journey, PatientJourney.Stage.REGISTERED, request, "Patient registration started today's establishment flow.")
    return journey


def start_journey_for_check_in(check_in, request=None):
    service_date = timezone.localdate()
    # Appointment matching will use the appointments table once that module exists.
    appointment_matched = False
    flow_type = PatientJourney.FlowType.APPOINTMENT_CHECKIN if appointment_matched else PatientJourney.FlowType.WALK_IN_QUEUE
    current_stage = PatientJourney.Stage.CHECKED_IN if appointment_matched else PatientJourney.Stage.QUEUED
    queue_number = None if appointment_matched else next_queue_number(service_date)
    user = request.user if request and request.user.is_authenticated else None

    journey = (
        PatientJourney.objects.filter(patient=check_in.patient, service_date=service_date, is_active=True)
        .order_by("-created_at")
        .first()
    )
    created = False
    if not journey:
        journey = PatientJourney.objects.create(
            check_in=check_in,
            patient=check_in.patient,
            service_date=service_date,
            current_stage=current_stage,
            flow_type=flow_type,
            queue_number=queue_number,
            appointment_matched=appointment_matched,
            created_by=user,
            updated_by=user,
            notes="Created from patient check-in.",
        )
        created = True
    else:
        journey.check_in = check_in
        journey.current_stage = current_stage
        journey.flow_type = flow_type
        journey.appointment_matched = appointment_matched
        if not journey.queue_number and queue_number:
            journey.queue_number = queue_number
        journey.updated_by = user
        journey.notes = "Updated from patient check-in."
        journey.save()
    if created or journey.events.filter(stage=current_stage).count() == 0:
        create_journey_event(journey, current_stage, request, "Patient added to establishment flow from check-in.")
    return journey


def transition_active_patient_journey(patient, stage, request=None, note="", visit=None):
    journey = (
        PatientJourney.objects.filter(patient=patient, is_active=True)
        .order_by("-service_date", "-created_at")
        .first()
    )
    if not journey:
        return None
    journey.current_stage = stage
    if visit:
        journey.visit = visit
    journey.updated_by = request.user if request and request.user.is_authenticated else None
    if note:
        journey.notes = note
    if stage in {PatientJourney.Stage.COMPLETED, PatientJourney.Stage.CANCELLED}:
        journey.is_active = False
    journey.save()
    create_journey_event(journey, stage, request, note)
    return journey


class PatientViewSet(viewsets.ModelViewSet):
    queryset = Patient.objects.select_related("profile").prefetch_related("conditions", "visits__vitals")
    search_fields = (
        "full_name_display",
        "patient_code",
        "national_id",
        "email",
        "primary_phone",
        "next_of_kin_full_name",
        "next_of_kin_phone",
    )
    ordering_fields = ("created_at", "full_name_display", "patient_code")

    def get_serializer_class(self):
        if self.action == "list":
            return PatientListSerializer
        return PatientDetailSerializer

    def perform_create(self, serializer):
        patient = serializer.save()
        journey = start_journey_for_registration(patient, self.request)
        write_audit_log(
            request=self.request,
            action="create",
            instance=patient,
            after_data=snapshot_instance(patient),
            details="Patient record created.",
        )
        write_audit_log(
            request=self.request,
            action="create",
            instance=journey,
            entity_type="patient_journey",
            after_data=snapshot_instance(journey),
            details="Patient journey tracking started from registration.",
        )

    def perform_update(self, serializer):
        before_data = snapshot_instance(self.get_object())
        patient = serializer.save()
        write_audit_log(
            request=self.request,
            action="update",
            instance=patient,
            before_data=before_data,
            after_data=snapshot_instance(patient),
            details="Patient record updated.",
        )

    def perform_destroy(self, instance):
        before_data = snapshot_instance(instance)
        entity_id = instance.pk
        instance.delete()
        write_audit_log(
            request=self.request,
            action="delete",
            entity_type="patient",
            entity_id=entity_id,
            before_data=before_data,
            details="Patient record deleted.",
        )

    @action(detail=True, methods=["get", "post"])
    def visits(self, request, pk=None):
        patient = self.get_object()
        if not has_patient_clinical_access(request.user, patient.id):
            return Response(
                {"detail": "Clinical access requires clinician approval."},
                status=status.HTTP_403_FORBIDDEN,
            )
        if request.method == "GET":
            visits = patient.visits.prefetch_related("vitals").select_related("follow_up_evaluation")
            serializer = VisitSerializer(visits, many=True, context={"request": request})
            return Response(serializer.data)

        if not is_clinical_user(request.user):
            return Response({"detail": "Only clinical users can create visits."}, status=status.HTTP_403_FORBIDDEN)
        serializer = VisitSerializer(data={**request.data, "patient": patient.id}, context={"request": request})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class VisitViewSet(viewsets.ModelViewSet):
    queryset = Visit.objects.select_related("patient", "follow_up_evaluation").prefetch_related("vitals").order_by("-visit_date", "-created_at")
    serializer_class = VisitSerializer
    search_fields = ("patient__full_name_display", "patient__patient_code", "main_complaint", "diagnosis")
    ordering_fields = ("visit_date", "created_at")

    def get_queryset(self):
        queryset = super().get_queryset()
        if is_clinical_user(self.request.user):
            return queryset
        now = timezone.now()
        return queryset.filter(
            patient__access_requests__requested_by=self.request.user,
            patient__access_requests__status=ElevatedAccessRequest.Status.APPROVED,
            patient__access_requests__expires_at__gt=now,
        ).distinct()

    def create(self, request, *args, **kwargs):
        if not is_clinical_user(request.user):
            return Response({"detail": "Only clinical users can create visits."}, status=status.HTTP_403_FORBIDDEN)
        return super().create(request, *args, **kwargs)

    def perform_create(self, serializer):
        visit = serializer.save()
        journey = transition_active_patient_journey(
            visit.patient,
            PatientJourney.Stage.VISIT_RECORDED,
            self.request,
            "Visit record created and linked to patient flow.",
            visit=visit,
        )
        write_audit_log(
            request=self.request,
            action="create",
            instance=visit,
            after_data=snapshot_instance(visit),
            details="Visit record created.",
        )
        if journey:
            write_audit_log(
                request=self.request,
                action="transition",
                instance=journey,
                entity_type="patient_journey",
                after_data=snapshot_instance(journey),
                details="Patient journey transitioned after visit creation.",
            )

    def perform_update(self, serializer):
        before_data = snapshot_instance(self.get_object())
        visit = serializer.save()
        write_audit_log(
            request=self.request,
            action="update",
            instance=visit,
            before_data=before_data,
            after_data=snapshot_instance(visit),
            details="Visit record updated.",
        )

    def perform_destroy(self, instance):
        before_data = snapshot_instance(instance)
        entity_id = instance.pk
        instance.delete()
        write_audit_log(
            request=self.request,
            action="delete",
            entity_type="visit",
            entity_id=entity_id,
            before_data=before_data,
            details="Visit record deleted.",
        )


class VitalViewSet(viewsets.ModelViewSet):
    queryset = Vital.objects.select_related("visit", "visit__patient", "recorded_by").order_by("-recorded_at", "-created_at")
    serializer_class = VitalSerializer
    search_fields = ("visit__patient__full_name_display", "visit__patient__patient_code")
    filterset_fields = ("visit", "visit__patient", "glucose_context", "medication_taken_status")
    ordering_fields = ("recorded_at", "created_at")

    def get_queryset(self):
        queryset = super().get_queryset()
        if is_clinical_user(self.request.user):
            return queryset
        now = timezone.now()
        return queryset.filter(
            visit__patient__access_requests__requested_by=self.request.user,
            visit__patient__access_requests__status=ElevatedAccessRequest.Status.APPROVED,
            visit__patient__access_requests__expires_at__gt=now,
        ).distinct()

    def create(self, request, *args, **kwargs):
        if not is_clinical_user(request.user):
            return Response({"detail": "Only clinical users can record vitals."}, status=status.HTTP_403_FORBIDDEN)
        return super().create(request, *args, **kwargs)

    def perform_create(self, serializer):
        vital = serializer.save()
        journey = transition_active_patient_journey(
            vital.visit.patient,
            PatientJourney.Stage.VITALS_RECORDED,
            self.request,
            "Vitals recorded for active patient flow.",
        )
        write_audit_log(
            request=self.request,
            action="create",
            instance=vital,
            entity_type="vital",
            after_data=snapshot_instance(vital),
            details="Vitals record created.",
        )
        if journey:
            write_audit_log(
                request=self.request,
                action="transition",
                instance=journey,
                entity_type="patient_journey",
                after_data=snapshot_instance(journey),
                details="Patient journey transitioned after vitals creation.",
            )

    def perform_update(self, serializer):
        before_data = snapshot_instance(self.get_object())
        vital = serializer.save()
        write_audit_log(
            request=self.request,
            action="update",
            instance=vital,
            entity_type="vital",
            before_data=before_data,
            after_data=snapshot_instance(vital),
            details="Vitals record updated.",
        )

    def perform_destroy(self, instance):
        before_data = snapshot_instance(instance)
        entity_id = instance.pk
        instance.delete()
        write_audit_log(
            request=self.request,
            action="delete",
            entity_type="vital",
            entity_id=entity_id,
            before_data=before_data,
            details="Vitals record deleted.",
        )


class PatientCheckInViewSet(viewsets.ModelViewSet):
    queryset = PatientCheckIn.objects.select_related("patient", "checked_in_by").order_by("-created_at")
    serializer_class = PatientCheckInSerializer
    search_fields = ("patient__full_name_display", "patient__patient_code", "patient__national_id", "patient__primary_phone")
    filterset_fields = ("status", "method", "visit_type")
    ordering_fields = ("created_at", "status")

    def get_permissions(self):
        if self.action in {"lookup", "create"}:
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

    @action(detail=False, methods=["post"], permission_classes=[permissions.AllowAny])
    def lookup(self, request):
        patient = find_patient_by_identifier(
            request.data.get("identifier", ""),
            request.data.get("identifier_type", ""),
        )
        if not patient:
            return Response({"detail": "No matching registered patient found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(
            {
                "patient": patient.id,
                "patient_name": patient.full_name_display,
                "patient_code": patient.patient_code,
                "primary_phone": patient.primary_phone,
            }
        )

    def create(self, request, *args, **kwargs):
        data = request.data.copy()
        identifier = data.get("identifier", "")
        if not data.get("patient") and identifier:
            patient = find_patient_by_identifier(identifier, data.get("identifier_type", ""))
            if not patient:
                return Response({"detail": "No matching registered patient found."}, status=status.HTTP_404_NOT_FOUND)
            data["patient"] = patient.id
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def perform_create(self, serializer):
        check_in = serializer.save()
        journey = start_journey_for_check_in(check_in, self.request)
        write_audit_log(
            request=self.request,
            action="create",
            instance=check_in,
            after_data=snapshot_instance(check_in),
            details="Patient check-in created.",
        )
        write_audit_log(
            request=self.request,
            action="create",
            instance=journey,
            entity_type="patient_journey",
            after_data=snapshot_instance(journey),
            details="Patient journey tracking started.",
        )

    def perform_update(self, serializer):
        before_data = snapshot_instance(self.get_object())
        check_in = serializer.save()
        write_audit_log(
            request=self.request,
            action="update",
            instance=check_in,
            before_data=before_data,
            after_data=snapshot_instance(check_in),
            details="Patient check-in updated.",
        )


class PatientJourneyViewSet(viewsets.ModelViewSet):
    queryset = PatientJourney.objects.select_related("patient", "check_in", "visit").prefetch_related("events").order_by("-service_date", "queue_number", "created_at")
    serializer_class = PatientJourneySerializer
    search_fields = ("patient__full_name_display", "patient__patient_code", "patient__national_id", "patient__primary_phone")
    filterset_fields = ("current_stage", "flow_type", "service_date", "is_active")
    ordering_fields = ("service_date", "queue_number", "created_at", "updated_at")

    @action(detail=False, methods=["post"])
    def lookup(self, request):
        patient = find_patient_by_identifier(
            request.data.get("identifier", ""),
            request.data.get("identifier_type", ""),
        )
        if not patient:
            return Response({"detail": "No matching registered patient found."}, status=status.HTTP_404_NOT_FOUND)
        journey = (
            PatientJourney.objects.select_related("patient", "check_in", "visit")
            .prefetch_related("events")
            .filter(patient=patient, is_active=True)
            .order_by("-service_date", "-created_at")
            .first()
        )
        history = (
            PatientJourney.objects.select_related("patient", "check_in", "visit")
            .prefetch_related("events")
            .filter(patient=patient)
            .order_by("-service_date", "-created_at")[:5]
        )
        return Response(
            {
                "patient": {
                    "id": patient.id,
                    "patient_code": patient.patient_code,
                    "full_name_display": patient.full_name_display,
                    "primary_phone": patient.primary_phone,
                    "national_id": patient.national_id,
                },
                "current_journey": self.get_serializer(journey).data if journey else None,
                "recent_journeys": self.get_serializer(history, many=True).data,
            }
        )

    @action(detail=True, methods=["post"])
    def transition(self, request, pk=None):
        journey = self.get_object()
        next_stage = request.data.get("stage")
        valid_stages = {choice[0] for choice in PatientJourney.Stage.choices}
        if next_stage not in valid_stages:
            return Response({"stage": "Invalid patient journey stage."}, status=status.HTTP_400_BAD_REQUEST)
        before_data = snapshot_instance(journey)
        journey.current_stage = next_stage
        journey.updated_by = request.user
        note = request.data.get("note", "")
        if note:
            journey.notes = note
        if next_stage in {PatientJourney.Stage.COMPLETED, PatientJourney.Stage.CANCELLED}:
            journey.is_active = False
        journey.save()
        create_journey_event(journey, next_stage, request, note)
        write_audit_log(
            request=request,
            action="transition",
            instance=journey,
            entity_type="patient_journey",
            before_data=before_data,
            after_data=snapshot_instance(journey),
            details=f"Patient journey transitioned to {journey.get_current_stage_display()}.",
        )
        return Response(self.get_serializer(journey).data)


class FormDraftViewSet(viewsets.ModelViewSet):
    serializer_class = FormDraftSerializer
    lookup_field = "draft_key"
    filterset_fields = ("form_type", "status", "related_patient", "related_visit")
    search_fields = ("form_type", "current_stage", "related_patient__full_name_display")
    ordering_fields = ("last_saved_at", "updated_at", "created_at")

    def get_queryset(self):
        queryset = FormDraft.objects.select_related("owner_user", "related_patient", "related_visit")
        if self.request.user.is_staff or getattr(self.request.user, "role", "") == "admin":
            return queryset
        return queryset.filter(owner_user=self.request.user)

    def perform_create(self, serializer):
        draft = serializer.save(owner_user=self.request.user)
        write_audit_log(
            request=self.request,
            action="create_draft",
            instance=draft,
            entity_type="form_draft",
            after_data=snapshot_instance(draft),
            details="Form draft created.",
        )

    def perform_update(self, serializer):
        before_data = snapshot_instance(self.get_object())
        draft = serializer.save(owner_user=self.request.user if not serializer.instance.owner_user_id else serializer.instance.owner_user)
        write_audit_log(
            request=self.request,
            action="update_draft",
            instance=draft,
            entity_type="form_draft",
            before_data=before_data,
            after_data=snapshot_instance(draft),
            details="Form draft saved.",
        )

    @action(detail=True, methods=["post"])
    def submit(self, request, draft_key=None):
        draft = self.get_object()
        before_data = snapshot_instance(draft)
        draft.status = FormDraft.Status.SUBMITTED
        draft.save(update_fields=["status", "submitted_at", "updated_at"])
        write_audit_log(
            request=request,
            action="submit_draft",
            instance=draft,
            entity_type="form_draft",
            before_data=before_data,
            after_data=snapshot_instance(draft),
            details="Form draft marked submitted.",
        )
        return Response(self.get_serializer(draft).data)

    @action(detail=True, methods=["post"])
    def abandon(self, request, draft_key=None):
        draft = self.get_object()
        before_data = snapshot_instance(draft)
        draft.status = FormDraft.Status.ABANDONED
        draft.save(update_fields=["status", "updated_at"])
        write_audit_log(
            request=request,
            action="abandon_draft",
            instance=draft,
            entity_type="form_draft",
            before_data=before_data,
            after_data=snapshot_instance(draft),
            details="Form draft abandoned.",
        )
        return Response(self.get_serializer(draft).data)


class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = AuditLog.objects.select_related("user")
    serializer_class = AuditLogSerializer


class ElevatedAccessRequestViewSet(viewsets.ModelViewSet):
    serializer_class = ElevatedAccessRequestSerializer
    search_fields = ("patient__full_name_display", "patient__patient_code", "requested_by__username")
    ordering_fields = ("created_at", "reviewed_at", "expires_at")

    def get_queryset(self):
        queryset = ElevatedAccessRequest.objects.select_related("patient", "requested_by", "reviewed_by")
        if is_clinical_user(self.request.user):
            return queryset
        return queryset.filter(requested_by=self.request.user)

    def perform_create(self, serializer):
        access_request = serializer.save(requested_by=self.request.user)
        write_audit_log(
            request=self.request,
            action="create",
            instance=access_request,
            entity_type="elevated_access_request",
            after_data=snapshot_instance(access_request),
            details="Elevated access request created.",
        )

    def update(self, request, *args, **kwargs):
        return Response({"detail": "Use approve or reject actions to review access requests."}, status=status.HTTP_405_METHOD_NOT_ALLOWED)

    def partial_update(self, request, *args, **kwargs):
        return Response({"detail": "Use approve or reject actions to review access requests."}, status=status.HTTP_405_METHOD_NOT_ALLOWED)

    @action(detail=True, methods=["post"])
    def approve(self, request, pk=None):
        if not is_clinical_user(request.user):
            return Response({"detail": "Only clinicians can approve elevated access."}, status=status.HTTP_403_FORBIDDEN)
        access_request = self.get_object()
        before_data = snapshot_instance(access_request)
        hours = int(request.data.get("hours") or 4)
        access_request.status = ElevatedAccessRequest.Status.APPROVED
        access_request.reviewed_by = request.user
        access_request.review_note = request.data.get("review_note", "")
        access_request.reviewed_at = timezone.now()
        access_request.expires_at = access_request.reviewed_at + timezone.timedelta(hours=hours)
        access_request.save(update_fields=["status", "reviewed_by", "review_note", "reviewed_at", "expires_at", "updated_at"])
        write_audit_log(
            request=request,
            action="approve",
            instance=access_request,
            entity_type="elevated_access_request",
            before_data=before_data,
            after_data=snapshot_instance(access_request),
            details="Elevated access request approved.",
        )
        return Response(self.get_serializer(access_request).data)

    @action(detail=True, methods=["post"])
    def reject(self, request, pk=None):
        if not is_clinical_user(request.user):
            return Response({"detail": "Only clinicians can reject elevated access."}, status=status.HTTP_403_FORBIDDEN)
        access_request = self.get_object()
        before_data = snapshot_instance(access_request)
        access_request.status = ElevatedAccessRequest.Status.REJECTED
        access_request.reviewed_by = request.user
        access_request.review_note = request.data.get("review_note", "")
        access_request.reviewed_at = timezone.now()
        access_request.expires_at = None
        access_request.save(update_fields=["status", "reviewed_by", "review_note", "reviewed_at", "expires_at", "updated_at"])
        write_audit_log(
            request=request,
            action="reject",
            instance=access_request,
            entity_type="elevated_access_request",
            before_data=before_data,
            after_data=snapshot_instance(access_request),
            details="Elevated access request rejected.",
        )
        return Response(self.get_serializer(access_request).data)


@api_view(["GET"])
def dashboard_stats(request):
    today = timezone.localdate()
    return Response(
        {
            "total_patients": Patient.objects.count(),
            "today_visits": Visit.objects.filter(created_at__date=today).count(),
            "pending_drafts": ElevatedAccessRequest.objects.filter(status=ElevatedAccessRequest.Status.PENDING).count(),
            "my_drafts": FormDraft.objects.filter(owner_user=request.user, status=FormDraft.Status.DRAFT).count(),
            "follow_ups_due": 0,
        }
    )


@api_view(["POST"])
@permission_classes([permissions.AllowAny])
def patient_import_webhook(request):
    secret = getattr(settings, "HARMONY_WEBHOOK_SECRET", "")
    provided_secret = request.headers.get("X-Harmony-Secret")
    if not secret or provided_secret != secret:
        return Response({"message": "Unauthorized"}, status=status.HTTP_401_UNAUTHORIZED)

    required = ("patient_code", "first_name", "last_name", "gender")
    missing = [field for field in required if not request.data.get(field)]
    if missing:
        return Response({"message": "Missing required fields", "fields": missing}, status=status.HTTP_400_BAD_REQUEST)

    with transaction.atomic():
        patient = Patient.objects.create(
            patient_code=request.data["patient_code"],
            national_id=request.data.get("national_id") or None,
            email=request.data.get("email", ""),
            first_name=request.data["first_name"],
            last_name=request.data["last_name"],
            primary_phone=request.data.get("phone", ""),
            next_of_kin_full_name=request.data.get("next_of_kin_full_name", ""),
            next_of_kin_phone=request.data.get("next_of_kin_phone", ""),
            next_of_kin_email=request.data.get("next_of_kin_email", ""),
            next_of_kin_relationship=request.data.get("next_of_kin_relationship", ""),
            next_of_kin_relationship_other=request.data.get("next_of_kin_relationship_other", ""),
            date_of_birth=request.data.get("date_of_birth") or None,
            gender=request.data.get("gender", "prefer_not_to_say"),
            town_or_locality=request.data.get("address", ""),
        )
        PatientProfile.objects.create(
            patient=patient,
            hiv_status=request.data.get("hiv_status", "undisclosed"),
            past_medical_history=request.data.get("medical_history", ""),
        )
        AuditLog.objects.create(
            entity_type="patient",
            entity_id=patient.id,
            action="import",
            change_summary={"source": "n8n", "patient_code": patient.patient_code},
            after_data=snapshot_instance(patient),
            details="Imported via n8n webhook",
            ip_address=request.META.get("REMOTE_ADDR"),
            user_agent=request.META.get("HTTP_USER_AGENT", ""),
        )
    return Response(
        {
            "message": "Patient imported successfully",
            "patient_id": patient.id,
            "patient_code": patient.patient_code,
        },
        status=status.HTTP_201_CREATED,
    )

# Create your views here.
