from django.conf import settings
from django.db import models
from django.utils import timezone
import re
import uuid


class TimeStampedModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class Patient(TimeStampedModel):
    class ConsentStatus(models.TextChoices):
        PENDING = "pending", "Pending consent"
        GENERATED = "generated", "Consent generated"
        SIGNED = "signed", "Consent signed"
        VERIFIED = "verified", "Consent verified"

    class Gender(models.TextChoices):
        MALE = "male", "Male"
        FEMALE = "female", "Female"
        OTHER = "other", "Other"
        PREFER_NOT_TO_SAY = "prefer_not_to_say", "Prefer not to say"

    patient_code = models.CharField(max_length=50, unique=True, blank=True)
    public_id = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    national_id = models.CharField(max_length=100, unique=True, null=True, blank=True)
    email = models.EmailField(blank=True)
    primary_phone = models.CharField(max_length=50, blank=True)
    secondary_phone = models.CharField(max_length=50, blank=True)
    whatsapp_number = models.CharField(max_length=50, blank=True)
    telegram_username = models.CharField(max_length=120, blank=True)
    preferred_notification_channel = models.CharField(
        max_length=30,
        choices=[
            ("email", "Email"),
            ("whatsapp", "WhatsApp"),
            ("telegram", "Telegram"),
        ],
        blank=True,
    )
    notification_consent = models.BooleanField(default=False)
    notification_consent_at = models.DateTimeField(null=True, blank=True)
    next_of_kin_full_name = models.CharField(max_length=255, blank=True)
    next_of_kin_phone = models.CharField(max_length=50, blank=True)
    next_of_kin_email = models.EmailField(blank=True)
    next_of_kin_relationship = models.CharField(max_length=80, blank=True)
    next_of_kin_relationship_other = models.CharField(max_length=120, blank=True)
    first_name = models.CharField(max_length=100)
    middle_name = models.CharField(max_length=100, blank=True)
    last_name = models.CharField(max_length=100)
    full_name_display = models.CharField(max_length=255, db_index=True, blank=True)
    date_of_birth = models.DateField(null=True, blank=True)
    gender = models.CharField(max_length=30, choices=Gender.choices, default=Gender.PREFER_NOT_TO_SAY)
    marital_status = models.CharField(max_length=80, blank=True)
    occupation = models.CharField(max_length=160, blank=True)
    allergies = models.TextField(blank=True)
    smoking_status = models.CharField(max_length=30, blank=True)
    smoking_details = models.TextField(blank=True)
    smoking_years = models.PositiveIntegerField(null=True, blank=True)
    alcohol_status = models.CharField(max_length=30, blank=True)
    alcohol_details = models.TextField(blank=True)
    region = models.CharField(max_length=120, blank=True)
    town_or_locality = models.CharField(max_length=120, blank=True)
    village = models.CharField(max_length=120, blank=True)

    # Medical Aid Section
    has_medical_aid = models.BooleanField(default=False)
    medical_aid_company = models.ForeignKey(
        "PartnerCompany",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="medical_aid_patients",
    )
    medical_aid_membership_ownership = models.CharField(
        max_length=20,
        default="self",
        blank=True,
        choices=[("self", "Self"), ("other", "Other")],
    )
    medical_aid_owner_full_name = models.CharField(max_length=255, blank=True)
    medical_aid_owner_national_id = models.CharField(max_length=100, blank=True)
    medical_aid_owner_relationship = models.CharField(max_length=80, blank=True)
    medical_aid_id_number = models.CharField(max_length=100, blank=True)

    status = models.CharField(max_length=30, default="active")
    consent_status = models.CharField(max_length=30, choices=ConsentStatus.choices, default=ConsentStatus.PENDING)
    is_deleted = models.BooleanField(default=False)
    deleted_at = models.DateTimeField(null=True, blank=True)
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
            models.Index(fields=["public_id"]),
            models.Index(fields=["primary_phone"]),
            models.Index(fields=["full_name_display"]),
        ]

    def save(self, *args, **kwargs):
        self.full_name_display = " ".join(
            part for part in [self.first_name, self.middle_name, self.last_name] if part
        )
        if self.notification_consent and not self.notification_consent_at:
            self.notification_consent_at = timezone.now()
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


