from django.contrib.auth import get_user_model
from django.db.models import Count, Prefetch
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.diagnostics.models import Concept, Exam, Question, Subject, TestAttempt
from apps.guardians.models import GuardianStudentLink
from apps.internal_admin.permissions import IsAdminRole
from apps.internal_admin.serializers import (
    AdminExamSerializer,
    AdminAiQuestionGenerateSerializer,
    AdminBulkQuestionUploadSerializer,
    AdminConceptSerializer,
    AdminDashboardSerializer,
    AdminQuestionSerializer,
    AdminQuestionWriteSerializer,
    AdminSubjectSerializer,
    AdminUserCreateSerializer,
    AdminUserListSerializer,
    AdminUserUpdateSerializer,
)

User = get_user_model()


class AdminDashboardView(APIView):
    permission_classes = [IsAdminRole]

    def get(self, request):
        recent_users = (
            User.objects.select_related("student_profile", "guardian_profile").order_by("-created_at")[:6]
        )
        recent_attempts = (
            TestAttempt.objects.select_related("student", "subject").order_by("-started_at")[:6]
        )
        payload = {
            "users_total": User.objects.count(),
            "students_total": User.objects.filter(role=User.Role.STUDENT).count(),
            "guardians_total": User.objects.filter(role=User.Role.GUARDIAN).count(),
            "admins_total": User.objects.filter(role=User.Role.ADMIN).count(),
            "active_users_total": User.objects.filter(is_active=True).count(),
            "verified_users_total": User.objects.filter(is_verified=True).count(),
            "subjects_total": Subject.objects.count(),
            "concepts_total": Concept.objects.count(),
            "questions_total": Question.objects.count(),
            "active_questions_total": Question.objects.filter(status=Question.Status.ACTIVE).count(),
            "attempts_total": TestAttempt.objects.count(),
            "completed_attempts_total": TestAttempt.objects.exclude(status=TestAttempt.Status.STARTED).count(),
            "guardian_links_total": GuardianStudentLink.objects.filter(status=GuardianStudentLink.Status.ACTIVE).count(),
            "recent_users": recent_users,
            "recent_attempts": recent_attempts,
        }
        serializer = AdminDashboardSerializer(payload)
        return Response(serializer.data)


