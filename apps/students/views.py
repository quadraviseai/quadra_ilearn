from django.utils import timezone
from rest_framework import status
from rest_framework.exceptions import APIException, ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.diagnostics.permissions import IsStudent
from apps.students.serializers import (
    PrimaryExamSuggestionRequestSerializer,
    StudentDashboardSummarySerializer,
    StudentProfileSerializer,
)
from apps.students.services import PrimaryExamSuggestionError, suggest_primary_exam_with_gemini


class StudentDashboardSummaryView(APIView):
    permission_classes = [IsStudent]

    def get(self, request):
        serializer = StudentDashboardSummarySerializer(request.user.student_profile)
        return Response(serializer.data)


class StudentProfileView(APIView):
    permission_classes = [IsStudent]

    def get(self, request):
        serializer = StudentProfileSerializer(request.user.student_profile)
        return Response(serializer.data)

    def patch(self, request):
        serializer = StudentProfileSerializer(
            request.user.student_profile,
            data=request.data,
            partial=True,
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class StudentPrimaryExamSuggestionView(APIView):
    permission_classes = [IsStudent]

    def post(self, request):
        serializer = PrimaryExamSuggestionRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            suggestion = suggest_primary_exam_with_gemini(**serializer.validated_data)
        except PrimaryExamSuggestionError as exc:
            message = str(exc)
            if "not configured" in message.lower():
                raise ValidationError({"detail": message}) from exc

            api_exception = APIException(message)
            api_exception.status_code = status.HTTP_502_BAD_GATEWAY
            raise api_exception from exc

        profile = request.user.student_profile
        profile.ai_exam_suggestions = suggestion["suggestions"]
        profile.ai_exam_suggestions_generated_at = timezone.now()
        profile.save(update_fields=["ai_exam_suggestions", "ai_exam_suggestions_generated_at", "updated_at"])

        return Response(
            {
                "suggestions": suggestion["suggestions"],
                "generated_at": profile.ai_exam_suggestions_generated_at,
            }
        )
