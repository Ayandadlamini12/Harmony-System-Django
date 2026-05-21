from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APITestCase

from .models import ElevatedAccessRequest, Patient, PatientCondition, PatientProfile, Visit

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
        self.assertTrue(patient.patient_code.startswith("PAT-"))
        self.assertEqual(patient.full_name_display, "Nomsa Dlamini")
        self.assertEqual(patient.profile.past_medical_history, "Hypertension")
        self.assertEqual(patient.conditions.count(), 2)
        self.assertTrue(PatientCondition.objects.get(patient=patient, condition_code="tuberculosis").present)
        self.assertFalse(PatientCondition.objects.get(patient=patient, condition_code="epilepsy").present)

    def test_creates_visit_with_vitals_for_patient(self):
        patient = Patient.objects.create(first_name="John", last_name="Nkosi", gender="male")
        PatientProfile.objects.create(patient=patient)

        response = self.client.post(
            f"/api/patients/{patient.id}/visits/",
            {
                "visit_type": "new_consultation",
                "visit_date": "2026-05-16",
                "main_complaint": "Headache and fatigue",
                "vitals": {
                    "bp_first_reading": "120",
                    "bp_second_reading": "80",
                    "pulse": 72,
                    "glucose_mmol_l": "5.6",
                    "glucose_context": "after_meals",
                    "glucose_food_type": "Porridge and fruit",
                },
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        visit = Visit.objects.select_related("vitals").get()
        self.assertEqual(visit.patient, patient)
        self.assertEqual(visit.vitals.pulse, 72)
        self.assertEqual(str(visit.vitals.glucose_mmol_l), "5.6")
        self.assertEqual(visit.vitals.glucose_food_type, "Porridge and fruit")


class DashboardApiTests(APITestCase):
    def test_dashboard_requires_authentication(self):
        response = self.client.get("/api/dashboard/stats/")

        self.assertEqual(response.status_code, 401)


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

# Create your tests here.
