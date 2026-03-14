import uuid

from django.db import models

from apps.students.models import StudentProfile


class LeaderboardEntry(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    student = models.ForeignKey(StudentProfile, on_delete=models.CASCADE, related_name="leaderboard_entries")
    leaderboard_type = models.CharField(max_length=30)
    period_start = models.DateField()
    period_end = models.DateField()
    score_value = models.DecimalField(max_digits=7, decimal_places=2)
    rank_position = models.PositiveIntegerField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["student", "leaderboard_type", "period_start", "period_end"],
                name="unique_student_leaderboard_period",
            )
        ]
        ordering = ["leaderboard_type", "rank_position"]
