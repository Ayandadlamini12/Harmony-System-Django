from django.test import TestCase


class NotFoundContextTests(TestCase):
    def test_patient_path_gets_patient_specific_context(self):
        response = self.client.get("/api/system/not-found-context/?path=/patients/missing-record")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["module"], "patients")
        self.assertEqual(payload["primary_href"], "/patients")
        self.assertIn("patient", payload["message"].lower())
        self.assertFalse(payload["secret_values_exposed"])

    def test_unknown_path_gets_dashboard_context_and_login_redirect(self):
        response = self.client.get("/api/system/not-found-context/?path=/unknown/tool")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["module"], "general")
        self.assertEqual(payload["primary_href"], "/")
        self.assertEqual(payload["login_href"], "/login?redirect=/unknown/tool")
        self.assertFalse(payload["secret_values_exposed"])
