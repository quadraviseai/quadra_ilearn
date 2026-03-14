from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase
from unittest.mock import patch

from apps.diagnostics.models import Concept, ConceptMastery, Subject
from apps.students.models import StudentProfile
from apps.study_planner.models import StudyPlanTask


class StudyPlannerApiTests(APITestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(
            email="planner@example.com",
            password="password123",
            role="student",
        )
        self.student = StudentProfile.objects.create(user=self.user, full_name="Planner", class_name="10")
        login = self.client.post(
            "/api/auth/login",
            {"email": "planner@example.com", "password": "password123"},
            format="json",
        )
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {login.data['access']}")

        self.subject = Subject.objects.create(name="Science", slug="science")
        self.concept = Concept.objects.create(subject=self.subject, name="Motion", slug="motion")
        ConceptMastery.objects.create(
            student=self.student,
            concept=self.concept,
            mastery_score=42,
            accuracy_percent=42,
            attempts_count=2,
        )

    def test_regenerate_and_fetch_study_plan(self):
        regenerate_response = self.client.post("/api/study-planner/regenerate", {}, format="json")
        self.assertEqual(regenerate_response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(len(regenerate_response.data["tasks"]), 1)

        fetch_response = self.client.get("/api/study-planner/")
        self.assertEqual(fetch_response.status_code, status.HTTP_200_OK)
        self.assertEqual(fetch_response.data["tasks"][0]["concept_name"], "Motion")

    def test_task_status_can_be_updated(self):
        regenerate_response = self.client.post("/api/study-planner/regenerate", {}, format="json")
        task_id = regenerate_response.data["tasks"][0]["id"]

        start_response = self.client.patch(
            f"/api/study-planner/tasks/{task_id}",
            {"status": StudyPlanTask.Status.IN_PROGRESS},
            format="json",
        )
        self.assertEqual(start_response.status_code, status.HTTP_200_OK)
        self.assertEqual(start_response.data["status"], StudyPlanTask.Status.IN_PROGRESS)

        update_response = self.client.patch(
            f"/api/study-planner/tasks/{task_id}",
            {"status": StudyPlanTask.Status.DONE},
            format="json",
        )
        self.assertEqual(update_response.status_code, status.HTTP_200_OK)
        self.assertEqual(update_response.data["status"], StudyPlanTask.Status.DONE)

        task = StudyPlanTask.objects.get(id=task_id)
        self.assertEqual(task.status, StudyPlanTask.Status.DONE)

    @patch("apps.study_planner.views.generate_study_content_for_task")
    def test_started_task_can_be_marked_done(self, mock_generate):
        self.student.board = "CBSE"
        self.student.primary_target_exam = "JEE Main"
        self.student.save(update_fields=["board", "primary_target_exam", "updated_at"])

        regenerate_response = self.client.post("/api/study-planner/regenerate", {}, format="json")
        task_id = regenerate_response.data["tasks"][0]["id"]
        mock_generate.return_value = {
            "heading": "Master Motion for JEE Main",
            "overview": "Focus on displacement, velocity, and acceleration first.",
            "exam_focus": "Typical objective questions test graphs and formulas.",
            "key_points": ["Distance vs displacement", "Speed vs velocity", "Acceleration basics"],
            "study_steps": [
                {
                    "title": "Build the core idea",
                    "detail": "Read the basic definitions first and connect each term to a real motion example.",
                    "checkpoints": ["Define displacement", "Compare speed and velocity"],
                }
            ],
            "quick_check": ["Define velocity", "Interpret a graph", "Identify acceleration sign"],
            "target_exam": "JEE Main",
        }

        start_response = self.client.post(
            f"/api/study-planner/tasks/{task_id}/start",
            {"target_exam": "JEE Main"},
            format="json",
        )
        self.assertEqual(start_response.status_code, status.HTTP_200_OK)
        self.assertEqual(start_response.data["status"], StudyPlanTask.Status.IN_PROGRESS)

        done_response = self.client.patch(
            f"/api/study-planner/tasks/{task_id}",
            {"status": StudyPlanTask.Status.DONE},
            format="json",
        )
        self.assertEqual(done_response.status_code, status.HTTP_200_OK)
        self.assertEqual(done_response.data["status"], StudyPlanTask.Status.DONE)

    @patch("apps.study_planner.views.generate_study_content_for_task")
    def test_start_study_generates_and_caches_ai_content(self, mock_generate):
        self.student.board = "CBSE"
        self.student.primary_target_exam = "JEE Main"
        self.student.secondary_target_exam = "Boards"
        self.student.save(update_fields=["board", "primary_target_exam", "secondary_target_exam", "updated_at"])

        regenerate_response = self.client.post("/api/study-planner/regenerate", {}, format="json")
        task_id = regenerate_response.data["tasks"][0]["id"]
        mock_generate.return_value = {
            "heading": "Master Motion for JEE Main",
            "overview": "Focus on displacement, velocity, and acceleration first.",
            "exam_focus": "Typical objective questions test graphs and formulas.",
            "key_points": ["Distance vs displacement", "Speed vs velocity", "Acceleration basics"],
            "study_steps": [
                {
                    "title": "Build the core idea",
                    "detail": "Read the basic definitions first and connect each term to a real motion example.",
                    "checkpoints": ["Define displacement", "Compare speed and velocity"],
                },
                {
                    "title": "Practice the formula layer",
                    "detail": "Work through direct formula questions before moving to graph interpretation.",
                    "checkpoints": ["Use three motion formulas", "Check units"],
                },
            ],
            "quick_check": ["Define velocity", "Interpret a graph", "Identify acceleration sign"],
        }

        response = self.client.post(f"/api/study-planner/tasks/{task_id}/start", {}, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], StudyPlanTask.Status.IN_PROGRESS)
        self.assertEqual(response.data["ai_study_content"]["selected_exam"], "JEE Main")
        self.assertEqual(
            response.data["ai_study_content"]["exam_content"]["JEE Main"]["heading"],
            "Master Motion for JEE Main",
        )
        mock_generate.assert_called_once()

        task = StudyPlanTask.objects.get(id=task_id)
        self.assertEqual(task.status, StudyPlanTask.Status.IN_PROGRESS)
        self.assertEqual(task.ai_study_content["exam_content"]["JEE Main"]["heading"], "Master Motion for JEE Main")
        self.assertIsNotNone(task.ai_study_content_generated_at)

    @patch("apps.study_planner.views.generate_study_content_for_task")
    def test_start_study_preserves_cached_content_per_exam(self, mock_generate):
        self.student.board = "CBSE"
        self.student.primary_target_exam = "JEE Main"
        self.student.secondary_target_exam = "Boards"
        self.student.save(update_fields=["board", "primary_target_exam", "secondary_target_exam", "updated_at"])

        regenerate_response = self.client.post("/api/study-planner/regenerate", {}, format="json")
        task_id = regenerate_response.data["tasks"][0]["id"]
        mock_generate.side_effect = [
            {
                "heading": "Motion for JEE Main",
                "overview": "JEE Main version",
                "exam_focus": "JEE Main only",
                "key_points": ["k1"],
                "study_steps": [{"title": "Step", "detail": "D1", "checkpoints": ["c1"]}],
                "quick_check": ["q1"],
                "target_exam": "JEE Main",
            },
            {
                "heading": "Motion for Boards",
                "overview": "Boards version",
                "exam_focus": "Boards only",
                "key_points": ["k2"],
                "study_steps": [{"title": "Step", "detail": "D2", "checkpoints": ["c2"]}],
                "quick_check": ["q2"],
                "target_exam": "Boards",
            },
        ]

        first_response = self.client.post(
            f"/api/study-planner/tasks/{task_id}/start",
            {"target_exam": "JEE Main"},
            format="json",
        )
        second_response = self.client.post(
            f"/api/study-planner/tasks/{task_id}/start",
            {"target_exam": "Boards"},
            format="json",
        )

        self.assertEqual(first_response.status_code, status.HTTP_200_OK)
        self.assertEqual(second_response.status_code, status.HTTP_200_OK)
        exam_content = second_response.data["ai_study_content"]["exam_content"]
        self.assertEqual(exam_content["JEE Main"]["heading"], "Motion for JEE Main")
        self.assertEqual(exam_content["Boards"]["heading"], "Motion for Boards")

    @patch("apps.study_planner.views.generate_step_study_content_for_task")
    @patch("apps.study_planner.views.generate_study_content_for_task")
    def test_step_start_generates_and_caches_step_session(self, mock_generate_task, mock_generate_step):
        self.student.board = "CBSE"
        self.student.primary_target_exam = "JEE Main"
        self.student.save(update_fields=["board", "primary_target_exam", "updated_at"])

        regenerate_response = self.client.post("/api/study-planner/regenerate", {}, format="json")
        task_id = regenerate_response.data["tasks"][0]["id"]
        mock_generate_task.return_value = {
            "heading": "Master Motion for JEE Main",
            "overview": "Focus on displacement, velocity, and acceleration first.",
            "exam_focus": "Keep the scope aligned to JEE Main only.",
            "key_points": ["Distance vs displacement", "Speed vs velocity", "Acceleration basics"],
            "study_steps": [
                {
                    "title": "Build the core idea",
                    "detail": "Read the basic definitions first and connect each term to a real motion example.",
                    "checkpoints": ["Define displacement", "Compare speed and velocity"],
                }
            ],
            "quick_check": ["Define velocity", "Interpret a graph", "Identify acceleration sign"],
        }
        mock_generate_step.return_value = {
            "heading": "Build the core idea for JEE Main",
            "exam_scope_note": "Stay within JEE Main level formula work.",
            "layman_explanation": "Think of this as learning the simplest way to read the formula before solving fast.",
            "exam_notes": ["Focus on direct formula use", "Avoid advanced derivations"],
            "master_guide": "For JEE Main, learn the standard pattern first and solve common variations quickly.",
            "shortcut_guide": "Spot the most direct substitution path and avoid extra algebra.",
            "worked_ideas": ["Rewrite one equation", "Check units"],
            "practice_tasks": ["Solve 3 direct questions", "Review one mistake"],
        }

        response = self.client.post(f"/api/study-planner/tasks/{task_id}/steps/0/start", {}, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        step_session = response.data["ai_study_content"]["exam_content"]["JEE Main"]["study_steps"][0]["session"]
        self.assertEqual(step_session["heading"], "Build the core idea for JEE Main")
        self.assertEqual(step_session["exam_scope_note"], "Stay within JEE Main level formula work.")
        mock_generate_step.assert_called_once()
