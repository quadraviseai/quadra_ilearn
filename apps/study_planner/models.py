import uuid

from django.db import models

from apps.diagnostics.models import Concept
from apps.students.models import StudentProfile


class StudyPlan(models.Model):
    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        COMPLETED = "completed", "Completed"
        ARCHIVED = "archived", "Archived"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    student = models.ForeignKey(StudentProfile, on_delete=models.CASCADE, related_name="study_plans")
    title = models.CharField(max_length=150)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE)
    start_date = models.DateField()
    end_date = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]


class StudyPlanTask(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        IN_PROGRESS = "in_progress", "In Progress"
        DONE = "done", "Done"
        SKIPPED = "skipped", "Skipped"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    plan = models.ForeignKey(StudyPlan, on_delete=models.CASCADE, related_name="tasks")
    concept = models.ForeignKey(Concept, on_delete=models.SET_NULL, null=True, blank=True, related_name="study_tasks")
    title = models.CharField(max_length=150)
    description = models.TextField(blank=True)
    scheduled_date = models.DateField()
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    estimated_minutes = models.PositiveIntegerField(default=15)
    ai_study_content = models.JSONField(default=dict, blank=True)
    ai_study_content_generated_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["scheduled_date", "title"]
