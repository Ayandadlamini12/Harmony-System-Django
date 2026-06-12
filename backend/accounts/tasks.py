import logging
import requests
from celery import shared_task
from django.conf import settings

logger = logging.getLogger(__name__)

@shared_task(bind=True, max_retries=3, default_retry_delay=10)
def dispatch_n8n_webhook_task(self, event_type, payload):
    url = settings.N8N_VERIFICATION_WEBHOOK_URL
    if not url:
        logger.warning("N8N_VERIFICATION_WEBHOOK_URL is not set. Skipping webhook dispatch.")
        return
    if not settings.N8N_OUTBOUND_SECRET:
        logger.warning("N8N_OUTBOUND_SECRET is not set. Skipping webhook dispatch.")
        return

    headers = {
        "Content-Type": "application/json",
        "X-Harmony-N8N-Outbound-Secret": settings.N8N_OUTBOUND_SECRET,
    }
    data = {
        "event": event_type,
        "payload": payload,
    }

    try:
        response = requests.post(url, json=data, headers=headers, timeout=10)
        response.raise_for_status()
    except requests.exceptions.RequestException as exc:
        logger.error(f"Failed to dispatch webhook to n8n: {exc}. Retrying...")
        raise self.retry(exc=exc)
