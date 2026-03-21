from rest_framework import serializers

from apps.diagnostics.models import Exam, PaymentRecord, Question, QuestionOption, Subject, TestAttempt
from apps.diagnostics.services import (
    QUESTION_LIMIT,
    build_adaptive_practice_plan,
    build_concept_tracking_summary,
    build_improvement_loop,
    build_mistake_analysis,
    build_weak_topic_summary,
    get_eligibility,
)


class ExamListSerializer(serializers.ModelSerializer):
    subject_count = serializers.SerializerMethodField()

    class Meta:
        model = Exam
        fields = ["id", "name", "slug", "exam_set_type", "is_active", "retest_price", "subject_count"]

    def get_subject_count(self, obj):
        return obj.subjects.filter(is_active=True).count()


class SubjectListSerializer(serializers.ModelSerializer):
    question_count = serializers.SerializerMethodField()

    class Meta:
        model = Subject
        fields = ["id", "name", "slug", "is_active", "learning_content", "question_count"]

    def get_question_count(self, obj):
        exam = self.context.get("exam")
        queryset = obj.questions.filter(status=Question.Status.ACTIVE)
        if exam is not None:
            queryset = queryset.filter(exams=exam)
        return queryset.distinct().count()


class EligibilityQuerySerializer(serializers.Serializer):
    exam_id = serializers.UUIDField()
    subject_id = serializers.UUIDField()

    def validate(self, attrs):
        exam = Exam.objects.filter(id=attrs["exam_id"], is_active=True).first()
        if not exam:
            raise serializers.ValidationError({"exam_id": "Exam not found."})

        subject = Subject.objects.filter(id=attrs["subject_id"], is_active=True).first()
        if not subject:
            raise serializers.ValidationError({"subject_id": "Subject not found."})

        if not subject.exams.filter(id=exam.id).exists():
            raise serializers.ValidationError({"subject_id": "This subject is not mapped to the selected exam."})

        attrs["exam"] = exam
        attrs["subject"] = subject
        return attrs


class StartTestSerializer(EligibilityQuerySerializer):
    pass


class SaveAnswerSerializer(serializers.Serializer):
    question_id = serializers.UUIDField()
    selected_option_id = serializers.UUIDField(required=False, allow_null=True)
    answer_text = serializers.CharField(required=False, allow_blank=True)
    time_spent_seconds = serializers.IntegerField(required=False, min_value=0, default=0)


class QuestionOptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = QuestionOption
        fields = ["id", "option_text", "display_order"]


class AttemptQuestionSerializer(serializers.ModelSerializer):
    options = QuestionOptionSerializer(many=True, read_only=True)
    topic_name = serializers.CharField(source="concept.name", read_only=True)
    chapter_name = serializers.CharField(source="concept.chapter.name", read_only=True)
    existing_answer = serializers.SerializerMethodField()
    display_order = serializers.IntegerField(read_only=True)

    class Meta:
        model = Question
        fields = [
            "id",
            "display_order",
            "prompt",
            "question_type",
            "difficulty_level",
            "topic_name",
            "chapter_name",
            "options",
            "existing_answer",
        ]

    def get_existing_answer(self, obj):
        answer_map = self.context.get("answer_map", {})
        answer = answer_map.get(obj.id)
        if not answer:
            return None
        return {
            "selected_option_id": str(answer.selected_option_id) if answer.selected_option_id else None,
            "answer_text": answer.answer_text,
            "time_spent_seconds": answer.time_spent_seconds,
        }


