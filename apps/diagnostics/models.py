import uuid

from django.db import models

from apps.students.models import StudentProfile


class Subject(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(max_length=120, unique=True)
    exams = models.ManyToManyField("Exam", related_name="subjects", blank=True)
    is_active = models.BooleanField(default=True)
    learning_content = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class Chapter(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE, related_name="chapters")
    name = models.CharField(max_length=150)
    slug = models.SlugField(max_length=160)
    description = models.TextField(blank=True)
    exams = models.ManyToManyField("Exam", related_name="chapters", blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["subject", "slug"], name="unique_chapter_slug_per_subject")
        ]
        ordering = ["subject__name", "name"]

    def __str__(self):
        return self.name


class Exam(models.Model):
    class ExamSetType(models.TextChoices):
        FREE = "free", "Free exam set"
        REGISTERED = "registered", "Registered user mock test set"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=120, unique=True)
    slug = models.SlugField(max_length=140, unique=True)
    exam_set_type = models.CharField(max_length=20, choices=ExamSetType.choices, default=ExamSetType.FREE)
    is_active = models.BooleanField(default=True)
    retest_price = models.DecimalField(max_digits=8, decimal_places=2, default="10.00")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class Concept(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE, related_name="concepts")
    chapter = models.ForeignKey("Chapter", on_delete=models.CASCADE, related_name="concepts", null=True, blank=True)
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

    class GenerationSource(models.TextChoices):
        MANUAL = "manual", "Manual"
        GENERATED = "generated", "Generated"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE, related_name="questions")
    concept = models.ForeignKey(Concept, on_delete=models.CASCADE, related_name="questions")
    secondary_concept = models.ForeignKey(
        Concept,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="secondary_questions",
    )
    template = models.ForeignKey(
        "QuestionTemplate",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="generated_questions",
    )
    exams = models.ManyToManyField(Exam, related_name="questions", blank=True)
    exam_type = models.JSONField(default=list, blank=True)
    question_type = models.CharField(max_length=30, choices=QuestionType.choices)
    prompt = models.TextField()
    explanation = models.TextField(blank=True)
    difficulty_level = models.PositiveSmallIntegerField(default=1)
    generation_source = models.CharField(
        max_length=20,
        choices=GenerationSource.choices,
        default=GenerationSource.MANUAL,
    )
    generation_hash = models.CharField(max_length=64, blank=True, db_index=True)
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


class QuestionTemplate(models.Model):
    class TemplateType(models.TextChoices):
        LOGIC = "logic", "Logic"
        WORD = "word", "Word"
        MULTI_CONCEPT = "multi_concept", "Multi-concept"
        LOGIC_REVERSE_CONSTRAINT = "logic_reverse_constraint", "Logic Reverse Constraint"

    class Difficulty(models.TextChoices):
        EASY = "easy", "Easy"
        MEDIUM = "medium", "Medium"
        HARD = "hard", "Hard"

    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        ACTIVE = "active", "Active"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    concept = models.ForeignKey(Concept, on_delete=models.CASCADE, related_name="templates")
    secondary_concept = models.ForeignKey(
        Concept,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="secondary_templates",
    )
    question_type = models.CharField(max_length=30, choices=Question.QuestionType.choices, default=Question.QuestionType.MCQ_SINGLE)
    template_type = models.CharField(max_length=30, choices=TemplateType.choices, default=TemplateType.LOGIC)
    difficulty = models.CharField(max_length=20, choices=Difficulty.choices, default=Difficulty.MEDIUM)
    template_text = models.TextField()
    variables = models.JSONField(default=dict, blank=True)
    constraints = models.JSONField(default=list, blank=True)
    distractor_logic = models.JSONField(default=list, blank=True)
    jee_tags = models.JSONField(default=list, blank=True)
    formula = models.TextField(blank=True)
    correct_answer_formula = models.TextField(blank=True)
    expected_time_sec = models.PositiveIntegerField(default=60)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["concept__name", "difficulty", "-updated_at"]

    def __str__(self):
        return f"{self.concept.name} - {self.template_type}"


class TestAttempt(models.Model):
    class Status(models.TextChoices):
        STARTED = "started", "Started"
        SUBMITTED = "submitted", "Submitted"
        EVALUATED = "evaluated", "Evaluated"
        ABANDONED = "abandoned", "Abandoned"

    class AccessMode(models.TextChoices):
        FREE = "free", "Free"
        PAID = "paid", "Paid"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    student = models.ForeignKey(StudentProfile, on_delete=models.CASCADE, related_name="test_attempts")
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE, related_name="test_attempts")
    exam = models.ForeignKey("Exam", on_delete=models.SET_NULL, null=True, blank=True, related_name="test_attempts")
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.STARTED)
    access_mode = models.CharField(max_length=20, choices=AccessMode.choices, default=AccessMode.FREE)
    started_at = models.DateTimeField(auto_now_add=True)
    last_saved_at = models.DateTimeField(auto_now=True)
    submitted_at = models.DateTimeField(null=True, blank=True)
    score_percent = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    total_questions = models.PositiveIntegerField(default=0)
    correct_answers = models.PositiveIntegerField(default=0)
    wrong_answers = models.PositiveIntegerField(default=0)
    unanswered_answers = models.PositiveIntegerField(default=0)
    time_spent_seconds = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-started_at"]


class TestAttemptQuestion(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    attempt = models.ForeignKey(TestAttempt, on_delete=models.CASCADE, related_name="attempt_questions")
    question = models.ForeignKey(Question, on_delete=models.CASCADE, related_name="attempt_questions")
    display_order = models.PositiveSmallIntegerField()

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["attempt", "question"], name="unique_attempt_question"),
            models.UniqueConstraint(fields=["attempt", "display_order"], name="unique_attempt_question_order"),
        ]
        ordering = ["display_order"]


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


class TestEntitlement(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    student = models.ForeignKey(StudentProfile, on_delete=models.CASCADE, related_name="test_entitlements")
    exam = models.ForeignKey(Exam, on_delete=models.CASCADE, related_name="test_entitlements")
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE, related_name="test_entitlements")
    free_attempt_used = models.BooleanField(default=False)
    paid_attempt_credits = models.PositiveIntegerField(default=0)
    updated_at = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["student", "exam", "subject"], name="unique_student_exam_subject_entitlement")
        ]
        ordering = ["-updated_at"]


class PaymentRecord(models.Model):
    class Status(models.TextChoices):
        SUCCESS = "success", "Success"
        FAILED = "failed", "Failed"
        PENDING = "pending", "Pending"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    student = models.ForeignKey(StudentProfile, on_delete=models.CASCADE, related_name="payment_records")
    exam = models.ForeignKey(Exam, on_delete=models.CASCADE, related_name="payment_records")
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE, related_name="payment_records")
    amount = models.DecimalField(max_digits=8, decimal_places=2)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.SUCCESS)
    provider = models.CharField(max_length=50, blank=True, default="manual")
    provider_reference = models.CharField(max_length=120, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]


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


class WeakTopicAIReview(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    attempt = models.ForeignKey(TestAttempt, on_delete=models.CASCADE, related_name="weak_topic_ai_reviews")
    concept = models.ForeignKey(Concept, on_delete=models.CASCADE, related_name="attempt_ai_reviews")
    content = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["attempt", "concept"], name="unique_weak_topic_ai_review_per_attempt")
        ]
        ordering = ["-updated_at"]
