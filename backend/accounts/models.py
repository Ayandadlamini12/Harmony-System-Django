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


class ClinicianProfile(models.Model):
    SECTION_KEYS = ("personal_details", "education", "career_details", "awards_certifications", "affiliations")

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="clinician_profile")
    full_names = models.CharField(max_length=220, blank=True)
    professional_title = models.CharField(max_length=120, blank=True)
    display_name = models.CharField(max_length=180, blank=True)
    professional_email = models.EmailField(blank=True)
    professional_phone = models.CharField(max_length=50, blank=True)
    whatsapp_number = models.CharField(max_length=50, blank=True)
    telegram_number = models.CharField(max_length=50, blank=True)
    linkedin_url = models.URLField(blank=True)
    facebook_url = models.URLField(blank=True)
    portfolio_url = models.URLField(blank=True)
    bio = models.TextField(blank=True)
    clinical_interests = models.TextField(blank=True)
    education = models.JSONField(default=list, blank=True)
    career_details = models.JSONField(default=list, blank=True)
    awards_certifications = models.JSONField(default=list, blank=True)
    affiliations = models.JSONField(default=list, blank=True)
    profile_completion = models.PositiveSmallIntegerField(default=0)
    completed_sections = models.JSONField(default=list, blank=True)
    last_profile_reminder_at = models.DateTimeField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("user__first_name", "user__last_name", "user__username")

    def __str__(self) -> str:
        return self.display_name or str(self.user)

    def calculate_completed_sections(self) -> list[str]:
        completed = []
        if self.full_names and self.professional_title and self.display_name and self.bio:
            completed.append("personal_details")
        if self._has_any_entry(self.education, ("institution", "qualification")):
            completed.append("education")
        if self._has_any_entry(self.career_details, ("organization", "role")):
            completed.append("career_details")
        if self._has_any_entry(self.awards_certifications, ("title", "issuer")):
            completed.append("awards_certifications")
        if self._has_any_entry(self.affiliations, ("organization", "role")):
            completed.append("affiliations")
        return completed

    def update_completion(self) -> None:
        completed = self.calculate_completed_sections()
        self.completed_sections = completed
        self.profile_completion = round((len(completed) / len(self.SECTION_KEYS)) * 100)

    @staticmethod
    def _has_any_entry(entries, required_keys: tuple[str, ...]) -> bool:
        if not isinstance(entries, list):
            return False
        for entry in entries:
            if isinstance(entry, dict) and any(str(entry.get(key, "")).strip() for key in required_keys):
                return True
        return False

    def save(self, *args, **kwargs):
        self.update_completion()
        super().save(*args, **kwargs)
