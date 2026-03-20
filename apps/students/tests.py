from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase
from unittest.mock import patch

from apps.students.models import StudentProfile


class StudentDashboardApiTests(APITestCase):
    def test_dashboard_summary_returns_student_payload(self):
        user = get_user_model().objects.create_user(
            email="student-dashboard@example.com",
            password="password123",
            role="student",
            is_verified=True,
        )
        StudentProfile.objects.create(
            user=user,
            full_name="Student Dashboard",
            class_name="10",
        )

        login_response = self.client.post(
            "/api/auth/login",
            {"email": user.email, "password": "password123"},
            format="json",
        )
        self.assertEqual(login_response.status_code, status.HTTP_200_OK)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {login_response.data['access']}")

        response = self.client.get("/api/students/dashboard-summary")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["full_name"], "Student Dashboard")
        self.assertIn("weak_concepts", response.data)
        self.assertIn("recent_attempts", response.data)

    def test_profile_can_be_fetched_and_updated(self):
        user = get_user_model().objects.create_user(
            email="student-profile@example.com",
            password="password123",
            role="student",
            phone="9999999999",
            is_verified=True,
        )
        StudentProfile.objects.create(
            user=user,
            full_name="Student Profile",
            class_name="9",
            board="CBSE",
        )

        login_response = self.client.post(
            "/api/auth/login",
            {"email": user.email, "password": "password123"},
            format="json",
        )
        self.assertEqual(login_response.status_code, status.HTTP_200_OK)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {login_response.data['access']}")

        fetch_response = self.client.get("/api/students/profile")
        self.assertEqual(fetch_response.status_code, status.HTTP_200_OK)
        self.assertEqual(fetch_response.data["email"], user.email)
        self.assertEqual(fetch_response.data["phone"], "9999999999")

        update_response = self.client.patch(
            "/api/students/profile",
            {
                "full_name": "Student Profile Updated",
                "class_name": "10",
                "phone": "8888888888",
                "school_name": "Demo School",
            },
            format="json",
        )
        self.assertEqual(update_response.status_code, status.HTTP_200_OK)
        self.assertEqual(update_response.data["full_name"], "Student Profile Updated")
        self.assertEqual(update_response.data["class_name"], "10")
        self.assertEqual(update_response.data["phone"], "8888888888")

        user.refresh_from_db()
        profile = user.student_profile
        self.assertEqual(user.phone, "8888888888")
        self.assertEqual(profile.school_name, "Demo School")

    @patch("apps.students.views.suggest_primary_exam_with_gemini")
    def test_primary_exam_suggestion_returns_gemini_response(self, mock_suggest):
        user = get_user_model().objects.create_user(
            email="student-suggestion@example.com",
            password="password123",
            role="student",
            is_verified=True,
        )
        StudentProfile.objects.create(
            user=user,
            full_name="Student Suggestion",
            class_name="11",
        )
        mock_suggest.return_value = {
            "suggestions": [
                {
                    "suggested_exam": "JEE / NEET / CUET",
                    "reason": "Class 11 student with board-ready age profile.",
                    "confidence": "high",
                },
                {
                    "suggested_exam": "NDA / Olympiad Advanced",
                    "reason": "Strong alternate path for competitive prep breadth.",
                    "confidence": "medium",
                },
            ]
        }

        login_response = self.client.post(
            "/api/auth/login",
            {"email": user.email, "password": "password123"},
            format="json",
        )
        self.assertEqual(login_response.status_code, status.HTTP_200_OK)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {login_response.data['access']}")

        response = self.client.post(
            "/api/students/profile/primary-exam-suggestion",
            {
                "class_name": "11",
                "date_of_birth": "2009-05-10",
                "board": "CBSE",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["suggestions"]), 2)
        self.assertEqual(response.data["suggestions"][0]["suggested_exam"], "JEE / NEET / CUET")
        self.assertEqual(response.data["suggestions"][0]["confidence"], "high")
        mock_suggest.assert_called_once()

        user.refresh_from_db()
        self.assertEqual(len(user.student_profile.ai_exam_suggestions), 2)
        self.assertIsNotNone(user.student_profile.ai_exam_suggestions_generated_at)

    def test_primary_exam_suggestion_requires_class_name(self):
        user = get_user_model().objects.create_user(
            email="student-suggestion-invalid@example.com",
            password="password123",
            role="student",
            is_verified=True,
        )
        StudentProfile.objects.create(
            user=user,
            full_name="Student Suggestion Invalid",
            class_name="9",
        )

        login_response = self.client.post(
            "/api/auth/login",
            {"email": user.email, "password": "password123"},
            format="json",
        )
        self.assertEqual(login_response.status_code, status.HTTP_200_OK)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {login_response.data['access']}")

        response = self.client.post(
            "/api/students/profile/primary-exam-suggestion",
            {
                "date_of_birth": "2010-02-01",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("class_name", response.data)
