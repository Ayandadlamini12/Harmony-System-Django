from datetime import datetime, timedelta
import csv
import re
import uuid

from django.conf import settings
from django.contrib.auth import get_user_model
from django.db import transaction
from django.http import FileResponse, HttpResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.db.models import Count, Max, Q
from django.utils.dateparse import parse_date
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from accounts.models import AuthenticationEvent

from .access import has_patient_clinical_access, is_clinical_user
from .audit import snapshot_instance, write_audit_log
from .audit_policy import audit_category, entity_types_for_category, redact_sensitive_data
from .document_generation import consent_document_reference, generate_consent_pdf, render_consent_html, save_consent_pdf, sign_consent_document
from .models import (
    Appointment, AuditLog, Case, ElevatedAccessRequest, FormDraft, Message,
    MessageDelivery, MessageParticipant, MessageThread, PartnerCompany, Patient,
    PatientCheckIn, PatientDocument, PatientJourney, PatientJourneyEvent,
    PatientProfile, SupportTicket, Visit, Vital, VisitSymptomProblem,
    ZulipOutboundEvent, AppointmentType, ResourceRoom, PractitionerAvailability,
    BlockedSlot, SchedulingOutboxEvent
)
from .serializers import (
    AuditLogSerializer,
    AppointmentSerializer,
    CaseSerializer,
    ElevatedAccessRequestSerializer,
    FormDraftSerializer,
    MessageRecipientSerializer,
    MessageSerializer,
    MessageThreadSerializer,
    PatientCheckInSerializer,
    PatientDocumentSerializer,
    PatientJourneySerializer,
    PatientDetailSerializer,
    PatientListSerializer,
    SupportTicketSerializer,
    VisitSerializer,
    VitalSerializer,
    PartnerCompanySerializer,
    ZulipMessagesQuerySerializer,
    ZulipOutboundEventSerializer,
    ZulipPostUpdateSerializer,
    AppointmentTypeSerializer,
    ResourceRoomSerializer,
    PractitionerAvailabilitySerializer,
    BlockedSlotSerializer,
)
from .tasks import post_to_zulip_task
from .zulip import LINKED_TYPE_CHANNEL_DEFAULTS, build_topic, clean_clinical_payload, format_operational_message, user_can_access_channel

User = get_user_model()


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

    return Patient.objects.filter(query, is_deleted=False).order_by("-created_at").first()


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
    appointment = (
        Appointment.objects.filter(
            patient=check_in.patient,
            appointment_date=service_date,
            status__in=[Appointment.Status.BOOKED, Appointment.Status.CONFIRMED],
        )
        .order_by("appointment_time", "created_at")
        .first()
    )
    appointment_matched = appointment is not None
    flow_type = PatientJourney.FlowType.APPOINTMENT_CHECKIN if appointment_matched else PatientJourney.FlowType.WALK_IN_QUEUE
    current_stage = PatientJourney.Stage.CHECKED_IN if appointment_matched else PatientJourney.Stage.QUEUED
    queue_number = None if appointment_matched else next_queue_number(service_date)
    user = request.user if request and request.user.is_authenticated else None
    if appointment:
        appointment.status = Appointment.Status.CHECKED_IN
        appointment.checked_in_at = timezone.now()
        appointment.save(update_fields=["status", "checked_in_at", "updated_at"])

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
            appointment=appointment,
            created_by=user,
            updated_by=user,
            notes="Created from patient check-in.",
        )
        created = True
        # Auto-create a Visit for this check-in
        visit = Visit.objects.create(
            patient=check_in.patient,
            visit_type=check_in.visit_type,
            visit_date=service_date,
            practitioner=None,
        )
        journey.visit = visit
        journey.save(update_fields=["visit"])
    else:
        journey.check_in = check_in
        journey.appointment = appointment
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


def active_journey_for_today(patient):
    return (
        PatientJourney.objects.filter(
            patient=patient,
            service_date=timezone.localdate(),
            is_active=True,
        )
        .order_by("-created_at")
        .first()
    )


def check_in_response_payload(serializer, journey):
    response_data = serializer.data
    response_data["journey"] = PatientJourneySerializer(journey).data if journey else None
    response_data["appointment_matched"] = bool(journey and journey.appointment_matched)
    response_data["queue_number"] = journey.queue_number if journey else None
    response_data["flow_status"] = journey.current_stage if journey else ""
    response_data["flow_status_label"] = journey.get_current_stage_display() if journey else ""
    response_data["next_action"] = (
        "Record vitals, then wait for the clinician."
        if journey and not journey.appointment_matched
        else "Appointment checked in. Record vitals, then wait for the clinician."
    )
    return response_data


def default_clinician():
    clinician = User.objects.filter(is_active=True, role="clinician").order_by("id").first()
    if clinician:
        return clinician
    return User.objects.filter(is_active=True, role="admin").order_by("id").first()


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


def is_valid_uuid(val: str) -> bool:
    try:
        if not val:
            return False
        uuid.UUID(str(val))
        return True
    except ValueError:
        return False


def resolve_linked_entity_label(linked_entity_type: str, linked_entity_id: str) -> str:
    if linked_entity_type == ZulipOutboundEvent.LinkedType.PATIENT:
        if is_valid_uuid(linked_entity_id):
            patient = Patient.objects.filter(Q(public_id=linked_entity_id) | Q(patient_code=linked_entity_id)).first()
        else:
            patient = Patient.objects.filter(patient_code=linked_entity_id).first()
        return patient.patient_code if patient else linked_entity_id
    if linked_entity_type == ZulipOutboundEvent.LinkedType.APPOINTMENT:
        appointment = Appointment.objects.filter(pk=linked_entity_id).select_related("patient").first()
        return appointment.patient.patient_code if appointment and appointment.patient else linked_entity_id
    if linked_entity_type == ZulipOutboundEvent.LinkedType.CONSENT:
        document = PatientDocument.objects.filter(document_id=linked_entity_id).select_related("patient").first()
        return document.patient.patient_code if document and document.patient else linked_entity_id
    if linked_entity_type == ZulipOutboundEvent.LinkedType.TICKET:
        ticket = SupportTicket.objects.filter(pk=linked_entity_id).first()
        return f"TICKET-{ticket.pk}" if ticket else linked_entity_id
    if linked_entity_type == ZulipOutboundEvent.LinkedType.EMPLOYEE:
        user = User.objects.filter(pk=linked_entity_id).first()
        return user.username if user else linked_entity_id
    return linked_entity_id


def resolve_secure_link(linked_entity_type: str, linked_entity_id: str) -> str:
    public_base = getattr(settings, "HARMONY_PUBLIC_URL", "").rstrip("/")
    if not public_base:
        return ""
    if linked_entity_type == ZulipOutboundEvent.LinkedType.PATIENT:
        if is_valid_uuid(linked_entity_id):
            patient = Patient.objects.filter(Q(public_id=linked_entity_id) | Q(patient_code=linked_entity_id)).first()
        else:
            patient = Patient.objects.filter(patient_code=linked_entity_id).first()
        if patient:
            return f"{public_base}/patients/{patient.public_id}"
    if linked_entity_type == ZulipOutboundEvent.LinkedType.APPOINTMENT:
        return f"{public_base}/appointments"
    if linked_entity_type == ZulipOutboundEvent.LinkedType.CONSENT:
        return f"{public_base}/patients"
    if linked_entity_type == ZulipOutboundEvent.LinkedType.TICKET:
        return f"{public_base}/administration/support-tickets"
    if linked_entity_type == ZulipOutboundEvent.LinkedType.EMPLOYEE:
        return f"{public_base}/users"
    return ""


class PatientViewSet(viewsets.ModelViewSet):
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

    def get_queryset(self):
        qs = Patient.objects.select_related("profile").prefetch_related("conditions", "documents", "vitals", "visits__vitals")
        if self.request is None:
            return qs.filter(is_deleted=False)
        include_deleted = self.request.query_params.get("include_deleted") == "true"
        if include_deleted or self.action in ["restore", "deleted_list"]:
            return qs
        return qs.filter(is_deleted=False)

    def get_object(self):
        lookup_value = self.kwargs.get(self.lookup_field or "pk")
        if lookup_value:
            try:
                patient_uuid = uuid.UUID(str(lookup_value))
            except ValueError:
                patient_uuid = None
            if patient_uuid:
                queryset = self.filter_queryset(self.get_queryset())
                obj = get_object_or_404(queryset, public_id=patient_uuid)
                self.check_object_permissions(self.request, obj)
                return obj
        return super().get_object()

    def get_serializer_class(self):
        if self.action == "list":
            return PatientListSerializer
        return PatientDetailSerializer

    def retrieve(self, request, *args, **kwargs):
        patient = self.get_object()
        write_audit_log(
            request=request,
            action="view",
            instance=patient,
            details="Patient record viewed.",
        )
        serializer = self.get_serializer(patient)
        return Response(serializer.data)

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
        instance.is_deleted = True
        from django.utils import timezone
        instance.deleted_at = timezone.now()
        instance.save()
        write_audit_log(
            request=self.request,
            action="delete",
            entity_type="patient",
            entity_id=entity_id,
            before_data=before_data,
            after_data=snapshot_instance(instance),
            details="Patient record soft-deleted.",
        )

    @action(detail=True, methods=["post"], url_path="restore")
    def restore(self, request, pk=None):
        patient = self.get_object()
        patient.is_deleted = False
        patient.deleted_at = None
        patient.save()
        write_audit_log(
            request=self.request,
            action="update",
            instance=patient,
            after_data=snapshot_instance(patient),
            details="Patient record restored.",
        )
        return Response({"status": "success", "message": "Patient restored successfully."})

    @action(detail=False, methods=["get"], url_path="deleted")
    def deleted_list(self, request):
        queryset = Patient.objects.filter(is_deleted=True).select_related("profile").prefetch_related("conditions")
        queryset = self.filter_queryset(queryset)
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = PatientListSerializer(page, many=True, context={"request": request})
            return self.get_paginated_response(serializer.data)
        serializer = PatientListSerializer(queryset, many=True, context={"request": request})
        return Response(serializer.data)

    @action(detail=True, methods=["get", "post"])
    def visits(self, request, pk=None):
        patient = self.get_object()
        if not has_patient_clinical_access(request.user, patient.id):
            return Response(
                {"detail": "Clinical access requires clinician approval."},
                status=status.HTTP_403_FORBIDDEN,
            )
        if request.method == "GET":
            visits = patient.visits.prefetch_related("vitals")
            serializer = VisitSerializer(visits, many=True, context={"request": request})
            return Response(serializer.data)

        if not is_clinical_user(request.user):
            return Response({"detail": "Only clinical users can create visits."}, status=status.HTTP_403_FORBIDDEN)
        serializer = VisitSerializer(data={**request.data, "patient": patient.id}, context={"request": request})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["get"], url_path="documents")
    def documents(self, request, pk=None):
        patient = self.get_object()
        documents = patient.documents.all()
        serializer = PatientDocumentSerializer(documents, many=True, context={"request": request})
        return Response(serializer.data)

    @action(detail=True, methods=["post"], url_path="documents/consent")
    def generate_consent(self, request, pk=None):
        patient = self.get_object()
        existing_document = (
            patient.documents.filter(document_type=PatientDocument.DocumentType.CONSENT_FORM)
            .exclude(status=PatientDocument.Status.REJECTED)
            .exclude(file="")
            .order_by("-created_at")
            .first()
        )
        if existing_document:
            serializer = PatientDocumentSerializer(existing_document, context={"request": request})
            return Response(serializer.data, status=status.HTTP_200_OK)

        document = generate_consent_pdf(patient, request)
        audit_data = PatientDocumentSerializer(document, context={"request": request}).data
        write_audit_log(
            request=request,
            action="generate",
            instance=document,
            entity_type="patient_document",
            after_data=audit_data,
            details="Consent form generated.",
        )
        return Response(audit_data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=["get"], url_path="consent-forms")
    def consent_forms(self, request):
        renewal_days = getattr(settings, "CONSENT_RENEWAL_DAYS", 365)
        cutoff = timezone.now().date() - timedelta(days=renewal_days)
        pending = Patient.objects.filter(consent_status__in=("pending", "generated"), is_deleted=False).order_by("-created_at")
        needs_renewal = Patient.objects.filter(
            consent_status="signed",
            is_deleted=False,
            documents__document_type=PatientDocument.DocumentType.CONSENT_FORM,
            documents__status=PatientDocument.Status.SIGNED,
            documents__signed_at__date__lt=cutoff,
        ).distinct().order_by("-created_at")
        serializer = PatientListSerializer(list(pending) + list(needs_renewal), many=True, context={"request": request})
        return Response(serializer.data)

    @action(detail=False, methods=["post"], url_path="seed")
    def seed(self, request):
        try:
            from seed_patients import run_seeder
            run_seeder(delete_first=False)
            return Response({"status": "success", "message": "Demo patients seeded successfully without data loss."}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"status": "error", "message": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)



class PatientDocumentViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = PatientDocument.objects.select_related("patient", "generated_by", "verified_by")
    serializer_class = PatientDocumentSerializer
    filterset_fields = ("patient", "document_type", "status")
    search_fields = ("patient__full_name_display", "patient__patient_code", "title", "document_id")
    ordering_fields = ("created_at", "updated_at", "signed_at")

    @action(detail=True, methods=["get"])
    def download(self, request, pk=None):
        document = self.get_object()
        if document.document_type == PatientDocument.DocumentType.CONSENT_FORM:
            document = save_consent_pdf(document)
        if not document.file:
            return Response({"detail": "Document file is not available."}, status=status.HTTP_404_NOT_FOUND)
        filename = document.file.name.split("/")[-1]
        if document.document_type == PatientDocument.DocumentType.CONSENT_FORM:
            filename = f"{consent_document_reference(document.patient, document)}.pdf"
        response = FileResponse(document.file.open("rb"), as_attachment=False, filename=filename)
        response["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
        response["Pragma"] = "no-cache"
        return response

    @action(detail=True, methods=["get"])
    def preview(self, request, pk=None):
        document = self.get_object()
        if document.document_type != PatientDocument.DocumentType.CONSENT_FORM:
            return Response({"detail": "Preview is only available for consent forms."}, status=status.HTTP_400_BAD_REQUEST)
        response = HttpResponse(render_consent_html(document), content_type="text/html; charset=utf-8")
        response["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
        response["Pragma"] = "no-cache"
        return response

    @action(detail=True, methods=["post"])
    def sign(self, request, pk=None):
        document = self.get_object()
        if document.document_type != PatientDocument.DocumentType.CONSENT_FORM:
            return Response({"detail": "Only consent forms can be digitally signed here."}, status=status.HTTP_400_BAD_REQUEST)
        if document.status in {PatientDocument.Status.SIGNED, PatientDocument.Status.VERIFIED}:
            return Response({"detail": "This consent form has already been signed."}, status=status.HTTP_409_CONFLICT)
        signer_name = str(request.data.get("signer_name", "")).strip()
        signer_capacity = str(request.data.get("signer_capacity", "")).strip()
        signature_image = str(request.data.get("signature_image", "")).strip()
        acknowledgement = bool(request.data.get("acknowledgement"))
        if not signer_name:
            return Response({"detail": "Signer name is required."}, status=status.HTTP_400_BAD_REQUEST)
        if not signer_capacity:
            return Response({"detail": "Signer capacity is required."}, status=status.HTTP_400_BAD_REQUEST)
        if not signature_image.startswith("data:image/png;base64,"):
            return Response({"detail": "A handwritten signature is required."}, status=status.HTTP_400_BAD_REQUEST)
        if not acknowledgement:
            return Response({"detail": "Consent acknowledgement is required before signing."}, status=status.HTTP_400_BAD_REQUEST)

        before_data = PatientDocumentSerializer(document, context={"request": request}).data
        signed_document = sign_consent_document(
            document,
            signer_name=signer_name,
            signer_capacity=signer_capacity,
            signature_image=signature_image,
            request=request,
        )
        after_data = PatientDocumentSerializer(signed_document, context={"request": request}).data
        write_audit_log(
            request=request,
            action="sign",
            instance=signed_document,
            entity_type="patient_document",
            before_data=before_data,
            after_data=after_data,
            details="Consent form digitally signed.",
        )
        return Response(after_data)

    @action(detail=True, methods=["post"])
    def invalidate(self, request, pk=None):
        document = self.get_object()
        if document.document_type != PatientDocument.DocumentType.CONSENT_FORM:
            return Response({"detail": "Only consent forms can be invalidated."}, status=status.HTTP_400_BAD_REQUEST)
        if document.status == PatientDocument.Status.REJECTED:
            return Response({"detail": "Rejected documents cannot be invalidated."}, status=status.HTTP_400_BAD_REQUEST)

        before_data = PatientDocumentSerializer(document, context={"request": request}).data
        document.status = PatientDocument.Status.INVALIDATED
        document.save(update_fields=["status", "updated_at"])

        patient = document.patient
        from .workflow import consent_is_complete
        if not consent_is_complete(patient):
            patient.consent_status = Patient.ConsentStatus.PENDING
            patient.save(update_fields=["consent_status", "updated_at"])

        after_data = PatientDocumentSerializer(document, context={"request": request}).data
        write_audit_log(
            request=request,
            action="invalidate",
            instance=document,
            entity_type="patient_document",
            before_data=before_data,
            after_data=after_data,
            details="Consent form manually invalidated.",
        )
        return Response(after_data)


class VisitViewSet(viewsets.ModelViewSet):
    queryset = Visit.objects.select_related("patient").prefetch_related("vitals").order_by("-visit_date", "-created_at")
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

    def update(self, request, *args, **kwargs):
        if not is_clinical_user(request.user):
            return Response({"detail": "Only clinical users can edit visits."}, status=status.HTTP_403_FORBIDDEN)
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        if not is_clinical_user(request.user):
            return Response({"detail": "Only clinical users can edit visits."}, status=status.HTTP_403_FORBIDDEN)
        return super().partial_update(request, *args, **kwargs)

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

    @action(detail=True, methods=["post"], url_path=r"resolve-symptom/(?P<symptom_id>\d+)")
    def resolve_symptom(self, request, pk=None, symptom_id=None):
        visit = self.get_object()
        problem = get_object_or_404(VisitSymptomProblem, id=symptom_id, patient=visit.patient)
        problem.mark_resolved(visit=visit)
        
        # Log audit log
        write_audit_log(
            request=request,
            action="update",
            instance=problem,
            entity_type="visit_symptom_problem",
            details=f"Symptom problem resolved in visit {visit.id}.",
        )
        return Response({"status": "resolved", "symptom_id": problem.id})


class CaseViewSet(viewsets.ModelViewSet):
    queryset = Case.objects.select_related("patient", "visit", "parent_case", "practitioner").order_by("-created_at")
    serializer_class = CaseSerializer
    search_fields = ("title", "main_complaint", "diagnosis", "patient__full_name_display", "patient__patient_code")
    filterset_fields = ("patient", "visit", "status", "parent_case")

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

    def perform_create(self, serializer):
        case = serializer.save()
        write_audit_log(
            request=self.request,
            action="create",
            instance=case,
            entity_type="case",
            after_data=snapshot_instance(case),
            details="Case record created.",
        )

    def perform_update(self, serializer):
        before_data = snapshot_instance(self.get_object())
        case = serializer.save()
        write_audit_log(
            request=self.request,
            action="update",
            instance=case,
            entity_type="case",
            before_data=before_data,
            after_data=snapshot_instance(case),
            details="Case record updated.",
        )


    @action(detail=True, methods=["post"])
    def resolve(self, request, pk=None):
        case = self.get_object()
        root = case
        while root.parent_case:
            root = root.parent_case
        chain = [root]
        for follow_up in root.follow_ups.filter(status="open").order_by("created_at"):
            chain.append(follow_up)
        now = timezone.now()
        resolved_ids = []
        for c in chain:
            c.status = Case.Status.RESOLVED
            c.resolved_at = now
            c.save(update_fields=["status", "resolved_at", "updated_at"])
            resolved_ids.append(c.id)
        write_audit_log(
            request=request,
            action="resolve",
            instance=root,
            entity_type="case",
            details=f"Resolved case chain: {resolved_ids}",
        )
        return Response({"resolved_ids": resolved_ids})

class VitalViewSet(viewsets.ModelViewSet):
    queryset = Vital.objects.select_related("visit", "patient", "recorded_by").order_by("-recorded_at", "-created_at")
    serializer_class = VitalSerializer
    search_fields = (
        "patient__full_name_display", "patient__patient_code",
        "visit__patient__full_name_display", "visit__patient__patient_code"
    )
    filterset_fields = ("visit", "patient", "visit__patient", "glucose_context", "medication_taken_status")
    ordering_fields = ("recorded_at", "created_at")

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
            return Response({"detail": "Only clinical users can record vitals."}, status=status.HTTP_403_FORBIDDEN)
        return super().create(request, *args, **kwargs)

    def perform_create(self, serializer):
        vital = serializer.save()
        patient = vital.patient or (vital.visit.patient if vital.visit else None)
        journey = None
        if patient:
            journey = transition_active_patient_journey(
                patient,
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
                "current_journey": PatientJourneySerializer(active_journey_for_today(patient)).data if active_journey_for_today(patient) else None,
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
        else:
            patient = get_object_or_404(Patient, pk=data.get("patient"))

        existing_journey = active_journey_for_today(patient)
        if existing_journey:
            return Response(
                {
                    "detail": "This patient already has an active visit flow today. Activations reset at 00:00.",
                    "journey": PatientJourneySerializer(existing_journey).data,
                    "appointment_matched": existing_journey.appointment_matched,
                    "queue_number": existing_journey.queue_number,
                    "flow_status": existing_journey.current_stage,
                    "flow_status_label": existing_journey.get_current_stage_display(),
                },
                status=status.HTTP_409_CONFLICT,
            )
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        journey = self.perform_create(serializer)
        return Response(check_in_response_payload(serializer, journey), status=status.HTTP_201_CREATED)

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
        return journey

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


from rest_framework.exceptions import APIException

class SchedulingConflictException(APIException):
    status_code = status.HTTP_409_CONFLICT
    default_detail = "A scheduling conflict was detected."
    default_code = "resource_conflict"

    def __init__(self, detail=None, conflicts=None):
        super().__init__(detail)
        self.detail = {
            "code": self.default_code,
            "detail": detail or self.default_detail,
            "conflicts": conflicts or []
        }


def check_scheduling_conflicts(appointment_id, start_at, end_at, practitioner_id, room_id, appointment_type=None):
    conflicts = []
    if not start_at or not end_at:
        return conflicts

    # 1. Blocked slot check
    blocked_qs = BlockedSlot.objects.filter(start_at__lt=end_at, end_at__gt=start_at)
    
    clinic_blocked = blocked_qs.filter(scope_type=BlockedSlot.ScopeType.CLINIC)
    for cb in clinic_blocked:
        conflicts.append({
            "type": "clinic_blocked",
            "detail": f"Clinic is blocked: {cb.reason or 'No reason provided'}.",
            "resource_id": None
        })
        
    if practitioner_id:
        practitioner_blocked = blocked_qs.filter(
            scope_type=BlockedSlot.ScopeType.PRACTITIONER,
            scope_id=str(practitioner_id)
        )
        for pb in practitioner_blocked:
            conflicts.append({
                "type": "practitioner_blocked",
                "detail": f"Practitioner is blocked during this time: {pb.reason or 'No reason provided'}.",
                "resource_id": practitioner_id
            })
            
    if room_id:
        room_blocked = blocked_qs.filter(
            scope_type=BlockedSlot.ScopeType.ROOM,
            scope_id=str(room_id)
        )
        for rb in room_blocked:
            conflicts.append({
                "type": "room_blocked",
                "detail": f"Room is blocked during this time: {rb.reason or 'No reason provided'}.",
                "resource_id": room_id
            })

    # 2. Practitioner Availability check
    if practitioner_id:
        local_start = timezone.localtime(start_at)
        weekday = local_start.weekday()
        date = local_start.date()
        time_start = local_start.time()
        time_end = timezone.localtime(end_at).time()
        
        avail_qs = PractitionerAvailability.objects.filter(
            practitioner_id=practitioner_id,
            weekday=weekday,
            effective_from__lte=date
        ).filter(
            Q(effective_to__isnull=True) | Q(effective_to__gte=date)
        )
        
        if avail_qs.exists():
            fits = False
            for av in avail_qs:
                if av.start_time <= time_start and av.end_time >= time_end:
                    fits = True
                    break
            if not fits:
                conflicts.append({
                    "type": "practitioner_unavailability",
                    "detail": f"Appointment time {time_start.strftime('%H:%M')}-{time_end.strftime('%H:%M')} is outside the practitioner's configured availability.",
                    "resource_id": practitioner_id
                })
        else:
            conflicts.append({
                "type": "practitioner_unavailability",
                "detail": "Practitioner has no configured availability on this day.",
                "resource_id": practitioner_id
            })

    # 3. Overlap check with other appointments
    appt_qs = Appointment.objects.exclude(
        status__in=[Appointment.Status.CANCELLED, Appointment.Status.NO_SHOW, Appointment.Status.DRAFT]
    )
    if appointment_id:
        appt_qs = appt_qs.exclude(id=appointment_id)
        
    overlap_qs = appt_qs.filter(start_at__lt=end_at, end_at__gt=start_at)
    
    if practitioner_id:
        prac_overlaps = overlap_qs.filter(practitioner_id=practitioner_id)
        for po in prac_overlaps:
            conflicts.append({
                "type": "practitioner_collision",
                "detail": f"Practitioner is already booked for patient {po.patient.full_name_display} ({timezone.localtime(po.start_at).strftime('%H:%M')}-{timezone.localtime(po.end_at).strftime('%H:%M')}).",
                "resource_id": practitioner_id
            })
            
    if room_id:
        room_overlaps = overlap_qs.filter(room_id=room_id)
        for ro in room_overlaps:
            conflicts.append({
                "type": "room_collision",
                "detail": f"Room is already booked for patient {ro.patient.full_name_display} ({timezone.localtime(ro.start_at).strftime('%H:%M')}-{timezone.localtime(ro.end_at).strftime('%H:%M')}).",
                "resource_id": room_id
            })
            
    return conflicts


def emit_outbox_event(event_type, appointment, request_user=None):
    from .serializers import AppointmentSerializer
    serializer = AppointmentSerializer(appointment)
    payload = serializer.data
    
    safe_payload = payload.copy()
    if "patient_phone" in safe_payload:
        safe_payload["patient_phone"] = "CLASSIFIED"
        
    SchedulingOutboxEvent.objects.create(
        event_type=event_type,
        aggregate_type="appointment",
        aggregate_id=str(appointment.id),
        payload_json=payload,
        safe_payload_json=safe_payload,
        status=SchedulingOutboxEvent.Status.PENDING,
    )


def parse_iso_datetime_param(value, label):
    if not value:
        return None, None
    try:
        parsed = timezone.datetime.fromisoformat(value.replace("Z", "+00:00"))
        if timezone.is_naive(parsed):
            parsed = timezone.make_aware(parsed)
        return parsed, None
    except ValueError:
        return None, f"Invalid {label} ISO format."


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def board_view(request):
    date_str = request.query_params.get("date")
    view_by = request.query_params.get("view_by", "practitioners")
    
    if date_str:
        try:
            date_val = timezone.datetime.strptime(date_str, "%Y-%m-%d").date()
        except ValueError:
            return Response({"detail": "Invalid date format. Use YYYY-MM-DD."}, status=status.HTTP_400_BAD_REQUEST)
    else:
        date_val = timezone.localdate()
        
    columns = []
    if view_by == "rooms":
        rooms = ResourceRoom.objects.filter(is_active=True)
        for room in rooms:
            columns.append({
                "id": room.id,
                "name": room.name,
                "location": room.location,
                "capacity": room.capacity,
                "resource_type": room.resource_type,
            })
    else:
        practitioners = User.objects.filter(role=User.Role.CLINICIAN, is_active=True)
        weekday = date_val.weekday()
        availabilities = PractitionerAvailability.objects.filter(
            weekday=weekday,
            effective_from__lte=date_val
        ).filter(
            Q(effective_to__isnull=True) | Q(effective_to__gte=date_val)
        ).select_related("practitioner")
        
        avail_by_prac = {}
        for av in availabilities:
            avail_by_prac.setdefault(av.practitioner_id, []).append(
                PractitionerAvailabilitySerializer(av).data
            )
            
        for prac in practitioners:
            columns.append({
                "id": prac.id,
                "name": prac.get_full_name() or prac.username,
                "role": prac.role,
                "availabilities": avail_by_prac.get(prac.id, [])
            })
            
    start_dt = timezone.make_aware(timezone.datetime.combine(date_val, timezone.datetime.min.time()))
    end_dt = timezone.make_aware(timezone.datetime.combine(date_val, timezone.datetime.max.time()))
    
    appts = Appointment.objects.filter(
        Q(start_at__range=(start_dt, end_dt)) | Q(appointment_date=date_val)
    ).select_related("patient", "practitioner", "room", "appointment_type").order_by("start_at", "created_at")
    
    journeys = {j.patient_id: j for j in PatientJourney.objects.filter(service_date=date_val, is_active=True)}
    
    serialized_appts = []
    for appt in appts:
        data = AppointmentSerializer(appt).data
        journey = journeys.get(appt.patient_id)
        data["flow_state"] = journey.current_stage if journey else None
        data["consent_status"] = appt.patient.consent_status
        data["consent_completed"] = appt.patient.consent_status in ["signed", "verified"]
        serialized_appts.append(data)
        
    return Response({
        "date": date_val.strftime("%Y-%m-%d"),
        "view_by": view_by,
        "columns": columns,
        "appointments": serialized_appts
    })


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def range_appointments_view(request):
    start_str = request.query_params.get("start_at")
    end_str = request.query_params.get("end_at")
    practitioner_id = request.query_params.get("practitioner")
    room_id = request.query_params.get("room")
    patient_id = request.query_params.get("patient")
    
    qs = Appointment.objects.all().select_related("patient", "practitioner", "room", "appointment_type").order_by("start_at", "created_at")
    start_dt = None
    end_dt = None
    
    if start_str:
        start_dt, error = parse_iso_datetime_param(start_str, "start_at")
        if error:
            return Response({"detail": error}, status=status.HTTP_400_BAD_REQUEST)
            
    if end_str:
        end_dt, error = parse_iso_datetime_param(end_str, "end_at")
        if error:
            return Response({"detail": error}, status=status.HTTP_400_BAD_REQUEST)

    if start_dt and end_dt and start_dt >= end_dt:
        return Response({"detail": "start_at must be before end_at."}, status=status.HTTP_400_BAD_REQUEST)

    if start_dt and end_dt:
        qs = qs.filter(start_at__lt=end_dt, end_at__gt=start_dt)
    elif start_dt:
        qs = qs.filter(end_at__gt=start_dt)
    elif end_dt:
        qs = qs.filter(start_at__lt=end_dt)
            
    if practitioner_id:
        qs = qs.filter(practitioner_id=practitioner_id)
    if room_id:
        qs = qs.filter(room_id=room_id)
    if patient_id:
        qs = qs.filter(patient_id=patient_id)
        
    appointments = list(qs)
    journey_dates = set()
    for appointment in appointments:
        if appointment.start_at:
            journey_dates.add(timezone.localtime(appointment.start_at).date())
        elif appointment.appointment_date:
            journey_dates.add(appointment.appointment_date)

    journeys = {
        (journey.patient_id, journey.service_date): journey
        for journey in PatientJourney.objects.filter(service_date__in=journey_dates, is_active=True)
    }

    serialized_appts = []
    for appointment in appointments:
        data = AppointmentSerializer(appointment).data
        service_date = timezone.localtime(appointment.start_at).date() if appointment.start_at else appointment.appointment_date
        journey = journeys.get((appointment.patient_id, service_date))
        data["flow_state"] = journey.current_stage if journey else None
        data["consent_status"] = appointment.patient.consent_status
        data["consent_completed"] = appointment.patient.consent_status in ["signed", "verified"]
        serialized_appts.append(data)

    return Response({
        "start_at": start_dt.isoformat() if start_dt else None,
        "end_at": end_dt.isoformat() if end_dt else None,
        "appointments": serialized_appts,
    })


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def resources_metadata_view(request):
    rooms = ResourceRoomSerializer(ResourceRoom.objects.filter(is_active=True), many=True).data
    types = AppointmentTypeSerializer(AppointmentType.objects.filter(is_active=True), many=True).data
    practitioners = []
    users = User.objects.filter(role=User.Role.CLINICIAN, is_active=True)
    for u in users:
        practitioners.append({
            "id": u.id,
            "name": u.get_full_name() or u.username,
            "role": u.role,
        })
    return Response({
        "rooms": rooms,
        "appointment_types": types,
        "practitioners": practitioners
    })


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def capabilities_view(request):
    user = request.user
    is_staff_role = user.role in [User.Role.ADMIN, User.Role.CLINICIAN, User.Role.RECEPTIONIST]
    capabilities = {
        "can_create_appointment": is_staff_role,
        "can_move_appointment": is_staff_role,
        "can_check_in": is_staff_role,
        "can_cancel_appointment": is_staff_role,
        "can_assign_room": is_staff_role,
        "can_create_follow_up": is_staff_role,
    }
    return Response(capabilities)


class PractitionerAvailabilityPermission(permissions.BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.method in permissions.SAFE_METHODS:
            return request.user.role in [User.Role.ADMIN, User.Role.CLINICIAN]
        return request.user.role == User.Role.ADMIN


class PractitionerAvailabilityViewSet(viewsets.ModelViewSet):
    serializer_class = PractitionerAvailabilitySerializer
    permission_classes = [PractitionerAvailabilityPermission]
    ordering_fields = ("weekday", "start_time", "effective_from", "effective_to", "practitioner")
    filterset_fields = ("practitioner", "weekday")

    def get_queryset(self):
        queryset = PractitionerAvailability.objects.select_related("practitioner").order_by(
            "practitioner__first_name",
            "practitioner__last_name",
            "weekday",
            "start_time",
        )
        user = self.request.user
        if user.role == User.Role.CLINICIAN:
            return queryset.filter(practitioner=user)

        practitioner_id = self.request.query_params.get("practitioner")
        weekday = self.request.query_params.get("weekday")
        if practitioner_id:
            queryset = queryset.filter(practitioner_id=practitioner_id)
        if weekday not in (None, ""):
            queryset = queryset.filter(weekday=weekday)
        return queryset

    def perform_create(self, serializer):
        availability = serializer.save()
        write_audit_log(
            request=self.request,
            action="create",
            instance=availability,
            entity_type="practitioner_availability",
            after_data=snapshot_instance(availability),
            details="Practitioner availability range created.",
        )

    def perform_update(self, serializer):
        instance = self.get_object()
        before_data = snapshot_instance(instance)
        availability = serializer.save()
        write_audit_log(
            request=self.request,
            action="update",
            instance=availability,
            entity_type="practitioner_availability",
            before_data=before_data,
            after_data=snapshot_instance(availability),
            details="Practitioner availability range updated.",
        )

    def perform_destroy(self, instance):
        before_data = snapshot_instance(instance)
        write_audit_log(
            request=self.request,
            action="delete",
            instance=instance,
            entity_type="practitioner_availability",
            before_data=before_data,
            details="Practitioner availability range deleted.",
        )
        instance.delete()


class AppointmentViewSet(viewsets.ModelViewSet):
    queryset = Appointment.objects.select_related("patient", "practitioner", "room", "appointment_type", "created_by").order_by("start_at", "created_at")
    serializer_class = AppointmentSerializer
    search_fields = ("patient__full_name_display", "patient__patient_code", "patient__national_id", "patient__primary_phone", "notes")
    filterset_fields = ("appointment_date", "appointment_type", "source", "status", "practitioner")
    ordering_fields = ("start_at", "end_at", "created_at", "updated_at")
    cancellation_cutoff = timedelta(minutes=15)
    history_statuses = (
        Appointment.Status.CANCELLED,
        Appointment.Status.NO_SHOW,
        Appointment.Status.COMPLETED,
    )

    def perform_create(self, serializer):
        start_at = serializer.validated_data.get("start_at")
        end_at = serializer.validated_data.get("end_at")
        practitioner = serializer.validated_data.get("practitioner") or default_clinician()
        room = serializer.validated_data.get("room")
        
        with transaction.atomic():
            if start_at and end_at:
                list(Appointment.objects.select_for_update().filter(start_at__lt=end_at, end_at__gt=start_at))
                
            conflicts = check_scheduling_conflicts(None, start_at, end_at, practitioner.id if practitioner else None, room.id if room else None)
            if conflicts:
                raise SchedulingConflictException(conflicts=conflicts)
                
            appointment = serializer.save(
                practitioner=practitioner,
                created_by=self.request.user if self.request.user.is_authenticated else None,
            )
            write_audit_log(
                request=self.request,
                action="create",
                instance=appointment,
                entity_type="appointment",
                after_data=snapshot_instance(appointment),
                details="Appointment booked.",
            )
            emit_outbox_event("appointment.created", appointment, self.request.user)

    def perform_update(self, serializer):
        instance = self.get_object()
        before_data = snapshot_instance(instance)
        
        start_at = serializer.validated_data.get("start_at", instance.start_at)
        end_at = serializer.validated_data.get("end_at", instance.end_at)
        practitioner = serializer.validated_data.get("practitioner", instance.practitioner)
        room = serializer.validated_data.get("room", instance.room)
        
        with transaction.atomic():
            if start_at and end_at:
                list(Appointment.objects.select_for_update().filter(start_at__lt=end_at, end_at__gt=start_at))
                
            if (start_at != instance.start_at or end_at != instance.end_at or 
                practitioner != instance.practitioner or room != instance.room):
                conflicts = check_scheduling_conflicts(
                    instance.id, start_at, end_at, 
                    practitioner.id if practitioner else None, 
                    room.id if room else None
                )
                if conflicts:
                    raise SchedulingConflictException(conflicts=conflicts)
                    
            appointment = serializer.save(
                updated_by=self.request.user if self.request.user.is_authenticated else None,
            )
            write_audit_log(
                request=self.request,
                action="update",
                instance=appointment,
                entity_type="appointment",
                before_data=before_data,
                after_data=snapshot_instance(appointment),
                details="Appointment updated.",
            )
            emit_outbox_event("appointment.updated", appointment, self.request.user)

    def perform_destroy(self, instance):
        before_data = snapshot_instance(instance)
        entity_id = instance.pk
        instance.delete()
        write_audit_log(
            request=self.request,
            action="delete",
            entity_type="appointment",
            entity_id=entity_id,
            before_data=before_data,
            details="Appointment deleted.",
        )

    @action(detail=True, methods=["post"])
    def move(self, request, pk=None):
        appointment = self.get_object()
        before_data = snapshot_instance(appointment)
        
        start_at_str = request.data.get("start_at")
        end_at_str = request.data.get("end_at")
        practitioner_id = request.data.get("practitioner", appointment.practitioner_id)
        room_id = request.data.get("room", appointment.room_id)
        
        if not start_at_str or not end_at_str:
            return Response({"detail": "Both start_at and end_at must be provided."}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            start_at = timezone.datetime.fromisoformat(start_at_str.replace("Z", "+00:00"))
            end_at = timezone.datetime.fromisoformat(end_at_str.replace("Z", "+00:00"))
        except ValueError:
            return Response({"detail": "Invalid start_at or end_at format. Use ISO format."}, status=status.HTTP_400_BAD_REQUEST)
            
        if start_at >= end_at:
            return Response({"detail": "End time must be strictly after start time."}, status=status.HTTP_400_BAD_REQUEST)
            
        with transaction.atomic():
            list(Appointment.objects.select_for_update().filter(start_at__lt=end_at, end_at__gt=start_at))
            
            conflicts = check_scheduling_conflicts(
                appointment.id, start_at, end_at, practitioner_id, room_id
            )
            if conflicts:
                raise SchedulingConflictException(conflicts=conflicts)
                
            appointment.start_at = start_at
            appointment.end_at = end_at
            appointment.practitioner_id = practitioner_id
            appointment.room_id = room_id
            appointment.updated_by = request.user if request.user.is_authenticated else None
            appointment.save()
            
            write_audit_log(
                request=request,
                action="update",
                instance=appointment,
                entity_type="appointment",
                before_data=before_data,
                after_data=snapshot_instance(appointment),
                details="Appointment rescheduled/moved.",
            )
            emit_outbox_event("appointment.moved", appointment, request.user)
            
        return Response(AppointmentSerializer(appointment).data)

    @action(detail=True, methods=["post"], url_path="check-in")
    def check_in(self, request, pk=None):
        appointment = self.get_object()
        if appointment.status == Appointment.Status.CHECKED_IN:
            return Response({"detail": "Appointment is already checked in."}, status=status.HTTP_400_BAD_REQUEST)
            
        before_data = snapshot_instance(appointment)
        
        with transaction.atomic():
            appointment.status = Appointment.Status.CHECKED_IN
            appointment.checked_in_at = timezone.now()
            appointment.save(update_fields=["status", "checked_in_at", "updated_at"])
            
            check_in = PatientCheckIn.objects.create(
                patient=appointment.patient,
                visit_type=PatientCheckIn.VisitType.CLINICAL,
                method=PatientCheckIn.Method.RECEPTION,
                status=PatientCheckIn.Status.ARRIVED,
                checked_in_by=request.user if request.user.is_authenticated else None,
            )
            
            journey, created = PatientJourney.objects.get_or_create(
                patient=appointment.patient,
                service_date=timezone.localdate(),
                is_active=True,
                defaults={
                    "current_stage": PatientJourney.Stage.CHECKED_IN,
                    "flow_type": PatientJourney.FlowType.APPOINTMENT_CHECKIN,
                    "appointment": appointment,
                    "check_in": check_in,
                    "created_by": request.user if request.user.is_authenticated else None,
                    "updated_by": request.user if request.user.is_authenticated else None,
                }
            )
            if created:
                create_journey_event(journey, PatientJourney.Stage.CHECKED_IN, request, "Patient checked in via appointment operational action.")
                
            write_audit_log(
                request=request,
                action="update",
                instance=appointment,
                entity_type="appointment",
                before_data=before_data,
                after_data=snapshot_instance(appointment),
                details="Appointment checked in, daily visit flow started.",
            )
            emit_outbox_event("appointment.checked_in", appointment, request.user)
            
        return Response({
            "appointment": AppointmentSerializer(appointment).data,
            "journey": PatientJourneySerializer(journey).data
        })

    @action(detail=True, methods=["post"])
    def cancel(self, request, pk=None):
        appointment = self.get_object()
        cancel_reason = (request.data.get("cancel_reason") or "").strip()
        if not cancel_reason:
            return Response({"detail": "A cancel reason must be provided."}, status=status.HTTP_400_BAD_REQUEST)
        if appointment.status in self.history_statuses:
            return Response({"detail": "This appointment is already in a terminal state and cannot be cancelled."}, status=status.HTTP_400_BAD_REQUEST)
        if not appointment.start_at:
            return Response({"detail": "Appointment start time is required before cancellation."}, status=status.HTTP_400_BAD_REQUEST)
        if appointment.start_at <= timezone.now() + self.cancellation_cutoff:
            return Response(
                {"detail": "Appointments can only be cancelled more than 15 minutes before the scheduled start time."},
                status=status.HTTP_400_BAD_REQUEST,
            )
            
        before_data = snapshot_instance(appointment)
        
        with transaction.atomic():
            appointment.status = Appointment.Status.CANCELLED
            appointment.cancel_reason = cancel_reason
            appointment.updated_by = request.user if request.user.is_authenticated else None
            appointment.save(update_fields=["status", "cancel_reason", "updated_by", "updated_at"])
            
            write_audit_log(
                request=request,
                action="update",
                instance=appointment,
                entity_type="appointment",
                before_data=before_data,
                after_data=snapshot_instance(appointment),
                details=f"Appointment cancelled. Reason: {cancel_reason}",
            )
            emit_outbox_event("appointment.cancelled", appointment, request.user)
        
        return Response(AppointmentSerializer(appointment).data)

    @action(detail=False, methods=["get"], url_path="history")
    def history(self, request):
        status_filter = request.query_params.get("status")
        start_str = request.query_params.get("start_at")
        end_str = request.query_params.get("end_at")
        practitioner_id = request.query_params.get("practitioner")
        patient_id = request.query_params.get("patient")

        queryset = self.get_queryset().filter(status__in=self.history_statuses)

        if status_filter:
            if status_filter not in self.history_statuses:
                return Response(
                    {"detail": "status must be one of: cancelled, no_show, completed."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            queryset = queryset.filter(status=status_filter)

        start_dt, error = parse_iso_datetime_param(start_str, "start_at")
        if error:
            return Response({"detail": error}, status=status.HTTP_400_BAD_REQUEST)
        end_dt, error = parse_iso_datetime_param(end_str, "end_at")
        if error:
            return Response({"detail": error}, status=status.HTTP_400_BAD_REQUEST)
        if start_dt and end_dt and start_dt >= end_dt:
            return Response({"detail": "start_at must be before end_at."}, status=status.HTTP_400_BAD_REQUEST)
        if start_dt and end_dt:
            queryset = queryset.filter(start_at__lt=end_dt, end_at__gt=start_dt)
        elif start_dt:
            queryset = queryset.filter(end_at__gt=start_dt)
        elif end_dt:
            queryset = queryset.filter(start_at__lt=end_dt)

        if practitioner_id:
            queryset = queryset.filter(practitioner_id=practitioner_id)
        if patient_id:
            queryset = queryset.filter(patient_id=patient_id)

        queryset = queryset.order_by("-start_at", "-updated_at")
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["post"], url_path="assign-room")
    def assign_room(self, request, pk=None):
        appointment = self.get_object()
        room_id = request.data.get("room")
        
        before_data = snapshot_instance(appointment)
        
        with transaction.atomic():
            if room_id:
                if appointment.start_at and appointment.end_at:
                    list(Appointment.objects.select_for_update().filter(start_at__lt=appointment.end_at, end_at__gt=appointment.start_at))
                    
                conflicts = check_scheduling_conflicts(
                    appointment.id, appointment.start_at, appointment.end_at, 
                    appointment.practitioner_id, room_id
                )
                if conflicts:
                    raise SchedulingConflictException(conflicts=conflicts)
                    
            appointment.room_id = room_id
            appointment.updated_by = request.user if request.user.is_authenticated else None
            appointment.save(update_fields=["room", "updated_by", "updated_at"])
            
            write_audit_log(
                request=request,
                action="update",
                instance=appointment,
                entity_type="appointment",
                before_data=before_data,
                after_data=snapshot_instance(appointment),
                details="Resource room assigned to appointment.",
            )
            emit_outbox_event("appointment.room_assigned", appointment, request.user)
            
        return Response(AppointmentSerializer(appointment).data)

    @action(detail=True, methods=["post"], url_path="create-follow-up")
    def create_follow_up(self, request, pk=None):
        parent_appointment = self.get_object()
        
        start_at_str = request.data.get("start_at")
        end_at_str = request.data.get("end_at")
        appointment_type_id = request.data.get("appointment_type")
        practitioner_id = request.data.get("practitioner", parent_appointment.practitioner_id)
        room_id = request.data.get("room")
        priority = request.data.get("priority", Appointment.Priority.MEDIUM)
        notes = request.data.get("notes", "")
        
        if not start_at_str or not end_at_str or not appointment_type_id:
            return Response({"detail": "start_at, end_at, and appointment_type must be provided."}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            start_at = timezone.datetime.fromisoformat(start_at_str.replace("Z", "+00:00"))
            end_at = timezone.datetime.fromisoformat(end_at_str.replace("Z", "+00:00"))
        except ValueError:
            return Response({"detail": "Invalid start_at or end_at format. Use ISO format."}, status=status.HTTP_400_BAD_REQUEST)
            
        if start_at >= end_at:
            return Response({"detail": "End time must be strictly after start time."}, status=status.HTTP_400_BAD_REQUEST)
            
        with transaction.atomic():
            list(Appointment.objects.select_for_update().filter(start_at__lt=end_at, end_at__gt=start_at))
            
            conflicts = check_scheduling_conflicts(
                None, start_at, end_at, practitioner_id, room_id
            )
            if conflicts:
                raise SchedulingConflictException(conflicts=conflicts)
                
            follow_up = Appointment.objects.create(
                patient=parent_appointment.patient,
                appointment_type_id=appointment_type_id,
                start_at=start_at,
                end_at=end_at,
                practitioner_id=practitioner_id,
                room_id=room_id,
                priority=priority,
                notes=notes,
                rescheduled_from=parent_appointment,
                status=Appointment.Status.BOOKED,
                created_by=request.user if request.user.is_authenticated else None,
            )
            
            write_audit_log(
                request=request,
                action="create",
                instance=follow_up,
                entity_type="appointment",
                after_data=snapshot_instance(follow_up),
                details=f"Follow-up appointment created from parent appointment {parent_appointment.id}.",
            )
            emit_outbox_event("appointment.created", follow_up, request.user)
            
        return Response(AppointmentSerializer(follow_up).data, status=status.HTTP_201_CREATED)


class PatientJourneyViewSet(viewsets.ModelViewSet):
    queryset = PatientJourney.objects.select_related("patient", "check_in", "appointment", "visit").prefetch_related("events").order_by("-service_date", "queue_number", "created_at")
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
            PatientJourney.objects.select_related("patient", "check_in", "appointment", "visit")
            .prefetch_related("events")
            .filter(patient=patient, is_active=True)
            .order_by("-service_date", "-created_at")
            .first()
        )
        history = (
            PatientJourney.objects.select_related("patient", "check_in", "appointment", "visit")
            .prefetch_related("events")
            .filter(patient=patient)
            .order_by("-service_date", "-created_at")[:5]
        )
        return Response(
            {
                "patient": {
                    "id": patient.id,
                    "public_id": patient.public_id,
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


def create_internal_deliveries(message):
    now = timezone.now()
    deliveries = []
    for participant in message.thread.participants.select_related("user").exclude(user=message.sender):
        deliveries.append(
            MessageDelivery(
                message=message,
                channel=Message.Channel.INTERNAL,
                status=MessageDelivery.Status.DELIVERED,
                recipient_user=participant.user,
                delivered_at=now,
            )
        )
    if deliveries:
        MessageDelivery.objects.bulk_create(deliveries)


def _workspace_label_for_role(role):
    return {
        "admin": "System Admin",
        "clinician": "Clinician Workspace",
        "receptionist": "Reception Desk",
        "supplier_contact": "Supplier Portal",
        "supplier_manager": "Supplier Management",
        "partner_contact": "Partner Portal",
        "partner_manager": "Partner Management",
    }.get(role or "", "Harmony Workspace")


def _safe_user_label(user):
    if not user:
        return "System"
    return user.get_full_name() or user.username or user.email or f"User {user.pk}"


def _active_queue_stages():
    return [
        PatientJourney.Stage.QUEUED,
        PatientJourney.Stage.CHECKED_IN,
        PatientJourney.Stage.VITALS_RECORDED,
        PatientJourney.Stage.WAITING_CLINICIAN,
        PatientJourney.Stage.IN_CONSULTATION,
    ]


def _appointment_time_label(appointment):
    if not appointment or not appointment.start_at:
        return None
    return timezone.localtime(appointment.start_at).strftime("%H:%M")


def _journey_visit_type(journey):
    if journey.check_in_id and journey.check_in:
        return journey.check_in.visit_type
    if journey.visit_id and journey.visit:
        return journey.visit.visit_type
    if journey.appointment_id and journey.appointment and journey.appointment.appointment_type_id:
        return journey.appointment.appointment_type.name
    return ""


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def navigation_summary(request):
    user = request.user
    role = getattr(user, "role", "")
    today = timezone.localdate()
    now = timezone.now()
    day_start = timezone.make_aware(datetime.combine(today, datetime.min.time()))
    day_end = day_start + timedelta(days=1)
    alert_since = now - timedelta(hours=24)

    waiting_queue = PatientJourney.objects.filter(
        service_date=today,
        is_active=True,
        current_stage__in=_active_queue_stages(),
    ).count()

    appointment_statuses = [
        Appointment.Status.BOOKED,
        Appointment.Status.CONFIRMED,
        Appointment.Status.CHECKED_IN,
        Appointment.Status.IN_QUEUE,
        Appointment.Status.IN_VISIT,
    ]
    appointments_qs = Appointment.objects.filter(
        start_at__gte=day_start,
        start_at__lt=day_end,
        status__in=appointment_statuses,
    )
    if role == "clinician":
        appointments_qs = appointments_qs.filter(practitioner=user)
    appointments_today = appointments_qs.count()

    unread_deliveries = MessageDelivery.objects.filter(
        recipient_user=user,
        channel=Message.Channel.INTERNAL,
        read_at__isnull=True,
    ).exclude(status__in=[MessageDelivery.Status.READ, MessageDelivery.Status.SKIPPED])
    inbox_unread = unread_deliveries.count()

    mention_query = Q(message__body__icontains=f"@{user.username}")
    if user.email:
        mention_query |= Q(message__body__icontains=f"@{user.email}")
    full_name = (user.get_full_name() or "").strip()
    if full_name:
        mention_query |= Q(message__body__icontains=f"@{full_name}")
    mentions = unread_deliveries.filter(mention_query).count()

    support_ticket_qs = SupportTicket.objects.filter(status=SupportTicket.TicketStatus.OPEN)
    if role not in {"admin", "receptionist"}:
        support_ticket_qs = support_ticket_qs.filter(created_by=user)
    support_tickets_open = support_ticket_qs.count()

    failed_zulip_qs = ZulipOutboundEvent.objects.filter(
        status__in=[ZulipOutboundEvent.Status.FAILED, ZulipOutboundEvent.Status.RETRY_BUFFERED],
        created_at__gte=alert_since,
    )
    failed_scheduling_qs = SchedulingOutboxEvent.objects.filter(
        status=SchedulingOutboxEvent.Status.FAILED,
        created_at__gte=alert_since,
    )
    system_alerts = failed_zulip_qs.count() + failed_scheduling_qs.count() if role == "admin" else 0

    alerts = []

    recent_delivery = (
        unread_deliveries.select_related("message", "message__thread", "message__sender")
        .order_by("-created_at")
        .first()
    )
    if recent_delivery:
        message = recent_delivery.message
        thread = message.thread
        alerts.append({
            "id": f"message-{message.id}",
            "category": "messages",
            "label": f"Unread message in {thread.subject}",
            "detail": f"From {_safe_user_label(message.sender)}",
            "priority": "normal",
            "href": "/messages",
            "created_at": message.sent_at.isoformat() if message.sent_at else message.created_at.isoformat(),
        })

    next_appointment = appointments_qs.select_related("patient").order_by("start_at").first()
    if next_appointment and next_appointment.start_at:
        patient_name = next_appointment.patient.full_name_display if next_appointment.patient_id else "patient"
        alerts.append({
            "id": f"appointment-{next_appointment.id}",
            "category": "appointments",
            "label": f"Next appointment: {patient_name}",
            "detail": timezone.localtime(next_appointment.start_at).strftime("%H:%M"),
            "priority": "normal",
            "href": "/appointments",
            "created_at": next_appointment.start_at.isoformat(),
        })

    if waiting_queue:
        alerts.append({
            "id": "patient-flow-waiting-queue",
            "category": "patient_flow",
            "label": f"{waiting_queue} patient{'s' if waiting_queue != 1 else ''} active in today's flow",
            "detail": "Queue, vitals, or clinician handover",
            "priority": "high" if waiting_queue >= 10 else "normal",
            "href": "/patient-flow/queue",
            "created_at": now.isoformat(),
        })

    if role == "admin":
        failed_event = failed_zulip_qs.order_by("-created_at").first()
        if failed_event:
            alerts.append({
                "id": f"zulip-event-{failed_event.id}",
                "category": "system",
                "label": "Zulip delivery requires attention",
                "detail": failed_event.topic,
                "priority": "high",
                "href": "/administration/security",
                "created_at": failed_event.created_at.isoformat(),
            })
        failed_outbox = failed_scheduling_qs.order_by("-created_at").first()
        if failed_outbox:
            alerts.append({
                "id": f"scheduling-outbox-{failed_outbox.id}",
                "category": "system",
                "label": "Scheduling integration event failed",
                "detail": failed_outbox.event_type,
                "priority": "high",
                "href": "/administration/security",
                "created_at": failed_outbox.created_at.isoformat(),
            })

    alerts = sorted(alerts, key=lambda item: item["created_at"], reverse=True)[:8]

    return Response({
        "workspace": {
            "label": _workspace_label_for_role(role),
            "role": role,
            "environment": "Clinic Live" if not settings.DEBUG else "Development",
        },
        "counters": {
            "waiting_queue": waiting_queue,
            "appointments_today": appointments_today,
            "inbox_unread": inbox_unread,
            "mentions": mentions,
            "support_tickets_open": support_tickets_open,
            "system_alerts": system_alerts,
        },
        "alerts": alerts,
        "system_health": {
            "visible": role == "admin",
            "status": "attention" if system_alerts else "ok",
            "failed_zulip_events_24h": failed_zulip_qs.count() if role == "admin" else 0,
            "failed_scheduling_events_24h": failed_scheduling_qs.count() if role == "admin" else 0,
        },
        "polling": {
            "default_interval_seconds": 30,
            "background_interval_seconds": 300,
        },
        "generated_at": now.isoformat(),
    })


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def patient_flow_today_queue(request):
    service_date = parse_date(request.query_params.get("date", "")) or timezone.localdate()
    now = timezone.now()
    queryset = (
        PatientJourney.objects.select_related(
            "patient",
            "check_in",
            "appointment",
            "appointment__appointment_type",
            "appointment__practitioner",
            "appointment__room",
            "visit",
        )
        .filter(
            service_date=service_date,
            is_active=True,
            current_stage__in=_active_queue_stages(),
        )
        .order_by("queue_number", "created_at")
    )

    stage = request.query_params.get("stage")
    if stage:
        queryset = queryset.filter(current_stage=stage)

    flow_type = request.query_params.get("flow_type")
    if flow_type:
        queryset = queryset.filter(flow_type=flow_type)

    items = []
    for journey in queryset[:200]:
        patient = journey.patient
        appointment = journey.appointment
        practitioner = appointment.practitioner if appointment and appointment.practitioner_id else None
        room = appointment.room if appointment and appointment.room_id else None
        wait_start = journey.created_at
        if journey.check_in_id and journey.check_in:
            wait_start = journey.check_in.created_at
        wait_minutes = max(0, int((now - wait_start).total_seconds() // 60)) if wait_start else 0
        patient_public_id = str(patient.public_id) if getattr(patient, "public_id", None) else None

        items.append({
            "id": journey.id,
            "queue_number": journey.queue_number,
            "patient_id": patient.id,
            "patient_public_id": patient_public_id,
            "patient_code": patient.patient_code,
            "patient_name": patient.full_name_display,
            "current_stage": journey.current_stage,
            "current_stage_label": journey.get_current_stage_display(),
            "flow_type": journey.flow_type,
            "flow_type_label": journey.get_flow_type_display(),
            "visit_type": _journey_visit_type(journey),
            "wait_minutes": wait_minutes,
            "appointment_id": appointment.id if appointment else None,
            "appointment_time": _appointment_time_label(appointment),
            "practitioner_id": practitioner.id if practitioner else None,
            "practitioner_name": _safe_user_label(practitioner) if practitioner else None,
            "room_id": room.id if room else None,
            "room_name": room.name if room else None,
            "href": f"/patients/{patient_public_id}" if patient_public_id else f"/patients?search={patient.patient_code}",
            "created_at": journey.created_at.isoformat(),
            "updated_at": journey.updated_at.isoformat(),
        })

    return Response({
        "service_date": service_date.isoformat(),
        "count": queryset.count(),
        "items": items,
        "stage_options": [
            {"value": value, "label": label}
            for value, label in PatientJourney.Stage.choices
            if value in _active_queue_stages()
        ],
        "generated_at": now.isoformat(),
    })


class MessageThreadViewSet(viewsets.ModelViewSet):
    serializer_class = MessageThreadSerializer
    permission_classes = [IsAuthenticated]
    search_fields = (
        "subject",
        "messages__body",
        "patient__full_name_display",
        "patient__patient_code",
        "appointment__notes",
    )
    ordering_fields = ("last_message_at", "updated_at", "created_at")
    filterset_fields = ("thread_type", "patient", "appointment", "visit", "clinical_case", "document", "is_closed")

    def get_queryset(self):
        queryset = (
            MessageThread.objects.select_related("patient", "appointment", "visit", "clinical_case", "document", "created_by")
            .prefetch_related("participants__user", "messages__sender", "messages__deliveries")
            .distinct()
        )
        if getattr(self.request.user, "role", "") == "admin":
            return queryset
        return queryset.filter(participants__user=self.request.user)

    def _participant_ids(self):
        participant_ids = self.request.data.get("participant_ids", [])
        if isinstance(participant_ids, str):
            participant_ids = [participant_ids]
        return {int(user_id) for user_id in participant_ids if str(user_id).isdigit()}

    def _ensure_participants(self, thread, participant_ids):
        MessageParticipant.objects.get_or_create(
            thread=thread,
            user=self.request.user,
            defaults={"role": MessageParticipant.Role.OWNER, "last_read_at": timezone.now()},
        )
        users = User.objects.filter(id__in=participant_ids, is_active=True)
        for user in users:
            if user == self.request.user:
                continue
            MessageParticipant.objects.get_or_create(
                thread=thread,
                user=user,
                defaults={"role": MessageParticipant.Role.MEMBER},
            )

    def _user_can_access_thread(self, thread):
        if getattr(self.request.user, "role", "") == "admin":
            return True
        return thread.participants.filter(user=self.request.user).exists()

    @transaction.atomic
    def perform_create(self, serializer):
        participant_ids = self._participant_ids()
        initial_message = (self.request.data.get("initial_message") or "").strip()
        thread = serializer.save(created_by=self.request.user)
        self._ensure_participants(thread, participant_ids)
        if initial_message:
            message = Message.objects.create(thread=thread, sender=self.request.user, body=initial_message)
            thread.last_message_at = message.sent_at
            thread.save(update_fields=["last_message_at", "updated_at"])
            create_internal_deliveries(message)
        write_audit_log(
            request=self.request,
            action="create",
            instance=thread,
            entity_type="message_thread",
            after_data=snapshot_instance(thread),
            details="Message thread created.",
        )

    @action(detail=False, methods=["get"])
    def recipients(self, request):
        users = User.objects.filter(is_active=True).order_by("first_name", "last_name", "username")
        return Response(MessageRecipientSerializer(users, many=True).data)

    @action(detail=True, methods=["post"])
    def messages(self, request, pk=None):
        thread = self.get_object()
        if not self._user_can_access_thread(thread):
            return Response({"detail": "You do not have access to this message thread."}, status=status.HTTP_403_FORBIDDEN)
        if thread.is_closed:
            return Response({"detail": "This message thread is closed."}, status=status.HTTP_400_BAD_REQUEST)
        body = (request.data.get("body") or "").strip()
        if not body:
            return Response({"body": ["Message text is required."]}, status=status.HTTP_400_BAD_REQUEST)
        if not thread.participants.filter(user=request.user).exists():
            MessageParticipant.objects.create(thread=thread, user=request.user, role=MessageParticipant.Role.MEMBER)
        message = Message.objects.create(thread=thread, sender=request.user, body=body)
        thread.last_message_at = message.sent_at
        thread.save(update_fields=["last_message_at", "updated_at"])
        create_internal_deliveries(message)
        write_audit_log(
            request=request,
            action="create",
            instance=message,
            entity_type="message",
            after_data=snapshot_instance(message),
            details="Message created.",
        )
        return Response(MessageSerializer(message, context={"request": request}).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="mark-read")
    def mark_read(self, request, pk=None):
        thread = self.get_object()
        participant, _ = MessageParticipant.objects.get_or_create(
            thread=thread,
            user=request.user,
            defaults={"role": MessageParticipant.Role.MEMBER},
        )
        participant.last_read_at = timezone.now()
        participant.save(update_fields=["last_read_at", "updated_at"])
        return Response(self.get_serializer(thread).data)


class AuditLogAccessPermission(permissions.BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if getattr(request.user, "role", "") == "admin":
            return True
        return (
            getattr(view, "action", None) == "list"
            and request.query_params.get("entity_type") == "patient"
            and bool(request.query_params.get("entity_id"))
        )


class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = AuditLog.objects.select_related("user")
    serializer_class = AuditLogSerializer
    permission_classes = [AuditLogAccessPermission]
    filterset_fields = ("entity_type", "entity_id", "action", "user")
    search_fields = ("entity_type", "action", "details", "ip_address", "user__username", "user__first_name", "user__last_name")
    ordering_fields = ("created_at", "entity_type", "action")

    def filter_queryset(self, queryset):
        entity_type = self.request.query_params.get("entity_type")
        entity_id = self.request.query_params.get("entity_id")
        
        if entity_type == "patient":
            if not entity_id or str(entity_id).lower() == "undefined":
                return queryset.none()
                
            patient_id = None
            import uuid
            from .models import Patient, Visit, Vital, Case, PatientDocument, PatientJourney, PatientCheckIn, Appointment, ElevatedAccessRequest
            from django.db.models import Q
            
            # 1. Try to parse as UUID first
            try:
                patient_uuid = uuid.UUID(str(entity_id))
                try:
                    patient_id = Patient.objects.get(public_id=patient_uuid).id
                except Patient.DoesNotExist:
                    pass
            except ValueError:
                # 2. Try to parse as integer PK
                try:
                    patient_id = int(entity_id)
                    if not Patient.objects.filter(pk=patient_id).exists():
                        patient_id = None
                except ValueError:
                    pass
            
            if patient_id is None:
                return queryset.none()

            if not has_patient_clinical_access(self.request.user, patient_id):
                return queryset.none()
                
            # Gather related record IDs
            visit_ids = list(Visit.objects.filter(patient_id=patient_id).values_list("id", flat=True))
            vital_ids = list(Vital.objects.filter(patient_id=patient_id).values_list("id", flat=True))
            case_ids = list(Case.objects.filter(patient_id=patient_id).values_list("id", flat=True))
            doc_ids = list(PatientDocument.objects.filter(patient_id=patient_id).values_list("id", flat=True))
            journey_ids = list(PatientJourney.objects.filter(patient_id=patient_id).values_list("id", flat=True))
            checkin_ids = list(PatientCheckIn.objects.filter(patient_id=patient_id).values_list("id", flat=True))
            appointment_ids = list(Appointment.objects.filter(patient_id=patient_id).values_list("id", flat=True))
            access_request_ids = list(ElevatedAccessRequest.objects.filter(patient_id=patient_id).values_list("id", flat=True))
            
            # Patient Profile logs
            q_filter = Q(entity_type="patient", entity_id=patient_id)
            try:
                patient_inst = Patient.objects.get(pk=patient_id)
                if hasattr(patient_inst, "profile") and patient_inst.profile:
                    q_filter |= Q(entity_type="patientprofile", entity_id=patient_inst.profile.pk)
            except Patient.DoesNotExist:
                pass
            
            # Or any logs for related records
            if visit_ids:
                q_filter |= Q(entity_type="visit", entity_id__in=visit_ids)
            if vital_ids:
                q_filter |= Q(entity_type="vital", entity_id__in=vital_ids)
            if case_ids:
                q_filter |= Q(entity_type="case", entity_id__in=case_ids)
            if doc_ids:
                q_filter |= Q(entity_type="patientdocument", entity_id__in=doc_ids)
                q_filter |= Q(entity_type="patient_document", entity_id__in=doc_ids)
            if journey_ids:
                q_filter |= Q(entity_type="patientjourney", entity_id__in=journey_ids)
                q_filter |= Q(entity_type="patient_journey", entity_id__in=journey_ids)
            if checkin_ids:
                q_filter |= Q(entity_type="patientcheckin", entity_id__in=checkin_ids)
                q_filter |= Q(entity_type="patient_checkin", entity_id__in=checkin_ids)
            if appointment_ids:
                q_filter |= Q(entity_type="appointment", entity_id__in=appointment_ids)
            if access_request_ids:
                q_filter |= Q(entity_type="elevated_access_request", entity_id__in=access_request_ids)
                q_filter |= Q(entity_type="elevatedaccessrequest", entity_id__in=access_request_ids)
            
            queryset = queryset.filter(q_filter)
            
            ordering = self.request.query_params.get("ordering")
            if ordering:
                ordering_fields = [f.strip() for f in ordering.split(",")]
                valid_ordering = [f for f in ordering_fields if f.replace("-", "") in ["created_at"]]
                if valid_ordering:
                    queryset = queryset.order_by(*valid_ordering)
            else:
                queryset = queryset.order_by("-created_at")
            return queryset

        queryset = self._apply_admin_filters(queryset)
        return super().filter_queryset(queryset)

    def _apply_admin_filters(self, queryset):
        category = self.request.query_params.get("category", "").strip().lower()
        if category:
            entity_types = entity_types_for_category(category)
            if category == "system":
                known_types = set().union(
                    entity_types_for_category("clinical"),
                    entity_types_for_category("administration"),
                    entity_types_for_category("security"),
                    entity_types_for_category("integration"),
                )
                queryset = queryset.exclude(entity_type__in=known_types)
            elif entity_types:
                queryset = queryset.filter(entity_type__in=entity_types)
            else:
                queryset = queryset.none()

        date_from = parse_date(self.request.query_params.get("date_from", ""))
        date_to = parse_date(self.request.query_params.get("date_to", ""))
        if date_from:
            queryset = queryset.filter(created_at__date__gte=date_from)
        if date_to:
            queryset = queryset.filter(created_at__date__lte=date_to)
        return queryset

    def _filtered_authentication_events(self):
        queryset = AuthenticationEvent.objects.select_related("user").all()
        params = self.request.query_params
        source = params.get("source", "").strip().lower()
        category = params.get("category", "").strip().lower()
        if source and source != "authentication":
            return queryset.none()
        if category and category != "security":
            return queryset.none()

        user_id = params.get("user")
        action = params.get("action", "").strip().lower()
        search = params.get("search", "").strip()
        date_from = parse_date(params.get("date_from", ""))
        date_to = parse_date(params.get("date_to", ""))
        if user_id:
            queryset = queryset.filter(user_id=user_id)
        if action:
            queryset = queryset.filter(outcome=action)
        if search:
            queryset = queryset.filter(
                Q(attempted_identifier__icontains=search)
                | Q(reason_code__icontains=search)
                | Q(ip_address__icontains=search)
                | Q(user__username__icontains=search)
                | Q(user__first_name__icontains=search)
                | Q(user__last_name__icontains=search)
            )
        if date_from:
            queryset = queryset.filter(created_at__date__gte=date_from)
        if date_to:
            queryset = queryset.filter(created_at__date__lte=date_to)
        return queryset

    def _filtered_system_events(self):
        queryset = AuditLog.objects.select_related("user").all()
        if self.request.query_params.get("source", "").strip().lower() == "authentication":
            return queryset.none()
        queryset = self._apply_admin_filters(queryset)
        params = self.request.query_params
        if params.get("user"):
            queryset = queryset.filter(user_id=params["user"])
        if params.get("action"):
            queryset = queryset.filter(action=params["action"])
        if params.get("search"):
            search = params["search"].strip()
            queryset = queryset.filter(
                Q(entity_type__icontains=search)
                | Q(action__icontains=search)
                | Q(details__icontains=search)
                | Q(ip_address__icontains=search)
                | Q(user__username__icontains=search)
                | Q(user__first_name__icontains=search)
                | Q(user__last_name__icontains=search)
            )
        return queryset

    @staticmethod
    def _normalize_system_event(event):
        return {
            "id": f"audit-{event.id}",
            "source": "system",
            "category": audit_category(event.entity_type),
            "action": event.action,
            "entity_type": event.entity_type,
            "entity_id": event.entity_id,
            "actor_id": event.user_id,
            "actor_name": event.user.get_full_name() or event.user.username if event.user else "System",
            "actor_role": event.user.role if event.user else None,
            "details": event.details,
            "ip_address": event.ip_address,
            "user_agent": event.user_agent,
            "changes": redact_sensitive_data(event.changed_fields),
            "created_at": event.created_at,
        }

    @staticmethod
    def _normalize_authentication_event(event):
        return {
            "id": f"auth-{event.id}",
            "source": "authentication",
            "category": "security",
            "action": event.outcome,
            "entity_type": "authentication",
            "entity_id": event.user_id or 0,
            "actor_id": event.user_id,
            "actor_name": event.user.get_full_name() or event.user.username if event.user else event.attempted_identifier,
            "actor_role": event.user.role if event.user else None,
            "details": event.reason_code,
            "ip_address": event.ip_address,
            "user_agent": event.user_agent,
            "changes": {
                "method": event.method,
                "outcome": event.outcome,
                "reason_code": event.reason_code,
            },
            "created_at": event.created_at,
        }

    @staticmethod
    def _csv_safe(value):
        text = "" if value is None else str(value)
        if text.startswith(("=", "+", "-", "@")):
            return f"'{text}"
        return text

    def _unified_events(self, limit, offset=0):
        system_queryset = self._filtered_system_events()
        authentication_queryset = self._filtered_authentication_events()
        fetch_count = offset + limit
        events = [
            *(self._normalize_system_event(event) for event in system_queryset.order_by("-created_at")[:fetch_count]),
            *(
                self._normalize_authentication_event(event)
                for event in authentication_queryset.order_by("-created_at")[:fetch_count]
            ),
        ]
        events.sort(key=lambda event: event["created_at"], reverse=True)
        return events[offset : offset + limit], system_queryset.count() + authentication_queryset.count()

    @action(detail=False, methods=["get"])
    def unified(self, request):
        try:
            page = max(int(request.query_params.get("page", 1)), 1)
            page_size = min(max(int(request.query_params.get("page_size", 25)), 1), 100)
        except (TypeError, ValueError):
            return Response(
                {"detail": "page and page_size must be valid integers."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        offset = (page - 1) * page_size
        events, total = self._unified_events(page_size, offset)
        return Response(
            {
                "count": total,
                "page": page,
                "page_size": page_size,
                "next_page": page + 1 if offset + page_size < total else None,
                "previous_page": page - 1 if page > 1 else None,
                "results": events,
            }
        )

    @action(detail=False, methods=["get"])
    def summary(self, request):
        system_queryset = self._filtered_system_events()
        authentication_queryset = self._filtered_authentication_events()
        category_counts = {category: 0 for category in ("clinical", "administration", "security", "integration", "system")}
        for row in system_queryset.values("entity_type").annotate(count=Count("id")):
            category_counts[audit_category(row["entity_type"])] += row["count"]
        category_counts["security"] += authentication_queryset.count()
        return Response(
            {
                "total_events": system_queryset.count() + authentication_queryset.count(),
                "system_events": system_queryset.count(),
                "authentication_events": authentication_queryset.count(),
                "category_counts": category_counts,
                "retention_days": settings.AUDIT_LOG_RETENTION_DAYS,
                "export_max_rows": settings.AUDIT_EXPORT_MAX_ROWS,
                "read_only": True,
            }
        )

    @action(detail=False, methods=["get"])
    def export(self, request):
        rows, total = self._unified_events(settings.AUDIT_EXPORT_MAX_ROWS)
        response = HttpResponse(content_type="text/csv")
        response["Content-Disposition"] = f'attachment; filename="harmony-audit-logs-{timezone.localdate().isoformat()}.csv"'
        writer = csv.writer(response)
        writer.writerow(
            [
                "Timestamp",
                "Source",
                "Category",
                "Action",
                "Entity Type",
                "Entity ID",
                "Actor",
                "Actor Role",
                "IP Address",
                "Details",
            ]
        )
        for event in rows:
            writer.writerow(
                [
                    event["created_at"].isoformat(),
                    self._csv_safe(event["source"]),
                    self._csv_safe(event["category"]),
                    self._csv_safe(event["action"]),
                    self._csv_safe(event["entity_type"]),
                    event["entity_id"],
                    self._csv_safe(event["actor_name"]),
                    self._csv_safe(event["actor_role"]),
                    self._csv_safe(event["ip_address"]),
                    self._csv_safe(event["details"]),
                ]
            )
        write_audit_log(
            request=request,
            action="export",
            entity_type="audit_log_export",
            entity_id=0,
            details=f"Exported {len(rows)} of {total} matching audit events as CSV.",
            change_summary={"exported_rows": len(rows), "matching_rows": total},
        )
        return response


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
            "total_patients": Patient.objects.filter(is_deleted=False).count(),
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


class ZulipMessagesViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated]

    def list(self, request):
        query = ZulipMessagesQuerySerializer(data=request.query_params)
        query.is_valid(raise_exception=True)
        validated = query.validated_data
        channel = validated["channel"]
        topic = validated["topic"]
        if not user_can_access_channel(request.user, channel):
            return Response({"detail": "You do not have access to this coordination channel."}, status=status.HTTP_403_FORBIDDEN)

        events = ZulipOutboundEvent.objects.filter(channel=channel, topic=topic).select_related("actor").order_by("-created_at")[
            : validated["limit"]
        ]
        serializer = ZulipOutboundEventSerializer(events, many=True, context={"request": request})
        return Response(
            {
                "channel": channel,
                "topic": topic,
                "results": serializer.data,
            }
        )


class ZulipOutboundEventViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = ZulipOutboundEventSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ("status", "channel", "linked_entity_type")
    search_fields = ("topic", "raw_payload", "sanitized_payload", "actor__username", "actor__first_name", "actor__last_name")
    ordering_fields = ("created_at", "updated_at", "retry_count")

    def get_queryset(self):
        queryset = ZulipOutboundEvent.objects.select_related("actor")
        if getattr(self.request.user, "role", "") == "admin":
            return queryset
        return queryset.filter(actor=self.request.user)


class ZulipPostUpdateViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated]

    def create(self, request):
        serializer = ZulipPostUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        payload = serializer.validated_data
        channel = payload.get("channel") or LINKED_TYPE_CHANNEL_DEFAULTS.get(payload["linked_entity_type"], "")
        if not channel:
            return Response({"detail": "No default channel is configured for this linked entity type."}, status=status.HTTP_400_BAD_REQUEST)
        if not user_can_access_channel(request.user, channel):
            return Response({"detail": "You do not have permission to post to this coordination channel."}, status=status.HTTP_403_FORBIDDEN)

        metadata = payload.get("metadata") or {}
        linked_label = resolve_linked_entity_label(payload["linked_entity_type"], payload["linked_entity_id"])
        topic = payload.get("topic") or build_topic(
            linked_entity_type=payload["linked_entity_type"],
            linked_entity_label=linked_label,
            service_date=str(timezone.localdate()),
        )
        metadata.setdefault("secure_link", resolve_secure_link(payload["linked_entity_type"], payload["linked_entity_id"]))
        sanitized_content = clean_clinical_payload(payload["raw_payload"])
        formatted_message = format_operational_message(
            user=request.user,
            template_key=payload.get("template_key") or "generic_update",
            content=sanitized_content,
            metadata=metadata,
        )
        event = ZulipOutboundEvent.objects.create(
            actor=request.user,
            channel=channel,
            topic=topic,
            linked_entity_type=payload["linked_entity_type"],
            linked_entity_id=payload["linked_entity_id"],
            raw_payload=payload["raw_payload"],
            sanitized_payload=formatted_message,
            template_key=payload.get("template_key") or "generic_update",
            status=ZulipOutboundEvent.Status.PENDING,
        )
        write_audit_log(
            request=request,
            action="create",
            instance=event,
            entity_type="zulip_outbound_event",
            after_data=snapshot_instance(event),
            details="Zulip outbound event created.",
            change_summary={"channel": channel, "topic": topic},
        )
        post_to_zulip_task.delay(event.id)
        response_serializer = ZulipOutboundEventSerializer(event, context={"request": request})
        return Response(response_serializer.data, status=status.HTTP_202_ACCEPTED)


class ZulipRetryPostViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated]

    def create(self, request):
        event_id = request.data.get("event_id")
        if not event_id:
            return Response({"event_id": ["This field is required."]}, status=status.HTTP_400_BAD_REQUEST)
        event = get_object_or_404(ZulipOutboundEvent, pk=event_id)
        if getattr(request.user, "role", "") != "admin" and event.actor_id != request.user.id:
            return Response({"detail": "You do not have permission to retry this coordination event."}, status=status.HTTP_403_FORBIDDEN)
        before_data = snapshot_instance(event)
        event.status = ZulipOutboundEvent.Status.PENDING
        event.response_metadata = {}
        event.save(update_fields=["status", "response_metadata", "updated_at"])
        write_audit_log(
            request=request,
            action="retry",
            instance=event,
            entity_type="zulip_outbound_event",
            before_data=before_data,
            after_data=snapshot_instance(event),
            details="Zulip outbound event manually retried.",
        )
        post_to_zulip_task.delay(event.id)
        return Response(ZulipOutboundEventSerializer(event, context={"request": request}).data, status=status.HTTP_202_ACCEPTED)


class SupportTicketViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    queryset = SupportTicket.objects.select_related("created_by")
    serializer_class = SupportTicketSerializer
    filterset_fields = ("status",)
    search_fields = (
        "title",
        "description",
        "created_by__first_name",
        "created_by__last_name",
        "created_by__username",
    )
    ordering_fields = ("created_at", "updated_at")

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class PartnerCompanyViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    queryset = PartnerCompany.objects.all()
    serializer_class = PartnerCompanySerializer
    lookup_field = "public_id"
    filterset_fields = ("category", "company_code")
    search_fields = (
        "company_code",
        "name",
        "tax_number",
        "account_number",
    )
    ordering_fields = ("name", "created_at", "updated_at")

    def perform_create(self, serializer):
        instance = serializer.save()
        write_audit_log(
            request=self.request,
            action="create",
            instance=instance,
            after_data=snapshot_instance(instance),
            details=f"Partner company '{instance.name}' created.",
        )

    def perform_update(self, serializer):
        before_data = snapshot_instance(self.get_object())
        instance = serializer.save()
        write_audit_log(
            request=self.request,
            action="update",
            instance=instance,
            before_data=before_data,
            after_data=snapshot_instance(instance),
            details=f"Partner company '{instance.name}' updated.",
        )

    def perform_destroy(self, instance):
        before_data = snapshot_instance(instance)
        entity_id = instance.pk
        name = instance.name
        instance.delete()
        write_audit_log(
            request=self.request,
            action="delete",
            entity_type="partner_company",
            entity_id=entity_id,
            before_data=before_data,
            details=f"Partner company '{name}' deleted.",
        )