class AdminUserListCreateView(APIView):
    permission_classes = [IsAdminRole]

    def get(self, request):
        users = User.objects.select_related("student_profile", "guardian_profile").order_by("-created_at")
        serializer = AdminUserListSerializer(users, many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = AdminUserCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        output = AdminUserListSerializer(user)
        return Response(output.data, status=status.HTTP_201_CREATED)


class AdminUserDetailView(APIView):
    permission_classes = [IsAdminRole]

    def patch(self, request, user_id):
        user = get_object_or_404(User.objects.select_related("student_profile", "guardian_profile"), id=user_id)
        serializer = AdminUserUpdateSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.update(user, serializer.validated_data)
        return Response(AdminUserListSerializer(user).data)


class AdminSubjectListCreateView(APIView):
    permission_classes = [IsAdminRole]

    def get(self, request):
        subjects = Subject.objects.annotate(
            concept_count=Count("concepts", distinct=True),
            question_count=Count("questions", distinct=True),
        ).prefetch_related("exams").order_by("name")
        return Response(AdminSubjectSerializer(subjects, many=True).data)

    def post(self, request):
        serializer = AdminSubjectSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        subject = serializer.save()
        subject = Subject.objects.annotate(
            concept_count=Count("concepts", distinct=True),
            question_count=Count("questions", distinct=True),
        ).prefetch_related("exams").get(id=subject.id)
        return Response(AdminSubjectSerializer(subject).data, status=status.HTTP_201_CREATED)


class AdminSubjectDetailView(APIView):
    permission_classes = [IsAdminRole]

    def patch(self, request, subject_id):
        subject = get_object_or_404(Subject, id=subject_id)
        serializer = AdminSubjectSerializer(subject, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        subject = serializer.save()
        subject = Subject.objects.annotate(
            concept_count=Count("concepts", distinct=True),
            question_count=Count("questions", distinct=True),
        ).prefetch_related("exams").get(id=subject.id)
        return Response(AdminSubjectSerializer(subject).data)

    def delete(self, request, subject_id):
        subject = get_object_or_404(Subject, id=subject_id)
        subject.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class AdminExamListCreateView(APIView):
    permission_classes = [IsAdminRole]

    def get(self, request):
        exams = Exam.objects.annotate(
            subject_count=Count("subjects", distinct=True),
            concept_count=Count("concepts", distinct=True),
            question_count=Count("questions", distinct=True),
        ).order_by("name")
        return Response(AdminExamSerializer(exams, many=True).data)

    def post(self, request):
        serializer = AdminExamSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        exam = serializer.save()
        exam = Exam.objects.annotate(
            subject_count=Count("subjects", distinct=True),
            concept_count=Count("concepts", distinct=True),
            question_count=Count("questions", distinct=True),
        ).get(id=exam.id)
        return Response(AdminExamSerializer(exam).data, status=status.HTTP_201_CREATED)


class AdminExamDetailView(APIView):
    permission_classes = [IsAdminRole]

    def patch(self, request, exam_id):
        exam = get_object_or_404(Exam, id=exam_id)
        serializer = AdminExamSerializer(exam, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        exam = serializer.save()
        exam = Exam.objects.annotate(
            subject_count=Count("subjects", distinct=True),
            concept_count=Count("concepts", distinct=True),
            question_count=Count("questions", distinct=True),
        ).get(id=exam.id)
        return Response(AdminExamSerializer(exam).data)

    def delete(self, request, exam_id):
        exam = get_object_or_404(Exam, id=exam_id)
        exam.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class AdminConceptListCreateView(APIView):
    permission_classes = [IsAdminRole]

    def get(self, request):
        concepts = Concept.objects.select_related("subject").prefetch_related("exams").annotate(
            question_count=Count("questions", distinct=True)
        )
        subject_id = request.query_params.get("subject_id")
        if subject_id:
            concepts = concepts.filter(subject_id=subject_id)
        concepts = concepts.order_by("subject__name", "name")
        return Response(AdminConceptSerializer(concepts, many=True).data)

    def post(self, request):
        serializer = AdminConceptSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        concept = serializer.save()
        concept = Concept.objects.select_related("subject").prefetch_related("exams").annotate(
            question_count=Count("questions", distinct=True)
        ).get(id=concept.id)
        return Response(AdminConceptSerializer(concept).data, status=status.HTTP_201_CREATED)


class AdminConceptDetailView(APIView):
    permission_classes = [IsAdminRole]

    def patch(self, request, concept_id):
        concept = get_object_or_404(Concept.objects.select_related("subject").prefetch_related("exams"), id=concept_id)
        serializer = AdminConceptSerializer(concept, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        concept = serializer.save()
        concept = Concept.objects.select_related("subject").prefetch_related("exams").annotate(
            question_count=Count("questions", distinct=True)
        ).get(id=concept.id)
        return Response(AdminConceptSerializer(concept).data)

    def delete(self, request, concept_id):
        concept = get_object_or_404(Concept, id=concept_id)
        concept.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class AdminQuestionListCreateView(APIView):
    permission_classes = [IsAdminRole]

    def get(self, request):
        questions = Question.objects.select_related("subject", "concept").prefetch_related(
            "exams",
            Prefetch("options")
        ).order_by("-updated_at")
        exam_id = request.query_params.get("exam_id")
        subject_id = request.query_params.get("subject_id")
        concept_id = request.query_params.get("concept_id")
        status_filter = request.query_params.get("status")
        if exam_id:
            questions = questions.filter(exams__id=exam_id)
        if subject_id:
            questions = questions.filter(subject_id=subject_id)
        if concept_id:
            questions = questions.filter(concept_id=concept_id)
        if status_filter:
            questions = questions.filter(status=status_filter)
        return Response(AdminQuestionSerializer(questions, many=True).data)

    def post(self, request):
        serializer = AdminQuestionWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        question = serializer.save()
        question = Question.objects.select_related("subject", "concept").prefetch_related("options", "exams").get(id=question.id)
        return Response(AdminQuestionSerializer(question).data, status=status.HTTP_201_CREATED)


class AdminQuestionBulkUploadView(APIView):
    permission_classes = [IsAdminRole]

    def post(self, request):
        serializer = AdminBulkQuestionUploadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        questions = serializer.save()
        hydrated = Question.objects.select_related("subject", "concept").prefetch_related("options", "exams").filter(
            id__in=[question.id for question in questions]
        )
        return Response(
            {
                "count": len(questions),
                "questions": AdminQuestionSerializer(hydrated.order_by("-created_at"), many=True).data,
            },
            status=status.HTTP_201_CREATED,
        )


class AdminQuestionAiGenerateView(APIView):
    permission_classes = [IsAdminRole]

    def post(self, request):
        serializer = AdminAiQuestionGenerateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        question = serializer.save()
        question = Question.objects.select_related("subject", "concept").prefetch_related("options", "exams").get(id=question.id)
        return Response(AdminQuestionSerializer(question).data, status=status.HTTP_201_CREATED)


class AdminQuestionDetailView(APIView):
    permission_classes = [IsAdminRole]

    def patch(self, request, question_id):
        question = get_object_or_404(
            Question.objects.select_related("subject", "concept").prefetch_related("options", "exams"),
            id=question_id,
        )
        if set(request.data.keys()) == {"status"}:
            if request.data["status"] not in Question.Status.values:
                return Response({"status": "Invalid status."}, status=status.HTTP_400_BAD_REQUEST)
            question.status = request.data["status"]
            question.save(update_fields=["status", "updated_at"])
            return Response(
                AdminQuestionSerializer(
                    Question.objects.select_related("subject", "concept").prefetch_related("options", "exams").get(id=question.id)
                ).data
            )
        payload = {
            "subject_id": request.data.get("subject_id", str(question.subject_id)),
            "concept_id": request.data.get("concept_id", str(question.concept_id)),
            "exam_ids": request.data.get("exam_ids", [str(exam_id) for exam_id in question.exams.values_list("id", flat=True)]),
            "exam_type": request.data.get("exam_type", question.exam_type),
            "question_type": request.data.get("question_type", question.question_type),
            "prompt": request.data.get("prompt", question.prompt),
            "explanation": request.data.get("explanation", question.explanation),
            "difficulty_level": request.data.get("difficulty_level", question.difficulty_level),
            "status": request.data.get("status", question.status),
            "options": request.data.get(
                "options",
                [
                    {
                        "option_text": option.option_text,
                        "is_correct": option.is_correct,
                        "display_order": option.display_order,
                    }
                    for option in question.options.all()
                ],
            ),
        }
        serializer = AdminQuestionWriteSerializer(data=payload)
        serializer.is_valid(raise_exception=True)
        serializer.update(question, serializer.validated_data)
        question.refresh_from_db()
        return Response(
            AdminQuestionSerializer(
                Question.objects.select_related("subject", "concept").prefetch_related("options", "exams").get(id=question.id)
            ).data
        )

    def delete(self, request, question_id):
        question = get_object_or_404(Question, id=question_id)
        question.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
