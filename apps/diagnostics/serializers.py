from rest_framework import serializers

from apps.diagnostics.models import AttemptAnswer, Question, QuestionOption, Subject, TestAttempt


class StartDiagnosticSerializer(serializers.Serializer):
    subject_id = serializers.UUIDField()

    def validate_subject_id(self, value):
        subject = Subject.objects.filter(id=value).first()
        if not subject:
            raise serializers.ValidationError("Subject not found.")
        if not Question.objects.filter(subject=subject, status=Question.Status.ACTIVE).exists():
            raise serializers.ValidationError("This subject has no active diagnostic questions.")
        return value

    def create(self, validated_data):
        student = self.context["request"].user.student_profile
        subject = Subject.objects.get(id=validated_data["subject_id"])
        question_count = Question.objects.filter(subject=subject, status=Question.Status.ACTIVE).count()
        attempt = TestAttempt.objects.create(student=student, subject=subject, total_questions=question_count)
        return attempt


class SubjectSerializer(serializers.ModelSerializer):
    question_count = serializers.SerializerMethodField()

    class Meta:
        model = Subject
        fields = ["id", "name", "slug", "question_count"]

    def get_question_count(self, obj):
        return obj.questions.filter(status=Question.Status.ACTIVE).count()


class QuestionOptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = QuestionOption
        fields = ["id", "option_text", "display_order"]


class AttemptAnswerSerializer(serializers.ModelSerializer):
    class Meta:
        model = AttemptAnswer
        fields = ["question", "selected_option", "answer_text", "is_correct", "time_spent_seconds", "answered_at"]


class QuestionAttemptSerializer(serializers.ModelSerializer):
    options = QuestionOptionSerializer(many=True, read_only=True)
    concept_name = serializers.CharField(source="concept.name", read_only=True)
    existing_answer = serializers.SerializerMethodField()

    class Meta:
        model = Question
        fields = [
            "id",
            "prompt",
            "question_type",
            "difficulty_level",
            "concept_name",
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

    class Meta:
        model = TestAttempt
        fields = [
            "id",
            "student",
            "subject",
            "subject_name",
            "status",
            "started_at",
            "submitted_at",
            "score_percent",
            "total_questions",
            "correct_answers",
            "time_spent_seconds",
        ]
        read_only_fields = fields


class SubmitAnswerItemSerializer(serializers.Serializer):
    question_id = serializers.UUIDField()
    selected_option_id = serializers.UUIDField(required=False, allow_null=True)
    answer_text = serializers.CharField(required=False, allow_blank=True)
    time_spent_seconds = serializers.IntegerField(required=False, min_value=0, default=0)


class SubmitDiagnosticSerializer(serializers.Serializer):
    answers = SubmitAnswerItemSerializer(many=True)
