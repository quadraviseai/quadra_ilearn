from django.urls import path

from apps.leaderboards.views import WeeklyLeaderboardView


urlpatterns = [
    path("weekly-health", WeeklyLeaderboardView.as_view(), name="leaderboard-weekly-health"),
]
