from urllib.parse import quote

from django.http import JsonResponse


def health_check(request):
    return JsonResponse({"status": "ok", "service": "harmony-backend"})


NOT_FOUND_CONTEXTS = {
    "patients": {
        "module": "patients",
        "eyebrow": "Patient workspace",
        "title": "That patient page is not available",
        "message": (
            "The record, list, or patient search result you tried to open could not be found. "
            "Go back to patient search and confirm the patient code, name, or contact number."
        ),
        "primary_label": "Search patients",
        "primary_href": "/patients",
    },
    "patient-flow": {
        "module": "patient-flow",
        "eyebrow": "Patient flow",
        "title": "That patient-flow view is not available",
        "message": (
            "The queue, visit, or patient-flow link you followed no longer points to an active view. "
            "Return to flow tracking to find the current queue state."
        ),
        "primary_label": "Open patient flow",
        "primary_href": "/patient-flow",
    },
    "appointments": {
        "module": "appointments",
        "eyebrow": "Appointments",
        "title": "That appointment view is not available",
        "message": (
            "The calendar slot, appointment, or schedule page could not be found. "
            "Return to the calendar to check the current booking state."
        ),
        "primary_label": "Open calendar",
        "primary_href": "/appointments",
    },
    "check-ins": {
        "module": "check-ins",
        "eyebrow": "Reception desk",
        "title": "That check-in view is not available",
        "message": (
            "The check-in or waiting-list item may have moved, been completed, or no longer exists. "
            "Return to the reception desk to continue from the live queue."
        ),
        "primary_label": "Open check-ins",
        "primary_href": "/check-ins",
    },
    "messages": {
        "module": "messages",
        "eyebrow": "Coordination",
        "title": "That message thread is not available",
        "message": (
            "The coordination thread or communication view could not be opened. "
            "Return to messages to find the active operational thread."
        ),
        "primary_label": "Open messages",
        "primary_href": "/messages",
    },
    "administration": {
        "module": "administration",
        "eyebrow": "Administration",
        "title": "That admin setting is not available",
        "message": (
            "The system setting or administrative tool you tried to open is not registered. "
            "Return to the administration workspace and choose an available section."
        ),
        "primary_label": "Open administration",
        "primary_href": "/administration/security",
    },
    "account": {
        "module": "account",
        "eyebrow": "Account",
        "title": "That account page is not available",
        "message": (
            "The account setting you tried to open could not be found. "
            "Return to your account area to update the available profile or notification settings."
        ),
        "primary_label": "Open account",
        "primary_href": "/account",
    },
}


DEFAULT_NOT_FOUND_CONTEXT = {
    "module": "general",
    "eyebrow": "Harmony MIS",
    "title": "This page is not on the current map",
    "message": (
        "The link may be old, incomplete, or no longer part of the MIS workspace. "
        "Return to the dashboard and continue from the live navigation."
    ),
    "primary_label": "Go to dashboard",
    "primary_href": "/",
}


def not_found_context(request):
    raw_path = str(request.GET.get("path", "") or "").strip()
    normalized = raw_path.split("?", 1)[0].strip("/")
    first_segment = normalized.split("/", 1)[0] if normalized else ""
    context = NOT_FOUND_CONTEXTS.get(first_segment, DEFAULT_NOT_FOUND_CONTEXT)
    redirect_path = raw_path if raw_path.startswith("/") else f"/{normalized}" if normalized else "/"

    return JsonResponse(
        {
            **context,
            "requested_path": raw_path,
            "login_href": f"/login?redirect={quote(redirect_path, safe='/')}",
            "dashboard_href": "/",
            "support_label": "Contact support",
            "support_href": "/administration/support-tickets",
            "secret_values_exposed": False,
        }
    )
