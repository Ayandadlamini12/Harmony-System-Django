from celery import shared_task
from django.conf import settings

from .audit import snapshot_instance, write_audit_log
from .models import ZulipOutboundEvent
from .zulip import ZulipIntegrationError, post_stream_message, zulip_enabled


@shared_task(bind=True, max_retries=5, default_retry_delay=60)
def post_to_zulip_task(self, event_id: int):
    try:
        event = ZulipOutboundEvent.objects.select_related("actor").get(id=event_id)
    except ZulipOutboundEvent.DoesNotExist:
        return

    if not zulip_enabled():
        event.status = ZulipOutboundEvent.Status.RETRY_BUFFERED
        event.retry_count += 1
        event.response_metadata = {"error": "Zulip integration is not configured."}
        event.save(update_fields=["status", "retry_count", "response_metadata", "updated_at"])
        return

    try:
        response_payload = post_stream_message(
            channel=event.channel,
            topic=event.topic,
            content=event.sanitized_payload,
        )
        before = snapshot_instance(event)
        event.status = ZulipOutboundEvent.Status.SUCCESS
        event.response_metadata = response_payload
        event.save(update_fields=["status", "response_metadata", "updated_at"])
        write_audit_log(
            user=event.actor,
            action="deliver",
            instance=event,
            entity_type="zulip_outbound_event",
            before_data=before,
            after_data=snapshot_instance(event),
            details="Zulip outbound event delivered successfully.",
        )
    except Exception as exc:
        before = snapshot_instance(event)
        event.retry_count += 1
        event.status = (
            ZulipOutboundEvent.Status.FAILED
            if event.retry_count >= settings.ZULIP_RETRY_LIMIT
            else ZulipOutboundEvent.Status.RETRY_BUFFERED
        )
        event.response_metadata = {"error": str(exc)}
        event.save(update_fields=["status", "retry_count", "response_metadata", "updated_at"])
        write_audit_log(
            user=event.actor,
            action="retry" if event.status == ZulipOutboundEvent.Status.RETRY_BUFFERED else "fail",
            instance=event,
            entity_type="zulip_outbound_event",
            before_data=before,
            after_data=snapshot_instance(event),
            details="Zulip outbound event delivery failed.",
        )
        if event.status == ZulipOutboundEvent.Status.RETRY_BUFFERED:
            raise self.retry(exc=exc)


@shared_task
def retry_buffered_zulip_events():
    event_ids = list(
        ZulipOutboundEvent.objects.filter(status=ZulipOutboundEvent.Status.RETRY_BUFFERED)
        .order_by("created_at")
        .values_list("id", flat=True)[: settings.ZULIP_RETRY_BATCH_SIZE]
    )
    for event_id in event_ids:
        post_to_zulip_task.delay(event_id)
