from django.contrib.auth import get_user_model
from django.urls import reverse
from unittest.mock import patch
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from apps.diagnostics.models import Concept, Exam, Question, Subject
from apps.guardians.models import GuardianProfile
from apps.students.models import StudentProfile

User = get_user_model()


class InternalAdminApiTests(APITestCase):
    def setUp(self):
        self.admin_user = User.objects.create_user(
            email="admin@example.com",
            password="strongpass123",
            role=User.Role.ADMIN,
            is_staff=True,
        )
        refresh = RefreshToken.for_user(self.admin_user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")

    def test_dashboard_endpoint_returns_summary(self):
        response = self.client.get(reverse("admin-dashboard"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("users_total", response.data)
        self.assertIn("recent_users", response.data)

    def test_admin_can_create_student_user(self):
        response = self.client.post(
            reverse("admin-users"),
            {
                "name": "Test Student",
                "email": "student@example.com",
                "password": "strongpass123",
                "role": User.Role.STUDENT,
                "class_name": "10",
                "board": "CBSE",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        created_user = User.objects.get(email="student@example.com")
        self.assertEqual(created_user.role, User.Role.STUDENT)
        self.assertTrue(StudentProfile.objects.filter(user=created_user, full_name="Test Student").exists())

    def test_admin_can_create_question(self):
        exam_one = Exam.objects.create(name="JEE Main", slug="jee-main")
        exam_two = Exam.objects.create(name="Olympiad", slug="olympiad")
        subject = Subject.objects.create(name="Mathematics", slug="mathematics")
        subject.exams.set([exam_one, exam_two])
        concept = Concept.objects.create(
            subject=subject,
            name="Algebra",
            slug="algebra",
            description="Expressions and equations",
            difficulty_level=2,
        )
        concept.exams.set([exam_one, exam_two])

        response = self.client.post(
            reverse("admin-questions"),
            {
                "subject_id": str(subject.id),
                "concept_id": str(concept.id),
                "exam_ids": [str(exam_one.id), str(exam_two.id)],
                "exam_type": ["JEE Main", "Olympiad"],
                "question_type": Question.QuestionType.MCQ_SINGLE,
                "prompt": "What is 2 + 2?",
                "difficulty_level": 1,
                "status": Question.Status.ACTIVE,
                "options": [
                    {"option_text": "3", "is_correct": False, "display_order": 1},
                    {"option_text": "4", "is_correct": True, "display_order": 2},
                ],
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        question = Question.objects.get(prompt="What is 2 + 2?")
        self.assertEqual(question.exam_type, ["JEE Main", "Olympiad"])
        self.assertEqual(question.exams.count(), 2)

    def test_admin_can_create_exam_and_link_it_to_subject(self):
        exam_response = self.client.post(reverse("admin-exams"), {"name": "NEET"}, format="json")
        self.assertEqual(exam_response.status_code, status.HTTP_201_CREATED)

        subject_response = self.client.post(
            reverse("admin-subjects"),
            {"name": "Biology", "exam_ids": [exam_response.data["id"]]},
            format="json",
        )
        self.assertEqual(subject_response.status_code, status.HTTP_201_CREATED)
        subject = Subject.objects.get(id=subject_response.data["id"])
        self.assertEqual(list(subject.exams.values_list("name", flat=True)), ["NEET"])

    def test_admin_auto_generates_subject_and_concept_slugs(self):
        subject_response = self.client.post(
            reverse("admin-subjects"),
            {"name": "Social Science", "exam_ids": []},
            format="json",
        )
        self.assertEqual(subject_response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(subject_response.data["slug"], "social-science")

        concept_response = self.client.post(
            reverse("admin-concepts"),
            {
                "subject": subject_response.data["id"],
                "name": "Civics Basics",
                "description": "Introductory civics",
                "exam_ids": [],
            },
            format="json",
        )
        self.assertEqual(concept_response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(concept_response.data["slug"], "civics-basics")

    def test_admin_can_update_student_without_guardian_fields(self):
        student_user = User.objects.create_user(
            email="edit-student@example.com",
            password="strongpass123",
            role=User.Role.STUDENT,
        )
        StudentProfile.objects.create(
            user=student_user,
            full_name="Edit Student",
            class_name="11",
        )

        response = self.client.patch(
            reverse("admin-user-detail", kwargs={"user_id": student_user.id}),
            {
                "name": "Updated Student",
                "phone": "9999999999",
                "class_name": "12",
                "board": "CBSE",
                "school_name": "DPS",
                "relationship_to_student": None,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        student_user.refresh_from_db()
        self.assertEqual(student_user.student_profile.full_name, "Updated Student")
        self.assertEqual(student_user.student_profile.class_name, "12")

    def test_admin_can_update_guardian_with_null_relationship(self):
        guardian_user = User.objects.create_user(
            email="edit-guardian@example.com",
            password="strongpass123",
            role=User.Role.GUARDIAN,
        )
        GuardianProfile.objects.create(
            user=guardian_user,
            full_name="Edit Guardian",
            relationship_to_student="Father",
        )

        response = self.client.patch(
            reverse("admin-user-detail", kwargs={"user_id": guardian_user.id}),
            {
                "name": "Updated Guardian",
                "relationship_to_student": None,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        guardian_user.refresh_from_db()
        self.assertEqual(guardian_user.guardian_profile.full_name, "Updated Guardian")
        self.assertEqual(guardian_user.guardian_profile.relationship_to_student, "")

    def test_admin_can_update_and_delete_subject(self):
        subject = Subject.objects.create(name="Physics", slug="physics")

        update_response = self.client.patch(
            reverse("admin-subject-detail", kwargs={"subject_id": subject.id}),
            {"name": "Advanced Physics"},
            format="json",
        )
        self.assertEqual(update_response.status_code, status.HTTP_200_OK)
        subject.refresh_from_db()
        self.assertEqual(subject.slug, "advanced-physics")

        delete_response = self.client.delete(reverse("admin-subject-detail", kwargs={"subject_id": subject.id}))
        self.assertEqual(delete_response.status_code, status.HTTP_204_NO_CONTENT)

    def test_admin_can_update_and_delete_concept(self):
        subject = Subject.objects.create(name="Chemistry", slug="chemistry")
        concept = Concept.objects.create(subject=subject, name="Atoms", slug="atoms")

        update_response = self.client.patch(
            reverse("admin-concept-detail", kwargs={"concept_id": concept.id}),
            {"name": "Atomic Structure"},
            format="json",
        )
        self.assertEqual(update_response.status_code, status.HTTP_200_OK)
        concept.refresh_from_db()
        self.assertEqual(concept.slug, "atomic-structure")

        delete_response = self.client.delete(reverse("admin-concept-detail", kwargs={"concept_id": concept.id}))
        self.assertEqual(delete_response.status_code, status.HTTP_204_NO_CONTENT)

    def test_admin_can_make_question_draft_and_delete_it(self):
        subject = Subject.objects.create(name="Biology", slug="biology")
        concept = Concept.objects.create(subject=subject, name="Cells", slug="cells")
        question = Question.objects.create(
            subject=subject,
            concept=concept,
            prompt="Cell is the basic unit of life?",
            question_type=Question.QuestionType.MCQ_SINGLE,
            status=Question.Status.ACTIVE,
        )

        update_response = self.client.patch(
            reverse("admin-question-detail", kwargs={"question_id": question.id}),
            {"status": Question.Status.DRAFT},
            format="json",
        )
        self.assertEqual(update_response.status_code, status.HTTP_200_OK)
        question.refresh_from_db()
        self.assertEqual(question.status, Question.Status.DRAFT)

        delete_response = self.client.delete(reverse("admin-question-detail", kwargs={"question_id": question.id}))
        self.assertEqual(delete_response.status_code, status.HTTP_204_NO_CONTENT)

    def test_admin_can_bulk_upload_questions(self):
        subject = Subject.objects.create(name="Economics", slug="economics")
        exam = Exam.objects.create(name="Boards", slug="boards")
        subject.exams.set([exam])
        concept = Concept.objects.create(subject=subject, name="Demand", slug="demand")
        concept.exams.set([exam])

        response = self.client.post(
            reverse("admin-question-bulk-upload"),
            {
                "subject_id": str(subject.id),
                "concept_id": str(concept.id),
                "questions": [
                    {
                        "exam_ids": [str(exam.id)],
                        "exam_type": ["Boards"],
                        "question_type": Question.QuestionType.MCQ_SINGLE,
                        "prompt": "Demand curve slopes downward because?",
                        "difficulty_level": 2,
                        "status": Question.Status.DRAFT,
                        "options": [
                            {"option_text": "Price and quantity demanded move inversely", "is_correct": True, "display_order": 1},
                            {"option_text": "Income always rises", "is_correct": False, "display_order": 2},
                        ],
                    }
                ],
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["count"], 1)

    @patch("apps.internal_admin.serializers.generate_question_with_gemini")
    def test_admin_can_generate_question_with_ai(self, mocked_generate):
        subject = Subject.objects.create(name="Geography", slug="geography")
        exam_one = Exam.objects.create(name="Boards", slug="boards")
        exam_two = Exam.objects.create(name="Olympiad", slug="olympiad")
        subject.exams.set([exam_one, exam_two])
        concept = Concept.objects.create(subject=subject, name="Climate", slug="climate")
        concept.exams.set([exam_one, exam_two])
        mocked_generate.return_value = {
            "prompt": "Which factor most directly affects climate?",
            "explanation": "Latitude strongly influences climate patterns.",
            "options": [
                {"option_text": "Latitude", "is_correct": True, "display_order": 1},
                {"option_text": "Font size", "is_correct": False, "display_order": 2},
            ],
        }

        response = self.client.post(
            reverse("admin-question-ai-generate"),
            {
                "subject_id": str(subject.id),
                "concept_id": str(concept.id),
                "exam_ids": [str(exam_one.id), str(exam_two.id)],
                "exam_type": ["Boards", "Olympiad"],
                "question_type": Question.QuestionType.MCQ_SINGLE,
                "question_prompt": "Create a climate fundamentals question.",
                "difficulty_level": 2,
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["status"], Question.Status.DRAFT)
