from django.shortcuts import get_object_or_404
from rest_framework.permissions import AllowAny
from rest_framework import status
from rest_framework.exceptions import APIException
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.diagnostics.models import Exam, Subject, TestAttempt, TestAttemptQuestion
from apps.diagnostics.permissions import IsStudent
from apps.diagnostics.serializers import (
    AttemptQuestionSerializer,
    EligibilityQuerySerializer,
    ExamListSerializer,
    PaymentRecordSerializer,
    PaymentUnlockSerializer,
    SaveAnswerSerializer,
    StartTestSerializer,
    SubjectListSerializer,
    TestAttemptSerializer,
    serialize_eligibility,
)
from apps.diagnostics.services import (
    build_adaptive_practice_plan,
    build_improvement_loop,
    build_mistake_analysis,
    build_weak_topic_summary,
    generate_weak_topic_ai_review,
    get_active_attempt,
    save_attempt_answer,
    start_attempt,
    submit_attempt,
    unlock_paid_attempt,
    WeakTopicAIReviewError,
)
from apps.users.models import TokenTransaction
from apps.users.services import TokenError, get_token_settings, serialize_token_settings, spend_tokens


class ExamListView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        exams = Exam.objects.filter(is_active=True).prefetch_related("subjects")
        serializer = ExamListSerializer(exams, many=True)
        return Response(serializer.data)


class SubjectListView(APIView):
    permission_classes = [IsStudent]

    def get(self, request):
        exam_id = request.query_params.get("exam_id")
        if exam_id:
            exam = get_object_or_404(Exam, id=exam_id, is_active=True)
            subjects = Subject.objects.filter(is_active=True, exams=exam).distinct()
            serializer = SubjectListSerializer(subjects, many=True, context={"exam": exam})
            return Response(serializer.data)

        subjects = Subject.objects.filter(is_active=True).prefetch_related("exams").distinct()
        serializer = SubjectListSerializer(subjects, many=True)
        return Response(serializer.data)


class ExamSubjectListView(APIView):
    permission_classes = [IsStudent]

    def get(self, request, exam_id):
        exam = get_object_or_404(Exam, id=exam_id, is_active=True)
        subjects = Subject.objects.filter(is_active=True, exams=exam).distinct()
        serializer = SubjectListSerializer(subjects, many=True, context={"exam": exam})
        return Response(serializer.data)


class EligibilityView(APIView):
    permission_classes = [IsStudent]

    def get(self, request):
        serializer = EligibilityQuerySerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)
        payload = serialize_eligibility(request.user.student_profile, serializer.validated_data["exam"], serializer.validated_data["subject"])
        return Response(payload)


