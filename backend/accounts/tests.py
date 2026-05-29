from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase

from .models import ClinicianProfile, EmployeeEnrollmentRequest

User = get_user_model()


class ClinicianProfileApiTests(APITestCase):
    def test_clinician_can_save_resume_profile_and_completion_updates(self):
        user = User.objects.create_user(username="doctor_profile", password="password123", role="clinician")
        self.client.force_authenticate(user)

        response = self.client.patch(
            "/api/users/me/clinician-profile/",
            {
                "full_names": "Dr Profile Test",
                "professional_title": "Doctor of Homeopathy",
                "display_name": "Dr Profile Test",
                "professional_email": "profile@harmony.test",
                "professional_phone": "+268 7600 0000",
                "whatsapp_number": "+268 7600 0000",
                "telegram_number": "+268 7600 0000",
                "linkedin_url": "https://linkedin.com/in/profile-test",
                "facebook_url": "https://facebook.com/profile.test",
                "portfolio_url": "https://profile-test.example.com",
                "bio": "Clinician focused on whole-person homeopathic care.",
                "clinical_interests": "Chronic care, family wellness",
                "education": [{"qualification": "DHom", "institution": "Homeopathy College", "year": "2019"}],
                "career_details": [{"role": "Clinician", "organization": "Harmony Health", "start_year": "2020"}],
                "awards_certifications": [{"title": "Good Clinical Practice", "issuer": "Training Body", "year": "2024"}],
                "affiliations": [{"organization": "Homeopathy Association", "role": "Member", "start_year": "2023"}],
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["profile_completion"], 100)
        self.assertEqual(set(response.data["completed_sections"]), set(ClinicianProfile.SECTION_KEYS))

    def test_receptionist_cannot_access_clinician_profile(self):
        user = User.objects.create_user(username="reception_profile", password="password123", role="receptionist")
        self.client.force_authenticate(user)

        response = self.client.get("/api/users/me/clinician-profile/")

        self.assertEqual(response.status_code, 403)


class EmployeeEnrollmentRequestApiTests(APITestCase):
    def test_n8n_can_create_pending_employee_enrollment_request_with_webhook_secret(self):
        with self.settings(HARMONY_WEBHOOK_SECRET="test-secret"):
            response = self.client.post(
                "/api/employee-enrollment-requests/",
                {
                    "full_names": "Jane Dlamini",
                    "email": "jane@harmonyhealthsz.com",
                    "phone_number": "+26876000000",
                    "whatsapp_number": "+26876000000",
                    "telegram_chat_id": "123456",
                    "telegram_username": "jane_d",
                    "requested_role": "Receptionist",
                    "requested_team": "Reception",
                    "source": "telegram",
                },
                format="json",
                HTTP_X_HARMONY_WEBHOOK_SECRET="test-secret",
            )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["status"], EmployeeEnrollmentRequest.Status.PENDING)
        self.assertTrue(EmployeeEnrollmentRequest.objects.filter(full_names="Jane Dlamini").exists())

    def test_employee_enrollment_request_rejects_missing_webhook_secret(self):
        with self.settings(HARMONY_WEBHOOK_SECRET="test-secret"):
            response = self.client.post(
                "/api/employee-enrollment-requests/",
                {
                    "full_names": "Jane Dlamini",
                    "telegram_chat_id": "123456",
                    "source": "telegram",
                },
                format="json",
            )

        self.assertEqual(response.status_code, 401)

    def test_admin_can_list_employee_enrollment_requests(self):
        admin = User.objects.create_user(username="admin_user", password="password123", role="admin")
        EmployeeEnrollmentRequest.objects.create(
            full_names="Jane Dlamini",
            phone_number="+26876000000",
            source=EmployeeEnrollmentRequest.Source.TELEGRAM,
        )
        self.client.force_authenticate(admin)

        response = self.client.get("/api/employee-enrollment-requests/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 1)
