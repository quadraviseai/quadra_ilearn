from rest_framework import serializers

from apps.leaderboards.models import LeaderboardEntry


class LeaderboardEntrySerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source="student.full_name", read_only=True)

    class Meta:
        model = LeaderboardEntry
        fields = ["id", "student_name", "leaderboard_type", "period_start", "period_end", "score_value", "rank_position"]
