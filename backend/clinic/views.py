from django.conf import settings
from django.db import transaction
from django.utils import timezone
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response

from .models import AuditLog, Patient, PatientProfile, Visit
from .serializers import AuditLogSerializer, PatientDetailSerializer, PatientListSerializer, VisitSerializer


class PatientViewSet(viewsets.ModelViewSet):
    queryset = Patient.objects.select_related("profile").prefetch_related("conditions", "visits__vitals")
    search_fields = ("full_name_display", "patient_code", "national_id", "primary_phone")
    ordering_fields = ("created_at", "full_name_display", "patient_code")

    def get_serializer_class(self):
        if self.action == "list":
            return PatientListSerializer
        return PatientDetailSerializer

    @action(detail=True, methods=["get", "post"])
    def visits(self, request, pk=None):
        patient = self.get_object()
        if request.method == "GET":
            visits = patient.visits.select_related("vitals", "follow_up_evaluation")
            serializer = VisitSerializer(visits, many=True)
            return Response(serializer.data)

        serializer = VisitSerializer(data={**request.data, "patient": patient.id}, context={"request": request})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class VisitViewSet(viewsets.ModelViewSet):
    queryset = Visit.objects.select_related("patient", "vitals", "follow_up_evaluation").order_by("-visit_date", "-created_at")
    serializer_class = VisitSerializer
    search_fields = ("patient__full_name_display", "patient__patient_code", "main_complaint", "diagnosis")
    ordering_fields = ("visit_date", "created_at")


class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = AuditLog.objects.select_related("user")
    serializer_class = AuditLogSerializer


@api_view(["GET"])
def dashboard_stats(request):
    today = timezone.localdate()
    return Response(
        {
            "total_patients": Patient.objects.count(),
            "today_visits": Visit.objects.filter(created_at__date=today).count(),
            "pending_drafts": 0,
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
            first_name=request.data["first_name"],
            last_name=request.data["last_name"],
            primary_phone=request.data.get("phone", ""),
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
