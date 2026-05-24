from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase

from .models import ClinicianProfile

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
