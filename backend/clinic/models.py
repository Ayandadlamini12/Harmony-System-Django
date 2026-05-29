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
    region = models.CharField(max_length=120, blank=True)
    town_or_locality = models.CharField(max_length=120, blank=True)
    village = models.CharField(max_length=120, blank=True)
    status = models.CharField(max_length=30, default="active")
    consent_status = models.CharField(max_length=30, choices=ConsentStatus.choices, default=ConsentStatus.PENDING)
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


class Appointment(TimeStampedModel):
    class Source(models.TextChoices):
        INTERNAL = "internal", "Internal"
        TELEGRAM = "telegram", "Telegram"
        WHATSAPP = "whatsapp", "WhatsApp"
        API = "api", "API"

    class Status(models.TextChoices):
        SCHEDULED = "scheduled", "Scheduled"
        CHECKED_IN = "checked_in", "Checked in"
        COMPLETED = "completed", "Completed"
        CANCELLED = "cancelled", "Cancelled"
        NO_SHOW = "no_show", "No show"

    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name="appointments")
    appointment_type = models.CharField(max_length=40, choices=Visit.VisitType.choices, default=Visit.VisitType.FOLLOW_UP)
    appointment_date = models.DateField()
    appointment_time = models.TimeField(null=True, blank=True)
    source = models.CharField(max_length=30, choices=Source.choices, default=Source.INTERNAL)
    assigned_clinician = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="assigned_appointments",
    )
    notes = models.TextField(blank=True)
    status = models.CharField(max_length=30, choices=Status.choices, default=Status.SCHEDULED)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="created_appointments",
    )
    checked_in_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ("appointment_date", "appointment_time", "created_at")
        indexes = [
            models.Index(fields=["appointment_date", "status"]),
            models.Index(fields=["patient", "appointment_date"]),
            models.Index(fields=["assigned_clinician", "appointment_date"]),
        ]

    def __str__(self) -> str:
        return f"{self.patient.full_name_display} - {self.get_appointment_type_display()} on {self.appointment_date}"


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


class Vital(TimeStampedModel):
    class GlucoseContext(models.TextChoices):
        FASTING = "fasting", "Fasting"
        AFTER_MEALS = "after_meals", "After meals"
        UNKNOWN = "unknown", "Unknown"

    class MedicationStatus(models.TextChoices):
        TAKEN = "taken", "Taken"
        NOT_TAKEN = "not_taken", "Not taken"
        UNKNOWN = "unknown", "Unknown"

    visit = models.ForeignKey(Visit, on_delete=models.CASCADE, related_name="vitals")
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
        ]

    def __str__(self) -> str:
        return f"Vitals for visit {self.visit_id}"


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
        indexes = [models.Index(fields=["entity_type", "entity_id"])]

    def __str__(self) -> str:
        return f"{self.action} {self.entity_type}#{self.entity_id}"

# Create your models here.
