SENSITIVE_KEY_MARKERS = (
    "password",
    "secret",
    "api_key",
    "access_token",
    "refresh_token",
    "authorization",
    "cookie",
    "credential",
    "verification_code",
    "verification_token",
    "raw_payload",
)

CLINICAL_ENTITY_TYPES = {
    "appointment",
    "case",
    "form_draft",
    "patient",
    "patient_checkin",
    "patient_document",
    "patient_journey",
    "patient_profile",
    "patientcheckin",
    "patientdocument",
    "patientjourney",
    "patientprofile",
    "visit",
    "vital",
}
ADMIN_ENTITY_TYPES = {
    "employee_enrollment_request",
    "role_module_permission",
    "system_email_settings",
    "user",
    "user_notification_channel",
}
SECURITY_ENTITY_TYPES = {
    "audit_log_export",
    "elevated_access_request",
    "elevatedaccessrequest",
    "system_audit_log_retention",
}
INTEGRATION_ENTITY_TYPES = {
    "scheduling_outbox_event",
    "zulip_outbound_event",
}


def redact_sensitive_data(value):
    if isinstance(value, dict):
        redacted = {}
        for key, item in value.items():
            normalized = str(key).lower()
            if any(marker in normalized for marker in SENSITIVE_KEY_MARKERS):
                redacted[key] = "[REDACTED]"
            else:
                redacted[key] = redact_sensitive_data(item)
        return redacted
    if isinstance(value, list):
        return [redact_sensitive_data(item) for item in value]
    return value


def audit_category(entity_type: str) -> str:
    normalized = (entity_type or "").strip().lower()
    if normalized in CLINICAL_ENTITY_TYPES:
        return "clinical"
    if normalized in ADMIN_ENTITY_TYPES:
        return "administration"
    if normalized in SECURITY_ENTITY_TYPES:
        return "security"
    if normalized in INTEGRATION_ENTITY_TYPES or "webhook" in normalized or "integration" in normalized:
        return "integration"
    return "system"


def entity_types_for_category(category: str) -> set[str]:
    category_map = {
        "clinical": CLINICAL_ENTITY_TYPES,
        "administration": ADMIN_ENTITY_TYPES,
        "security": SECURITY_ENTITY_TYPES,
        "integration": INTEGRATION_ENTITY_TYPES,
    }
    return set(category_map.get((category or "").lower(), set()))