def patient_document_upload_path(instance, filename: str) -> str:
    return f"patient_documents/patient_{instance.patient_id}/{instance.document_id}/{filename}"


class PatientDocument(TimeStampedModel):
    class DocumentType(models.TextChoices):
        CONSENT_FORM = "consent_form", "Consent form"
        PATIENT_UPLOAD = "patient_upload", "Patient upload"
        REPORT = "report", "Report"

    class Status(models.TextChoices):
        GENERATED = "generated", "Generated"
        PENDING_SIGNATURE = "pending_signature", "Pending signature"
        SIGNED = "signed", "Signed"
        VERIFIED = "verified", "Verified"
        REJECTED = "rejected", "Rejected"
        INVALIDATED = "invalidated", "Invalidated"

    document_id = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name="documents")
    document_type = models.CharField(max_length=50, choices=DocumentType.choices)
    title = models.CharField(max_length=180)
    status = models.CharField(max_length=40, choices=Status.choices, default=Status.GENERATED)
    file = models.FileField(upload_to=patient_document_upload_path, blank=True)
    verification_payload = models.JSONField(default=dict, blank=True)
    signed_at = models.DateTimeField(null=True, blank=True)
    generated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="generated_patient_documents",
    )
    verified_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="verified_patient_documents",
    )

    class Meta:
        ordering = ("-created_at",)
        indexes = [
            models.Index(fields=["patient", "document_type", "status"]),
            models.Index(fields=["document_id"]),
        ]

    def __str__(self) -> str:
        return f"{self.title} - {self.patient.patient_code}"


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
    main_complaint = models.TextField(blank=True, default="")
    initial_complaints = models.TextField(blank=True)
    physical_examination = models.TextField(blank=True)
    diagnosis = models.TextField(blank=True)
    remedy = models.TextField(blank=True)
    reason_for_remedy = models.TextField(blank=True)
    dietary_recommendation = models.TextField(blank=True)
    lifestyle_recommendation = models.TextField(blank=True)
    digestive_review = models.JSONField(default=dict, blank=True)
    general_review = models.JSONField(default=dict, blank=True)
    reproductive_review = models.JSONField(default=dict, blank=True)
    sleep_mental_review = models.JSONField(default=dict, blank=True)
    follow_up_review = models.JSONField(default=dict, blank=True)
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


class VisitSymptomProblem(TimeStampedModel):
    class Status(models.TextChoices):
        OPEN = "open", "Open"
        RESOLVED = "resolved", "Resolved"

    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name="symptom_problems")
    opened_visit = models.ForeignKey(Visit, on_delete=models.CASCADE, related_name="opened_symptom_problems")
    resolved_visit = models.ForeignKey(
        Visit,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="resolved_symptom_problems",
    )
    description = models.CharField(max_length=255)
    note = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.OPEN)
    resolved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ("status", "created_at")
        indexes = [
            models.Index(fields=["patient", "status"]),
            models.Index(fields=["opened_visit"]),
            models.Index(fields=["resolved_visit"]),
        ]

    def mark_resolved(self, visit: Visit | None = None, note: str | None = None) -> None:
        self.status = self.Status.RESOLVED
        self.resolved_at = timezone.now()
        if visit:
            self.resolved_visit = visit
        if note is not None:
            self.note = note
        self.save(update_fields=["status", "resolved_at", "resolved_visit", "note", "updated_at"])

    def __str__(self) -> str:
        return f"{self.description} - {self.patient.patient_code} ({self.get_status_display()})"


