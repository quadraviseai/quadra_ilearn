from rest_framework import serializers

from apps.diagnostics.models import ConceptMastery, TestAttempt
from apps.learning_health.serializers import LearningHealthSnapshotSerializer
from apps.students.models import StudentProfile
from apps.users.models import PushDevice, TokenTransaction
from apps.users.services import (
    TokenError,
    apply_referral_bonus,
    get_token_settings,
    get_token_top_up_packs,
    serialize_token_settings,
)


class WeakConceptSerializer(serializers.ModelSerializer):
    concept_name = serializers.CharField(source="concept.name", read_only=True)
    subject_name = serializers.CharField(source="concept.subject.name", read_only=True)

    class Meta:
        model = ConceptMastery
        fields = ["concept_name", "subject_name", "mastery_score", "accuracy_percent", "attempts_count"]


class RecentAttemptSerializer(serializers.ModelSerializer):
    subject_name = serializers.CharField(source="subject.name", read_only=True)

    class Meta:
        model = TestAttempt
        fields = ["id", "subject_name", "status", "score_percent", "started_at", "submitted_at"]


class StudentDashboardSummarySerializer(serializers.ModelSerializer):
    latest_learning_health = serializers.SerializerMethodField()
    streak = serializers.SerializerMethodField()
    weak_concepts = serializers.SerializerMethodField()
    recent_attempts = serializers.SerializerMethodField()
    token_balance = serializers.IntegerField(source="user.token_balance", read_only=True)
    referral_code = serializers.CharField(source="user.referral_code", read_only=True)
    token_settings = serializers.SerializerMethodField()

    class Meta:
        model = StudentProfile
        fields = [
            "id",
            "full_name",
            "class_name",
            "date_of_birth",
            "board",
            "primary_target_exam",
            "secondary_target_exam",
            "token_balance",
            "referral_code",
            "token_settings",
            "latest_learning_health",
            "streak",
            "weak_concepts",
            "recent_attempts",
        ]

    def get_latest_learning_health(self, obj):
        snapshot = obj.learning_health_snapshots.first()
        return LearningHealthSnapshotSerializer(snapshot).data if snapshot else None

    def get_streak(self, obj):
        streak = getattr(obj, "streak", None)
        if not streak:
            return {
                "current_streak_days": 0,
                "best_streak_days": 0,
                "last_activity_date": None,
            }
        return {
            "current_streak_days": streak.current_streak_days,
            "best_streak_days": streak.best_streak_days,
            "last_activity_date": streak.last_activity_date,
        }

    def get_weak_concepts(self, obj):
        concepts = obj.concept_mastery.select_related("concept__subject").order_by("mastery_score", "updated_at")[:5]
        return WeakConceptSerializer(concepts, many=True).data

    def get_recent_attempts(self, obj):
        attempts = (
            obj.test_attempts.select_related("subject")
            .exclude(status=TestAttempt.Status.STARTED)
            .order_by("-started_at")[:5]
        )
        return RecentAttemptSerializer(attempts, many=True).data

    def get_token_settings(self, _obj):
        return serialize_token_settings(get_token_settings())


class StudentProfileSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(source="user.email", read_only=True)
    phone = serializers.CharField(source="user.phone", allow_blank=True, required=False)
    class_name = serializers.CharField(required=False, allow_blank=True)
    token_balance = serializers.IntegerField(source="user.token_balance", read_only=True)
    referral_code = serializers.CharField(source="user.referral_code", read_only=True)
    referred_by_email = serializers.EmailField(source="user.referred_by.email", read_only=True)
    referral_code_input = serializers.CharField(write_only=True, required=False, allow_blank=True)
    profile_image_url = serializers.SerializerMethodField()
    profile_image_upload = serializers.FileField(write_only=True, required=False, allow_null=True)
    token_settings = serializers.SerializerMethodField()
    token_top_up_packs = serializers.SerializerMethodField()

    class Meta:
        model = StudentProfile
        fields = [
            "id",
            "email",
            "phone",
            "full_name",
            "class_name",
            "date_of_birth",
            "board",
            "school_name",
            "profile_image_url",
            "profile_image_upload",
            "primary_target_exam",
            "secondary_target_exam",
            "token_balance",
            "referral_code",
            "referred_by_email",
            "referral_code_input",
            "token_settings",
            "token_top_up_packs",
            "ai_exam_suggestions",
            "ai_exam_suggestions_generated_at",
            "timezone",
        ]
        read_only_fields = ["ai_exam_suggestions", "ai_exam_suggestions_generated_at"]

    def get_token_settings(self, _obj):
        return serialize_token_settings(get_token_settings())

    def get_profile_image_url(self, obj):
        request = self.context.get("request")
        if obj.profile_image:
            url = obj.profile_image.url
            return request.build_absolute_uri(url) if request else url
        return obj.profile_image_url

    def get_token_top_up_packs(self, _obj):
        return get_token_top_up_packs()

    def validate_referral_code_input(self, value):
        return str(value or "").strip().upper()

    def update(self, instance, validated_data):
        user_data = validated_data.pop("user", {})
        referral_code_input = validated_data.pop("referral_code_input", "")
        uploaded_profile_image = validated_data.pop("profile_image_upload", None)
        for field, value in validated_data.items():
            setattr(instance, field, value)
        if uploaded_profile_image is not None:
            instance.profile_image = uploaded_profile_image
            instance.profile_image_url = ""
        instance.save()

        if user_data:
            for field, value in user_data.items():
                setattr(instance.user, field, value)
            instance.user.save(update_fields=list(user_data.keys()) + ["updated_at"])

        if referral_code_input:
            try:
                apply_referral_bonus(instance.user, referral_code_input)
            except TokenError as exc:
                raise serializers.ValidationError({"referral_code_input": str(exc)}) from exc

        instance.refresh_from_db()
        return instance


