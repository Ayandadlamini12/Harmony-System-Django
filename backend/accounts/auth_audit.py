from dataclasses import dataclass

from django.conf import settings
from django.utils import timezone

from .models import AuthenticationEvent


@dataclass(frozen=True)
class LockoutStatus:
    locked: bool
    failed_attempts: int
    locked_until: timezone.datetime | None = None


def normalize_identifier(identifier: str) -> str:
    return (identifier or "").strip().lower()


def get_client_ip(request) -> str | None:
    if request is None:
        return None
    forwarded = request.META.get("HTTP_X_FORWARDED_FOR", "")
    if forwarded:
        return forwarded.split(",", 1)[0].strip() or None
    return request.META.get("REMOTE_ADDR")


def login_protection_settings() -> dict:
    return {
        "max_failed_attempts": settings.AUTH_MAX_FAILED_ATTEMPTS,
        "failure_window_minutes": settings.AUTH_FAILURE_WINDOW_MINUTES,
        "lockout_duration_minutes": settings.AUTH_LOCKOUT_DURATION_MINUTES,
    }


def get_lockout_status(identifier: str) -> LockoutStatus:
    normalized = normalize_identifier(identifier)
    if not normalized:
        return LockoutStatus(locked=False, failed_attempts=0)

    now = timezone.now()
    policy = login_protection_settings()
    if policy["max_failed_attempts"] <= 0:
        return LockoutStatus(locked=False, failed_attempts=0)
    window_start = now - timezone.timedelta(minutes=policy["failure_window_minutes"])
    events = AuthenticationEvent.objects.filter(
        attempted_identifier=normalized,
        created_at__gte=window_start,
    )
    latest_success = events.filter(outcome=AuthenticationEvent.Outcome.SUCCESS).order_by("-created_at").first()
    failures = events.filter(outcome=AuthenticationEvent.Outcome.FAILURE)
    if latest_success:
        failures = failures.filter(created_at__gt=latest_success.created_at)

    failed_attempts = failures.count()
    if failed_attempts < policy["max_failed_attempts"]:
        return LockoutStatus(locked=False, failed_attempts=failed_attempts)

    latest_failure = failures.order_by("-created_at").first()
    locked_until = latest_failure.created_at + timezone.timedelta(minutes=policy["lockout_duration_minutes"])
    return LockoutStatus(
        locked=locked_until > now,
        failed_attempts=failed_attempts,
        locked_until=locked_until if locked_until > now else None,
    )


def record_authentication_event(
    *,
    request,
    identifier: str,
    outcome: str,
    method: str,
    reason_code: str = "",
    user=None,
) -> AuthenticationEvent:
    return AuthenticationEvent.objects.create(
        user=user,
        attempted_identifier=normalize_identifier(identifier),
        outcome=outcome,
        method=method,
        reason_code=reason_code,
        ip_address=get_client_ip(request),
        user_agent=request.META.get("HTTP_USER_AGENT", "") if request else "",
    )
