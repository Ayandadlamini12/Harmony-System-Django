from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase

from .models import Patient, PatientProfile, Visit

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
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        patient = Patient.objects.get()
        self.assertTrue(patient.patient_code.startswith("PAT-"))
        self.assertEqual(patient.full_name_display, "Nomsa Dlamini")
        self.assertEqual(patient.profile.past_medical_history, "Hypertension")

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
                },
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        visit = Visit.objects.select_related("vitals").get()
        self.assertEqual(visit.patient, patient)
        self.assertEqual(visit.vitals.pulse, 72)


class DashboardApiTests(APITestCase):
    def test_dashboard_requires_authentication(self):
        response = self.client.get("/api/dashboard/stats/")

        self.assertEqual(response.status_code, 401)

# Create your tests here.