class PrimaryExamSuggestionRequestSerializer(serializers.Serializer):
    class_name = serializers.CharField(max_length=50)
    date_of_birth = serializers.DateField(required=False, allow_null=True)
    board = serializers.CharField(max_length=100, required=False, allow_blank=True)
    school_name = serializers.CharField(max_length=255, required=False, allow_blank=True)


class TokenTopUpPurchaseRequestSerializer(serializers.Serializer):
    pack_id = serializers.CharField(max_length=30)
    provider = serializers.CharField(required=False, allow_blank=True, default="mobile-demo")
    provider_reference = serializers.CharField(required=False, allow_blank=True, default="")


class PushDeviceRegistrationSerializer(serializers.Serializer):
    expo_push_token = serializers.CharField(max_length=255)
    platform = serializers.ChoiceField(choices=PushDevice.Platform.choices)
    device_id = serializers.CharField(required=False, allow_blank=True, default="")
    app_version = serializers.CharField(required=False, allow_blank=True, default="")


class PushTestNotificationSerializer(serializers.Serializer):
    title = serializers.CharField(required=False, allow_blank=True, default="QuadraILearn")
    body = serializers.CharField(required=False, allow_blank=True, default="This is a test push notification.")
    screen = serializers.CharField(required=False, allow_blank=True, default="profile")


class StudentTokenTransactionSerializer(serializers.ModelSerializer):
    transaction_type_label = serializers.CharField(source="get_transaction_type_display", read_only=True)
    created_by_email = serializers.EmailField(source="created_by.email", read_only=True)

    class Meta:
        model = TokenTransaction
        fields = [
            "id",
            "transaction_type",
            "transaction_type_label",
            "amount",
            "balance_after",
            "note",
            "metadata",
            "created_by_email",
            "created_at",
        ]


class StudentPriceTransactionSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    price_transaction_type = serializers.CharField()
    title = serializers.CharField()
    amount = serializers.DecimalField(max_digits=8, decimal_places=2)
    status = serializers.CharField()
    provider = serializers.CharField(allow_blank=True)
    provider_reference = serializers.CharField(allow_blank=True)
    metadata = serializers.JSONField()
    created_at = serializers.DateTimeField()


class StudentExamTransactionSerializer(serializers.ModelSerializer):
    exam_name = serializers.CharField(source="exam.name", read_only=True)
    subject_name = serializers.CharField(source="subject.name", read_only=True)

    class Meta:
        model = TestAttempt
        fields = [
            "id",
            "exam_name",
            "subject_name",
            "status",
            "access_mode",
            "score_percent",
            "total_questions",
            "correct_answers",
            "wrong_answers",
            "unanswered_answers",
            "started_at",
            "submitted_at",
        ]


class StudentAuditLogSerializer(serializers.Serializer):
    token_transactions = StudentTokenTransactionSerializer(many=True)
    price_transactions = StudentPriceTransactionSerializer(many=True)
    exam_transactions = StudentExamTransactionSerializer(many=True)


def build_price_transaction_rows(topups, payments):
    rows = []
    for purchase in topups:
        rows.append(
            {
                "id": purchase.id,
                "price_transaction_type": "token_topup",
                "title": f"{purchase.token_amount} token pack",
                "amount": purchase.amount,
                "status": purchase.status,
                "provider": purchase.provider,
                "provider_reference": purchase.provider_reference,
                "metadata": purchase.metadata,
                "created_at": purchase.created_at,
            }
        )

    for payment in payments:
        rows.append(
            {
                "id": payment.id,
                "price_transaction_type": "exam_unlock",
                "title": f"{payment.exam.name} · {payment.subject.name}",
                "amount": payment.amount,
                "status": payment.status,
                "provider": payment.provider,
                "provider_reference": payment.provider_reference,
                "metadata": {
                    "exam_id": str(payment.exam_id),
                    "subject_id": str(payment.subject_id),
                },
                "created_at": payment.created_at,
            }
        )

    rows.sort(key=lambda item: item["created_at"], reverse=True)
    return rows
