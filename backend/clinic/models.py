from django.conf import settings
from django.db import models
from django.utils import timezone
import re


class TimeStampedModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class Patient(TimeStampedModel):
    class Gender(models.TextChoices):
        MALE = "male", "Male"
        FEMALE = "female", "Female"
        OTHER = "other", "Other"
        PREFER_NOT_TO_SAY = "prefer_not_to_say", "Prefer not to say"

    patient_code = models.CharField(max_length=50, unique=True, blank=True)
    national_id = models.CharField(max_length=100, unique=True, null=True, blank=True)
    email = models.EmailField(blank=True)
    primary_phone = models.CharField(max_length=50, blank=True)
    secondary_phone = models.CharField(max_length=50, blank=True)
    first_name = models.CharField(max_length=100)
    middle_name = models.CharField(max_length=100, blank=True)
    last_name = models.CharField(max_length=100)
    full_name_display = models.CharField(max_length=255, db_index=True, blank=True)
    date_of_birth = models.DateField(null=True, blank=True)
    gender = models.CharField(max_length=30, choices=Gender.choices, default=Gender.PREFER_NOT_TO_SAY)
    region = models.CharField(max_length=120, blank=True)
    town_or_locality = models.CharField(max_length=120, blank=True)
    village = models.CharField(max_length=120, blank=True)
    status = models.CharField(max_length=30, default="active")
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="created_patients",
    )

    class Meta:
        ordering = ("-created_at",)
        indexes = [
            models.Index(fields=["primary_phone"]),
            models.Index(fields=["full_name_display"]),
        ]

    def save(self, *args, **kwargs):
        self.full_name_display = " ".join(
            part for part in [self.first_name, self.middle_name, self.last_name] if part
        )
        if not self.patient_code:
            self.patient_code = self.next_patient_code(self.primary_phone)
        super().save(*args, **kwargs)

    @classmethod
    def next_patient_code(cls, phone_number: str = "") -> str:
        year_suffix = timezone.now().strftime("%y")
        phone_digits = re.sub(r"\D", "", phone_number or "")
        last_six_phone_digits = phone_digits[-6:].rjust(6, "0")
        last = cls.objects.filter(patient_code__startswith="HHPAT-").order_by("-id").first()
        next_sequence = 100
        if last:
            match = re.match(r"^HHPAT-(\d+)\d{8}$", last.patient_code)
            if match:
                next_sequence = int(match.group(1)) + 1
        return f"HHPAT-{next_sequence}{year_suffix}{last_six_phone_digits}"

    def __str__(self) -> str:
        return f"{self.patient_code} - {self.full_name_display}"


class PatientProfile(TimeStampedModel):
    class HIVStatus(models.TextChoices):
        REACTIVE = "reactive", "Reactive"
        NON_REACTIVE = "non_reactive", "Non-reactive"
        UNKNOWN = "unknown", "Unknown"
        UNDISCLOSED = "undisclosed", "Undisclosed"

    patient = models.OneToOneField(Patient, on_delete=models.CASCADE, related_name="profile")
    family_medical_history = models.TextField(blank=True)
    past_medical_history = models.TextField(blank=True)
    allopathic_medication = models.TextField(blank=True)
    hiv_status = models.CharField(max_length=30, choices=HIVStatus.choices, default=HIVStatus.UNDISCLOSED)
    other_important_information = models.TextField(blank=True)
    children_count = models.PositiveIntegerField(null=True, blank=True)
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="updated_patient_profiles",
    )

    def __str__(self) -> str:
        return f"Profile for {self.patient.full_name_display}"


class PatientCondition(TimeStampedModel):
    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        HISTORICAL = "historical", "Historical"
        SUSPECTED = "suspected", "Suspected"

    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name="conditions")
    condition_code = models.CharField(max_length=80)
    condition_label = models.CharField(max_length=180)
    present = models.BooleanField(default=True)
    is_confidential = models.BooleanField(default=True)
    status = models.CharField(max_length=30, choices=Status.choices, default=Status.ACTIVE)
    notes = models.TextField(blank=True)
    recorded_at = models.DateTimeField(default=timezone.now)
    recorded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="recorded_conditions",
    )

    class Meta:
        ordering = ("condition_label",)
        constraints = [
            models.UniqueConstraint(fields=["patient", "condition_code"], name="unique_patient_condition_code"),
        ]

    def __str__(self) -> str:
        return self.condition_label


