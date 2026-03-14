import uuid

from django.db import models

from apps.students.models import StudentProfile


class Subject(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(max_length=120, unique=True)
    exams = models.ManyToManyField("Exam", related_name="subjects", blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class Exam(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=120, unique=True)
    slug = models.SlugField(max_length=140, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class Concept(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE, related_name="concepts")
    exams = models.ManyToManyField(Exam, related_name="concepts", blank=True)
    name = models.CharField(max_length=150)
    slug = models.SlugField(max_length=160)
    description = models.TextField(blank=True)
    difficulty_level = models.PositiveSmallIntegerField(default=1)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["subject", "slug"], name="unique_concept_slug_per_subject")
        ]
        ordering = ["subject__name", "name"]

    def __str__(self):
        return self.name


class Question(models.Model):
    class QuestionType(models.TextChoices):
        MCQ_SINGLE = "mcq_single", "Single Correct MCQ"
        MCQ_MULTI = "mcq_multi", "Multiple Correct MCQ"
        NUMERIC = "numeric", "Numeric"

    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        ACTIVE = "active", "Active"
        ARCHIVED = "archived", "Archived"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE, related_name="questions")
    concept = models.ForeignKey(Concept, on_delete=models.CASCADE, related_name="questions")
    exams = models.ManyToManyField(Exam, related_name="questions", blank=True)
    exam_type = models.JSONField(default=list, blank=True)
    question_type = models.CharField(max_length=30, choices=QuestionType.choices)
    prompt = models.TextField()
    explanation = models.TextField(blank=True)
    difficulty_level = models.PositiveSmallIntegerField(default=1)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.prompt[:60]


class QuestionOption(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    question = models.ForeignKey(Question, on_delete=models.CASCADE, related_name="options")
    option_text = models.TextField()
    is_correct = models.BooleanField(default=False)
    display_order = models.PositiveSmallIntegerField(default=1)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["question", "display_order"],
                name="unique_option_order_per_question",
            )
        ]
        ordering = ["display_order"]


class TestAttempt(models.Model):
    class Status(models.TextChoices):
        STARTED = "started", "Started"
        SUBMITTED = "submitted", "Submitted"
        EVALUATED = "evaluated", "Evaluated"
        ABANDONED = "abandoned", "Abandoned"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    student = models.ForeignKey(StudentProfile, on_delete=models.CASCADE, related_name="test_attempts")
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE, related_name="test_attempts")
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.STARTED)
    started_at = models.DateTimeField(auto_now_add=True)
    submitted_at = models.DateTimeField(null=True, blank=True)
    score_percent = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    total_questions = models.PositiveIntegerField(default=0)
    correct_answers = models.PositiveIntegerField(default=0)
    time_spent_seconds = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-started_at"]


class AttemptAnswer(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    attempt = models.ForeignKey(TestAttempt, on_delete=models.CASCADE, related_name="answers")
    question = models.ForeignKey(Question, on_delete=models.CASCADE, related_name="attempt_answers")
    selected_option = models.ForeignKey(
        QuestionOption,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="selected_in_answers",
    )
    answer_text = models.TextField(blank=True)
    is_correct = models.BooleanField(null=True, blank=True)
    time_spent_seconds = models.PositiveIntegerField(default=0)
    answered_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["attempt", "question"], name="unique_answer_per_attempt_question")
        ]


class ConceptMastery(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    student = models.ForeignKey(StudentProfile, on_delete=models.CASCADE, related_name="concept_mastery")
    concept = models.ForeignKey(Concept, on_delete=models.CASCADE, related_name="student_mastery")
    mastery_score = models.DecimalField(max_digits=5, decimal_places=2)
    accuracy_percent = models.DecimalField(max_digits=5, decimal_places=2)
    attempts_count = models.PositiveIntegerField(default=0)
    last_assessed_at = models.DateTimeField(null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["student", "concept"], name="unique_student_concept_mastery")
        ]
