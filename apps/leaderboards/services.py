from datetime import timedelta

from django.utils import timezone

from apps.learning_health.models import LearningHealthSnapshot
from apps.leaderboards.models import LeaderboardEntry


def refresh_weekly_health_leaderboard():
    today = timezone.localdate()
    period_start = today - timedelta(days=today.weekday())
    period_end = period_start + timedelta(days=6)

    snapshots = (
        LearningHealthSnapshot.objects.select_related("student")
        .filter(snapshot_date__range=[period_start, period_end])
        .order_by("-snapshot_date", "-health_score")
    )

    latest_by_student = {}
    for snapshot in snapshots:
        latest_by_student.setdefault(snapshot.student_id, snapshot)

    ordered = sorted(latest_by_student.values(), key=lambda item: (-float(item.health_score), item.student.full_name))
    entries = []
    for index, snapshot in enumerate(ordered, start=1):
        entry, _ = LeaderboardEntry.objects.update_or_create(
            student=snapshot.student,
            leaderboard_type="weekly_health",
            period_start=period_start,
            period_end=period_end,
            defaults={
                "score_value": snapshot.health_score,
                "rank_position": index,
            },
        )
        entries.append(entry)
    return entries
