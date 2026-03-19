from unittest.mock import patch

from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from apps.diagnostics.models import (
    Exam,
    PaymentRecord,
    Question,
    QuestionOption,
    Subject,
    TestAttempt,
    TestEntitlement,
)
from apps.students.models import StudentProfile
from apps.users.models import TokenTransaction


class MockTestFlowTests(APITestCase):
    def setUp(self):
        self.student_user = get_user_model().objects.create_user(
            email="student@example.com",
            password="password123",
            role="student",
        )
        self.student = StudentProfile.objects.create(user=self.student_user, full_name="Student", class_name="")
        login = self.client.post(
            "/api/auth/login",
            {"email": "student@example.com", "password": "password123"},
            format="json",
        )
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {login.data['access']}")

        self.exam = Exam.objects.create(name="JEE Main", slug="jee-main", is_active=True)
        self.subject = Subject.objects.create(name="Physics", slug="physics", is_active=True)
        self.subject.exams.add(self.exam)

        for index in range(30):
            concept = self.subject.concepts.create(
                name=f"Topic {index + 1}",
                slug=f"topic-{index + 1}",
                description=f"Explain topic {index + 1}",
            )
            concept.exams.add(self.exam)
            question = Question.objects.create(
                subject=self.subject,
                concept=concept,
                question_type=Question.QuestionType.MCQ_SINGLE,
                prompt=f"Question {index + 1}",
                status=Question.Status.ACTIVE,
            )
            question.exams.add(self.exam)
            QuestionOption.objects.create(question=question, option_text="Correct", is_correct=True, display_order=1)
            QuestionOption.objects.create(question=question, option_text="Wrong", is_correct=False, display_order=2)

    def test_exam_and_subject_listing(self):
        exams_response = self.client.get("/api/diagnostic/exams")
        self.assertEqual(exams_response.status_code, status.HTTP_200_OK)
        self.assertEqual(exams_response.data[0]["name"], "JEE Main")

        subjects_response = self.client.get(f"/api/diagnostic/exams/{self.exam.id}/subjects")
        self.assertEqual(subjects_response.status_code, status.HTTP_200_OK)
        self.assertEqual(subjects_response.data[0]["name"], "Physics")

    def test_free_attempt_eligibility_start_save_submit_and_report(self):
        eligibility = self.client.get(
            "/api/diagnostic/eligibility",
            {"exam_id": str(self.exam.id), "subject_id": str(self.subject.id)},
        )
        self.assertEqual(eligibility.status_code, status.HTTP_200_OK)
        self.assertTrue(eligibility.data["free"])
        self.assertTrue(eligibility.data["can_start"])

        start = self.client.post(
            "/api/diagnostic/attempts/start",
            {"exam_id": str(self.exam.id), "subject_id": str(self.subject.id)},
            format="json",
        )
        self.assertEqual(start.status_code, status.HTTP_201_CREATED)
        self.assertEqual(start.data["access_mode"], "free")
        attempt_id = start.data["id"]

        detail = self.client.get(f"/api/diagnostic/attempts/{attempt_id}")
        self.assertEqual(detail.status_code, status.HTTP_200_OK)
        self.assertEqual(len(detail.data["questions"]), 30)

        first_question = detail.data["questions"][0]
        second_question = detail.data["questions"][1]
        correct_option_id = first_question["options"][0]["id"]
        wrong_option_id = second_question["options"][1]["id"]

        save_first = self.client.patch(
            f"/api/diagnostic/attempts/{attempt_id}/answers",
            {
                "question_id": first_question["id"],
                "selected_option_id": correct_option_id,
                "time_spent_seconds": 12,
            },
            format="json",
        )
        self.assertEqual(save_first.status_code, status.HTTP_200_OK)

        save_second = self.client.patch(
            f"/api/diagnostic/attempts/{attempt_id}/answers",
            {
                "question_id": second_question["id"],
                "selected_option_id": wrong_option_id,
                "time_spent_seconds": 9,
            },
            format="json",
        )
        self.assertEqual(save_second.status_code, status.HTTP_200_OK)

        submit = self.client.post(f"/api/diagnostic/attempts/{attempt_id}/submit", {}, format="json")
        self.assertEqual(submit.status_code, status.HTTP_200_OK)
        self.assertEqual(submit.data["status"], "evaluated")
        self.assertEqual(submit.data["correct_answers"], 1)
        self.assertEqual(submit.data["wrong_answers"], 1)
        self.assertEqual(submit.data["unanswered_answers"], 28)
        self.assertTrue(len(submit.data["weak_topics"]) > 0)
        self.assertIn("concept_tracking", submit.data)
        self.assertIn("mistake_analysis", submit.data)
        self.assertIn("adaptive_practice", submit.data)
        self.assertIn("improvement_loop", submit.data)

        latest = self.client.get("/api/diagnostic/reports/latest")
        self.assertEqual(latest.status_code, status.HTTP_200_OK)
        self.assertEqual(latest.data["id"], attempt_id)

        learning = self.client.get(f"/api/diagnostic/reports/{attempt_id}/learning")
        self.assertEqual(learning.status_code, status.HTTP_200_OK)
        self.assertIn("learning_cards", learning.data)
        self.assertIn("mistake_analysis", learning.data)
        self.assertIn("improvement_loop", learning.data)
        self.assertTrue(len(learning.data["learning_cards"]) > 0)

    def test_second_attempt_requires_payment_then_unlocks(self):
        first_attempt = self.client.post(
            "/api/diagnostic/attempts/start",
            {"exam_id": str(self.exam.id), "subject_id": str(self.subject.id)},
            format="json",
        )
        self.assertEqual(first_attempt.status_code, status.HTTP_201_CREATED)
        self.client.post(f"/api/diagnostic/attempts/{first_attempt.data['id']}/submit", {}, format="json")

        eligibility = self.client.get(
            "/api/diagnostic/eligibility",
            {"exam_id": str(self.exam.id), "subject_id": str(self.subject.id)},
        )
        self.assertEqual(eligibility.status_code, status.HTTP_200_OK)
        self.assertTrue(eligibility.data["payment_required"])

        payment = self.client.post(
            "/api/diagnostic/payments/unlock",
            {"exam_id": str(self.exam.id), "subject_id": str(self.subject.id), "provider": "test"},
            format="json",
        )
        self.assertEqual(payment.status_code, status.HTTP_201_CREATED)
        self.assertTrue(PaymentRecord.objects.filter(student=self.student, exam=self.exam, subject=self.subject).exists())

        entitlement = TestEntitlement.objects.get(student=self.student, exam=self.exam, subject=self.subject)
        self.assertEqual(entitlement.paid_attempt_credits, 1)

        second_attempt = self.client.post(
            "/api/diagnostic/attempts/start",
            {"exam_id": str(self.exam.id), "subject_id": str(self.subject.id)},
            format="json",
        )
        self.assertEqual(second_attempt.status_code, status.HTTP_201_CREATED)
        self.assertEqual(second_attempt.data["access_mode"], "paid")

    def test_duplicate_submit_is_rejected(self):
        start = self.client.post(
            "/api/diagnostic/attempts/start",
            {"exam_id": str(self.exam.id), "subject_id": str(self.subject.id)},
            format="json",
        )
        attempt_id = start.data["id"]
        first_submit = self.client.post(f"/api/diagnostic/attempts/{attempt_id}/submit", {}, format="json")
        self.assertEqual(first_submit.status_code, status.HTTP_200_OK)

        second_submit = self.client.post(f"/api/diagnostic/attempts/{attempt_id}/submit", {}, format="json")
        self.assertEqual(second_submit.status_code, status.HTTP_400_BAD_REQUEST)

    def test_start_uses_available_questions_when_pool_is_under_limit(self):
        Question.objects.filter(subject=self.subject).exclude(
            id__in=Question.objects.filter(subject=self.subject).values_list("id", flat=True)[:29]
        ).delete()

        response = self.client.post(
            "/api/diagnostic/attempts/start",
            {"exam_id": str(self.exam.id), "subject_id": str(self.subject.id)},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["total_questions"], 29)

        detail = self.client.get(f"/api/diagnostic/attempts/{response.data['id']}")
        self.assertEqual(detail.status_code, status.HTTP_200_OK)
        self.assertEqual(len(detail.data["questions"]), 29)

    def test_active_attempt_endpoint_returns_started_attempt(self):
        start = self.client.post(
            "/api/diagnostic/attempts/start",
            {"exam_id": str(self.exam.id), "subject_id": str(self.subject.id)},
            format="json",
        )
        self.assertEqual(start.status_code, status.HTTP_201_CREATED)

        active = self.client.get(
            "/api/diagnostic/attempts/active",
            {"exam_id": str(self.exam.id), "subject_id": str(self.subject.id)},
        )
        self.assertEqual(active.status_code, status.HTTP_200_OK)
        self.assertEqual(active.data["id"], start.data["id"])

    @patch("apps.diagnostics.views.generate_weak_topic_ai_review")
    def test_learning_ai_endpoint_returns_structured_review(self, mock_generate_review):
        start = self.client.post(
            "/api/diagnostic/attempts/start",
            {"exam_id": str(self.exam.id), "subject_id": str(self.subject.id)},
            format="json",
        )
        self.assertEqual(start.status_code, status.HTTP_201_CREATED)
        attempt_id = start.data["id"]

        detail = self.client.get(f"/api/diagnostic/attempts/{attempt_id}")
        first_question = detail.data["questions"][0]
        wrong_option_id = first_question["options"][1]["id"]

        save = self.client.patch(
            f"/api/diagnostic/attempts/{attempt_id}/answers",
            {
                "question_id": first_question["id"],
                "selected_option_id": wrong_option_id,
                "time_spent_seconds": 15,
            },
            format="json",
        )
        self.assertEqual(save.status_code, status.HTTP_200_OK)

        submit = self.client.post(f"/api/diagnostic/attempts/{attempt_id}/submit", {}, format="json")
        self.assertEqual(submit.status_code, status.HTTP_200_OK)

        learning = self.client.get(f"/api/diagnostic/reports/{attempt_id}/learning")
        self.assertEqual(learning.status_code, status.HTTP_200_OK)
        concept_id = learning.data["learning_cards"][0]["concept_id"]

        mock_generate_review.return_value = {
            "heading": "AI review",
            "layman_explanation": "Simple explanation",
            "teacher_guide": "Teacher guide",
            "shortcut_guide": "Shortcut",
            "common_trap": "Common trap",
            "solve_steps": ["Step 1", "Step 2"],
            "practice_tip": "Practice tip",
            "question_prompt": "Question 1",
            "student_answer": "Wrong",
            "correct_answer": "Correct",
        }

        response = self.client.get(f"/api/diagnostic/reports/{attempt_id}/learning/{concept_id}/ai")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["heading"], "AI review")
        self.assertEqual(response.data["shortcut_guide"], "Shortcut")
        self.student_user.refresh_from_db()
        self.assertEqual(response.data["tokens_spent"], 25)
        self.assertEqual(self.student_user.token_balance, 975)

        second_response = self.client.get(f"/api/diagnostic/reports/{attempt_id}/learning/{concept_id}/ai")
        self.assertEqual(second_response.status_code, status.HTTP_200_OK)
        self.assertTrue(second_response.data["already_unlocked"])
        self.student_user.refresh_from_db()
        self.assertEqual(self.student_user.token_balance, 975)

    def test_timer_reset_spends_tokens(self):
        start = self.client.post(
            "/api/diagnostic/attempts/start",
            {"exam_id": str(self.exam.id), "subject_id": str(self.subject.id)},
            format="json",
        )
        self.assertEqual(start.status_code, status.HTTP_201_CREATED)

        response = self.client.post(f"/api/diagnostic/attempts/{start.data['id']}/reset-timer", {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["tokens_spent"], 50)
        self.assertEqual(response.data["reset_duration_seconds"], 1800)
        self.student_user.refresh_from_db()
        self.assertEqual(self.student_user.token_balance, 950)
        self.assertTrue(
            TokenTransaction.objects.filter(
                user=self.student_user,
                transaction_type=TokenTransaction.TransactionType.TIMER_RESET,
            ).exists()
        )


class RegistrationCompatibilityTests(APITestCase):
    def test_student_register_without_class_name(self):
        response = self.client.post(
            "/api/auth/register",
            {
                "name": "New Student",
                "email": "newstudent@example.com",
                "password": "password123",
                "role": "student",
                "phone": "9999999999",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        profile = StudentProfile.objects.get(user__email="newstudent@example.com")
        self.assertEqual(profile.class_name, "")
