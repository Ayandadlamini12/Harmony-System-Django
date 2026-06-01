from anymail.message import AnymailMessage
from django.conf import settings as django_settings
from django.core.mail import EmailMessage
from django.core.mail.backends.smtp import EmailBackend
from django.utils import timezone

from .models import EmailDeliveryLog, EmployeeEnrollmentRequest, SystemEmailSettings


def _sender(settings: SystemEmailSettings) -> str:
    if settings.from_name:
        return f"{settings.from_name} <{settings.from_email}>"
    return settings.from_email


def build_email_backend(settings: SystemEmailSettings) -> EmailBackend:
    return EmailBackend(
        host=settings.smtp_host,
        port=settings.smtp_port,
        username=settings.username,
        password=settings.password,
        use_tls=settings.encryption == SystemEmailSettings.Encryption.STARTTLS,
        use_ssl=settings.encryption == SystemEmailSettings.Encryption.SSL,
        timeout=20,
    )


def build_brevo_backend(settings: SystemEmailSettings):
    from anymail.backends.brevo import EmailBackend as BrevoEmailBackend

    brevo_settings = {
        **getattr(django_settings, "ANYMAIL", {}),
        "BREVO_API_KEY": settings.brevo_api_key or getattr(django_settings, "ANYMAIL", {}).get("BREVO_API_KEY", ""),
    }
    return BrevoEmailBackend(anymail_settings=brevo_settings)


def send_system_email(
    *,
    subject: str,
    body: str,
    to: list[str],
    reply_to: list[str] | None = None,
    template_key: str = "system_email",
    metadata: dict | None = None,
) -> EmailDeliveryLog:
    settings = SystemEmailSettings.get_default()
    if not settings.is_enabled:
        raise RuntimeError("System email is disabled.")

    provider = settings.provider
    log = EmailDeliveryLog.objects.create(
        template_key=template_key,
        provider=provider,
        status=EmailDeliveryLog.Status.PENDING,
        subject=subject,
        to=to,
        from_email=settings.from_email,
        metadata=metadata or {},
    )

    try:
        if provider == SystemEmailSettings.Provider.BREVO_API:
            required_fields = [settings.brevo_api_key or getattr(django_settings, "ANYMAIL", {}).get("BREVO_API_KEY", ""), settings.from_email]
            if not all(required_fields):
                raise RuntimeError("Brevo API settings are incomplete.")
            message = AnymailMessage(
                subject=subject,
                body=body,
                from_email=_sender(settings),
                to=to,
                reply_to=reply_to or ([settings.reply_to_email] if settings.reply_to_email else None),
                connection=build_brevo_backend(settings),
            )
            message.metadata = metadata or {}
        else:
            required_fields = [settings.smtp_host, settings.smtp_port, settings.username, settings.password, settings.from_email]
            if not all(required_fields):
                raise RuntimeError("SMTP settings are incomplete.")
            message = EmailMessage(
                subject=subject,
                body=body,
                from_email=_sender(settings),
                to=to,
                reply_to=reply_to or ([settings.reply_to_email] if settings.reply_to_email else None),
                connection=build_email_backend(settings),
            )

        message.send(fail_silently=False)
    except Exception as exc:
        log.status = EmailDeliveryLog.Status.FAILED
        log.error = str(exc)
        log.save(update_fields=["status", "error"])
        raise

    anymail_status = getattr(message, "anymail_status", None)
    message_id = ""
    if anymail_status and getattr(anymail_status, "message_id", None):
        message_id = str(anymail_status.message_id)
    log.status = EmailDeliveryLog.Status.SENT
    log.message_id = message_id
    log.sent_at = timezone.now()
    log.save(update_fields=["status", "message_id", "sent_at"])
    return log


def send_enrollment_under_review_email(enrollment_request: EmployeeEnrollmentRequest) -> bool:
    if not enrollment_request.email:
        return False

    first_name = enrollment_request.full_names.split()[0] if enrollment_request.full_names else "there"
    body = (
        f"Hello {first_name},\n\n"
        "Thank you for submitting your Harmony Health employee onboarding details.\n\n"
        "Your application is now under review by the Harmony Health administration team. "
        "You will receive another update after your details have been reviewed and your system access is ready for the next step.\n\n"
        "If you did not submit this request, please contact Harmony Health administration.\n\n"
        "Regards,\n"
        "Harmony Health MIS"
    )

    try:
        send_system_email(
            subject="Harmony Health MIS employee onboarding under review",
            body=body,
            to=[enrollment_request.email],
            template_key="employee_enrollment_under_review",
            metadata={"employee_enrollment_request_id": enrollment_request.id},
        )
    except Exception as exc:
        enrollment_request.review_email_error = str(exc)
        enrollment_request.save(update_fields=["review_email_error", "updated_at"])
        return False

    enrollment_request.review_email_sent_at = timezone.now()
    enrollment_request.review_email_error = ""
    enrollment_request.save(update_fields=["review_email_sent_at", "review_email_error", "updated_at"])
    return True
