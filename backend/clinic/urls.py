from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import AuditLogViewSet, ElevatedAccessRequestViewSet, PatientViewSet, VisitViewSet, dashboard_stats, patient_import_webhook

router = DefaultRouter()
router.register("patients", PatientViewSet, basename="patients")
router.register("visits", VisitViewSet, basename="visits")
router.register("access-requests", ElevatedAccessRequestViewSet, basename="access-requests")
router.register("audit-logs", AuditLogViewSet, basename="audit-logs")

urlpatterns = [
    path("dashboard/stats/", dashboard_stats, name="dashboard-stats"),
    path("webhooks/patient-import/", patient_import_webhook, name="patient-import-webhook"),
] + router.urls