class Case(TimeStampedModel):
    class Status(models.TextChoices):
        OPEN = "open", "Open"
        RESOLVED = "resolved", "Resolved"

    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name="cases")
    visit = models.ForeignKey(Visit, on_delete=models.CASCADE, related_name="cases")
    parent_case = models.ForeignKey("self", null=True, blank=True, on_delete=models.SET_NULL, related_name="follow_ups")
    title = models.CharField(max_length=255)
    main_complaint = models.TextField(blank=True)
    physical_examination = models.TextField(blank=True)
    diagnosis = models.TextField(blank=True)
    remedy = models.TextField(blank=True)
    reason_for_remedy = models.TextField(blank=True)
    dietary_recommendation = models.TextField(blank=True)
    lifestyle_recommendation = models.TextField(blank=True)
    previous_consult_symptoms = models.TextField(blank=True)
    dietary_changes = models.TextField(blank=True)
    lifestyle_changes = models.TextField(blank=True)
    exercise_notes = models.TextField(blank=True)
    energy_notes = models.TextField(blank=True)
    evaluation_notes = models.TextField(blank=True)
    notes = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.OPEN)
    resolved_at = models.DateTimeField(null=True, blank=True)
    practitioner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name="cases",
    )

    class Meta:
        ordering = ("-created_at",)
        indexes = [
            models.Index(fields=["patient", "status"]),
            models.Index(fields=["visit"]),
        ]

    def __str__(self) -> str:
        return f"{self.title} - {self.patient.patient_code} ({self.get_status_display()})"


class PatientCheckIn(TimeStampedModel):
    class Status(models.TextChoices):
        WAITING = "waiting", "Waiting"
        IN_VISIT = "in_visit", "In visit"
        COMPLETED = "completed", "Completed"
        CANCELLED = "cancelled", "Cancelled"

    class Method(models.TextChoices):
        RECEPTION = "reception", "Reception"
        TABLET = "tablet", "Tablet"
        API = "api", "API"

    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name="check_ins")
    visit_type = models.CharField(max_length=40, choices=Visit.VisitType.choices, default=Visit.VisitType.NEW_CONSULTATION)
    status = models.CharField(max_length=30, choices=Status.choices, default=Status.WAITING)
    method = models.CharField(max_length=30, choices=Method.choices, default=Method.RECEPTION)
    identifier_type = models.CharField(max_length=40, blank=True)
    source_label = models.CharField(max_length=120, blank=True)
    note = models.TextField(blank=True)
    checked_in_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="patient_check_ins",
    )

    class Meta:
        ordering = ("-created_at",)
        indexes = [
            models.Index(fields=["status", "created_at"]),
            models.Index(fields=["patient", "status"]),
        ]

    def __str__(self) -> str:
        return f"{self.patient.full_name_display} - {self.get_status_display()}"


class AppointmentType(TimeStampedModel):
    name = models.CharField(max_length=100, unique=True)
    default_duration_minutes = models.PositiveIntegerField(default=30)
    requires_practitioner = models.BooleanField(default=True)
    requires_room = models.BooleanField(default=False)
    requires_consent = models.BooleanField(default=False)
    buffer_before_minutes = models.PositiveIntegerField(default=0)
    buffer_after_minutes = models.PositiveIntegerField(default=0)
    color_token = models.CharField(max_length=50, blank=True)
    is_active = models.BooleanField(default=True)

    def __str__(self) -> str:
        return self.name


class ResourceRoom(TimeStampedModel):
    name = models.CharField(max_length=100, unique=True)
    location = models.CharField(max_length=255, null=True, blank=True)
    resource_type = models.CharField(max_length=100, blank=True)
    capacity = models.PositiveIntegerField(default=1)
    is_active = models.BooleanField(default=True)

    def __str__(self) -> str:
        return self.name


class PractitionerAvailability(TimeStampedModel):
    class Weekday(models.IntegerChoices):
        MONDAY = 0, "Monday"
        TUESDAY = 1, "Tuesday"
        WEDNESDAY = 2, "Wednesday"
        THURSDAY = 3, "Thursday"
        FRIDAY = 4, "Friday"
        SATURDAY = 5, "Saturday"
        SUNDAY = 6, "Sunday"

    practitioner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="availabilities",
    )
    weekday = models.PositiveSmallIntegerField(choices=Weekday.choices)
    start_time = models.TimeField()
    end_time = models.TimeField()
    effective_from = models.DateField(default=timezone.localdate)
    effective_to = models.DateField(null=True, blank=True)
    location = models.CharField(max_length=255, null=True, blank=True)

    class Meta:
        ordering = ("weekday", "start_time")

    def __str__(self) -> str:
        name = self.practitioner.get_full_name() if hasattr(self.practitioner, "get_full_name") else ""
        return f"{name or self.practitioner.username} - {self.get_weekday_display()} {self.start_time}-{self.end_time}"


