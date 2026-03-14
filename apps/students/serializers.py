from rest_framework import serializers

from apps.diagnostics.models import ConceptMastery, TestAttempt
from apps.learning_health.serializers import LearningHealthSnapshotSerializer
from apps.students.models import StudentProfile


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


class StudentProfileSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(source="user.email", read_only=True)
    phone = serializers.CharField(source="user.phone", allow_blank=True, required=False)

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
            "primary_target_exam",
            "secondary_target_exam",
            "ai_exam_suggestions",
            "ai_exam_suggestions_generated_at",
            "timezone",
        ]
        read_only_fields = ["ai_exam_suggestions", "ai_exam_suggestions_generated_at"]

    def update(self, instance, validated_data):
        user_data = validated_data.pop("user", {})
        for field, value in validated_data.items():
            setattr(instance, field, value)
        instance.save()

        if user_data:
            for field, value in user_data.items():
                setattr(instance.user, field, value)
            instance.user.save(update_fields=list(user_data.keys()) + ["updated_at"])

        return instance


class PrimaryExamSuggestionRequestSerializer(serializers.Serializer):
    class_name = serializers.CharField(max_length=50)
    date_of_birth = serializers.DateField(required=False, allow_null=True)
    board = serializers.CharField(max_length=100, required=False, allow_blank=True)
    school_name = serializers.CharField(max_length=255, required=False, allow_blank=True)