class ActiveAttemptView(APIView):
    permission_classes = [IsStudent]

    def get(self, request):
        serializer = EligibilityQuerySerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)
        attempt = get_active_attempt(
            request.user.student_profile,
            exam=serializer.validated_data["exam"],
            subject=serializer.validated_data["subject"],
        )
        if not attempt:
            return Response({"detail": "No active attempt found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(TestAttemptSerializer(attempt).data)


class StartDiagnosticView(APIView):
    permission_classes = [IsStudent]

    def post(self, request):
        serializer = StartTestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            attempt = start_attempt(
                request.user.student_profile,
                serializer.validated_data["exam"],
                serializer.validated_data["subject"],
            )
        except ValueError as exc:
            raise ValidationError({"detail": str(exc)}) from exc
        return Response(TestAttemptSerializer(attempt).data, status=status.HTTP_201_CREATED)


class DiagnosticAttemptDetailView(APIView):
    permission_classes = [IsStudent]

    def get(self, request, attempt_id):
        attempt = get_object_or_404(
            TestAttempt.objects.select_related("subject", "student", "exam"),
            id=attempt_id,
            student=request.user.student_profile,
        )
        attempt_questions = list(
            TestAttemptQuestion.objects.filter(attempt=attempt)
            .select_related("question__concept__chapter")
            .prefetch_related("question__options")
            .order_by("display_order")
        )
        answers = {answer.question_id: answer for answer in attempt.answers.select_related("selected_option")}
        questions = []
        for item in attempt_questions:
            serialized = AttemptQuestionSerializer(
                item.question,
                context={"answer_map": answers},
            ).data
            serialized["display_order"] = item.display_order
            questions.append(serialized)
        return Response(
            {
                "attempt": TestAttemptSerializer(attempt).data,
                "questions": questions,
                "token_balance": request.user.token_balance,
                "token_settings": serialize_token_settings(get_token_settings()),
            }
        )


class AttemptAnswerSaveView(APIView):
    permission_classes = [IsStudent]

    def patch(self, request, attempt_id):
        attempt = get_object_or_404(TestAttempt, id=attempt_id, student=request.user.student_profile)
        serializer = SaveAnswerSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            answer = save_attempt_answer(attempt, **serializer.validated_data)
        except ValueError as exc:
            raise ValidationError({"detail": str(exc)}) from exc
        return Response(
            {
                "question_id": str(answer.question_id),
                "selected_option_id": str(answer.selected_option_id) if answer.selected_option_id else None,
                "answer_text": answer.answer_text,
                "time_spent_seconds": answer.time_spent_seconds,
                "answered_at": answer.answered_at,
            }
        )


class DiagnosticAttemptSubmitView(APIView):
    permission_classes = [IsStudent]

    def post(self, request, attempt_id):
        attempt = get_object_or_404(TestAttempt, id=attempt_id, student=request.user.student_profile)
        try:
            submitted = submit_attempt(attempt)
        except ValueError as exc:
            raise ValidationError({"detail": str(exc)}) from exc
        return Response(TestAttemptSerializer(submitted).data)


class LatestReportView(APIView):
    permission_classes = [IsStudent]

    def get(self, request):
        report = (
            TestAttempt.objects.select_related("exam", "subject")
            .filter(student=request.user.student_profile, status=TestAttempt.Status.EVALUATED)
            .order_by("-submitted_at", "-started_at")
            .first()
        )
        if not report:
            return Response({"detail": "No report available."}, status=status.HTTP_404_NOT_FOUND)
        return Response(TestAttemptSerializer(report).data)


class ReportDetailView(APIView):
    permission_classes = [IsStudent]

    def get(self, request, attempt_id):
        report = get_object_or_404(
            TestAttempt.objects.select_related("exam", "subject"),
            id=attempt_id,
            student=request.user.student_profile,
            status=TestAttempt.Status.EVALUATED,
        )
        return Response(TestAttemptSerializer(report).data)


class ReportLearningView(APIView):
    permission_classes = [IsStudent]

    def get(self, request, attempt_id):
        report = get_object_or_404(
            TestAttempt.objects.select_related("exam", "subject"),
            id=attempt_id,
            student=request.user.student_profile,
            status=TestAttempt.Status.EVALUATED,
        )
        content = []
        mistake_lookup = {
            str(item["concept_id"]): item["primary_mistake"]
            for item in build_mistake_analysis(report)["by_concept"]
        }
        adaptive_lookup = {
            str(item["concept_id"]): item
            for item in build_adaptive_practice_plan(report)
        }
        token_settings = get_token_settings()
        for topic in build_weak_topic_summary(report):
            summary = topic["description"] or report.subject.learning_content or f"Review {topic['topic']} before the next retest."
            adaptive = adaptive_lookup.get(str(topic["concept_id"]), {})
            mistake_type = mistake_lookup.get(str(topic["concept_id"]), "concept_mistake")
            guidance = [
                f"Rebuild the core idea behind {topic['topic']}.",
                f"Practice only {topic['topic']} first, not the full {topic['chapter'] or report.subject.name} chapter.",
                f"Check mistakes from {topic['chapter'] or report.subject.name} and avoid repeating the same pattern.",
                f"Follow the adaptive ladder: {' -> '.join(adaptive.get('ladder', ['easy', 'medium', 'hard']))}.",
            ]
            content.append(
                {
                    "concept_id": topic["concept_id"],
                    "topic": topic["topic"],
                    "chapter": topic["chapter"],
                    "misses": topic["misses"],
                    "primary_mistake": mistake_type,
                    "adaptive_stage": adaptive.get("current_stage", "easy"),
                    "ladder": adaptive.get("ladder", ["easy", "medium", "hard"]),
                    "summary": summary,
                    "guidance": guidance,
                    "token_cost": token_settings.weak_topic_unlock_cost,
                }
            )
        unlocked_concept_ids = list(
            request.user.token_transactions.filter(
                transaction_type=TokenTransaction.TransactionType.WEAK_TOPIC_UNLOCK,
                metadata__attempt_id=str(report.id),
            ).values_list("metadata__concept_id", flat=True)
        )
        return Response(
            {
                "learning_cards": content,
                "improvement_loop": build_improvement_loop(report),
                "mistake_analysis": build_mistake_analysis(report),
                "token_balance": request.user.token_balance,
                "token_settings": serialize_token_settings(token_settings),
                "weak_topic_unlock_cost": token_settings.weak_topic_unlock_cost,
                "unlocked_concept_ids": unlocked_concept_ids,
            }
        )


class ReportLearningAIView(APIView):
    permission_classes = [IsStudent]

    def get(self, request, attempt_id, concept_id):
        report = get_object_or_404(
            TestAttempt.objects.select_related("exam", "subject", "student"),
            id=attempt_id,
            student=request.user.student_profile,
            status=TestAttempt.Status.EVALUATED,
        )
        settings = get_token_settings()
        already_unlocked = request.user.token_transactions.filter(
            transaction_type=TokenTransaction.TransactionType.WEAK_TOPIC_UNLOCK,
            metadata__attempt_id=str(report.id),
            metadata__concept_id=str(concept_id),
        ).exists()
        if not already_unlocked and request.user.token_balance < settings.weak_topic_unlock_cost:
            raise ValidationError({"detail": "Insufficient tokens."})
        try:
            content = generate_weak_topic_ai_review(report, concept_id)
        except WeakTopicAIReviewError as exc:
            raise APIException(str(exc)) from exc
        if not already_unlocked:
            try:
                request.user = spend_tokens(
                    request.user,
                    settings.weak_topic_unlock_cost,
                    TokenTransaction.TransactionType.WEAK_TOPIC_UNLOCK,
                    note=f"Weak topic unlock for {report.subject.name}",
                    metadata={"attempt_id": str(report.id), "concept_id": str(concept_id)},
                )
            except TokenError as exc:
                raise ValidationError({"detail": str(exc)}) from exc
        return Response(
            {
                **content,
                "token_balance": request.user.token_balance,
                "tokens_spent": 0 if already_unlocked else settings.weak_topic_unlock_cost,
                "already_unlocked": already_unlocked,
            }
        )


class DiagnosticAttemptTimerResetView(APIView):
    permission_classes = [IsStudent]

    def post(self, request, attempt_id):
        attempt = get_object_or_404(
            TestAttempt.objects.select_related("exam", "subject", "student"),
            id=attempt_id,
            student=request.user.student_profile,
            status=TestAttempt.Status.STARTED,
        )
        settings = get_token_settings()
        try:
            request.user = spend_tokens(
                request.user,
                settings.timer_reset_cost,
                TokenTransaction.TransactionType.TIMER_RESET,
                note=f"Timer reset for {attempt.exam.name} {attempt.subject.name}",
                metadata={"attempt_id": str(attempt.id)},
            )
        except TokenError as exc:
            raise ValidationError({"detail": str(exc)}) from exc

        question_count = TestAttemptQuestion.objects.filter(attempt=attempt).count()
        return Response(
            {
                "message": "Timer reset unlocked.",
                "token_balance": request.user.token_balance,
                "tokens_spent": settings.timer_reset_cost,
                "reset_duration_seconds": max(question_count, 1) * 60,
            },
            status=status.HTTP_200_OK,
        )


class PaymentUnlockView(APIView):
    permission_classes = [IsStudent]

    def post(self, request):
        serializer = PaymentUnlockSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        payment, _entitlement = unlock_paid_attempt(
            request.user.student_profile,
            serializer.validated_data["exam"],
            serializer.validated_data["subject"],
            provider=serializer.validated_data.get("provider", "manual"),
            provider_reference=serializer.validated_data.get("provider_reference", ""),
        )
        return Response(PaymentRecordSerializer(payment).data, status=status.HTTP_201_CREATED)
