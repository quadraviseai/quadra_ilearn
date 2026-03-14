from django.conf import settings
from django.contrib.auth import get_user_model
from django.core import mail
from django.test import override_settings
from django.contrib.auth.tokens import default_token_generator
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from rest_framework import status
from rest_framework.test import APITestCase

from apps.students.models import StudentProfile


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
        profile = StudentProfile.objects.get(user=user, full_name="Student One")
        self.assertEqual(str(profile.date_of_birth), "2011-04-15")
        self.assertEqual(profile.primary_target_exam, "JEE")
        self.assertEqual(profile.secondary_target_exam, "Olympiad")

    def test_login_returns_jwt_tokens(self):
        user = get_user_model().objects.create_user(
            email="guardian@example.com",
            password="password123",
            role="guardian",
        )

        response = self.client.post(
            "/api/auth/login",
            {"email": user.email, "password": "password123"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)

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
        self.assertIn(settings.DEFAULT_FROM_EMAIL, mail.outbox[0].from_email)

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
