from rest_framework import serializers

from apps.learning_health.models import LearningHealthSnapshot


class LearningHealthSnapshotSerializer(serializers.ModelSerializer):
    class Meta:
        model = LearningHealthSnapshot
        fields = [
            "id",
            "health_score",
            "consistency_score",
            "accuracy_score",
            "coverage_score",
            "snapshot_date",
            "created_at",
        ]