class TestAttemptSerializer(serializers.ModelSerializer):
    subject_name = serializers.CharField(source="subject.name", read_only=True)
    exam_name = serializers.CharField(source="exam.name", read_only=True)
    weak_topics = serializers.SerializerMethodField()
    concept_tracking = serializers.SerializerMethodField()
    mistake_analysis = serializers.SerializerMethodField()
    improvement_loop = serializers.SerializerMethodField()
    adaptive_practice = serializers.SerializerMethodField()

    class Meta:
        model = TestAttempt
        fields = [
            "id",
            "subject",
            "subject_name",
            "exam",
            "exam_name",
            "status",
            "access_mode",
            "started_at",
            "last_saved_at",
            "submitted_at",
            "score_percent",
            "total_questions",
            "correct_answers",
            "wrong_answers",
            "unanswered_answers",
            "time_spent_seconds",
            "weak_topics",
            "concept_tracking",
            "mistake_analysis",
            "adaptive_practice",
            "improvement_loop",
        ]

    def get_weak_topics(self, obj):
        if obj.status != TestAttempt.Status.EVALUATED:
            return []
        return build_weak_topic_summary(obj)

    def get_concept_tracking(self, obj):
        if obj.status != TestAttempt.Status.EVALUATED:
            return []
        return build_concept_tracking_summary(obj)

    def get_mistake_analysis(self, obj):
        if obj.status != TestAttempt.Status.EVALUATED:
            return {"breakdown": {}, "dominant": None, "by_concept": []}
        return build_mistake_analysis(obj)

    def get_improvement_loop(self, obj):
        if obj.status != TestAttempt.Status.EVALUATED:
            return []
        return build_improvement_loop(obj)

    def get_adaptive_practice(self, obj):
        if obj.status != TestAttempt.Status.EVALUATED:
            return []
        return build_adaptive_practice_plan(obj)


class AttemptDetailSerializer(serializers.Serializer):
    attempt = serializers.DictField()
    questions = serializers.ListField()


class EligibilityResponseSerializer(serializers.Serializer):
    can_start = serializers.BooleanField()
    payment_required = serializers.BooleanField()
    free = serializers.BooleanField()
    resume = serializers.BooleanField()
    message = serializers.CharField()
    amount = serializers.DecimalField(max_digits=8, decimal_places=2)
    question_limit = serializers.IntegerField(default=QUESTION_LIMIT)
    active_attempt_id = serializers.UUIDField(required=False, allow_null=True)
    paid_attempt_credits = serializers.IntegerField(required=False)


class PaymentUnlockSerializer(EligibilityQuerySerializer):
    provider = serializers.CharField(required=False, allow_blank=True, default="manual")
    provider_reference = serializers.CharField(required=False, allow_blank=True, default="")


class PaymentRecordSerializer(serializers.ModelSerializer):
    exam_name = serializers.CharField(source="exam.name", read_only=True)
    subject_name = serializers.CharField(source="subject.name", read_only=True)

    class Meta:
        model = PaymentRecord
        fields = [
            "id",
            "exam",
            "exam_name",
            "subject",
            "subject_name",
            "amount",
            "status",
            "provider",
            "provider_reference",
            "created_at",
        ]


class LearningContentSerializer(serializers.Serializer):
    topic = serializers.CharField()
    chapter = serializers.CharField(allow_blank=True)
    misses = serializers.IntegerField()
    primary_mistake = serializers.CharField(required=False, allow_blank=True)
    adaptive_stage = serializers.CharField(required=False, allow_blank=True)
    ladder = serializers.ListField(child=serializers.CharField(), required=False)
    summary = serializers.CharField()
    guidance = serializers.ListField(child=serializers.CharField())


def serialize_eligibility(student, exam, subject):
    payload = get_eligibility(student, exam, subject)
    entitlement = student.test_entitlements.filter(exam=exam, subject=subject).first()
    return {
        "can_start": payload["can_start"],
        "payment_required": payload["payment_required"],
        "free": payload["free"],
        "resume": payload["resume"],
        "message": payload["message"],
        "amount": exam.retest_price,
        "question_limit": payload.get("question_limit", QUESTION_LIMIT),
        "active_attempt_id": payload["active_attempt"].id if payload.get("active_attempt") else None,
        "paid_attempt_credits": entitlement.paid_attempt_credits if entitlement else 0,
    }
