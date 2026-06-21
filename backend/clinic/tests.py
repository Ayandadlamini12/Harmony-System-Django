from datetime import timedelta
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APITestCase

from .models import (
    Appointment, AppointmentType, AuditLog, BlockedSlot, ElevatedAccessRequest, 
    FormDraft, Message, MessageDelivery, MessageParticipant, MessageThread, 
    Patient, PatientCheckIn, PatientCondition, PatientDocument, PatientJourney, 
    PatientProfile, PractitionerAvailability, ResourceRoom, SchedulingOutboxEvent, 
    Visit, VisitSymptomProblem, Vital, ZulipOutboundEvent
)

User = get_user_model()


class PatientApiTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="clinician",
            password="password123",
            role="clinician",
            first_name="Clinical",
            last_name="User",
        )
        self.client.force_authenticate(self.user)

    def test_creates_patient_with_profile_and_generated_code(self):
        response = self.client.post(
            "/api/patients/",
            {
                "first_name": "Nomsa",
                "last_name": "Dlamini",
                "gender": "female",
                "primary_phone": "+26876000000",
                "next_of_kin_full_name": "Nokuthula Dlamini",
                "next_of_kin_phone": "+26876111111",
                "next_of_kin_email": "nokuthula@example.com",
                "next_of_kin_relationship": "mother",
                "profile": {
                    "hiv_status": "undisclosed",
                    "past_medical_history": "Hypertension",
                },
                "conditions": [
                    {
                        "condition_code": "tuberculosis",
                        "condition_label": "Tuberculosis",
                        "present": True,
                        "is_confidential": True,
                    },
                    {
                        "condition_code": "epilepsy",
                        "condition_label": "Epilepsy",
                        "present": False,
                        "is_confidential": True,
                    },
                ],
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        patient = Patient.objects.get()
        self.assertEqual(patient.patient_code, f"HHPAT-100{timezone.now().strftime('%y')}000000")
        self.assertEqual(patient.full_name_display, "Nomsa Dlamini")
        self.assertIsNotNone(patient.public_id)
        self.assertEqual(response.data["public_id"], str(patient.public_id))
        self.assertEqual(patient.next_of_kin_full_name, "Nokuthula Dlamini")
        self.assertEqual(patient.next_of_kin_relationship, "mother")
        self.assertEqual(patient.profile.past_medical_history, "Hypertension")
        self.assertEqual(patient.conditions.count(), 2)
        self.assertTrue(PatientCondition.objects.get(patient=patient, condition_code="tuberculosis").present)
        self.assertFalse(PatientCondition.objects.get(patient=patient, condition_code="epilepsy").present)

    def test_patient_code_sequence_increments_and_uses_last_six_phone_digits(self):
        first = Patient.objects.create(first_name="A", last_name="One", gender="female", primary_phone="+268 7601 2345")
        second = Patient.objects.create(first_name="B", last_name="Two", gender="male", primary_phone="+27 72 555 7788")

        year_suffix = timezone.now().strftime("%y")
        self.assertEqual(first.patient_code, f"HHPAT-100{year_suffix}012345")
        self.assertEqual(second.patient_code, f"HHPAT-101{year_suffix}557788")

    def test_updates_patient_notification_preferences(self):
        patient = Patient.objects.create(first_name="Notify", last_name="Patient", gender="female", primary_phone="+26876001234")

        response = self.client.patch(
            f"/api/patients/{patient.id}/",
            {
                "preferred_notification_channel": "whatsapp",
                "notification_consent": True,
                "whatsapp_number": "+26876009999",
                "telegram_username": "@notifypatient",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        patient.refresh_from_db()
        self.assertEqual(patient.preferred_notification_channel, "whatsapp")
        self.assertTrue(patient.notification_consent)
        self.assertEqual(patient.whatsapp_number, "+26876009999")
        self.assertEqual(patient.telegram_username, "@notifypatient")
        self.assertIsNotNone(patient.notification_consent_at)

    def test_creates_visit_without_embedded_vitals_for_patient(self):
        patient = Patient.objects.create(first_name="John", last_name="Nkosi", gender="male")
        PatientProfile.objects.create(patient=patient)

        response = self.client.post(
            f"/api/patients/{patient.id}/visits/",
            {
                "visit_type": "new_consultation",
                "visit_date": "2026-05-16",
                "main_complaint": "Headache and fatigue",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        visit = Visit.objects.get()
        self.assertEqual(visit.patient, patient)
        self.assertEqual(visit.vitals.count(), 0)

    def test_follow_up_carries_symptom_problems_and_resolves_items(self):
        patient = Patient.objects.create(first_name="Zahara", last_name="Dlamini", gender="female")
        first_response = self.client.post(
            "/api/visits/",
            {
                "patient": patient.id,
                "visit_type": "new_consultation",
                "visit_date": "2026-05-16",
                "main_complaint": "Headache",
                "symptom_problem_updates": [
                    {"description": "Headache", "note": "Worse in the morning", "status": "open"},
                    {"description": "Sinus pressure", "note": "Blocked nose", "status": "open"},
                ],
            },
            format="json",
        )

        self.assertEqual(first_response.status_code, 201)
        headache = VisitSymptomProblem.objects.get(description="Headache")
        self.assertEqual(headache.status, VisitSymptomProblem.Status.OPEN)

        follow_up_response = self.client.post(
            "/api/visits/",
            {
                "patient": patient.id,
                "visit_type": "follow_up",
                "visit_date": "2026-05-25",
                "main_complaint": "Headache",
                "symptom_problem_updates": [
                    {"id": headache.id, "description": "Headache", "note": "Resolved after remedy", "status": "resolved"},
                    {"description": "Fatigue", "note": "New problem reported today", "status": "open"},
                ],
            },
            format="json",
        )

        self.assertEqual(follow_up_response.status_code, 201)
        headache.refresh_from_db()
        self.assertEqual(headache.status, VisitSymptomProblem.Status.RESOLVED)
        self.assertIsNotNone(headache.resolved_visit)
        self.assertTrue(VisitSymptomProblem.objects.filter(patient=patient, description="Fatigue", status="open").exists())

    def test_clinician_can_create_multiple_vitals_for_one_visit(self):
        patient = Patient.objects.create(first_name="John", last_name="Nkosi", gender="male")
        visit = Visit.objects.create(patient=patient, visit_date="2026-05-16", main_complaint="Headache")

        first_response = self.client.post(
            "/api/vitals/",
            {
                "visit": visit.id,
                "bp_first_reading": "120",
                "bp_second_reading": "80",
                "pulse": 72,
                "glucose_mmol_l": "5.6",
                "glucose_context": "after_meals",
                "glucose_food_type": "Porridge and fruit",
            },
            format="json",
        )
        second_response = self.client.post(
            "/api/vitals/",
            {"visit": visit.id, "bp_first_reading": "118", "bp_second_reading": "78", "pulse": 70},
            format="json",
        )

        self.assertEqual(first_response.status_code, 201)
        self.assertEqual(second_response.status_code, 201)
        self.assertEqual(Vital.objects.filter(visit=visit).count(), 2)
        self.assertTrue(AuditLog.objects.filter(entity_type="vital", action="create").exists())

    def test_patient_can_be_retrieved_by_public_id(self):
        patient = Patient.objects.create(first_name="Public", last_name="Lookup", gender="female")

        response = self.client.get(f"/api/patients/{patient.public_id}/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["id"], patient.id)
        self.assertEqual(response.data["public_id"], str(patient.public_id))

    def test_consent_signature_updates_document_and_download(self):
        patient = Patient.objects.create(
            first_name="Zahara",
            last_name="Dlamini",
            gender="female",
            primary_phone="+26876001048",
        )

        create_response = self.client.post(f"/api/patients/{patient.public_id}/documents/consent/", {}, format="json")
        self.assertEqual(create_response.status_code, 201)
        document = PatientDocument.objects.get()
        original_file_name = document.file.name

        signature_response = self.client.post(
            f"/api/patient-documents/{document.id}/sign/",
            {
                "signer_name": "Zahara Dlamini",
                "signer_capacity": "Patient",
                "acknowledgement": True,
                "signature_image": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=",
            },
            format="json",
        )

        self.assertEqual(signature_response.status_code, 200)
        document.refresh_from_db()
        patient.refresh_from_db()
        self.assertEqual(document.status, PatientDocument.Status.SIGNED)
        self.assertEqual(signature_response.data["status"], PatientDocument.Status.SIGNED)
        self.assertEqual(patient.consent_status, Patient.ConsentStatus.SIGNED)
        self.assertIn("digital_signature", document.verification_payload)
        self.assertTrue(document.file.name.endswith(".pdf"))
        self.assertNotEqual(document.file.name, "")
        self.assertEqual(PatientDocument.objects.count(), 1)

        download_response = self.client.get(f"/api/patient-documents/{document.id}/download/")
        self.assertEqual(download_response.status_code, 200)
        self.assertEqual(download_response["Cache-Control"], "no-store, no-cache, must-revalidate, max-age=0")
        document.refresh_from_db()
        self.assertEqual(document.file.name, original_file_name)


class DashboardApiTests(APITestCase):
    def test_dashboard_requires_authentication(self):
        response = self.client.get("/api/dashboard/stats/")

        self.assertEqual(response.status_code, 401)


class FormDraftApiTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="reception_drafts",
            password="password123",
            role="receptionist",
            first_name="Reception",
            last_name="Drafts",
        )
        self.client.force_authenticate(self.user)

    def test_user_can_create_update_and_submit_own_draft(self):
        create_response = self.client.post(
            "/api/form-drafts/",
            {
                "form_type": "patient_registration",
                "current_stage": "identity",
                "payload": {"first_name": "Nomsa"},
            },
            format="json",
        )

        self.assertEqual(create_response.status_code, 201)
        draft = FormDraft.objects.get()
        self.assertEqual(draft.owner_user, self.user)
        self.assertEqual(draft.status, FormDraft.Status.DRAFT)

        update_response = self.client.patch(
            f"/api/form-drafts/{draft.draft_key}/",
            {
                "current_stage": "contact",
                "payload": {"first_name": "Nomsa", "primary_phone": "+26876000000"},
            },
            format="json",
        )
        self.assertEqual(update_response.status_code, 200)
        draft.refresh_from_db()
        self.assertEqual(draft.current_stage, "contact")
        self.assertEqual(draft.payload["primary_phone"], "+26876000000")

        submit_response = self.client.post(f"/api/form-drafts/{draft.draft_key}/submit/", {}, format="json")
        self.assertEqual(submit_response.status_code, 200)
        draft.refresh_from_db()
        self.assertEqual(draft.status, FormDraft.Status.SUBMITTED)
        self.assertIsNotNone(draft.submitted_at)
        self.assertTrue(AuditLog.objects.filter(entity_type="form_draft", action="submit_draft").exists())

    def test_user_only_sees_own_drafts(self):
        other = User.objects.create_user(username="other", password="password123", role="receptionist")
        FormDraft.objects.create(owner_user=other, form_type=FormDraft.FormType.PATIENT_REGISTRATION, current_stage="identity")
        FormDraft.objects.create(owner_user=self.user, form_type=FormDraft.FormType.VISIT_NEW_CONSULTATION, current_stage="vitals")

        response = self.client.get("/api/form-drafts/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["current_stage"], "vitals")


class PatientCheckInApiTests(APITestCase):
    def setUp(self):
        self.patient = Patient.objects.create(
            first_name="Zahara",
            last_name="Dlamini",
            gender="female",
            national_id="P123456",
            primary_phone="+26876001048",
        )

    def test_public_tablet_lookup_uses_patient_code_phone_or_identity(self):
        response = self.client.post(
            "/api/check-ins/lookup/",
            {"identifier": "76001048", "identifier_type": "cell_number"},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["patient"], self.patient.id)
        self.assertEqual(response.data["patient_code"], self.patient.patient_code)

        identity_response = self.client.post(
            "/api/check-ins/lookup/",
            {"identifier": "P123456", "identifier_type": "national_passport_id"},
            format="json",
        )
        self.assertEqual(identity_response.status_code, 200)
        self.assertEqual(identity_response.data["patient"], self.patient.id)

    def test_national_passport_identifier_is_alphanumeric_not_phone_digit_match(self):
        other_patient = Patient.objects.create(
            first_name="Phone",
            last_name="Match",
            gender="male",
            primary_phone="+26876551234",
        )

        response = self.client.post(
            "/api/check-ins/lookup/",
            {"identifier": "551234", "identifier_type": "national_passport_id"},
            format="json",
        )

        self.assertEqual(response.status_code, 404)
        self.assertTrue(Patient.objects.filter(id=other_patient.id).exists())

    def test_public_tablet_check_in_creates_waiting_record(self):
        response = self.client.post(
            "/api/check-ins/",
            {
                "identifier": self.patient.patient_code,
                "visit_type": "follow_up",
                "method": "tablet",
                "identifier_type": "patient_code",
                "source_label": "Front desk tablet",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        check_in = PatientCheckIn.objects.get()
        self.assertEqual(check_in.patient, self.patient)
        self.assertEqual(check_in.visit_type, "follow_up")
        self.assertEqual(check_in.method, "tablet")
        self.assertEqual(check_in.status, PatientCheckIn.Status.WAITING)
        journey = PatientJourney.objects.get(check_in=check_in)
        self.assertEqual(journey.patient, self.patient)
        self.assertEqual(journey.current_stage, PatientJourney.Stage.QUEUED)
        self.assertEqual(journey.flow_type, PatientJourney.FlowType.WALK_IN_QUEUE)
        self.assertEqual(journey.queue_number, 1)
        self.assertEqual(journey.events.count(), 1)

    def test_authenticated_user_can_lookup_patient_current_journey(self):
        user = User.objects.create_user(username="flow_user", password="password123", role="receptionist")
        self.client.force_authenticate(user)
        check_in = PatientCheckIn.objects.create(patient=self.patient, visit_type="follow_up")
        journey = PatientJourney.objects.create(
            patient=self.patient,
            check_in=check_in,
            current_stage=PatientJourney.Stage.QUEUED,
            flow_type=PatientJourney.FlowType.WALK_IN_QUEUE,
            queue_number=4,
        )

        response = self.client.post(
            "/api/patient-journeys/lookup/",
            {"identifier": self.patient.patient_code, "identifier_type": "patient_code"},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["patient"]["id"], self.patient.id)
        self.assertEqual(response.data["current_journey"]["id"], journey.id)
        self.assertEqual(response.data["current_journey"]["queue_number"], 4)

    def test_check_in_queue_number_increments_for_same_service_day(self):
        second_patient = Patient.objects.create(first_name="Second", last_name="Patient", gender="male", primary_phone="+26876009999")
        self.client.post(
            "/api/check-ins/",
            {"identifier": self.patient.patient_code, "visit_type": "follow_up", "method": "tablet", "identifier_type": "patient_code"},
            format="json",
        )
        self.client.post(
            "/api/check-ins/",
            {"identifier": second_patient.patient_code, "visit_type": "follow_up", "method": "tablet", "identifier_type": "patient_code"},
            format="json",
        )

        self.assertEqual(PatientJourney.objects.get(patient=self.patient).queue_number, 1)
        self.assertEqual(PatientJourney.objects.get(patient=second_patient).queue_number, 2)

    def test_patient_cannot_be_checked_in_twice_on_same_service_day(self):
        first_response = self.client.post(
            "/api/check-ins/",
            {"identifier": self.patient.patient_code, "visit_type": "new_consultation", "method": "tablet", "identifier_type": "patient_code"},
            format="json",
        )
        second_response = self.client.post(
            "/api/check-ins/",
            {"identifier": self.patient.patient_code, "visit_type": "new_consultation", "method": "tablet", "identifier_type": "patient_code"},
            format="json",
        )

        self.assertEqual(first_response.status_code, 201)
        self.assertEqual(second_response.status_code, 409)
        self.assertIn("already has an active visit flow today", second_response.data["detail"])
        self.assertEqual(PatientCheckIn.objects.filter(patient=self.patient).count(), 1)

    def test_check_in_allows_new_activation_after_midnight_service_date_changes(self):
        yesterday_check_in = PatientCheckIn.objects.create(patient=self.patient, visit_type="new_consultation")
        PatientJourney.objects.create(
            patient=self.patient,
            check_in=yesterday_check_in,
            service_date=timezone.localdate() - timedelta(days=1),
            current_stage=PatientJourney.Stage.QUEUED,
            flow_type=PatientJourney.FlowType.WALK_IN_QUEUE,
            queue_number=1,
        )

        response = self.client.post(
            "/api/check-ins/",
            {"identifier": self.patient.patient_code, "visit_type": "follow_up", "method": "tablet", "identifier_type": "patient_code"},
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(PatientCheckIn.objects.filter(patient=self.patient).count(), 2)

    def test_check_in_matches_same_day_appointment(self):
        clinician = User.objects.create_user(username="doctor_appt", password="password123", role="clinician")
        appt_type = AppointmentType.objects.create(name="follow_up", default_duration_minutes=30)
        appointment = Appointment.objects.create(
            patient=self.patient,
            appointment_type=appt_type,
            appointment_date=timezone.localdate(),
            start_at=timezone.now(),
            end_at=timezone.now() + timedelta(minutes=30),
            practitioner=clinician,
            notes="Review remedy response",
            status=Appointment.Status.BOOKED
        )

        response = self.client.post(
            "/api/check-ins/",
            {"identifier": self.patient.patient_code, "visit_type": "follow_up", "method": "tablet", "identifier_type": "patient_code"},
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        appointment.refresh_from_db()
        self.assertEqual(appointment.status, Appointment.Status.CHECKED_IN)
        self.assertIsNotNone(appointment.checked_in_at)
        journey = PatientJourney.objects.get(patient=self.patient)
        self.assertEqual(journey.flow_type, PatientJourney.FlowType.APPOINTMENT_CHECKIN)
        self.assertEqual(journey.current_stage, PatientJourney.Stage.CHECKED_IN)
        self.assertEqual(journey.appointment, appointment)
        self.assertIsNone(journey.queue_number)


class AppointmentApiTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(username="admin_appt", password="password123", role="admin")
        self.clinician = User.objects.create_user(username="doctor_default", password="password123", role="clinician")
        self.patient = Patient.objects.create(first_name="Appointment", last_name="Patient", gender="female", primary_phone="+26876001234")
        self.client.force_authenticate(self.admin)

    def test_employee_can_book_appointment_with_default_clinician(self):
        appt_type = AppointmentType.objects.create(name="follow_up", default_duration_minutes=30)
        response = self.client.post(
            "/api/appointments/",
            {
                "patient": self.patient.id,
                "appointment_type": appt_type.id,
                "appointment_date": "2026-05-28",
                "appointment_time": "10:30",
                "source": "internal",
                "notes": "Booked from reception.",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        appointment = Appointment.objects.get()
        self.assertEqual(appointment.practitioner, self.clinician)
        self.assertEqual(appointment.created_by, self.admin)
        self.assertEqual(appointment.status, Appointment.Status.BOOKED)
        self.assertTrue(AuditLog.objects.filter(entity_type="appointment", action="create").exists())


class MessageThreadApiTests(APITestCase):
    def setUp(self):
        self.clinician = User.objects.create_user(
            username="doctor_messages",
            password="password123",
            role="clinician",
            first_name="Doctor",
            last_name="Messages",
        )
        self.receptionist = User.objects.create_user(
            username="reception_messages",
            password="password123",
            role="receptionist",
            first_name="Reception",
            last_name="Messages",
        )
        self.outsider = User.objects.create_user(username="other_messages", password="password123", role="receptionist")
        self.patient = Patient.objects.create(first_name="Message", last_name="Patient", gender="female")
        self.client.force_authenticate(self.clinician)

    def test_user_can_create_thread_with_internal_delivery(self):
        response = self.client.post(
            "/api/message-threads/",
            {
                "subject": "Patient handoff",
                "thread_type": "patient",
                "patient": self.patient.id,
                "participant_ids": [self.receptionist.id],
                "initial_message": "Please confirm the consent form before consultation.",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        thread = MessageThread.objects.get()
        self.assertEqual(thread.patient, self.patient)
        self.assertEqual(thread.participants.count(), 2)
        self.assertEqual(Message.objects.filter(thread=thread).count(), 1)
        self.assertEqual(MessageDelivery.objects.get().recipient_user, self.receptionist)
        self.assertTrue(AuditLog.objects.filter(entity_type="message_thread", action="create").exists())

    def test_only_thread_participants_can_list_messages(self):
        thread = MessageThread.objects.create(subject="Private thread", created_by=self.clinician)
        MessageParticipant.objects.create(thread=thread, user=self.clinician, role=MessageParticipant.Role.OWNER)
        MessageParticipant.objects.create(thread=thread, user=self.receptionist)

        self.client.force_authenticate(self.receptionist)
        allowed_response = self.client.get("/api/message-threads/")
        self.assertEqual(allowed_response.status_code, 200)
        self.assertEqual(allowed_response.data["count"], 1)

        self.client.force_authenticate(self.outsider)
        denied_response = self.client.get("/api/message-threads/")
        self.assertEqual(denied_response.status_code, 200)
        self.assertEqual(denied_response.data["count"], 0)

    def test_participant_can_reply_to_thread(self):
        thread = MessageThread.objects.create(subject="Reply thread", created_by=self.clinician)
        MessageParticipant.objects.create(thread=thread, user=self.clinician, role=MessageParticipant.Role.OWNER)
        MessageParticipant.objects.create(thread=thread, user=self.receptionist)

        self.client.force_authenticate(self.receptionist)
        response = self.client.post(
            f"/api/message-threads/{thread.id}/messages/",
            {"body": "I have checked the document."},
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        thread.refresh_from_db()
        self.assertIsNotNone(thread.last_message_at)
        self.assertEqual(Message.objects.get().sender, self.receptionist)


class ClinicalAccessTests(APITestCase):
    def setUp(self):
        self.receptionist = User.objects.create_user(
            username="reception",
            password="password123",
            role="receptionist",
            first_name="Reception",
            last_name="User",
        )
        self.clinician = User.objects.create_user(
            username="doctor",
            password="password123",
            role="clinician",
            first_name="Doctor",
            last_name="User",
        )
        self.patient = Patient.objects.create(first_name="Lindiwe", last_name="Maseko", gender="female")
        PatientProfile.objects.create(patient=self.patient, past_medical_history="Asthma")
        self.visit = Visit.objects.create(
            patient=self.patient,
            visit_date="2026-05-16",
            main_complaint="Cough",
            diagnosis="Follow-up required",
            practitioner=self.clinician,
        )

    def test_receptionist_patient_detail_excludes_clinical_records_without_approval(self):
        self.client.force_authenticate(self.receptionist)

        response = self.client.get(f"/api/patients/{self.patient.id}/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["clinical_access"], "approval_required")
        self.assertNotIn("profile", response.data)
        self.assertNotIn("visits", response.data)

    def test_patient_update_creates_audit_log_with_changed_fields(self):
        self.client.force_authenticate(self.clinician)

        response = self.client.patch(
            f"/api/patients/{self.patient.id}/",
            {"first_name": "Lindiwe", "last_name": "Updated", "gender": "female"},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        audit = AuditLog.objects.filter(entity_type="patient", action="update").latest("created_at")
        self.assertEqual(audit.user, self.clinician)
        self.assertIn("last_name", audit.changed_fields)
        self.assertEqual(audit.changed_fields["last_name"]["before"], "Maseko")
        self.assertEqual(audit.changed_fields["last_name"]["after"], "Updated")

    def test_clinician_can_approve_receptionist_access_request(self):
        self.client.force_authenticate(self.receptionist)
        create_response = self.client.post(
            "/api/access-requests/",
            {"patient": self.patient.id, "reason": "Need to update intake information before consultation."},
            format="json",
        )
        self.assertEqual(create_response.status_code, 201)

        self.client.force_authenticate(self.clinician)
        approve_response = self.client.post(
            f"/api/access-requests/{create_response.data['id']}/approve/",
            {"hours": 2, "review_note": "Approved for intake update."},
            format="json",
        )

        self.assertEqual(approve_response.status_code, 200)
        self.assertEqual(approve_response.data["status"], ElevatedAccessRequest.Status.APPROVED)
        self.assertIsNotNone(approve_response.data["expires_at"])

    def test_receptionist_can_view_visits_with_active_approval(self):
        ElevatedAccessRequest.objects.create(
            patient=self.patient,
            requested_by=self.receptionist,
            reviewed_by=self.clinician,
            status=ElevatedAccessRequest.Status.APPROVED,
            reviewed_at=timezone.now(),
            expires_at=timezone.now() + timezone.timedelta(hours=1),
        )
        self.client.force_authenticate(self.receptionist)

        response = self.client.get("/api/visits/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 1)


class ZulipCoordinationApiTests(APITestCase):
    def setUp(self):
        self.receptionist = User.objects.create_user(
            username="zulip_reception",
            password="password123",
            role="receptionist",
            first_name="Reception",
            last_name="Agent",
        )
        self.admin = User.objects.create_user(
            username="zulip_admin",
            password="password123",
            role="admin",
            first_name="Admin",
            last_name="Agent",
        )
        self.patient = Patient.objects.create(
            first_name="Zahara",
            last_name="Dlamini",
            gender="female",
            primary_phone="+26876001048",
        )
        self.client.force_authenticate(self.receptionist)

    @patch("clinic.views.post_to_zulip_task.delay")
    def test_post_update_creates_sanitized_event_and_queues_delivery(self, mock_delay):
        response = self.client.post(
            "/api/zulip/post-update/",
            {
                "linked_entity_type": "patient",
                "linked_entity_id": str(self.patient.public_id),
                "template_key": "patient_checked_in",
                "raw_payload": "Patient reports diagnosis of HIV and severe headache.",
                "metadata": {"queue_number": 4},
            },
            format="json",
        )

        self.assertEqual(response.status_code, 202)
        event = ZulipOutboundEvent.objects.get()
        self.assertEqual(event.actor, self.receptionist)
        self.assertEqual(event.channel, "front-desk")
        self.assertEqual(event.linked_entity_type, "patient")
        self.assertIn("[clinical detail redacted for privacy]", event.sanitized_payload.lower())
        self.assertEqual(event.status, ZulipOutboundEvent.Status.PENDING)
        mock_delay.assert_called_once_with(event.id)
        self.assertTrue(AuditLog.objects.filter(entity_type="zulip_outbound_event", action="create").exists())

    def test_non_admin_cannot_post_to_management_channel(self):
        response = self.client.post(
            "/api/zulip/post-update/",
            {
                "channel": "management",
                "topic": "EMPLOYEE | HH2005572",
                "linked_entity_type": "employee",
                "linked_entity_id": "HH2005572",
                "raw_payload": "Provision new staff account.",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 403)

    def test_messages_endpoint_returns_only_visible_events(self):
        own_event = ZulipOutboundEvent.objects.create(
            actor=self.receptionist,
            channel="front-desk",
            topic="PATIENT FLOW | Zahara Dlamini | 2026-06-09",
            linked_entity_type="patient",
            linked_entity_id=str(self.patient.public_id),
            raw_payload="Patient checked in.",
            sanitized_payload="Patient checked in.",
        )
        ZulipOutboundEvent.objects.create(
            actor=self.admin,
            channel="management",
            topic="EMPLOYEE | HH2005572",
            linked_entity_type="employee",
            linked_entity_id="HH2005572",
            raw_payload="Admin-only update.",
            sanitized_payload="Admin-only update.",
        )

        response = self.client.get(
            "/api/zulip/messages/",
            {"channel": "front-desk", "topic": own_event.topic},
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data["results"]), 1)
        self.assertEqual(response.data["results"][0]["id"], own_event.id)

# Create your tests here.

class AppointmentSchedulingTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(username="admin_sched", password="password123", role="admin")
        self.clinician = User.objects.create_user(username="clinician_sched", password="password123", role="clinician")
        self.receptionist = User.objects.create_user(username="receptionist_sched", password="password123", role="receptionist")
        self.patient = Patient.objects.create(first_name="Sched", last_name="Patient", gender="male", primary_phone="+26876009999")
        self.appt_type = AppointmentType.objects.create(name="Consultation", default_duration_minutes=30)
        self.room = ResourceRoom.objects.create(name="Room 1", is_active=True)
        self.client.force_authenticate(self.receptionist)
        
        # Add availability so conflicts pass
        import datetime
        for day in range(7):
            PractitionerAvailability.objects.create(
                practitioner=self.clinician,
                weekday=day,
                start_time=datetime.time(8, 0),
                end_time=datetime.time(17, 0),
                effective_from=timezone.localdate() - timedelta(days=1)
            )
    
    def test_resources_metadata(self):
        response = self.client.get("/api/scheduling/resources/")
        self.assertEqual(response.status_code, 200)
        self.assertIn("appointment_types", response.data)
        self.assertIn("rooms", response.data)
        self.assertIn("practitioners", response.data)
        self.assertEqual(len(response.data["rooms"]), 1)
        self.assertEqual(len(response.data["appointment_types"]), 4)
        self.assertTrue(any(p["id"] == self.clinician.id for p in response.data["practitioners"]))

    def test_capabilities_view(self):
        response = self.client.get("/api/me/capabilities/")
        self.assertEqual(response.status_code, 200)
        self.assertIn("can_create_appointment", response.data)
        self.assertIn("can_move_appointment", response.data)

    def test_admin_can_manage_practitioner_availability(self):
        self.client.force_authenticate(self.admin)
        response = self.client.post("/api/practitioner-availabilities/", {
            "practitioner": self.clinician.id,
            "weekday": 1,
            "start_time": "09:00:00",
            "end_time": "15:30:00",
            "effective_from": timezone.localdate().isoformat(),
            "location": "Main clinic",
        }, format="json")

        self.assertEqual(response.status_code, 201)
        availability_id = response.data["id"]

        response = self.client.patch(f"/api/practitioner-availabilities/{availability_id}/", {
            "end_time": "16:00:00",
        }, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["end_time"], "16:00:00")

        response = self.client.delete(f"/api/practitioner-availabilities/{availability_id}/")
        self.assertEqual(response.status_code, 204)

    def test_clinician_reads_only_own_availability_and_cannot_write(self):
        other_clinician = User.objects.create_user(username="other_clinician_sched", password="password123", role="clinician")
        own = PractitionerAvailability.objects.create(
            practitioner=self.clinician,
            weekday=1,
            start_time="09:00:00",
            end_time="15:00:00",
            effective_from=timezone.localdate(),
        )
        PractitionerAvailability.objects.create(
            practitioner=other_clinician,
            weekday=1,
            start_time="09:00:00",
            end_time="15:00:00",
            effective_from=timezone.localdate(),
        )

        self.client.force_authenticate(self.clinician)
        response = self.client.get("/api/practitioner-availabilities/")
        self.assertEqual(response.status_code, 200)
        ids = [item["id"] for item in response.data["results"]] if "results" in response.data else [item["id"] for item in response.data]
        self.assertIn(own.id, ids)
        self.assertFalse(PractitionerAvailability.objects.exclude(practitioner=self.clinician).filter(id__in=ids).exists())

        response = self.client.post("/api/practitioner-availabilities/", {
            "practitioner": self.clinician.id,
            "weekday": 2,
            "start_time": "09:00:00",
            "end_time": "15:00:00",
            "effective_from": timezone.localdate().isoformat(),
        }, format="json")
        self.assertEqual(response.status_code, 403)

    def test_availability_rejects_invalid_time_range(self):
        self.client.force_authenticate(self.admin)
        response = self.client.post("/api/practitioner-availabilities/", {
            "practitioner": self.clinician.id,
            "weekday": 1,
            "start_time": "15:00:00",
            "end_time": "09:00:00",
            "effective_from": timezone.localdate().isoformat(),
        }, format="json")

        self.assertEqual(response.status_code, 400)
        self.assertIn("end_time", response.data)
    
    def test_board_view(self):
        # Create an appointment for today
        today = timezone.localdate()
        start = timezone.make_aware(timezone.datetime.combine(today, timezone.datetime.min.time())) + timedelta(hours=10)
        appt = Appointment.objects.create(
            patient=self.patient,
            appointment_type=self.appt_type,
            start_at=start,
            end_at=start + timedelta(minutes=30),
            practitioner=self.clinician,
            room=self.room,
            status=Appointment.Status.BOOKED
        )
        
        response = self.client.get("/api/scheduling/board/", {"date": today.isoformat()})
        self.assertEqual(response.status_code, 200)
        self.assertIn("columns", response.data)
        self.assertIn("appointments", response.data)
        self.assertEqual(len(response.data["appointments"]), 1)
        self.assertEqual(response.data["appointments"][0]["id"], appt.id)

    def test_range_appointments_returns_overlapping_enriched_appointments(self):
        today = timezone.localdate()
        start = timezone.make_aware(timezone.datetime.combine(today, timezone.datetime.min.time())) + timedelta(hours=10)
        appointment = Appointment.objects.create(
            patient=self.patient,
            appointment_type=self.appt_type,
            start_at=start,
            end_at=start + timedelta(minutes=30),
            practitioner=self.clinician,
            room=self.room,
            status=Appointment.Status.BOOKED
        )
        PatientJourney.objects.create(
            patient=self.patient,
            service_date=today,
            current_stage=PatientJourney.Stage.WAITING_CLINICIAN,
            is_active=True,
        )

        response = self.client.get("/api/scheduling/appointments/", {
            "start_at": (start + timedelta(minutes=10)).isoformat(),
            "end_at": (start + timedelta(hours=1)).isoformat(),
        })

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["appointments"][0]["id"], appointment.id)
        self.assertEqual(response.data["appointments"][0]["flow_state"], PatientJourney.Stage.WAITING_CLINICIAN)
        self.assertIn("consent_completed", response.data["appointments"][0])

    def test_range_appointments_rejects_invalid_range(self):
        today = timezone.localdate()
        start = timezone.make_aware(timezone.datetime.combine(today, timezone.datetime.min.time())) + timedelta(hours=10)

        response = self.client.get("/api/scheduling/appointments/", {
            "start_at": (start + timedelta(hours=1)).isoformat(),
            "end_at": start.isoformat(),
        })

        self.assertEqual(response.status_code, 400)
        self.assertIn("start_at", response.data["detail"])

    def test_double_booking_conflict(self):
        # Create one appointment
        today = timezone.localdate()
        start = timezone.make_aware(timezone.datetime.combine(today, timezone.datetime.min.time())) + timedelta(hours=10)
        appt = Appointment.objects.create(
            patient=self.patient,
            appointment_type=self.appt_type,
            start_at=start,
            end_at=start + timedelta(minutes=30),
            practitioner=self.clinician,
            status=Appointment.Status.BOOKED
        )
        
        # Try to create another appointment overlapping
        response = self.client.post("/api/appointments/", {
            "patient": self.patient.id,
            "appointment_type": self.appt_type.id,
            "start_at": (start + timedelta(minutes=15)).isoformat(),
            "end_at": (start + timedelta(minutes=45)).isoformat(),
            "practitioner": self.clinician.id,
            "source": "internal"
        }, format="json")
        
        self.assertEqual(response.status_code, 409)
        self.assertIn("conflict", str(response.data).lower())

    def test_move_appointment(self):
        today = timezone.localdate()
        start = timezone.make_aware(timezone.datetime.combine(today, timezone.datetime.min.time())) + timedelta(hours=10)
        appt = Appointment.objects.create(
            patient=self.patient,
            appointment_type=self.appt_type,
            start_at=start,
            end_at=start + timedelta(minutes=30),
            practitioner=self.clinician,
            status=Appointment.Status.BOOKED
        )
        
        new_start = start + timedelta(hours=2)
        new_end = new_start + timedelta(minutes=30)
        
        response = self.client.post(f"/api/appointments/{appt.id}/move/", {
            "start_at": new_start.isoformat(),
            "end_at": new_end.isoformat(),
        }, format="json")
        
        self.assertEqual(response.status_code, 200)
        appt.refresh_from_db()
        self.assertEqual(appt.start_at, new_start)
        self.assertEqual(appt.end_at, new_end)
        
        # Verify outbox event was created
        outbox_exists = SchedulingOutboxEvent.objects.filter(
            event_type="appointment.moved",
            aggregate_id=str(appt.id)
        ).exists()
        self.assertTrue(outbox_exists)

    def test_cancel_appointment(self):
        today = timezone.localdate()
        start = timezone.make_aware(timezone.datetime.combine(today, timezone.datetime.min.time())) + timedelta(hours=10)
        appt = Appointment.objects.create(
            patient=self.patient,
            appointment_type=self.appt_type,
            start_at=start,
            end_at=start + timedelta(minutes=30),
            practitioner=self.clinician,
            status=Appointment.Status.BOOKED
        )
        
        response = self.client.post(f"/api/appointments/{appt.id}/cancel/", {
            "cancel_reason": "Patient requested cancellation"
        }, format="json")
        
        self.assertEqual(response.status_code, 200)
        appt.refresh_from_db()
        self.assertEqual(appt.status, Appointment.Status.CANCELLED)
        self.assertEqual(appt.cancel_reason, "Patient requested cancellation")
        
        outbox_exists = SchedulingOutboxEvent.objects.filter(
            event_type="appointment.cancelled",
            aggregate_id=str(appt.id)
        ).exists()
        self.assertTrue(outbox_exists)
