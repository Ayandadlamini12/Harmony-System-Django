from django.utils import timezone

from accounts.module_permissions import role_module_permissions

from .models import Patient, PatientDocument, PatientJourney


def active_journey_today(patient: Patient) -> PatientJourney | None:
    return patient.journeys.filter(is_active=True, service_date=timezone.localdate()).order_by("-created_at").first()


def consent_is_complete(patient: Patient) -> bool:
    if patient.consent_status in (Patient.ConsentStatus.SIGNED, Patient.ConsentStatus.VERIFIED):
        return True
    return patient.documents.filter(
        document_type=PatientDocument.DocumentType.CONSENT_FORM,
        status__in=(PatientDocument.Status.SIGNED, PatientDocument.Status.VERIFIED),
    ).exists()


def medical_history_started(patient: Patient) -> bool:
    try:
        profile = patient.profile
    except Exception:
        return False
    fields = (
        profile.family_medical_history,
        profile.past_medical_history,
        profile.allopathic_medication,
        profile.other_important_information,
    )
    return any(str(value).strip() for value in fields) or profile.hiv_status != "undisclosed" or profile.children_count is not None


def confidential_records_started(patient: Patient) -> bool:
    return patient.conditions.exists()


def vitals_recorded_today(patient: Patient) -> bool:
    today = timezone.localdate()
    return patient.vitals.filter(recorded_at__date=today).exists()


def build_patient_workflow_actions(patient: Patient, user) -> list[dict]:
    role = getattr(user, "role", "") if user and user.is_authenticated else ""
    permissions = role_module_permissions(role)
    consent_complete = consent_is_complete(patient)
    journey = active_journey_today(patient)
    has_journey = bool(journey)
    has_visits = patient.visits.exists()
    history_started = medical_history_started(patient)
    confidential_started = confidential_records_started(patient)
    vitals_today = vitals_recorded_today(patient)

    def action(
        key: str,
        label: str,
        module_key: str,
        *,
        completed: bool = False,
        blocked_reason: str = "",
        href: str = "",
        presentation: str = "dialog",
    ) -> dict:
        module_allowed = permissions.get(module_key, False)
        reason = ""
        if not module_allowed:
            reason = "This role does not have this module active."
        elif blocked_reason:
            reason = blocked_reason
        return {
            "key": key,
            "label": label,
            "module_key": module_key,
            "enabled": module_allowed and not blocked_reason,
            "completed": completed,
            "reason": reason,
            "href": href,
            "presentation": presentation,
        }

    visit_block = ""
    if not consent_complete:
        visit_block = "Consent must be signed before clinical visit recording."
    elif not has_journey:
        visit_block = "Check the patient in before creating the visit record."
    elif not has_visits and not history_started:
        visit_block = "Record medical and family history before the first consultation."
    elif not has_visits and not confidential_started:
        visit_block = "Review confidential clinical records before the first consultation."
    elif not vitals_today:
        visit_block = "Record vitals before visit is activated."

    actions = [
        action(
            "consent_forms",
            "Consent form",
            "consent_forms",
            completed=consent_complete,
            href=f"/patients/{patient.public_id}?tab=documents",
            presentation="tab",
        ),
        action(
            "check_in",
            "Check in / queue",
            "check_in",
            completed=has_journey,
            href=f"/check-ins?patient={patient.id}",
            presentation="page",
        ),
        action(
            "medical_history",
            "Medical history",
            "medical_history",
            completed=history_started,
            blocked_reason="" if consent_complete else "Consent must be signed before recording medical history.",
            presentation="dialog",
        ),
        action(
            "confidential_records",
            "Confidential records",
            "confidential_records",
            completed=confidential_started,
            blocked_reason="" if consent_complete else "Consent must be signed before recording confidential records.",
            presentation="tab",
        ),
        action(
            "vitals",
            "Add vitals",
            "vitals",
            completed=vitals_today,
            blocked_reason="" if consent_complete else "Consent must be signed before recording vitals.",
            presentation="dialog",
        ),
        action(
            "visits",
            "New visit",
            "visits",
            completed=False,
            blocked_reason=visit_block,
            href=f"/visits/new?patient={patient.id}",
            presentation="page",
        ),
    ]

    for item in actions:
        item["next"] = False
    next_action = next((item for item in actions if item["enabled"] and not item["completed"]), None)
    if next_action:
        next_action["next"] = True
    return actions