class BlockedSlot(TimeStampedModel):
    class ScopeType(models.TextChoices):
        PRACTITIONER = "practitioner", "Practitioner"
        ROOM = "room", "Room"
        CLINIC = "clinic", "Clinic"

    scope_type = models.CharField(max_length=30, choices=ScopeType.choices, default=ScopeType.CLINIC)
    scope_id = models.CharField(max_length=100, null=True, blank=True)
    start_at = models.DateTimeField()
    end_at = models.DateTimeField()
    reason = models.TextField(blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="created_blocked_slots",
    )

    class Meta:
        ordering = ("start_at",)

    def __str__(self) -> str:
        return f"Blocked {self.scope_type} ({self.scope_id or 'all'}) {self.start_at} to {self.end_at}"


class ExternalSyncRecord(TimeStampedModel):
    entity_type = models.CharField(max_length=50, default="appointment")
    entity_id = models.CharField(max_length=100)
    provider = models.CharField(max_length=50, default="google")
    external_id = models.CharField(max_length=255)
    sync_status = models.CharField(max_length=50, default="synced")
    last_synced_at = models.DateTimeField(null=True, blank=True)
    last_error = models.TextField(null=True, blank=True)

    class Meta:
        unique_together = ("entity_type", "entity_id", "provider")

    def __str__(self) -> str:
        return f"{self.provider} Sync for {self.entity_type} {self.entity_id}"


class SchedulingOutboxEvent(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        PROCESSED = "processed", "Processed"
        FAILED = "failed", "Failed"

    event_type = models.CharField(max_length=100)
    aggregate_type = models.CharField(max_length=100, default="appointment")
    aggregate_id = models.CharField(max_length=100)
    payload_json = models.JSONField()
    safe_payload_json = models.JSONField(default=dict, blank=True)
    status = models.CharField(max_length=30, choices=Status.choices, default=Status.PENDING)
    retry_count = models.PositiveIntegerField(default=0)
    last_error = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    processed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ("created_at",)

    def __str__(self) -> str:
        return f"Outbox Event: {self.event_type} on {self.aggregate_type} {self.aggregate_id} ({self.status})"


class Appointment(TimeStampedModel):
    class Source(models.TextChoices):
        INTERNAL = "internal", "Internal"
        TELEGRAM = "telegram", "Telegram"
        WHATSAPP = "whatsapp", "WhatsApp"
        API = "api", "API"

    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        BOOKED = "booked", "Booked"
        CONFIRMED = "confirmed", "Confirmed"
        CHECKED_IN = "checked_in", "Checked in"
        IN_QUEUE = "in_queue", "In Queue"
        IN_VISIT = "in_visit", "In Visit"
        COMPLETED = "completed", "Completed"
        CANCELLED = "cancelled", "Cancelled"
        NO_SHOW = "no_show", "No show"

    class Priority(models.TextChoices):
        LOW = "low", "Low"
        MEDIUM = "medium", "Medium"
        HIGH = "high", "High"

    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name="appointments")
    appointment_type = models.ForeignKey(AppointmentType, on_delete=models.PROTECT, related_name="appointments", null=True, blank=True)
    
    # Precise operational bounds
    start_at = models.DateTimeField(null=True, blank=True)
    end_at = models.DateTimeField(null=True, blank=True)
    
    # Backwards compatibility database-level fields (auto-synced)
    appointment_date = models.DateField(null=True, blank=True)
    appointment_time = models.TimeField(null=True, blank=True)
    
    source = models.CharField(max_length=30, choices=Source.choices, default=Source.INTERNAL)
    priority = models.CharField(max_length=20, choices=Priority.choices, default=Priority.MEDIUM)
    
    practitioner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="appointments",
    )
    room = models.ForeignKey(
        ResourceRoom,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="appointments",
    )
    location = models.CharField(max_length=255, null=True, blank=True)
    notes = models.TextField(blank=True)
    status = models.CharField(max_length=30, choices=Status.choices, default=Status.BOOKED)
    
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="created_appointments",
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="updated_appointments",
    )
    cancel_reason = models.TextField(null=True, blank=True)
    rescheduled_from = models.ForeignKey(
        "self",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="rescheduled_to",
    )
    checked_in_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ("start_at", "created_at")
        indexes = [
            models.Index(fields=["start_at", "end_at"]),
            models.Index(fields=["status", "start_at"]),
            models.Index(fields=["patient", "start_at"]),
            models.Index(fields=["practitioner", "start_at"]),
            models.Index(fields=["room", "start_at"]),
        ]

    def save(self, *args, **kwargs):
        if self.start_at:
            local_dt = timezone.localtime(self.start_at)
            self.appointment_date = local_dt.date()
            self.appointment_time = local_dt.time()
        super().save(*args, **kwargs)

    def __str__(self) -> str:
        appt_type = self.appointment_type.name if self.appointment_type else "No Type"
        return f"{self.patient.full_name_display} - {appt_type} on {self.start_at or self.appointment_date}"


