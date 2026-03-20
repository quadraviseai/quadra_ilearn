from django.conf import settings
from django.contrib.auth import get_user_model
from django.core import mail
from django.test import override_settings
from django.contrib.auth.tokens import default_token_generator
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from unittest.mock import patch
from rest_framework import status
from rest_framework.test import APITestCase

from apps.students.models import StudentProfile
from apps.users.models import TokenTransaction


@override_settings(
    EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
    FRONTEND_BASE_URL="http://127.0.0.1:5173",
)
class AuthApiTests(APITestCase):
    def test_register_student_creates_profile(self):
        response = self.client.post(
            "/api/auth/register",
            {
                "name": "Student One",
                "email": "student@example.com",
                "password": "password123",
                "role": "student",
                "class_name": "8",
                "date_of_birth": "2011-04-15",
                "primary_target_exam": "JEE",
                "secondary_target_exam": "Olympiad",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        user = get_user_model().objects.get(email="student@example.com")
        self.assertEqual(user.role, "student")
        self.assertFalse(user.is_verified)
        self.assertEqual(user.token_balance, 1000)
        self.assertTrue(user.referral_code)
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn("/verify-email?uid=", mail.outbox[0].body)
        profile = StudentProfile.objects.get(user=user, full_name="Student One")
        self.assertEqual(str(profile.date_of_birth), "2011-04-15")
        self.assertEqual(profile.primary_target_exam, "JEE")
        self.assertEqual(profile.secondary_target_exam, "Olympiad")

    def test_login_returns_jwt_tokens(self):
        user = get_user_model().objects.create_user(
            email="guardian@example.com",
            password="password123",
            role="guardian",
            is_verified=True,
        )

        response = self.client.post(
            "/api/auth/login",
            {"email": user.email, "password": "password123"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)
        self.assertEqual(response.data["user"]["token_balance"], 1000)

    @override_settings(GOOGLE_OAUTH_CLIENT_ID="google-client-id")
    @patch("apps.users.serializers.verify_google_id_token")
    def test_google_login_returns_jwt_tokens_for_existing_user(self, mocked_verify_google_id_token):
        user = get_user_model().objects.create_user(
            email="google-user@example.com",
            password="password123",
            role="guardian",
            auth_provider="google",
            google_subject="google-sub-1",
        )
        mocked_verify_google_id_token.return_value = {
            "email": user.email,
            "email_verified": True,
            "name": "Google Guardian",
            "sub": "google-sub-1",
        }

        response = self.client.post(
            "/api/auth/google",
            {"credential": "valid-token", "intent": "login"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)
        self.assertEqual(response.data["user"]["email"], user.email)

    @override_settings(GOOGLE_OAUTH_CLIENT_ID="google-client-id")
    @patch("apps.users.serializers.verify_google_id_token")
    def test_google_register_creates_student_profile(self, mocked_verify_google_id_token):
        mocked_verify_google_id_token.return_value = {
            "email": "google-student@example.com",
            "email_verified": True,
            "name": "Google Student",
            "sub": "google-sub-2",
        }

        response = self.client.post(
            "/api/auth/google",
            {
                "credential": "valid-token",
                "intent": "register",
                "role": "student",
                "class_name": "9",
                "board": "CBSE",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        user = get_user_model().objects.get(email="google-student@example.com")
        self.assertTrue(user.is_verified)
        self.assertFalse(user.has_usable_password())
        self.assertEqual(user.auth_provider, "google")
        self.assertEqual(user.google_subject, "google-sub-2")
        profile = StudentProfile.objects.get(user=user)
        self.assertEqual(profile.full_name, "Google Student")
        self.assertEqual(profile.class_name, "9")

    @override_settings(GOOGLE_OAUTH_CLIENT_ID="google-client-id")
    @patch("apps.users.serializers.verify_google_id_token")
    def test_google_login_auto_registers_new_google_user(self, mocked_verify_google_id_token):
        mocked_verify_google_id_token.return_value = {
            "email": "new-google@example.com",
            "email_verified": True,
            "name": "New User",
            "sub": "google-sub-3",
        }

        response = self.client.post(
            "/api/auth/google",
            {"credential": "valid-token", "intent": "login"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        user = get_user_model().objects.get(email="new-google@example.com")
        self.assertEqual(user.auth_provider, "google")
        self.assertEqual(user.role, "student")
        profile = StudentProfile.objects.get(user=user)
        self.assertEqual(profile.full_name, "New User")
        self.assertEqual(profile.class_name, "")

    @override_settings(GOOGLE_OAUTH_CLIENT_ID="google-client-id")
    @patch("apps.users.serializers.verify_google_id_token")
    def test_google_login_rejects_password_only_account(self, mocked_verify_google_id_token):
        user = get_user_model().objects.create_user(
            email="password-user@example.com",
            password="password123",
            role="guardian",
        )
        mocked_verify_google_id_token.return_value = {
            "email": user.email,
            "email_verified": True,
            "name": "Password User",
            "sub": "google-sub-4",
        }

        response = self.client.post(
            "/api/auth/google",
            {"credential": "valid-token", "intent": "login"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Use email/password login instead", str(response.data["detail"]))

    @override_settings(GOOGLE_OAUTH_CLIENT_ID="google-client-id")
    @patch("apps.users.serializers.verify_google_id_token")
    def test_google_register_rejects_existing_password_only_account(self, mocked_verify_google_id_token):
        get_user_model().objects.create_user(
            email="existing-user@example.com",
            password="password123",
            role="student",
        )
        mocked_verify_google_id_token.return_value = {
            "email": "existing-user@example.com",
            "email_verified": True,
            "name": "Existing User",
            "sub": "google-sub-5",
        }

        response = self.client.post(
            "/api/auth/google",
            {"credential": "valid-token", "intent": "register", "role": "student", "class_name": "10"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Use email/password login instead", str(response.data["detail"]))

    def test_forgot_password_sends_reset_email(self):
        user = get_user_model().objects.create_user(
            email="supporter@example.com",
            password="password123",
            role="student",
        )

        response = self.client.post(
            "/api/auth/forgot-password",
            {"email": user.email},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn("/reset-password?uid=", mail.outbox[0].body)
        self.assertIn("quadrailearn://reset-password", mail.outbox[0].body)
        self.assertIn(settings.DEFAULT_FROM_EMAIL, mail.outbox[0].from_email)

    def test_verify_email_marks_user_verified(self):
        user = get_user_model().objects.create_user(
            email="verifyme@example.com",
            password="password123",
            role="student",
        )
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = default_token_generator.make_token(user)

        response = self.client.post(
            "/api/auth/verify-email",
            {"uid": uid, "token": token},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        user.refresh_from_db()
        self.assertTrue(user.is_verified)

    def test_login_rejects_unverified_email_user(self):
        user = get_user_model().objects.create_user(
            email="unverified@example.com",
            password="password123",
            role="student",
        )

        response = self.client.post(
            "/api/auth/login",
            {"email": user.email, "password": "password123"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Verify your email before logging in.", str(response.data))

    def test_reset_password_updates_password(self):
        user = get_user_model().objects.create_user(
            email="resetme@example.com",
            password="password123",
            role="student",
        )
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = default_token_generator.make_token(user)

        response = self.client.post(
            "/api/auth/reset-password",
            {
                "uid": uid,
                "token": token,
                "password": "newpassword123",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        user.refresh_from_db()
        self.assertTrue(user.check_password("newpassword123"))

    def test_me_returns_current_user(self):
        user = get_user_model().objects.create_user(
            email="me@example.com",
            password="password123",
            role="student",
            is_verified=True,
        )

        login_response = self.client.post(
            "/api/auth/login",
            {"email": user.email, "password": "password123"},
            format="json",
        )
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {login_response.data['access']}")

        response = self.client.get("/api/auth/me")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["email"], user.email)
        self.assertIn("referral_code", response.data)
        self.assertIn("token_settings", response.data)

    def test_register_with_referral_code_rewards_referrer(self):
        referrer = get_user_model().objects.create_user(
            email="referrer@example.com",
            password="password123",
            role="student",
        )
        StudentProfile.objects.create(user=referrer, full_name="Referrer", class_name="")

        response = self.client.post(
            "/api/auth/register",
            {
                "name": "Student Two",
                "email": "student-two@example.com",
                "password": "password123",
                "role": "student",
                "referral_code": referrer.referral_code,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        referrer.refresh_from_db()
        referred_user = get_user_model().objects.get(email="student-two@example.com")
        self.assertEqual(referrer.token_balance, 200)
        self.assertEqual(referred_user.referred_by_id, referrer.id)
        self.assertTrue(
            TokenTransaction.objects.filter(
                user=referrer,
                transaction_type=TokenTransaction.TransactionType.REFERRAL_BONUS,
            ).exists()
        )
