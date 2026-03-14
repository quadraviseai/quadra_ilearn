import uuid

from django.db import models

from apps.students.models import StudentProfile


class StudentStreak(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    student = models.OneToOneField(StudentProfile, on_delete=models.CASCADE, related_name="streak")
    current_streak_days = models.PositiveIntegerField(default=0)
    best_streak_days = models.PositiveIntegerField(default=0)
    last_activity_date = models.DateField(null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)
