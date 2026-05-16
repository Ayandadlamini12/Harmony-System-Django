from django.utils import timezone

from .models import ElevatedAccessRequest


CLINICAL_ROLES = {"admin", "clinician"}


def user_role(user) -> str:
    return getattr(user, "role", "")


def is_clinical_user(user) -> bool:
    return bool(user and user.is_authenticated and user_role(user) in CLINICAL_ROLES)


def has_patient_clinical_access(user, patient_id: int) -> bool:
    if is_clinical_user(user):
        return True
    if not user or not user.is_authenticated:
        return False

    now = timezone.now()
    return ElevatedAccessRequest.objects.filter(
        patient_id=patient_id,
        requested_by=user,
        status=ElevatedAccessRequest.Status.APPROVED,
    ).filter(expires_at__gt=now).exists()