class PatientJourney(TimeStampedModel):
    class Stage(models.TextChoices):
        REGISTERED = "registered", "Registered"
        QUEUED = "queued", "Queued"
        CHECKED_IN = "checked_in", "Checked in"
        VITALS_RECORDED = "vitals_recorded", "Vitals recorded"
        WAITING_CLINICIAN = "waiting_clinician", "Waiting clinician"
        IN_CONSULTATION = "in_consultation", "In consultation"
        VISIT_RECORDED = "visit_recorded", "Visit recorded"
        COMPLETED = "completed", "Completed"
        CANCELLED = "cancelled", "Cancelled"

    class FlowType(models.TextChoices):
        WALK_IN_QUEUE = "walk_in_queue", "Walk-in queue"
        APPOINTMENT_CHECKIN = "appointment_checkin", "Appointment check-in"
        MANUAL = "manual", "Manual"

    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name="journeys")
    check_in = models.OneToOneField(PatientCheckIn, null=True, blank=True, on_delete=models.SET_NULL, related_name="journey")
    appointment = models.ForeignKey(Appointment, null=True, blank=True, on_delete=models.SET_NULL, related_name="journeys")
    visit = models.ForeignKey(Visit, null=True, blank=True, on_delete=models.SET_NULL, related_name="journeys")
    service_date = models.DateField(default=timezone.localdate)
    current_stage = models.CharField(max_length=40, choices=Stage.choices, default=Stage.REGISTERED)
    flow_type = models.CharField(max_length=40, choices=FlowType.choices, default=FlowType.MANUAL)
    queue_number = models.PositiveIntegerField(null=True, blank=True)
    appointment_matched = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    notes = models.TextField(blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="created_patient_journeys",
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="updated_patient_journeys",
    )

    class Meta:
        ordering = ("service_date", "queue_number", "created_at")
        indexes = [
            models.Index(fields=["patient", "service_date", "is_active"]),
            models.Index(fields=["current_stage", "service_date"]),
            models.Index(fields=["flow_type", "service_date", "queue_number"]),
        ]

    def __str__(self) -> str:
        return f"{self.patient.full_name_display} - {self.get_current_stage_display()}"


class PatientJourneyEvent(models.Model):
    journey = models.ForeignKey(PatientJourney, on_delete=models.CASCADE, related_name="events")
    stage = models.CharField(max_length=40, choices=PatientJourney.Stage.choices)
    note = models.TextField(blank=True)
    recorded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="patient_journey_events",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("created_at",)
        indexes = [
            models.Index(fields=["journey", "created_at"]),
        ]

    def __str__(self) -> str:
        return f"{self.journey_id} - {self.stage}"


