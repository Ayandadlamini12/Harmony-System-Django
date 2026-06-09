import re
from urllib.parse import quote

import requests
from django.conf import settings


SENSITIVE_KEYWORDS = [
    r"\bhiv\b",
    r"\baids\b",
    r"\bcancer\b",
    r"\btuberculosis\b",
    r"\btb\b",
    r"\bdiabet(?:es|ic)?\b",
    r"\bhypertension\b",
    r"\basthma\b",
    r"\bpregnan(?:t|cy)\b",
    r"\bsyphilis\b",
    r"\bgonorrhea\b",
    r"\bhepatitis\b",
    r"\bdepress(?:ion|ed)?\b",
    r"\banxiety\b",
    r"\bschizophrenia\b",
    r"\bpneumonia\b",
    r"\bremedy\b",
    r"\bdiagnos(?:is|ed)\b",
]

CHANNEL_ROLE_RULES = {
    "front-desk": {"admin", "receptionist", "clinician"},
    "appointments": {"admin", "receptionist", "clinician"},
    "consent-forms": {"admin", "receptionist", "clinician"},
    "clinical-handover": {"admin", "clinician"},
    "system-support": {"admin", "clinician"},
    "management": {"admin"},
}

LINKED_TYPE_CHANNEL_DEFAULTS = {
    "patient": "front-desk",
    "appointment": "appointments",
    "consent": "consent-forms",
    "ticket": "system-support",
    "employee": "management",
}


class ZulipIntegrationError(Exception):
    pass


def zulip_enabled() -> bool:
    return bool(settings.ZULIP_SITE and settings.ZULIP_BOT_EMAIL and settings.ZULIP_BOT_API_KEY)


def user_can_access_channel(user, channel: str) -> bool:
    if not user or not getattr(user, "is_authenticated", False):
        return False
    allowed_roles = CHANNEL_ROLE_RULES.get(channel, set())
    if not allowed_roles:
        return False
    return getattr(user, "role", "") in allowed_roles


def clean_clinical_payload(text: str) -> str:
    cleaned = (text or "").strip()
    for pattern in SENSITIVE_KEYWORDS:
        cleaned = re.sub(pattern, "[CLINICAL DETAIL REDACTED FOR PRIVACY]", cleaned, flags=re.IGNORECASE)
    return cleaned


def format_actor_signature(user) -> str:
    if not user:
        return "_Operator: Harmony MIS System_"
    display_name = user.get_full_name() or user.username
    return f"_Operator: {display_name} (User ID: {user.username})_"


def format_operational_message(*, user, template_key: str, content: str, metadata: dict | None = None) -> str:
    metadata = metadata or {}
    title = {
        "patient_checked_in": "PATIENT CHECKED IN",
        "patient_ready": "PATIENT READY",
        "appointment_booked": "APPOINTMENT BOOKED",
        "support_ticket_created": "SUPPORT TICKET CREATED",
        "consent_pending": "CONSENT FORM PENDING",
        "generic_update": "COORDINATION UPDATE",
    }.get(template_key or "", "COORDINATION UPDATE")

    lead = metadata.get("lead")
    if not lead:
        lead = content.strip()

    lines = [f"**{title}**"]
    if lead:
        lines.append(lead)

    queue_number = metadata.get("queue_number")
    if queue_number:
        lines.append(f"Queue number: {queue_number}")

    secure_link = metadata.get("secure_link")
    if secure_link:
        lines.append(f"Open in MIS: {secure_link}")

    lines.append(format_actor_signature(user))
    return "\n".join(lines)


def build_topic(*, linked_entity_type: str, linked_entity_label: str, service_date: str | None = None, suffix: str | None = None) -> str:
    parts = [linked_entity_type.upper().replace("_", " ")]
    if linked_entity_label:
        parts.append(linked_entity_label)
    if service_date:
        parts.append(service_date)
    if suffix:
        parts.append(suffix)
    return " | ".join(parts)


def zulip_message_url(channel: str, topic: str) -> str:
    if not settings.ZULIP_SITE:
        return ""
    return f"{settings.ZULIP_SITE}/#narrow/channel/{quote(channel, safe='')}/topic/{quote(topic, safe='')}"


def post_stream_message(*, channel: str, topic: str, content: str) -> dict:
    if not zulip_enabled():
        raise ZulipIntegrationError("Zulip integration is not configured.")

    response = requests.post(
        f"{settings.ZULIP_SITE}/api/v1/messages",
        data={
            "type": "stream",
            "to": channel,
            "topic": topic,
            "content": content,
        },
        auth=(settings.ZULIP_BOT_EMAIL, settings.ZULIP_BOT_API_KEY),
        timeout=settings.ZULIP_BOT_TIMEOUT,
    )
    if response.status_code != 200:
        raise ZulipIntegrationError(f"Zulip API error {response.status_code}: {response.text[:500]}")
    return response.json()
