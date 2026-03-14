from rest_framework.response import Response
from rest_framework.views import APIView

from apps.diagnostics.permissions import IsStudent
from apps.leaderboards.serializers import LeaderboardEntrySerializer
from apps.leaderboards.services import refresh_weekly_health_leaderboard


class WeeklyLeaderboardView(APIView):
    permission_classes = [IsStudent]

    def get(self, request):
        entries = refresh_weekly_health_leaderboard()
        serializer = LeaderboardEntrySerializer(entries, many=True)
        current_user_entry = next((entry for entry in serializer.data if entry["student_name"] == request.user.student_profile.full_name), None)
        return Response({"entries": serializer.data, "current_user": current_user_entry})