class FormDraft(TimeStampedModel):
    class FormType(models.TextChoices):
        PATIENT_REGISTRATION = "patient_registration", "Patient registration"
        VISIT_NEW_CONSULTATION = "visit_new_consultation", "New consultation"
        VISIT_FOLLOW_UP = "visit_follow_up", "Follow up"
        VITALS_ENTRY = "vitals_entry", "Vitals entry"
        MEDICAL_HISTORY_UPDATE = "medical_history_update", "Medical history update"

    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        SUBMITTED = "submitted", "Submitted"
        ABANDONED = "abandoned", "Abandoned"

    draft_key = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    owner_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="form_drafts",
    )
    form_type = models.CharField(max_length=80, choices=FormType.choices)
    related_patient = models.ForeignKey(
        Patient,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="form_drafts",
    )
    related_visit = models.ForeignKey(
        Visit,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="form_drafts",
    )
    current_stage = models.CharField(max_length=120, blank=True)
    payload = models.JSONField(default=dict, blank=True)
    status = models.CharField(max_length=30, choices=Status.choices, default=Status.DRAFT)
    last_saved_at = models.DateTimeField(default=timezone.now)
    submitted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ("-last_saved_at", "-updated_at")
        indexes = [
            models.Index(fields=["owner_user", "status", "last_saved_at"]),
            models.Index(fields=["form_type", "status"]),
            models.Index(fields=["draft_key"]),
        ]

    def save(self, *args, **kwargs):
        if self.status == self.Status.SUBMITTED and not self.submitted_at:
            self.submitted_at = timezone.now()
        if self.status == self.Status.DRAFT:
            self.last_saved_at = timezone.now()
        super().save(*args, **kwargs)

    def __str__(self) -> str:
        return f"{self.get_form_type_display()} draft for {self.owner_user}"


class MessageThread(TimeStampedModel):
    class ThreadType(models.TextChoices):
        DIRECT = "direct", "Direct"
        GROUP = "group", "Group"
        PATIENT = "patient", "Patient"
        APPOINTMENT = "appointment", "Appointment"
        SYSTEM = "system", "System"

    subject = models.CharField(max_length=220)
    thread_type = models.CharField(max_length=40, choices=ThreadType.choices, default=ThreadType.DIRECT)
    patient = models.ForeignKey(Patient, null=True, blank=True, on_delete=models.SET_NULL, related_name="message_threads")
    appointment = models.ForeignKey(Appointment, null=True, blank=True, on_delete=models.SET_NULL, related_name="message_threads")
    visit = models.ForeignKey(Visit, null=True, blank=True, on_delete=models.SET_NULL, related_name="message_threads")
    clinical_case = models.ForeignKey(Case, null=True, blank=True, on_delete=models.SET_NULL, related_name="message_threads")
    document = models.ForeignKey(PatientDocument, null=True, blank=True, on_delete=models.SET_NULL, related_name="message_threads")
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="created_message_threads",
    )
    last_message_at = models.DateTimeField(null=True, blank=True)
    is_closed = models.BooleanField(default=False)
    external_reference = models.CharField(max_length=180, blank=True)
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ("-last_message_at", "-updated_at")
        indexes = [
            models.Index(fields=["thread_type", "last_message_at"]),
            models.Index(fields=["patient", "last_message_at"]),
            models.Index(fields=["appointment", "last_message_at"]),
            models.Index(fields=["created_by", "last_message_at"]),
        ]

    def __str__(self) -> str:
        return self.subject


class MessageParticipant(TimeStampedModel):
    class Role(models.TextChoices):
        OWNER = "owner", "Owner"
        MEMBER = "member", "Member"
        OBSERVER = "observer", "Observer"

    thread = models.ForeignKey(MessageThread, on_delete=models.CASCADE, related_name="participants")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="message_participations")
    role = models.CharField(max_length=30, choices=Role.choices, default=Role.MEMBER)
    last_read_at = models.DateTimeField(null=True, blank=True)
    is_muted = models.BooleanField(default=False)

    class Meta:
        unique_together = ("thread", "user")
        ordering = ("created_at",)
        indexes = [
            models.Index(fields=["user", "last_read_at"]),
            models.Index(fields=["thread", "user"]),
        ]

    def __str__(self) -> str:
        return f"{self.user} in {self.thread}"


