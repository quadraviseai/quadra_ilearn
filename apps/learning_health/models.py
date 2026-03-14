import uuid

from django.db import models

from apps.students.models import StudentProfile


class LearningHealthSnapshot(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    student = models.ForeignKey(
        StudentProfile,
        on_delete=models.CASCADE,
        related_name="learning_health_snapshots",
    )
    health_score = models.DecimalField(max_digits=5, decimal_places=2)
    consistency_score = models.DecimalField(max_digits=5, decimal_places=2)
    accuracy_score = models.DecimalField(max_digits=5, decimal_places=2)
    coverage_score = models.DecimalField(max_digits=5, decimal_places=2)
    snapshot_date = models.DateField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["student", "snapshot_date"], name="unique_student_health_snapshot_date")
        ]
        ordering = ["-snapshot_date"]