class ElevatedAccessRequest(TimeStampedModel):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        APPROVED = "approved", "Approved"
        REJECTED = "rejected", "Rejected"
        EXPIRED = "expired", "Expired"

    class Scope(models.TextChoices):
        MEDICAL_RECORDS = "medical_records", "Medical records"

    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name="access_requests")
    requested_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="clinical_access_requests",
    )
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="reviewed_clinical_access_requests",
    )
    scope = models.CharField(max_length=40, choices=Scope.choices, default=Scope.MEDICAL_RECORDS)
    status = models.CharField(max_length=30, choices=Status.choices, default=Status.PENDING)
    reason = models.TextField(blank=True)
    review_note = models.TextField(blank=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)
    expires_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ("-created_at",)
        indexes = [
            models.Index(fields=["patient", "status"]),
            models.Index(fields=["requested_by", "status"]),
        ]

    def __str__(self) -> str:
        return f"{self.patient.patient_code} access request by {self.requested_by}"


class Visit(TimeStampedModel):
    class VisitType(models.TextChoices):
        NEW_CONSULTATION = "new_consultation", "New consultation"
        FOLLOW_UP = "follow_up", "Follow up"
        REVIEW = "review", "Review"

    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name="visits")
    visit_type = models.CharField(max_length=40, choices=VisitType.choices, default=VisitType.NEW_CONSULTATION)
    visit_date = models.DateField()
    visit_time = models.TimeField(null=True, blank=True)
    main_complaint = models.TextField()
    initial_complaints = models.TextField(blank=True)
    physical_examination = models.TextField(blank=True)
    diagnosis = models.TextField(blank=True)
    remedy = models.TextField(blank=True)
    reason_for_remedy = models.TextField(blank=True)
    dietary_recommendation = models.TextField(blank=True)
    lifestyle_recommendation = models.TextField(blank=True)
    practitioner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="visits",
    )

    class Meta:
        ordering = ("-visit_date", "-created_at")

    def __str__(self) -> str:
        return f"{self.patient.full_name_display} - {self.visit_date}"


class Vital(TimeStampedModel):
    class GlucoseContext(models.TextChoices):
        FASTING = "fasting", "Fasting"
        AFTER_MEALS = "after_meals", "After meals"
        UNKNOWN = "unknown", "Unknown"

    class MedicationStatus(models.TextChoices):
        TAKEN = "taken", "Taken"
        NOT_TAKEN = "not_taken", "Not taken"
        UNKNOWN = "unknown", "Unknown"

    visit = models.OneToOneField(Visit, on_delete=models.CASCADE, related_name="vitals")
    bp_first_reading = models.CharField(max_length=50, blank=True)
    bp_second_reading = models.CharField(max_length=50, blank=True)
    pulse = models.PositiveIntegerField(null=True, blank=True)
    resp_rate = models.PositiveIntegerField(null=True, blank=True)
    temperature = models.DecimalField(max_digits=4, decimal_places=1, null=True, blank=True)
    weight = models.DecimalField(max_digits=5, decimal_places=1, null=True, blank=True)
    glucose_mmol_l = models.DecimalField(max_digits=4, decimal_places=1, null=True, blank=True)
    glucose_context = models.CharField(max_length=30, choices=GlucoseContext.choices, default=GlucoseContext.UNKNOWN)
    glucose_food_type = models.CharField(max_length=180, blank=True)
    medication_taken_status = models.CharField(
        max_length=30,
        choices=MedicationStatus.choices,
        default=MedicationStatus.UNKNOWN,
    )
    recorded_at = models.DateTimeField(default=timezone.now)

    def __str__(self) -> str:
        return f"Vitals for visit {self.visit_id}"


class FollowUpEvaluation(TimeStampedModel):
    visit = models.OneToOneField(Visit, on_delete=models.CASCADE, related_name="follow_up_evaluation")
    previous_consult_symptoms = models.TextField(blank=True)
    dietary_changes = models.TextField(blank=True)
    lifestyle_changes = models.TextField(blank=True)
    exercise_notes = models.TextField(blank=True)
    energy_notes = models.TextField(blank=True)
    evaluation_notes = models.TextField(blank=True)

    def __str__(self) -> str:
        return f"Follow-up for visit {self.visit_id}"


class AuditLog(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL)
    entity_type = models.CharField(max_length=80)
    entity_id = models.PositiveBigIntegerField()
    action = models.CharField(max_length=80)
    change_summary = models.JSONField(null=True, blank=True)
    details = models.TextField(blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("-created_at",)
        indexes = [models.Index(fields=["entity_type", "entity_id"])]

    def __str__(self) -> str:
        return f"{self.action} {self.entity_type}#{self.entity_id}"

# Create your models here.
