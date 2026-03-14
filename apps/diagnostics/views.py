from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.diagnostics.models import Question, Subject, TestAttempt
from apps.diagnostics.permissions import IsStudent
from apps.diagnostics.serializers import (
    QuestionAttemptSerializer,
    StartDiagnosticSerializer,
    SubjectSerializer,
    SubmitDiagnosticSerializer,
    TestAttemptSerializer,
)
from apps.diagnostics.services import evaluate_attempt
from apps.study_planner.serializers import StudyPlanSerializer


class StartDiagnosticView(APIView):
    permission_classes = [IsStudent]

    def post(self, request):
        serializer = StartDiagnosticSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        attempt = serializer.save()
        return Response(TestAttemptSerializer(attempt).data, status=status.HTTP_201_CREATED)


class SubjectListView(APIView):
    permission_classes = [IsStudent]

    def get(self, request):
        subjects = Subject.objects.all()
        serializer = SubjectSerializer(subjects, many=True)
        return Response(serializer.data)


class DiagnosticAttemptDetailView(APIView):
    permission_classes = [IsStudent]

    def get(self, request, attempt_id):
        attempt = get_object_or_404(
            TestAttempt.objects.select_related("subject", "student"),
            id=attempt_id,
            student=request.user.student_profile,
        )
        questions = Question.objects.filter(subject=attempt.subject, status=Question.Status.ACTIVE).prefetch_related(
            "options"
        )
        answers = {answer.question_id: answer for answer in attempt.answers.select_related("selected_option")}
        serializer = QuestionAttemptSerializer(questions, many=True, context={"answer_map": answers})
        return Response(
            {
                "attempt": TestAttemptSerializer(attempt).data,
                "questions": serializer.data,
            }
        )


class DiagnosticAttemptSubmitView(APIView):
    permission_classes = [IsStudent]

    def post(self, request, attempt_id):
        attempt = get_object_or_404(TestAttempt, id=attempt_id, student=request.user.student_profile)
        serializer = SubmitDiagnosticSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            result = evaluate_attempt(attempt, serializer.validated_data["answers"])
        except ValueError as exc:
            raise ValidationError({"detail": str(exc)}) from exc
        return Response(
            {
                "attempt": TestAttemptSerializer(result["attempt"]).data,
                "learning_health": {
                    "health_score": result["snapshot"].health_score,
                    "consistency_score": result["snapshot"].consistency_score,
                    "accuracy_score": result["snapshot"].accuracy_score,
                    "coverage_score": result["snapshot"].coverage_score,
                    "snapshot_date": result["snapshot"].snapshot_date,
                },
                "streak": {
                    "current_streak_days": result["streak"].current_streak_days,
                    "best_streak_days": result["streak"].best_streak_days,
                },
                "study_plan": StudyPlanSerializer(result["study_plan"]).data if result["study_plan"] else None,
            }
        )
