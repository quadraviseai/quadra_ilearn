import uuid

from django.conf import settings
from django.db import models

from apps.students.models import StudentProfile


class GuardianProfile(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="guardian_profile",
    )
    full_name = models.CharField(max_length=150)
    relationship_to_student = models.CharField(max_length=50, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["full_name"]

    def __str__(self):
        return self.full_name


class GuardianStudentLink(models.Model):
    class Status(models.TextChoices):
        INVITED = "invited", "Invited"
        ACTIVE = "active", "Active"
        REVOKED = "revoked", "Revoked"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    guardian = models.ForeignKey(
        GuardianProfile,
        on_delete=models.CASCADE,
        related_name="student_links",
    )
    student = models.ForeignKey(
        StudentProfile,
        on_delete=models.CASCADE,
        related_name="guardian_links",
    )
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.INVITED)
    invite_token = models.CharField(max_length=255, unique=True, blank=True)
    invited_at = models.DateTimeField(null=True, blank=True)
    accepted_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["guardian", "student"],
                name="unique_guardian_student_link",
            )
        ]
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.guardian} -> {self.student} ({self.status})"
