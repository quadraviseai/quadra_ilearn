import uuid

from django.conf import settings
from django.db import models


class StudentProfile(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="student_profile",
    )
    full_name = models.CharField(max_length=150)
    class_name = models.CharField(max_length=50)
    date_of_birth = models.DateField(blank=True, null=True)
    board = models.CharField(max_length=50, blank=True)
    school_name = models.CharField(max_length=150, blank=True)
    primary_target_exam = models.CharField(max_length=100, blank=True)
    secondary_target_exam = models.CharField(max_length=100, blank=True)
    ai_exam_suggestions = models.JSONField(default=list, blank=True)
    ai_exam_suggestions_generated_at = models.DateTimeField(blank=True, null=True)
    timezone = models.CharField(max_length=50, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["full_name"]

    def __str__(self):
        return self.full_name