class Message(TimeStampedModel):
    class MessageType(models.TextChoices):
        USER = "user", "User"
        SYSTEM = "system", "System"
        HANDOFF = "handoff", "Handoff"
        EXTERNAL = "external", "External"

    class Channel(models.TextChoices):
        INTERNAL = "internal", "Internal"
        EMAIL = "email", "Email"
        TELEGRAM = "telegram", "Telegram"
        WHATSAPP = "whatsapp", "WhatsApp"
        API = "api", "API"

    thread = models.ForeignKey(MessageThread, on_delete=models.CASCADE, related_name="messages")
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="sent_messages",
    )
    body = models.TextField()
    message_type = models.CharField(max_length=30, choices=MessageType.choices, default=MessageType.USER)
    external_channel = models.CharField(max_length=30, choices=Channel.choices, default=Channel.INTERNAL)
    external_message_id = models.CharField(max_length=180, blank=True)
    sent_at = models.DateTimeField(default=timezone.now)
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ("sent_at", "created_at")
        indexes = [
            models.Index(fields=["thread", "sent_at"]),
            models.Index(fields=["sender", "sent_at"]),
            models.Index(fields=["external_channel", "external_message_id"]),
        ]

    def __str__(self) -> str:
        return f"{self.thread} - {self.sent_at:%Y-%m-%d %H:%M}"


class MessageDelivery(TimeStampedModel):
    class Status(models.TextChoices):
        QUEUED = "queued", "Queued"
        SENT = "sent", "Sent"
        DELIVERED = "delivered", "Delivered"
        READ = "read", "Read"
        FAILED = "failed", "Failed"
        SKIPPED = "skipped", "Skipped"

    message = models.ForeignKey(Message, on_delete=models.CASCADE, related_name="deliveries")
    channel = models.CharField(max_length=30, choices=Message.Channel.choices, default=Message.Channel.INTERNAL)
    status = models.CharField(max_length=30, choices=Status.choices, default=Status.DELIVERED)
    recipient_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="message_deliveries",
    )
    destination = models.CharField(max_length=255, blank=True)
    provider = models.CharField(max_length=80, blank=True)
    provider_message_id = models.CharField(max_length=180, blank=True)
    error = models.TextField(blank=True)
    sent_at = models.DateTimeField(null=True, blank=True)
    delivered_at = models.DateTimeField(null=True, blank=True)
    read_at = models.DateTimeField(null=True, blank=True)
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ("-created_at",)
        indexes = [
            models.Index(fields=["channel", "status", "created_at"]),
            models.Index(fields=["message", "channel"]),
            models.Index(fields=["recipient_user", "status"]),
        ]

    def __str__(self) -> str:
        return f"{self.channel} {self.status} for message {self.message_id}"


class Vital(TimeStampedModel):
    class GlucoseContext(models.TextChoices):
        FASTING = "fasting", "Fasting"
        AFTER_MEALS = "after_meals", "After meals"
        UNKNOWN = "unknown", "Unknown"

    class MedicationStatus(models.TextChoices):
        TAKEN = "taken", "Taken"
        NOT_TAKEN = "not_taken", "Not taken"
        UNKNOWN = "unknown", "Unknown"

    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name="vitals", null=True, blank=True)
    visit = models.ForeignKey(Visit, on_delete=models.SET_NULL, null=True, blank=True, related_name="vitals")
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
    recorded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="recorded_vitals",
    )

    class Meta:
        ordering = ("-recorded_at", "-created_at")
        indexes = [
            models.Index(fields=["visit", "recorded_at"]),
            models.Index(fields=["patient", "recorded_at"]),
        ]

    def __str__(self) -> str:
        if self.visit_id:
            return f"Vitals for visit {self.visit_id}"
        return f"Vitals for patient {self.patient_id} at {self.recorded_at}"


