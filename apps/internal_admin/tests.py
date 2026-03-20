from django.contrib.auth import get_user_model
from django.urls import reverse
from unittest.mock import patch
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from apps.diagnostics.models import Chapter, Concept, Exam, Question, QuestionTemplate, Subject
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
            is_verified=True,
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
        chapter = Chapter.objects.create(subject=subject, name="Algebra", slug="algebra")
        chapter.exams.set([exam_one, exam_two])
        concept = Concept.objects.create(
            subject=subject,
            chapter=chapter,
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
                "chapter_id": str(chapter.id),
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

        chapter_response = self.client.post(
            reverse("admin-chapters"),
            {"subject": subject_response.data["id"], "name": "Foundations", "exam_ids": []},
            format="json",
        )
        self.assertEqual(chapter_response.status_code, status.HTTP_201_CREATED)

        concept_response = self.client.post(
            reverse("admin-concepts"),
            {
                "subject": subject_response.data["id"],
                "chapter": chapter_response.data["id"],
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

    def test_admin_can_delete_other_user_but_not_self(self):
        student_user = User.objects.create_user(
            email="delete-student@example.com",
            password="strongpass123",
            role=User.Role.STUDENT,
        )
        StudentProfile.objects.create(
            user=student_user,
            full_name="Delete Student",
            class_name="10",
        )

        delete_response = self.client.delete(reverse("admin-user-detail", kwargs={"user_id": student_user.id}))
        self.assertEqual(delete_response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(User.objects.filter(id=student_user.id).exists())

        self_delete_response = self.client.delete(reverse("admin-user-detail", kwargs={"user_id": self.admin_user.id}))
        self.assertEqual(self_delete_response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertTrue(User.objects.filter(id=self.admin_user.id).exists())

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
        chapter = Chapter.objects.create(subject=subject, name="Physical Chemistry", slug="physical-chemistry")
        concept = Concept.objects.create(subject=subject, chapter=chapter, name="Atoms", slug="atoms")

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
        chapter = Chapter.objects.create(subject=subject, name="Cell Biology", slug="cell-biology")
        concept = Concept.objects.create(subject=subject, chapter=chapter, name="Cells", slug="cells")
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
        chapter = Chapter.objects.create(subject=subject, name="Microeconomics", slug="microeconomics")
        chapter.exams.set([exam])
        concept = Concept.objects.create(subject=subject, chapter=chapter, name="Demand", slug="demand")
        concept.exams.set([exam])

        response = self.client.post(
            reverse("admin-question-bulk-upload"),
            {
                "subject_id": str(subject.id),
                "chapter_id": str(chapter.id),
                "concept_id": str(concept.id),
                "exam_ids": [str(exam.id)],
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

    def test_admin_can_bulk_upload_concepts(self):
        subject = Subject.objects.create(name="Physics", slug="physics")
        exam = Exam.objects.create(name="JEE Main", slug="jee-main")
        subject.exams.set([exam])
        chapter = Chapter.objects.create(subject=subject, name="Mechanics", slug="mechanics")
        chapter.exams.set([exam])
        Concept.objects.create(subject=subject, chapter=chapter, name="Motion in a Straight Line", slug="motion")

        response = self.client.post(
            reverse("admin-concept-bulk-upload"),
            {
                "subject_id": str(subject.id),
                "chapter_id": str(chapter.id),
                "exam_ids": [str(exam.id)],
                "concept_names": [
                    "Motion in a Plane",
                    " Work Energy Power ",
                    "motion in a plane",
                    "Motion in a Straight Line",
                ],
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["count"], 2)
        self.assertTrue(
            Concept.objects.filter(subject=subject, chapter=chapter, name="Motion in a Plane", exams=exam).exists()
        )
        self.assertTrue(
            Concept.objects.filter(subject=subject, chapter=chapter, name="Work Energy Power", exams=exam).exists()
        )

    def test_admin_can_import_templates_from_json(self):
        subject = Subject.objects.create(name="Math", slug="math")
        exam = Exam.objects.create(name="JEE Main", slug="jee-main")
        exam_two = Exam.objects.create(name="JEE Advanced", slug="jee-advanced")
        subject.exams.set([exam, exam_two])
        chapter = Chapter.objects.create(subject=subject, name="Sets", slug="sets")
        chapter.exams.set([exam, exam_two])

        response = self.client.post(
            reverse("admin-template-json-import"),
            {
                "subject_name": "Math",
                "chapter_name": "Sets",
                "exam_names": ["JEE Main", "JEE Advanced"],
                "concept_names": ["Inclusion-Exclusion", "Venn Diagrams"],
                "templates": [
                    {
                        "concept_name": "Inclusion-Exclusion",
                        "question_type": "mcq_single",
                        "template_type": "reverse",
                        "difficulty": QuestionTemplate.Difficulty.MEDIUM,
                        "template_text": "In a class of {total} students, {x} students like Mathematics, {y} students like Physics and {z} students like both. How many students like neither subject?",
                        "variables": {
                            "total": {"min": 60, "max": 150},
                            "x": {"min": 30, "max": 100},
                            "y": {"min": 30, "max": 100},
                            "z": {"min": 5, "max": 40},
                        },
                        "constraints": ["z <= x", "z <= y", "x + y - z <= total"],
                        "distractor_logic": ["x + y - z", "total - x - y + z", "x + y", "total - z"],
                        "formula": "total - (x + y - z)",
                        "correct_answer_formula": "total - (x + y - z)",
                        "jee_tags": ["word_problem", "inclusion_exclusion", "reverse_logic", "moderate_difficulty"],
                        "expected_time_sec": 60,
                        "status": QuestionTemplate.Status.ACTIVE,
                    }
                ],
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["count"], 1)
        self.assertTrue(Concept.objects.filter(subject=subject, chapter=chapter, name="Inclusion-Exclusion").exists())
        imported_template = QuestionTemplate.objects.get(concept__subject=subject, concept__chapter=chapter)
        self.assertEqual(imported_template.template_type, QuestionTemplate.TemplateType.LOGIC_REVERSE_CONSTRAINT)
        self.assertEqual(imported_template.correct_answer_formula, "total - (x + y - z)")
        self.assertEqual(imported_template.expected_time_sec, 60)

    def test_admin_template_import_auto_creates_missing_exams(self):
        subject = Subject.objects.create(name="Math", slug="math")
        chapter = Chapter.objects.create(subject=subject, name="Sets", slug="sets")

        response = self.client.post(
            reverse("admin-template-json-import"),
            {
                "subject_name": "Math",
                "chapter_name": "Sets",
                "exam_names": ["JEE Main", "JEE Advanced"],
                "concept_names": ["Inclusion-Exclusion"],
                "templates": [
                    {
                        "concept_name": "Inclusion-Exclusion",
                        "question_type": "mcq_single",
                        "template_type": "logic",
                        "difficulty": QuestionTemplate.Difficulty.MEDIUM,
                        "template_text": "If n(A)={x}, n(B)={y} and n(A∩B)={z}, find n(A∪B).",
                        "variables": {
                            "x": {"min": 20, "max": 80, "integer_only": True},
                            "y": {"min": 20, "max": 80, "integer_only": True},
                            "z": {"min": 5, "max": 30, "integer_only": True},
                        },
                        "constraints": ["z <= x", "z <= y"],
                        "answer_formula": "x + y - z",
                        "status": QuestionTemplate.Status.ACTIVE,
                    }
                ],
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        created_exams = list(Exam.objects.filter(name__in=["JEE Main", "JEE Advanced"]).order_by("name"))
        self.assertEqual(len(created_exams), 2)
        self.assertEqual(subject.exams.count(), 2)
        self.assertEqual(chapter.exams.count(), 2)
        concept = Concept.objects.get(subject=subject, chapter=chapter, name="Inclusion-Exclusion")
        self.assertEqual(concept.exams.count(), 2)

    @patch("apps.internal_admin.serializers.generate_question_with_gemini")
    def test_admin_can_generate_question_with_ai(self, mocked_generate):
        subject = Subject.objects.create(name="Geography", slug="geography")
        exam_one = Exam.objects.create(name="Boards", slug="boards")
        exam_two = Exam.objects.create(name="Olympiad", slug="olympiad")
        subject.exams.set([exam_one, exam_two])
        chapter = Chapter.objects.create(subject=subject, name="Physical Geography", slug="physical-geography")
        chapter.exams.set([exam_one, exam_two])
        concept = Concept.objects.create(subject=subject, chapter=chapter, name="Climate", slug="climate")
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
                "chapter_id": str(chapter.id),
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
