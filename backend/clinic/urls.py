from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import AppointmentViewSet, AuditLogViewSet, CaseViewSet, ElevatedAccessRequestViewSet, FormDraftViewSet, MessageThreadViewSet, PatientCheckInViewSet, PatientDocumentViewSet, PatientJourneyViewSet, PatientViewSet, VisitViewSet, VitalViewSet, dashboard_stats, patient_import_webhook

router = DefaultRouter()
router.register("patients", PatientViewSet, basename="patients")
router.register("patient-documents", PatientDocumentViewSet, basename="patient-documents")
router.register("visits", VisitViewSet, basename="visits")
router.register("cases", CaseViewSet, basename="cases")
router.register("vitals", VitalViewSet, basename="vitals")
router.register("check-ins", PatientCheckInViewSet, basename="check-ins")
router.register("appointments", AppointmentViewSet, basename="appointments")
router.register("patient-journeys", PatientJourneyViewSet, basename="patient-journeys")
router.register("form-drafts", FormDraftViewSet, basename="form-drafts")
router.register("message-threads", MessageThreadViewSet, basename="message-threads")
router.register("access-requests", ElevatedAccessRequestViewSet, basename="access-requests")
router.register("audit-logs", AuditLogViewSet, basename="audit-logs")

urlpatterns = [
    path("dashboard/stats/", dashboard_stats, name="dashboard-stats"),
    path("webhooks/patient-import/", patient_import_webhook, name="patient-import-webhook"),
] + router.urls
