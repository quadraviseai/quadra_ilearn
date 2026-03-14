from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from apps.guardians.models import GuardianProfile, GuardianStudentLink
from apps.students.models import StudentProfile


class GuardianApiTests(APITestCase):
    def setUp(self):
        self.guardian_user = get_user_model().objects.create_user(
            email="guardian@example.com",
            password="password123",
            role="guardian",
        )
        self.guardian_profile = GuardianProfile.objects.create(user=self.guardian_user, full_name="Guardian")
        login = self.client.post(
            "/api/auth/login",
            {"email": "guardian@example.com", "password": "password123"},
            format="json",
        )
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {login.data['access']}")

    def test_create_student_links_guardian(self):
        response = self.client.post(
            "/api/guardian/create-student",
            {
                "name": "Student One",
                "email": "student@example.com",
                "class_name": "9",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        student = StudentProfile.objects.get(user__email="student@example.com")
        self.assertTrue(
            GuardianStudentLink.objects.filter(
                guardian=self.guardian_profile,
                student=student,
                status=GuardianStudentLink.Status.ACTIVE,
            ).exists()
        )

    def test_accept_invite_activates_link(self):
        student_user = get_user_model().objects.create_user(
            email="student@example.com",
            password="password123",
            role="student",
        )
        student = StudentProfile.objects.create(user=student_user, full_name="Student", class_name="8")
        link = GuardianStudentLink.objects.create(
            guardian=self.guardian_profile,
            student=student,
            status=GuardianStudentLink.Status.INVITED,
            invite_token="token-123",
        )

        student_login = self.client.post(
            "/api/auth/login",
            {"email": "student@example.com", "password": "password123"},
            format="json",
        )
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {student_login.data['access']}")

        response = self.client.post(
            "/api/guardian/accept-invite",
            {"invite_token": "token-123"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        link.refresh_from_db()
        self.assertEqual(link.status, GuardianStudentLink.Status.ACTIVE)
