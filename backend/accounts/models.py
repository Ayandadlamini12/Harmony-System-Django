from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    class Role(models.TextChoices):
        ADMIN = "admin", "Admin"
        CLINICIAN = "clinician", "Clinician"
        RECEPTIONIST = "receptionist", "Receptionist"

    role = models.CharField(max_length=30, choices=Role.choices, default=Role.RECEPTIONIST)
    is_active = models.BooleanField(default=True)

    def __str__(self) -> str:
        return self.get_full_name() or self.username or self.email

# Create your models here.
