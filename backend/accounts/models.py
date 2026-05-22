from django.contrib.auth.models import AbstractUser
from django.db import models
from pathlib import Path


def user_profile_image_path(instance, filename: str) -> str:
    extension = Path(filename).suffix.lower() or ".png"
    return f"user_profiles/user_{instance.pk}/avatar{extension}"


class User(AbstractUser):
    class Role(models.TextChoices):
        ADMIN = "admin", "Admin"
        CLINICIAN = "clinician", "Clinician"
        RECEPTIONIST = "receptionist", "Receptionist"

    role = models.CharField(max_length=30, choices=Role.choices, default=Role.RECEPTIONIST)
    is_active = models.BooleanField(default=True)
    profile_image = models.FileField(upload_to=user_profile_image_path, blank=True, null=True)

    def __str__(self) -> str:
        return self.get_full_name() or self.username or self.email

# Create your models here.
