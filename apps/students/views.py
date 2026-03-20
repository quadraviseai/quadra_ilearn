from django.utils import timezone
from rest_framework import status
from rest_framework.exceptions import APIException, ValidationError
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.diagnostics.models import PaymentRecord, TestAttempt
from apps.diagnostics.permissions import IsStudent
from apps.students.serializers import (
    PrimaryExamSuggestionRequestSerializer,
    PushDeviceRegistrationSerializer,
    PushTestNotificationSerializer,
    StudentAuditLogSerializer,
    StudentDashboardSummarySerializer,
    StudentProfileSerializer,
    TokenTopUpPurchaseRequestSerializer,
    build_price_transaction_rows,
)
from apps.students.services import PrimaryExamSuggestionError, suggest_primary_exam_with_gemini
from apps.users.services import (
    PushNotificationError,
    TokenError,
    purchase_token_pack,
    register_push_device,
    send_expo_push_notification,
)


class StudentDashboardSummaryView(APIView):
    permission_classes = [IsStudent]

    def get(self, request):
        serializer = StudentDashboardSummarySerializer(request.user.student_profile)
        return Response(serializer.data)


class StudentProfileView(APIView):
    permission_classes = [IsStudent]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get(self, request):
        serializer = StudentProfileSerializer(request.user.student_profile, context={"request": request})
        return Response(serializer.data)

    def patch(self, request):
        serializer = StudentProfileSerializer(
            request.user.student_profile,
            data=request.data,
            partial=True,
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class StudentTokenTopUpPurchaseView(APIView):
    permission_classes = [IsStudent]

    def post(self, request):
        serializer = TokenTopUpPurchaseRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            purchase, updated_user = purchase_token_pack(
                request.user,
                serializer.validated_data["pack_id"],
                provider=serializer.validated_data.get("provider", "mobile-demo"),
                provider_reference=serializer.validated_data.get("provider_reference", ""),
            )
        except TokenError as exc:
            raise ValidationError({"pack_id": str(exc)}) from exc

        return Response(
            {
                "purchase_id": purchase.id,
                "token_balance": updated_user.token_balance,
                "token_amount": purchase.token_amount,
                "amount": purchase.amount,
                "status": purchase.status,
                "provider": purchase.provider,
                "created_at": purchase.created_at,
            },
            status=status.HTTP_201_CREATED,
        )


class StudentAuditLogView(APIView):
    permission_classes = [IsStudent]

    def get(self, request):
        user = request.user
        student = user.student_profile
        token_transactions = user.token_transactions.select_related("created_by").all()[:50]
        topups = user.token_topup_purchases.all()[:50]
        payments = PaymentRecord.objects.filter(student=student).select_related("exam", "subject").all()[:50]
        attempts = TestAttempt.objects.filter(student=student).select_related("exam", "subject").all()[:50]
        serializer = StudentAuditLogSerializer(
            {
                "token_transactions": token_transactions,
                "price_transactions": build_price_transaction_rows(topups, payments),
                "exam_transactions": attempts,
            }
        )
        return Response(serializer.data)


class StudentPushDeviceView(APIView):
    permission_classes = [IsStudent]

    def post(self, request):
        serializer = PushDeviceRegistrationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            device = register_push_device(
                request.user,
                serializer.validated_data["expo_push_token"],
                serializer.validated_data["platform"],
                device_id=serializer.validated_data.get("device_id", ""),
                app_version=serializer.validated_data.get("app_version", ""),
            )
        except PushNotificationError as exc:
            raise ValidationError({"expo_push_token": str(exc)}) from exc

        return Response(
            {
                "id": device.id,
                "platform": device.platform,
                "expo_push_token": device.expo_push_token,
                "last_registered_at": device.last_registered_at,
            },
            status=status.HTTP_201_CREATED,
        )


class StudentPushTestNotificationView(APIView):
    permission_classes = [IsStudent]

    def post(self, request):
        serializer = PushTestNotificationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            tickets = send_expo_push_notification(
                request.user.push_devices.filter(is_active=True),
                title=serializer.validated_data["title"],
                body=serializer.validated_data["body"],
                data={"screen": serializer.validated_data.get("screen") or "profile"},
            )
        except PushNotificationError as exc:
            raise ValidationError({"detail": str(exc)}) from exc

        return Response({"sent_count": len(tickets), "tickets": tickets})


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
