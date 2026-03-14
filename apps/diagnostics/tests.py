from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from apps.diagnostics.models import Concept, Question, QuestionOption, Subject, TestAttempt
from apps.guardians.models import GuardianProfile
from apps.learning_health.models import LearningHealthSnapshot
from apps.students.models import StudentProfile
from apps.study_planner.models import StudyPlan


class DiagnosticFlowTests(APITestCase):
    def setUp(self):
        self.student_user = get_user_model().objects.create_user(
            email="student@example.com",
            password="password123",
            role="student",
        )
        self.student = StudentProfile.objects.create(user=self.student_user, full_name="Student", class_name="8")
        login = self.client.post(
            "/api/auth/login",
            {"email": "student@example.com", "password": "password123"},
            format="json",
        )
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {login.data['access']}")

        self.subject = Subject.objects.create(name="Math", slug="math")
        self.concept = Concept.objects.create(subject=self.subject, name="Algebra", slug="algebra")
        self.question = Question.objects.create(
            subject=self.subject,
            concept=self.concept,
            question_type=Question.QuestionType.MCQ_SINGLE,
            prompt="2 + 2 = ?",
        )
        self.correct_option = QuestionOption.objects.create(
            question=self.question,
            option_text="4",
            is_correct=True,
            display_order=1,
        )
        QuestionOption.objects.create(
            question=self.question,
            option_text="5",
            is_correct=False,
            display_order=2,
        )

    def test_start_and_submit_diagnostic_creates_snapshot_and_plan(self):
        start_response = self.client.post(
            "/api/diagnostic/start",
            {"subject_id": str(self.subject.id)},
            format="json",
        )
        self.assertEqual(start_response.status_code, status.HTTP_201_CREATED)

        attempt_id = start_response.data["id"]
        detail_response = self.client.get(f"/api/diagnostic/attempts/{attempt_id}")
        self.assertEqual(detail_response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(detail_response.data["questions"]), 1)

        submit_response = self.client.post(
            f"/api/diagnostic/attempts/{attempt_id}/submit",
            {
                "answers": [
                    {
                        "question_id": str(self.question.id),
                        "selected_option_id": str(self.correct_option.id),
                        "time_spent_seconds": 12,
                    }
                ]
            },
            format="json",
        )
        self.assertEqual(submit_response.status_code, status.HTTP_200_OK)
        self.assertEqual(float(submit_response.data["attempt"]["score_percent"]), 100.0)
        self.assertTrue(LearningHealthSnapshot.objects.filter(student=self.student).exists())
        self.assertTrue(StudyPlan.objects.filter(student=self.student, status="active").exists())

    def test_subject_listing_returns_available_subjects(self):
        response = self.client.get("/api/diagnostic/subjects")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data[0]["name"], "Math")

    def test_resubmitting_evaluated_attempt_returns_bad_request(self):
        start_response = self.client.post(
            "/api/diagnostic/start",
            {"subject_id": str(self.subject.id)},
            format="json",
        )
        attempt_id = start_response.data["id"]
        payload = {
            "answers": [
                {
                    "question_id": str(self.question.id),
                    "selected_option_id": str(self.correct_option.id),
                    "time_spent_seconds": 12,
                }
            ]
        }

        first_submit = self.client.post(
            f"/api/diagnostic/attempts/{attempt_id}/submit",
            payload,
            format="json",
        )
        self.assertEqual(first_submit.status_code, status.HTTP_200_OK)

        second_submit = self.client.post(
            f"/api/diagnostic/attempts/{attempt_id}/submit",
            payload,
            format="json",
        )
        self.assertEqual(second_submit.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("submittable", str(second_submit.data))
