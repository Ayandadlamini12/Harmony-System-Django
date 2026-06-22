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
        SUPPLIER_CONTACT = "supplier_contact", "Supplier Contact"
        SUPPLIER_MANAGER = "supplier_manager", "Supplier Manager"
        PARTNER_CONTACT = "partner_contact", "Partner Contact"
        PARTNER_MANAGER = "partner_manager", "Partner Manager"

    role = models.CharField(max_length=30, choices=Role.choices, default=Role.RECEPTIONIST)
    is_active = models.BooleanField(default=True)
    profile_image = models.FileField(upload_to=user_profile_image_path, blank=True, null=True)

    def __str__(self) -> str:
        return self.get_full_name() or self.username or self.email


class AuthenticationEvent(models.Model):
    class Outcome(models.TextChoices):
        SUCCESS = "success", "Successful login"
        FAILURE = "failure", "Failed login"
        BLOCKED = "blocked", "Blocked by login protection"

    class Method(models.TextChoices):
        KEYCLOAK = "keycloak", "Keycloak"
        LOCAL = "local", "Local authentication"
        LOCAL_FALLBACK = "local_fallback", "Local fallback"
        UNKNOWN = "unknown", "Unknown"

    user = models.ForeignKey(
        User,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="authentication_events",
    )
    attempted_identifier = models.CharField(max_length=180, db_index=True)
    outcome = models.CharField(max_length=20, choices=Outcome.choices, db_index=True)
    method = models.CharField(max_length=30, choices=Method.choices, default=Method.UNKNOWN, db_index=True)
    reason_code = models.CharField(max_length=80, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ("-created_at",)
        indexes = [
            models.Index(fields=["attempted_identifier", "outcome", "created_at"]),
            models.Index(fields=["method", "created_at"]),
        ]

    def __str__(self) -> str:
        return f"{self.outcome} {self.method} login for {self.attempted_identifier}"


class UserNotificationChannel(models.Model):
    class Channel(models.TextChoices):
        EMAIL = "email", "Email"
        WHATSAPP = "whatsapp", "WhatsApp"
        TELEGRAM = "telegram", "Telegram"

    class VerificationStatus(models.TextChoices):
        UNVERIFIED = "unverified", "Unverified"
        PENDING = "pending", "Pending verification"
        VERIFIED = "verified", "Verified"

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="notification_channels")
    channel = models.CharField(max_length=30, choices=Channel.choices)
    value = models.CharField(max_length=180, blank=True)
    is_preferred = models.BooleanField(default=False)
    verification_status = models.CharField(
        max_length=30,
        choices=VerificationStatus.choices,
        default=VerificationStatus.UNVERIFIED,
    )
    verified_at = models.DateTimeField(null=True, blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("channel", "created_at")
        constraints = [
            models.UniqueConstraint(fields=["user", "channel"], name="unique_user_notification_channel"),
        ]

    def __str__(self) -> str:
        return f"{self.user} [{self.channel}]"


class RoleModulePermission(models.Model):
    role = models.CharField(max_length=30, choices=User.Role.choices)
    module_key = models.CharField(max_length=80)
    enabled = models.BooleanField(default=False)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("role", "module_key")
        constraints = [
            models.UniqueConstraint(fields=["role", "module_key"], name="unique_role_module_permission"),
        ]

    def __str__(self) -> str:
        return f"{self.role}: {self.module_key} = {self.enabled}"


class SystemEmailSettings(models.Model):
    class Provider(models.TextChoices):
        BREVO_API = "brevo_api", "Brevo API"
        SMTP = "smtp", "SMTP fallback"

    class Encryption(models.TextChoices):
        STARTTLS = "starttls", "STARTTLS"
        SSL = "ssl", "SSL/TLS"
        NONE = "none", "None"

    name = models.CharField(max_length=80, default="default", unique=True)
    is_enabled = models.BooleanField(default=False)
    provider = models.CharField(max_length=30, choices=Provider.choices, default=Provider.BREVO_API)
    brevo_api_key = models.CharField(max_length=500, blank=True)
    smtp_host = models.CharField(max_length=180, blank=True)
    smtp_port = models.PositiveIntegerField(default=587)
    encryption = models.CharField(max_length=20, choices=Encryption.choices, default=Encryption.STARTTLS)
    username = models.CharField(max_length=180, blank=True)
    password = models.CharField(max_length=500, blank=True)
    from_email = models.EmailField(blank=True)
    from_name = models.CharField(max_length=160, blank=True)
    reply_to_email = models.EmailField(blank=True)
    reply_to_name = models.CharField(max_length=160, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "System email settings"
        verbose_name_plural = "System email settings"

    def __str__(self) -> str:
        return f"{self.from_email or 'System email'} via {self.smtp_host or 'unconfigured SMTP'}"

    @classmethod
    def get_default(cls):
        settings, _ = cls.objects.get_or_create(name="default")
        return settings

    @property
    def password_is_set(self) -> bool:
        return bool(self.password)

    @property
    def brevo_api_key_is_set(self) -> bool:
        return bool(self.brevo_api_key)


class EmailDeliveryLog(models.Model):
    class Provider(models.TextChoices):
        BREVO_API = "brevo_api", "Brevo API"
        SMTP = "smtp", "SMTP"

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        SENT = "sent", "Sent"
        FAILED = "failed", "Failed"

    template_key = models.CharField(max_length=120)
    provider = models.CharField(max_length=30, choices=Provider.choices)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    subject = models.CharField(max_length=255)
    to = models.JSONField(default=list, blank=True)
    from_email = models.EmailField(blank=True)
    message_id = models.CharField(max_length=255, blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    error = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    sent_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ("-created_at",)
        indexes = [
            models.Index(fields=["status", "created_at"]),
            models.Index(fields=["template_key", "created_at"]),
        ]

    def __str__(self) -> str:
        recipients = ", ".join(self.to[:2]) if isinstance(self.to, list) else ""
        return f"{self.template_key} to {recipients} - {self.status}"


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


class EmployeeEnrollmentRequest(models.Model):
    class Source(models.TextChoices):
        TELEGRAM = "telegram", "Telegram"
        WHATSAPP = "whatsapp", "WhatsApp"
        INTERNAL = "internal", "Internal"
        API = "api", "API"

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        APPROVED = "approved", "Approved"
        REJECTED = "rejected", "Rejected"
        CANCELLED = "cancelled", "Cancelled"

    full_names = models.CharField(max_length=220)
    email = models.EmailField(blank=True)
    phone_number = models.CharField(max_length=50, blank=True)
    whatsapp_number = models.CharField(max_length=50, blank=True)
    telegram_chat_id = models.CharField(max_length=80, blank=True)
    telegram_username = models.CharField(max_length=120, blank=True)
    requested_role = models.CharField(max_length=80, blank=True)
    requested_team = models.CharField(max_length=120, blank=True)
    source = models.CharField(max_length=30, choices=Source.choices, default=Source.API)
    status = models.CharField(max_length=30, choices=Status.choices, default=Status.PENDING)
    notes = models.TextField(blank=True)
    raw_payload = models.JSONField(default=dict, blank=True)
    review_email_sent_at = models.DateTimeField(null=True, blank=True)
    review_email_error = models.TextField(blank=True)
    reviewed_by = models.ForeignKey(
        User,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="reviewed_employee_enrollment_requests",
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("-created_at",)
        indexes = [
            models.Index(fields=["status", "created_at"]),
            models.Index(fields=["source", "created_at"]),
            models.Index(fields=["telegram_chat_id", "status"]),
        ]

    def __str__(self) -> str:
        return f"{self.full_names} - {self.get_status_display()}"
