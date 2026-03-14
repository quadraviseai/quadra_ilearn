from rest_framework import serializers

from apps.study_planner.models import StudyPlan, StudyPlanTask


class StudyPlanTaskSerializer(serializers.ModelSerializer):
    concept_name = serializers.CharField(source="concept.name", read_only=True)

    class Meta:
        model = StudyPlanTask
        fields = [
            "id",
            "title",
            "description",
            "scheduled_date",
            "status",
            "estimated_minutes",
            "concept_name",
            "ai_study_content",
            "ai_study_content_generated_at",
        ]


class StudyPlanTaskUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = StudyPlanTask
        fields = ["status"]


class StudyPlanSerializer(serializers.ModelSerializer):
    tasks = StudyPlanTaskSerializer(many=True, read_only=True)
    primary_target_exam = serializers.CharField(source="student.primary_target_exam", read_only=True)
    secondary_target_exam = serializers.CharField(source="student.secondary_target_exam", read_only=True)

    class Meta:
        model = StudyPlan
        fields = ["id", "title", "status", "start_date", "end_date", "primary_target_exam", "secondary_target_exam", "tasks"]
