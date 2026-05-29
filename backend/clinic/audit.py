import json

from django.core.serializers.json import DjangoJSONEncoder
from django.forms.models import model_to_dict

from .models import AuditLog


def json_safe(value):
    return json.loads(json.dumps(value, cls=DjangoJSONEncoder))


def snapshot_instance(instance):
    if instance is None:
        return None
    data = model_to_dict(instance)
    data["id"] = instance.pk
    return json_safe(data)


def diff_fields(before_data, after_data):
    before_data = before_data or {}
    after_data = after_data or {}
    changed = {}
    for key in sorted(set(before_data) | set(after_data)):
        before_value = before_data.get(key)
        after_value = after_data.get(key)
        if before_value != after_value:
            changed[key] = {"before": before_value, "after": after_value}
    return changed


def get_client_ip(request):
    if not request:
        return None
    forwarded = request.META.get("HTTP_X_FORWARDED_FOR")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR")


def write_audit_log(
    *,
    request=None,
    user=None,
    action,
    instance=None,
    entity_type=None,
    entity_id=None,
    before_data=None,
    after_data=None,
    details="",
    change_summary=None,
):
    actor = user or (request.user if request and getattr(request, "user", None) and request.user.is_authenticated else None)
    resolved_entity_type = entity_type or (instance.__class__.__name__.lower() if instance is not None else "")
    resolved_entity_id = entity_id or (instance.pk if instance is not None else 0)
    safe_before = json_safe(before_data) if before_data is not None else None
    safe_after = json_safe(after_data) if after_data is not None else None
    changed = diff_fields(safe_before, safe_after) if safe_before is not None or safe_after is not None else None

    return AuditLog.objects.create(
        user=actor,
        entity_type=resolved_entity_type,
        entity_id=resolved_entity_id or 0,
        action=action,
        change_summary=json_safe(change_summary or {}),
        before_data=safe_before,
        after_data=safe_after,
        changed_fields=json_safe(changed) if changed is not None else None,
        details=details,
        ip_address=get_client_ip(request),
        user_agent=request.META.get("HTTP_USER_AGENT", "") if request else "",
    )
