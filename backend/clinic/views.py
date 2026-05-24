from django.conf import settings
from django.db import transaction
from django.utils import timezone
import re

from django.db.models import Q
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response

from .access import has_patient_clinical_access, is_clinical_user
from .models import AuditLog, ElevatedAccessRequest, Patient, PatientCheckIn, PatientProfile, Visit
from .serializers import (
    AuditLogSerializer,
    ElevatedAccessRequestSerializer,
    PatientCheckInSerializer,
    PatientDetailSerializer,
    PatientListSerializer,
    VisitSerializer,
)


def normalize_digits(value):
    return re.sub(r"\D", "", value or "")


def find_patient_by_identifier(identifier):
    text = (identifier or "").strip()
    digits = normalize_digits(text)
    if not text:
        return None

    query = Q(patient_code__iexact=text) | Q(national_id__iexact=text)
    if digits:
        query |= Q(primary_phone__icontains=digits[-8:]) | Q(secondary_phone__icontains=digits[-8:])
    return Patient.objects.filter(query).order_by("-created_at").first()


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

    @action(detail=True, methods=["get", "post"])
    def visits(self, request, pk=None):
        patient = self.get_object()
        if not has_patient_clinical_access(request.user, patient.id):
            return Response(
                {"detail": "Clinical access requires clinician approval."},
                status=status.HTTP_403_FORBIDDEN,
            )
        if request.method == "GET":
            visits = patient.visits.select_related("vitals", "follow_up_evaluation")
            serializer = VisitSerializer(visits, many=True, context={"request": request})
            return Response(serializer.data)

        if not is_clinical_user(request.user):
            return Response({"detail": "Only clinical users can create visits."}, status=status.HTTP_403_FORBIDDEN)
        serializer = VisitSerializer(data={**request.data, "patient": patient.id}, context={"request": request})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class VisitViewSet(viewsets.ModelViewSet):
    queryset = Visit.objects.select_related("patient", "vitals", "follow_up_evaluation").order_by("-visit_date", "-created_at")
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
        patient = find_patient_by_identifier(request.data.get("identifier", ""))
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
            patient = find_patient_by_identifier(identifier)
            if not patient:
                return Response({"detail": "No matching registered patient found."}, status=status.HTTP_404_NOT_FOUND)
            data["patient"] = patient.id
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


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
        serializer.save(requested_by=self.request.user)

    def update(self, request, *args, **kwargs):
        return Response({"detail": "Use approve or reject actions to review access requests."}, status=status.HTTP_405_METHOD_NOT_ALLOWED)

    def partial_update(self, request, *args, **kwargs):
        return Response({"detail": "Use approve or reject actions to review access requests."}, status=status.HTTP_405_METHOD_NOT_ALLOWED)

    @action(detail=True, methods=["post"])
    def approve(self, request, pk=None):
        if not is_clinical_user(request.user):
            return Response({"detail": "Only clinicians can approve elevated access."}, status=status.HTTP_403_FORBIDDEN)
        access_request = self.get_object()
        hours = int(request.data.get("hours") or 4)
        access_request.status = ElevatedAccessRequest.Status.APPROVED
        access_request.reviewed_by = request.user
        access_request.review_note = request.data.get("review_note", "")
        access_request.reviewed_at = timezone.now()
        access_request.expires_at = access_request.reviewed_at + timezone.timedelta(hours=hours)
        access_request.save(update_fields=["status", "reviewed_by", "review_note", "reviewed_at", "expires_at", "updated_at"])
        return Response(self.get_serializer(access_request).data)

    @action(detail=True, methods=["post"])
    def reject(self, request, pk=None):
        if not is_clinical_user(request.user):
            return Response({"detail": "Only clinicians can reject elevated access."}, status=status.HTTP_403_FORBIDDEN)
        access_request = self.get_object()
        access_request.status = ElevatedAccessRequest.Status.REJECTED
        access_request.reviewed_by = request.user
        access_request.review_note = request.data.get("review_note", "")
        access_request.reviewed_at = timezone.now()
        access_request.expires_at = None
        access_request.save(update_fields=["status", "reviewed_by", "review_note", "reviewed_at", "expires_at", "updated_at"])
        return Response(self.get_serializer(access_request).data)


@api_view(["GET"])
def dashboard_stats(request):
    today = timezone.localdate()
    return Response(
        {
            "total_patients": Patient.objects.count(),
            "today_visits": Visit.objects.filter(created_at__date=today).count(),
            "pending_drafts": ElevatedAccessRequest.objects.filter(status=ElevatedAccessRequest.Status.PENDING).count(),
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
            details="Imported via n8n webhook",
            ip_address=request.META.get("REMOTE_ADDR"),
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
