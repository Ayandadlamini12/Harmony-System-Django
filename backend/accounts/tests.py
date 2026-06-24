from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APITestCase

from .models import ApiToken, AuthenticationEvent, ClinicianProfile, EmployeeEnrollmentRequest, UserNotificationChannel

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


class NotificationSettingsApiTests(APITestCase):
    def test_user_can_save_notification_settings(self):
        user = User.objects.create_user(
            username="notify_user",
            password="password123",
            role="clinician",
            email="notify@harmony.test",
        )
        self.client.force_authenticate(user)

        response = self.client.patch(
            "/api/users/me/notification-settings/",
            {
                "email": "notify.updated@harmony.test",
                "channels": [
                    {
                        "channel": "whatsapp",
                        "value": "+26876001111",
                        "is_preferred": True,
                        "verification_status": "pending",
                    },
                    {
                        "channel": "telegram",
                        "value": "@harmonydoctor",
                        "verification_status": "unverified",
                    },
                ],
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        user.refresh_from_db()
        self.assertEqual(user.email, "notify.updated@harmony.test")
        self.assertEqual(user.notification_channels.count(), 2)
        self.assertTrue(user.notification_channels.get(channel="whatsapp").is_preferred)
        self.assertFalse(user.notification_channels.get(channel="telegram").is_preferred)

    def test_user_can_get_notification_settings(self):
        user = User.objects.create_user(
            username="notify_read_user",
            password="password123",
            role="receptionist",
            email="reception@harmony.test",
        )
        UserNotificationChannel.objects.create(
            user=user,
            channel=UserNotificationChannel.Channel.WHATSAPP,
            value="+26876002222",
            is_preferred=True,
            verification_status=UserNotificationChannel.VerificationStatus.PENDING,
        )
        self.client.force_authenticate(user)

        response = self.client.get("/api/users/me/notification-settings/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["email"], "reception@harmony.test")
        self.assertEqual(len(response.data["channels"]), 1)
        self.assertEqual(response.data["channels"][0]["channel"], "whatsapp")


class ChannelVerificationApiTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="verify_user",
            password="password123",
            role="clinician",
            email="verify@harmony.test",
        )
        self.client.force_authenticate(self.user)

    @patch("accounts.tasks.dispatch_n8n_webhook_task.delay")
    def test_initiate_verification_generates_code_and_sets_pending(self, mock_dispatch):
        channel = UserNotificationChannel.objects.create(
            user=self.user,
            channel=UserNotificationChannel.Channel.WHATSAPP,
            value="+26876001234",
            verification_status=UserNotificationChannel.VerificationStatus.UNVERIFIED,
        )

        response = self.client.post(
            "/api/users/me/notification-settings/initiate-verification/",
            {"channel": "whatsapp"},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["status"], "pending")

        channel.refresh_from_db()
        self.assertEqual(channel.verification_status, UserNotificationChannel.VerificationStatus.PENDING)
        self.assertTrue(channel.metadata.get("verification_code"))
        self.assertTrue(channel.metadata.get("verification_code_expires_at"))
        self.assertIsNone(channel.verified_at)

        mock_dispatch.assert_called_once()
        event_type, payload = mock_dispatch.call_args.args
        self.assertEqual(event_type, "user_verification_requested")
        self.assertEqual(payload["username"], self.user.username)
        self.assertEqual(payload["channel"], "whatsapp")
        self.assertEqual(payload["value"], "+26876001234")
        self.assertEqual(payload["code"], channel.metadata["verification_code"])
        self.assertIn("event_id", payload)

    @patch("accounts.tasks.dispatch_n8n_webhook_task.delay")
    def test_initiate_verification_generates_telegram_token_and_sets_pending(self, mock_dispatch):
        channel = UserNotificationChannel.objects.create(
            user=self.user,
            channel=UserNotificationChannel.Channel.TELEGRAM,
            value="@verify_user",
            verification_status=UserNotificationChannel.VerificationStatus.UNVERIFIED,
        )

        with self.settings(TELEGRAM_VERIFICATION_BOT_USERNAME="HarmonyVerificationBot"):
            response = self.client.post(
                "/api/users/me/notification-settings/initiate-verification/",
                {"channel": "telegram"},
                format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["status"], "pending")
        self.assertEqual(response.data["channel"], "telegram")

        channel.refresh_from_db()
        self.assertEqual(channel.verification_status, UserNotificationChannel.VerificationStatus.PENDING)
        self.assertTrue(channel.metadata.get("verification_token"))
        self.assertTrue(channel.metadata.get("verification_token_expires_at"))
        self.assertNotIn("verification_code", channel.metadata)
        self.assertEqual(response.data["verification_token"], channel.metadata["verification_token"])
        self.assertIn("token_expires_at", response.data)
        self.assertEqual(
            response.data["telegram_start_link"],
            f"https://t.me/HarmonyVerificationBot?start={response.data['verification_token']}",
        )

        mock_dispatch.assert_called_once()
        event_type, payload = mock_dispatch.call_args.args
        self.assertEqual(event_type, "user_verification_requested")
        self.assertEqual(payload["username"], self.user.username)
        self.assertEqual(payload["channel"], "telegram")
        self.assertEqual(payload["value"], "@verify_user")
        self.assertEqual(payload["verification_token"], channel.metadata["verification_token"])
        self.assertIn("token_expires_at", payload)

    def test_initiate_verification_validates_channel(self):
        response = self.client.post(
            "/api/users/me/notification-settings/initiate-verification/",
            {"channel": "invalid_channel"},
            format="json",
        )
        self.assertEqual(response.status_code, 400)

        response = self.client.post(
            "/api/users/me/notification-settings/initiate-verification/",
            {"channel": "email"},
            format="json",
        )
        self.assertEqual(response.status_code, 400)

    def test_initiate_verification_requires_channel_to_exist(self):
        response = self.client.post(
            "/api/users/me/notification-settings/initiate-verification/",
            {"channel": "telegram"},
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("not configured", response.data["error"])

    def test_initiate_verification_requires_non_empty_value(self):
        UserNotificationChannel.objects.create(
            user=self.user,
            channel=UserNotificationChannel.Channel.TELEGRAM,
            value="",
            verification_status=UserNotificationChannel.VerificationStatus.UNVERIFIED,
        )

        response = self.client.post(
            "/api/users/me/notification-settings/initiate-verification/",
            {"channel": "telegram"},
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("value is empty", response.data["error"])

    @patch("accounts.tasks.dispatch_n8n_webhook_task.delay")
    def test_confirm_verification_verifies_correct_code(self, mock_dispatch):
        channel = UserNotificationChannel.objects.create(
            user=self.user,
            channel=UserNotificationChannel.Channel.WHATSAPP,
            value="+26876001234",
            verification_status=UserNotificationChannel.VerificationStatus.PENDING,
            metadata={
                "verification_code": "123456",
                "verification_code_expires_at": (timezone.now() + timezone.timedelta(minutes=15)).isoformat(),
            },
        )

        response = self.client.post(
            "/api/users/me/notification-settings/confirm-verification/",
            {"channel": "whatsapp", "code": "123456"},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["status"], "verified")

        channel.refresh_from_db()
        self.assertEqual(channel.verification_status, UserNotificationChannel.VerificationStatus.VERIFIED)
        self.assertIsNotNone(channel.verified_at)
        self.assertNotIn("verification_code", channel.metadata)
        self.assertNotIn("verification_code_expires_at", channel.metadata)
        mock_dispatch.assert_not_called()

    def test_confirm_verification_rejects_expired_or_incorrect_code(self):
        UserNotificationChannel.objects.create(
            user=self.user,
            channel=UserNotificationChannel.Channel.WHATSAPP,
            value="+26876001234",
            verification_status=UserNotificationChannel.VerificationStatus.PENDING,
            metadata={
                "verification_code": "123456",
                "verification_code_expires_at": (timezone.now() - timezone.timedelta(minutes=1)).isoformat(),
            },
        )

        response = self.client.post(
            "/api/users/me/notification-settings/confirm-verification/",
            {"channel": "whatsapp", "code": "654321"},
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("Invalid verification code", response.data["error"])

        response = self.client.post(
            "/api/users/me/notification-settings/confirm-verification/",
            {"channel": "whatsapp", "code": "123456"},
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("expired", response.data["error"])

    def test_inbound_webhook_rejects_without_callback_secret(self):
        with self.settings(N8N_CALLBACK_SECRET="secret-123"):
            response = self.client.post(
                "/api/webhooks/verify-channel/",
                {"username": "verify_user", "channel": "whatsapp", "direct_verify": True},
                format="json",
            )
        self.assertEqual(response.status_code, 403)

    @patch("accounts.tasks.dispatch_n8n_webhook_task.delay")
    def test_inbound_webhook_direct_verifies_with_secret(self, mock_dispatch):
        with self.settings(N8N_CALLBACK_SECRET="secret-123"):
            response = self.client.post(
                "/api/webhooks/verify-channel/",
                {
                    "username": "verify_user",
                    "channel": "telegram",
                    "value": "987654321",
                    "direct_verify": True,
                },
                format="json",
                HTTP_X_HARMONY_N8N_CALLBACK_SECRET="secret-123",
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["status"], "verified")

        channel = UserNotificationChannel.objects.get(user=self.user, channel="telegram")
        self.assertEqual(channel.verification_status, UserNotificationChannel.VerificationStatus.VERIFIED)
        self.assertEqual(channel.value, "987654321")
        self.assertIsNotNone(channel.verified_at)
        mock_dispatch.assert_not_called()

    @patch("accounts.tasks.dispatch_n8n_webhook_task.delay")
    def test_inbound_webhook_direct_verifies_with_legacy_harmony_secret(self, mock_dispatch):
        with self.settings(N8N_CALLBACK_SECRET="", HARMONY_WEBHOOK_SECRET="secret-123"):
            response = self.client.post(
                "/api/webhooks/verify-channel/",
                {
                    "username": "verify_user",
                    "channel": "telegram",
                    "value": "987654321",
                    "direct_verify": True,
                },
                format="json",
                HTTP_X_HARMONY_WEBHOOK_SECRET="secret-123",
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["status"], "verified")

        channel = UserNotificationChannel.objects.get(user=self.user, channel="telegram")
        self.assertEqual(channel.verification_status, UserNotificationChannel.VerificationStatus.VERIFIED)
        self.assertEqual(channel.value, "987654321")
        self.assertIsNotNone(channel.verified_at)
        mock_dispatch.assert_not_called()

    @patch("accounts.tasks.dispatch_n8n_webhook_task.delay")
    def test_inbound_webhook_direct_verifies_with_opaque_token(self, mock_dispatch):
        channel = UserNotificationChannel.objects.create(
            user=self.user,
            channel=UserNotificationChannel.Channel.TELEGRAM,
            value="@verify_user",
            verification_status=UserNotificationChannel.VerificationStatus.PENDING,
            metadata={
                "verification_token": "opaque-token-123",
                "verification_token_expires_at": (timezone.now() + timezone.timedelta(minutes=15)).isoformat(),
            },
        )

        with self.settings(N8N_CALLBACK_SECRET="secret-123"):
            response = self.client.post(
                "/api/webhooks/verify-channel/",
                {
                    "username": "opaque-token-123",
                    "verification_token": "opaque-token-123",
                    "channel": "telegram",
                    "value": "987654321",
                    "direct_verify": True,
                    "telegram_chat_id": "987654321",
                    "telegram_username": "verify_user_bot",
                    "telegram_user_id": "112233",
                    "token_resolution_mode": "token-deferred-to-harmony",
                },
                format="json",
                HTTP_X_HARMONY_N8N_CALLBACK_SECRET="secret-123",
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["status"], "verified")

        channel.refresh_from_db()
        self.assertEqual(channel.verification_status, UserNotificationChannel.VerificationStatus.VERIFIED)
        self.assertEqual(channel.value, "987654321")
        self.assertEqual(channel.metadata["telegram_chat_id"], "987654321")
        self.assertEqual(channel.metadata["telegram_username"], "verify_user_bot")
        self.assertEqual(channel.metadata["telegram_user_id"], "112233")
        self.assertNotIn("verification_token", channel.metadata)
        mock_dispatch.assert_not_called()

    @patch("accounts.tasks.dispatch_n8n_webhook_task.delay")
    def test_inbound_webhook_verifies_with_code_and_secret(self, mock_dispatch):
        channel = UserNotificationChannel.objects.create(
            user=self.user,
            channel=UserNotificationChannel.Channel.WHATSAPP,
            value="+26876001234",
            verification_status=UserNotificationChannel.VerificationStatus.PENDING,
            metadata={
                "verification_code": "789012",
                "verification_code_expires_at": (timezone.now() + timezone.timedelta(minutes=15)).isoformat(),
            },
        )

        with self.settings(N8N_CALLBACK_SECRET="secret-123"):
            response = self.client.post(
                "/api/webhooks/verify-channel/",
                {
                    "username": "verify_user",
                    "channel": "whatsapp",
                    "verification_code": "789012",
                },
                format="json",
                HTTP_X_HARMONY_N8N_CALLBACK_SECRET="secret-123",
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["status"], "verified")

        channel.refresh_from_db()
        self.assertEqual(channel.verification_status, UserNotificationChannel.VerificationStatus.VERIFIED)
        self.assertIsNotNone(channel.verified_at)
        mock_dispatch.assert_not_called()


class SystemSecurityStatusApiTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(username="security_admin", password="password123", role="admin")
        self.receptionist = User.objects.create_user(username="security_reception", password="password123", role="receptionist")

    def test_admin_can_read_security_status_without_secret_values(self):
        self.client.force_authenticate(self.admin)

        with self.settings(
            KEYCLOAK_ENABLED=True,
            KEYCLOAK_SERVER_URL="https://auth.harmonyhealthsz.com",
            KEYCLOAK_REALM="harmony-health",
            KEYCLOAK_CLIENT_ID="harmony-mis",
            KEYCLOAK_CLIENT_SECRET="secret-value",
            KEYCLOAK_ADMIN_USERNAME="admin-user",
            KEYCLOAK_ADMIN_PASSWORD="admin-password",
            KEYCLOAK_ALLOW_LOCAL_FALLBACK=True,
            KEYCLOAK_ACTION_EMAIL_LIFESPAN=432000,
        ):
            response = self.client.get("/api/system/security-status/")

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data["keycloak"]["enabled"])
        self.assertEqual(response.data["keycloak"]["server_url"], "https://auth.harmonyhealthsz.com")
        self.assertTrue(response.data["keycloak"]["client_secret_configured"])
        self.assertTrue(response.data["keycloak"]["admin_password_configured"])
        self.assertNotIn("secret-value", str(response.data))
        self.assertNotIn("admin-password", str(response.data))
        self.assertEqual(response.data["keycloak"]["missing_required"], [])
        self.assertEqual(response.data["sessions"]["access_token_lifetime_minutes"], 30)
        self.assertEqual(response.data["sessions"]["refresh_token_lifetime_days"], 7)
        self.assertTrue(response.data["sessions"]["jwt_stateless"])
        self.assertIn("cookie_policy", response.data["sessions"])
        self.assertIn("authentication_activity", response.data)
        self.assertIn("recent_successful_logins", response.data["authentication_activity"])
        self.assertTrue(response.data["authentication_activity"]["failed_login_instrumented"])
        self.assertIn("policies", response.data)
        self.assertTrue(response.data["policies"]["read_only"])
        self.assertFalse(response.data["policies"]["secret_values_exposed"])
        self.assertIn("keycloak", response.data["tabs"])
        self.assertIn("sessions", response.data["tabs"])
        self.assertIn("authentication_activity", response.data["tabs"])

    def test_non_admin_cannot_read_security_status(self):
        self.client.force_authenticate(self.receptionist)

        response = self.client.get("/api/system/security-status/")

        self.assertEqual(response.status_code, 403)

    def test_missing_keycloak_configuration_is_reported_when_enabled(self):
        self.client.force_authenticate(self.admin)

        with self.settings(
            KEYCLOAK_ENABLED=True,
            KEYCLOAK_SERVER_URL="",
            KEYCLOAK_REALM="harmony-health",
            KEYCLOAK_CLIENT_ID="harmony-mis",
            KEYCLOAK_CLIENT_SECRET="",
            KEYCLOAK_ADMIN_USERNAME="",
            KEYCLOAK_ADMIN_PASSWORD="",
        ):
            response = self.client.get("/api/system/security-status/")

        self.assertEqual(response.status_code, 200)
        self.assertIn("KEYCLOAK_SERVER_URL", response.data["keycloak"]["missing_required"])
        self.assertIn("KEYCLOAK_CLIENT_SECRET", response.data["keycloak"]["missing_required"])
        self.assertFalse(response.data["deployment"]["backend_keycloak_env_ok"])
        self.assertTrue(any(warning["code"] == "keycloak_missing_required_env" for warning in response.data["warnings"]))

    def test_security_status_includes_recent_login_activity(self):
        AuthenticationEvent.objects.create(
            user=self.admin,
            attempted_identifier=self.admin.username,
            outcome=AuthenticationEvent.Outcome.SUCCESS,
            method=AuthenticationEvent.Method.KEYCLOAK,
            reason_code="authenticated",
        )
        self.client.force_authenticate(self.admin)

        response = self.client.get("/api/system/security-status/")

        self.assertEqual(response.status_code, 200)
        recent_logins = response.data["authentication_activity"]["recent_successful_logins"]
        self.assertEqual(recent_logins[0]["username"], "security_admin")
        self.assertEqual(recent_logins[0]["role"], "admin")
        self.assertIn("last_login", recent_logins[0])


class AuthenticationProtectionApiTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(username="auth_admin", password="password123", role="admin")
        self.user = User.objects.create_user(username="auth_user", password="password123", role="receptionist")

    def test_successful_local_login_is_recorded_without_credentials(self):
        with self.settings(KEYCLOAK_ENABLED=False):
            response = self.client.post(
                "/api/auth/token/",
                {"user_id": "auth_user", "password": "password123"},
                format="json",
                REMOTE_ADDR="10.0.0.5",
                HTTP_USER_AGENT="Harmony test client",
            )

        self.assertEqual(response.status_code, 200)
        event = AuthenticationEvent.objects.get()
        self.assertEqual(event.outcome, AuthenticationEvent.Outcome.SUCCESS)
        self.assertEqual(event.method, AuthenticationEvent.Method.LOCAL)
        self.assertEqual(event.user, self.user)
        self.assertEqual(event.ip_address, "10.0.0.5")
        self.assertNotIn("password123", str(event.__dict__))
        self.user.refresh_from_db()
        self.assertIsNotNone(self.user.last_login)

    def test_failed_login_is_recorded(self):
        with self.settings(KEYCLOAK_ENABLED=False):
            response = self.client.post(
                "/api/auth/token/",
                {"user_id": "auth_user", "password": "wrong-password"},
                format="json",
            )

        self.assertEqual(response.status_code, 400)
        event = AuthenticationEvent.objects.get()
        self.assertEqual(event.outcome, AuthenticationEvent.Outcome.FAILURE)
        self.assertEqual(event.reason_code, "invalid_credentials")

    def test_temporary_lockout_blocks_even_correct_password(self):
        policy = self.settings(
            KEYCLOAK_ENABLED=False,
            AUTH_MAX_FAILED_ATTEMPTS=2,
            AUTH_FAILURE_WINDOW_MINUTES=15,
            AUTH_LOCKOUT_DURATION_MINUTES=15,
        )
        with policy:
            for _ in range(2):
                self.client.post(
                    "/api/auth/token/",
                    {"user_id": "auth_user", "password": "wrong-password"},
                    format="json",
                )
            response = self.client.post(
                "/api/auth/token/",
                {"user_id": "auth_user", "password": "password123"},
                format="json",
            )

        self.assertEqual(response.status_code, 429)
        self.assertEqual(str(response.data["code"]), "temporary_lockout")
        self.assertEqual(AuthenticationEvent.objects.filter(outcome="failure").count(), 2)
        self.assertEqual(AuthenticationEvent.objects.filter(outcome="blocked").count(), 1)
        self.assertFalse(AuthenticationEvent.objects.filter(outcome="success").exists())

    @patch("accounts.keycloak.keycloak_password_login")
    def test_local_fallback_success_is_attributed(self, mock_keycloak_login):
        from .keycloak import KeycloakAuthenticationError

        mock_keycloak_login.side_effect = KeycloakAuthenticationError("invalid")
        with self.settings(
            KEYCLOAK_ENABLED=True,
            KEYCLOAK_SERVER_URL="https://auth.example.test",
            KEYCLOAK_REALM="test",
            KEYCLOAK_CLIENT_ID="test-client",
            KEYCLOAK_ALLOW_LOCAL_FALLBACK=True,
        ):
            response = self.client.post(
                "/api/auth/token/",
                {"user_id": "auth_user", "password": "password123"},
                format="json",
            )

        self.assertEqual(response.status_code, 200)
        event = AuthenticationEvent.objects.get()
        self.assertEqual(event.method, AuthenticationEvent.Method.LOCAL_FALLBACK)
        self.assertEqual(event.outcome, AuthenticationEvent.Outcome.SUCCESS)

    def test_authentication_event_api_is_admin_only_and_filterable(self):
        AuthenticationEvent.objects.create(
            user=self.user,
            attempted_identifier=self.user.username,
            outcome=AuthenticationEvent.Outcome.FAILURE,
            method=AuthenticationEvent.Method.LOCAL,
            reason_code="invalid_credentials",
        )
        self.client.force_authenticate(self.user)
        denied = self.client.get("/api/authentication-events/")
        self.assertEqual(denied.status_code, 403)

        self.client.force_authenticate(self.admin)
        response = self.client.get("/api/authentication-events/?outcome=failure&method=local")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["reason_code"], "invalid_credentials")

        summary = self.client.get("/api/authentication-events/summary/")
        self.assertEqual(summary.status_code, 200)
        self.assertEqual(summary.data["failed_logins"], 1)
        self.assertIn("policy", summary.data)

    def test_authentication_event_retention_prunes_only_expired_events(self):
        from .tasks import prune_authentication_events

        expired = AuthenticationEvent.objects.create(
            attempted_identifier="expired_user",
            outcome=AuthenticationEvent.Outcome.FAILURE,
            method=AuthenticationEvent.Method.LOCAL,
        )
        AuthenticationEvent.objects.filter(pk=expired.pk).update(
            created_at=timezone.now() - timezone.timedelta(days=366)
        )
        recent = AuthenticationEvent.objects.create(
            attempted_identifier="recent_user",
            outcome=AuthenticationEvent.Outcome.FAILURE,
            method=AuthenticationEvent.Method.LOCAL,
        )

        with self.settings(AUTH_EVENT_RETENTION_DAYS=365):
            deleted_count = prune_authentication_events()

        self.assertEqual(deleted_count, 1)
        self.assertFalse(AuthenticationEvent.objects.filter(pk=expired.pk).exists())
        self.assertTrue(AuthenticationEvent.objects.filter(pk=recent.pk).exists())


class ApiTokenApiTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(username="token_admin", password="password123", role="admin")
        self.receptionist = User.objects.create_user(username="token_reception", password="password123", role="receptionist")

    def test_admin_can_create_token_and_plain_value_is_returned_once(self):
        self.client.force_authenticate(self.admin)

        response = self.client.post(
            "/api/system/api-tokens/",
            {
                "name": "n8n calendar sync",
                "scopes": ["n8n", "calendar_sync"],
                "notes": "Used by n8n appointment workflows.",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertIn("token", response.data)
        self.assertTrue(response.data["token"].startswith("hmis_"))
        self.assertNotIn("token_hash", response.data)
        token = ApiToken.objects.get()
        self.assertEqual(token.created_by, self.admin)
        self.assertEqual(token.scopes, ["calendar_sync", "n8n"])
        self.assertNotEqual(token.token_hash, response.data["token"])

        list_response = self.client.get("/api/system/api-tokens/")
        self.assertEqual(list_response.status_code, 200)
        self.assertNotIn(response.data["token"], str(list_response.data))
        self.assertNotIn("token_hash", str(list_response.data))

    def test_non_admin_cannot_manage_tokens(self):
        self.client.force_authenticate(self.receptionist)

        response = self.client.get("/api/system/api-tokens/")

        self.assertEqual(response.status_code, 403)

    def test_invalid_scope_is_rejected(self):
        self.client.force_authenticate(self.admin)

        response = self.client.post(
            "/api/system/api-tokens/",
            {"name": "bad token", "scopes": ["root"]},
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertFalse(ApiToken.objects.exists())

    def test_admin_can_revoke_token_but_not_delete_it(self):
        self.client.force_authenticate(self.admin)
        create_response = self.client.post(
            "/api/system/api-tokens/",
            {"name": "external reporting", "scopes": ["read"]},
            format="json",
        )
        token_id = create_response.data["id"]

        revoke_response = self.client.post(f"/api/system/api-tokens/{token_id}/revoke/")
        delete_response = self.client.delete(f"/api/system/api-tokens/{token_id}/")

        self.assertEqual(revoke_response.status_code, 200)
        self.assertIsNotNone(revoke_response.data["revoked_at"])
        self.assertEqual(delete_response.status_code, 405)
        token = ApiToken.objects.get(pk=token_id)
        self.assertEqual(token.revoked_by, self.admin)

    def test_active_api_token_authenticates_request_and_updates_last_used(self):
        self.client.force_authenticate(self.admin)
        create_response = self.client.post(
            "/api/system/api-tokens/",
            {"name": "admin automation", "scopes": ["read"]},
            format="json",
        )
        raw_token = create_response.data["token"]
        self.client.force_authenticate(user=None)

        response = self.client.get(
            "/api/system/security-status/",
            HTTP_X_HARMONY_API_TOKEN=raw_token,
        )

        self.assertEqual(response.status_code, 200)
        token = ApiToken.objects.get(pk=create_response.data["id"])
        self.assertIsNotNone(token.last_used_at)

    def test_revoked_api_token_is_rejected(self):
        self.client.force_authenticate(self.admin)
        create_response = self.client.post(
            "/api/system/api-tokens/",
            {"name": "revoked automation", "scopes": ["read"]},
            format="json",
        )
        raw_token = create_response.data["token"]
        self.client.post(f"/api/system/api-tokens/{create_response.data['id']}/revoke/")
        self.client.force_authenticate(user=None)

        response = self.client.get(
            "/api/system/security-status/",
            HTTP_X_HARMONY_API_TOKEN=raw_token,
        )

        self.assertEqual(response.status_code, 401)

    def test_api_token_scope_limits_request_access(self):
        self.client.force_authenticate(self.admin)
        create_response = self.client.post(
            "/api/system/api-tokens/",
            {"name": "narrow integration", "scopes": ["n8n", "calendar_sync"]},
            format="json",
        )
        raw_token = create_response.data["token"]
        self.client.force_authenticate(user=None)

        response = self.client.get(
            "/api/system/security-status/",
            HTTP_X_HARMONY_API_TOKEN=raw_token,
        )

        self.assertEqual(response.status_code, 401)