class AuditLog(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL)
    entity_type = models.CharField(max_length=80)
    entity_id = models.PositiveBigIntegerField()
    action = models.CharField(max_length=80)
    change_summary = models.JSONField(null=True, blank=True)
    before_data = models.JSONField(null=True, blank=True)
    after_data = models.JSONField(null=True, blank=True)
    changed_fields = models.JSONField(null=True, blank=True)
    details = models.TextField(blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("-created_at",)
        indexes = [
            models.Index(fields=["entity_type", "entity_id"]),
            models.Index(fields=["created_at"]),
            models.Index(fields=["user", "created_at"]),
            models.Index(fields=["action", "created_at"]),
        ]

    def __str__(self) -> str:
        return f"{self.action} {self.entity_type}#{self.entity_id}"


class ZulipOutboundEvent(TimeStampedModel):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending delivery"
        SUCCESS = "success", "Delivered successfully"
        FAILED = "failed", "Delivery failed"
        RETRY_BUFFERED = "retry_buffered", "Buffered for retry"

    class LinkedType(models.TextChoices):
        PATIENT = "patient", "Patient"
        TICKET = "ticket", "Support Ticket"
        APPOINTMENT = "appointment", "Appointment"
        CONSENT = "consent", "Consent Form"
        EMPLOYEE = "employee", "Employee / Staff"

    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="zulip_events",
    )
    channel = models.CharField(max_length=80)
    topic = models.CharField(max_length=255)
    linked_entity_type = models.CharField(max_length=40, choices=LinkedType.choices)
    linked_entity_id = models.CharField(max_length=100)
    raw_payload = models.TextField()
    sanitized_payload = models.TextField()
    template_key = models.CharField(max_length=80, default="generic_update", blank=True)
    status = models.CharField(max_length=30, choices=Status.choices, default=Status.PENDING)
    response_metadata = models.JSONField(default=dict, blank=True)
    retry_count = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ("-created_at",)
        indexes = [
            models.Index(fields=["status", "created_at"]),
            models.Index(fields=["channel", "topic"]),
            models.Index(fields=["linked_entity_type", "linked_entity_id"]),
        ]

    def __str__(self) -> str:
        return f"{self.channel} | {self.topic} ({self.status})"


class SupportTicket(TimeStampedModel):
    class TicketStatus(models.TextChoices):
        OPEN = "open", "Open"
        RESOLVED = "resolved", "Resolved"

    title = models.CharField(max_length=255)
    description = models.TextField()
    status = models.CharField(
        max_length=30,
        choices=TicketStatus.choices,
        default=TicketStatus.OPEN,
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="created_tickets",
    )

    class Meta:
        ordering = ("-created_at",)

    def __str__(self) -> str:
        return f"{self.title} ({self.status})"

# Create your models here.


class PartnerCompany(TimeStampedModel):
    class Category(models.TextChoices):
        SUPPLIER = "supplier", "Supplier"
        MEDICAL_AID = "medical_aid", "Medical Aid"
        AFFILIATE = "affiliate", "Affiliate"

    class BankName(models.TextChoices):
        FNB = "fnb", "First National Bank (FNB)"
        STANDARD_BANK = "standard_bank", "Standard Bank"
        NEDBANK = "nedbank", "Nedbank"
        ESWATINI_BANK = "eswatini_bank", "Eswatini Bank"
        ESWATINI_BUILDING_SOCIETY = "eswatini_building_society", "Eswatini Building Society"

    public_id = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    company_code = models.CharField(max_length=100, unique=True, blank=True)
    name = models.CharField(max_length=255)
    category = models.CharField(max_length=50, choices=Category.choices)
    address = models.TextField(blank=True)
    email = models.EmailField(blank=True)
    website = models.URLField(blank=True)
    phone_number = models.CharField(max_length=50, blank=True)
    tax_number = models.CharField(max_length=100, blank=True)
    
    # Banking details (all optional)
    bank_name = models.CharField(max_length=100, choices=BankName.choices, blank=True, default="")
    branch_code = models.CharField(max_length=50, blank=True, default="")
    account_holder = models.CharField(max_length=255, blank=True, default="")
    account_number = models.CharField(max_length=100, blank=True)

    class Meta:
        ordering = ["name"]
        verbose_name_plural = "Partner Companies"

    def __str__(self) -> str:
        return f"{self.name} ({self.get_category_display()})"

    def save(self, *args, **kwargs):
        if not self.company_code:
            import re
            prefix = "COMP-"
            last_company = PartnerCompany.objects.filter(company_code__startswith=prefix).order_by("-company_code").first()
            next_num = 1001
            if last_company:
                match = re.search(r'\d+', last_company.company_code)
                if match:
                    next_num = int(match.group()) + 1
            
            while PartnerCompany.objects.filter(company_code=f"{prefix}{next_num}").exists():
                next_num += 1
                
            self.company_code = f"{prefix}{next_num}"
        super().save(*args, **kwargs)


