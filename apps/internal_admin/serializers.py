from django.contrib.auth import get_user_model
from django.db import transaction
from django.utils.text import slugify
from rest_framework import serializers

from apps.diagnostics.models import Chapter, Concept, Exam, Question, QuestionOption, QuestionTemplate, Subject, TestAttempt
from apps.guardians.models import GuardianProfile, GuardianStudentLink
from apps.internal_admin.services import (
    QuestionGenerationError,
    build_mcq_options,
    generate_question_with_gemini,
    make_generation_hash,
    render_template_text,
    resolve_template_variables,
    safe_eval_expression,
    validate_template_constraints,
)
from apps.students.models import StudentProfile
from apps.users.models import TokenSettings, TokenTransaction
from apps.users.services import credit_tokens_by_admin, get_token_settings, grant_welcome_tokens_if_eligible, serialize_token_settings

User = get_user_model()

QUESTION_TYPE_ALIASES = {
    "mcq_single": Question.QuestionType.MCQ_SINGLE,
    "mcq_multiple": Question.QuestionType.MCQ_MULTI,
    "mcq_multi": Question.QuestionType.MCQ_MULTI,
    "integer": Question.QuestionType.NUMERIC,
    "numerical": Question.QuestionType.NUMERIC,
    "numeric": Question.QuestionType.NUMERIC,
}

TEMPLATE_TYPE_ALIASES = {
    "logic": QuestionTemplate.TemplateType.LOGIC,
    "reverse": QuestionTemplate.TemplateType.LOGIC_REVERSE_CONSTRAINT,
    "logic_reverse_constraint": QuestionTemplate.TemplateType.LOGIC_REVERSE_CONSTRAINT,
    "multi_concept": QuestionTemplate.TemplateType.MULTI_CONCEPT,
    "word_problem": QuestionTemplate.TemplateType.WORD,
    "word": QuestionTemplate.TemplateType.WORD,
    "expression": QuestionTemplate.TemplateType.LOGIC,
}


def build_unique_slug(model, name, max_length=120, scope=None, exclude_id=None):
    base_slug = slugify(name or "")[:max_length] or "item"
    candidate = base_slug
    counter = 2
    queryset = model.objects.all()
    if scope:
        queryset = queryset.filter(**scope)
    if exclude_id:
        queryset = queryset.exclude(id=exclude_id)

    while queryset.filter(slug=candidate).exists():
        suffix = f"-{counter}"
        candidate = f"{base_slug[: max(1, max_length - len(suffix))]}{suffix}"
        counter += 1
    return candidate


def normalize_question_type(value):
    normalized = QUESTION_TYPE_ALIASES.get(str(value or "").strip().casefold())
    if not normalized:
        raise serializers.ValidationError("Unsupported question type.")
    return normalized


def normalize_template_type(value):
    normalized = TEMPLATE_TYPE_ALIASES.get(str(value or "").strip().casefold())
    if not normalized:
        raise serializers.ValidationError("Unsupported template type.")
    return normalized


def clean_unique_name_list(values, error_message, allow_empty=False):
    cleaned_names = []
    seen_names = set()
    for value in values or []:
        normalized_name = " ".join((value or "").split())
        if not normalized_name:
            continue
        normalized_key = normalized_name.casefold()
        if normalized_key in seen_names:
            continue
        seen_names.add(normalized_key)
        cleaned_names.append(normalized_name)
    if not cleaned_names and not allow_empty:
        raise serializers.ValidationError(error_message)
    return cleaned_names


class AdminUserListSerializer(serializers.ModelSerializer):
    name = serializers.SerializerMethodField()
    class_name = serializers.CharField(source="student_profile.class_name", read_only=True)
    board = serializers.CharField(source="student_profile.board", read_only=True)
    school_name = serializers.CharField(source="student_profile.school_name", read_only=True)
    relationship_to_student = serializers.CharField(source="guardian_profile.relationship_to_student", read_only=True)
    linked_students = serializers.SerializerMethodField()
    referred_by_email = serializers.EmailField(source="referred_by.email", read_only=True)
    referral_count = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "phone",
            "role",
            "is_active",
            "is_verified",
            "is_staff",
            "token_balance",
            "referral_code",
            "referred_by_email",
            "referral_count",
            "created_at",
            "name",
            "class_name",
            "board",
            "school_name",
            "relationship_to_student",
            "linked_students",
        ]

    def get_name(self, obj):
        if obj.role == User.Role.STUDENT and hasattr(obj, "student_profile"):
            return obj.student_profile.full_name
        if obj.role == User.Role.GUARDIAN and hasattr(obj, "guardian_profile"):
            return obj.guardian_profile.full_name
        return obj.email

    def get_linked_students(self, obj):
        if obj.role != User.Role.GUARDIAN or not hasattr(obj, "guardian_profile"):
            return 0
        return obj.guardian_profile.student_links.filter(status=GuardianStudentLink.Status.ACTIVE).count()

    def get_referral_count(self, obj):
        return obj.referrals.count()


class AdminUserCreateSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=150, required=False, allow_blank=True, allow_null=True)
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=8)
    role = serializers.ChoiceField(choices=User.Role.choices)
    phone = serializers.CharField(max_length=20, required=False, allow_blank=True, allow_null=True)
    class_name = serializers.CharField(max_length=50, required=False, allow_blank=True, allow_null=True)
    date_of_birth = serializers.DateField(required=False, allow_null=True)
    board = serializers.CharField(max_length=50, required=False, allow_blank=True, allow_null=True)
    school_name = serializers.CharField(max_length=150, required=False, allow_blank=True, allow_null=True)
    primary_target_exam = serializers.CharField(max_length=100, required=False, allow_blank=True, allow_null=True)
    secondary_target_exam = serializers.CharField(max_length=100, required=False, allow_blank=True, allow_null=True)
    relationship_to_student = serializers.CharField(max_length=50, required=False, allow_blank=True, allow_null=True)
    is_verified = serializers.BooleanField(required=False, default=False)

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value

    def validate(self, attrs):
        role = attrs["role"]
        name = (attrs.get("name") or "").strip()
        if role == User.Role.STUDENT:
            if not name:
                raise serializers.ValidationError({"name": "This field is required for students."})
            if not attrs.get("class_name"):
                raise serializers.ValidationError({"class_name": "This field is required for students."})
        if role == User.Role.GUARDIAN and not name:
            raise serializers.ValidationError({"name": "This field is required for guardians."})
        return attrs

    def create(self, validated_data):
        role = validated_data["role"]
        user = User.objects.create_user(
            email=validated_data["email"],
            password=validated_data["password"],
            role=role,
            phone=validated_data.get("phone", ""),
            is_verified=validated_data.get("is_verified", False),
            is_staff=role == User.Role.ADMIN,
        )

        if role == User.Role.STUDENT:
            StudentProfile.objects.create(
                user=user,
                full_name=(validated_data.get("name") or "").strip(),
                class_name=validated_data.get("class_name") or "",
                date_of_birth=validated_data.get("date_of_birth"),
                board=validated_data.get("board") or "",
                school_name=validated_data.get("school_name") or "",
                primary_target_exam=validated_data.get("primary_target_exam") or "",
                secondary_target_exam=validated_data.get("secondary_target_exam") or "",
            )
        elif role == User.Role.GUARDIAN:
            GuardianProfile.objects.create(
                user=user,
                full_name=(validated_data.get("name") or "").strip(),
                relationship_to_student=validated_data.get("relationship_to_student") or "",
            )

        user = grant_welcome_tokens_if_eligible(user)
        return user


class AdminUserUpdateSerializer(serializers.Serializer):
    phone = serializers.CharField(max_length=20, required=False, allow_blank=True, allow_null=True)
    is_active = serializers.BooleanField(required=False)
    is_verified = serializers.BooleanField(required=False)
    name = serializers.CharField(max_length=150, required=False, allow_blank=True, allow_null=True)
    class_name = serializers.CharField(max_length=50, required=False, allow_blank=True, allow_null=True)
    board = serializers.CharField(max_length=50, required=False, allow_blank=True, allow_null=True)
    school_name = serializers.CharField(max_length=150, required=False, allow_blank=True, allow_null=True)
    primary_target_exam = serializers.CharField(max_length=100, required=False, allow_blank=True, allow_null=True)
    secondary_target_exam = serializers.CharField(max_length=100, required=False, allow_blank=True, allow_null=True)
    relationship_to_student = serializers.CharField(max_length=50, required=False, allow_blank=True, allow_null=True)
    token_adjustment = serializers.IntegerField(required=False)
    token_adjustment_note = serializers.CharField(max_length=255, required=False, allow_blank=True, allow_null=True)

    def update(self, instance, validated_data):
        user_fields = []
        token_adjustment = validated_data.pop("token_adjustment", 0)
        token_adjustment_note = validated_data.pop("token_adjustment_note", "")
        for field in ["phone", "is_active", "is_verified"]:
            if field in validated_data:
                setattr(instance, field, validated_data[field] if validated_data[field] is not None else "")
                user_fields.append(field)

        if instance.role == User.Role.STUDENT and hasattr(instance, "student_profile"):
            profile = instance.student_profile
            profile_map = {
                "name": "full_name",
                "class_name": "class_name",
                "board": "board",
                "school_name": "school_name",
                "primary_target_exam": "primary_target_exam",
                "secondary_target_exam": "secondary_target_exam",
            }
            profile_fields = []
            for incoming, model_field in profile_map.items():
                if incoming in validated_data:
                    setattr(profile, model_field, validated_data[incoming] if validated_data[incoming] is not None else "")
                    profile_fields.append(model_field)
            if profile_fields:
                profile.save(update_fields=profile_fields + ["updated_at"])

        if instance.role == User.Role.GUARDIAN and hasattr(instance, "guardian_profile"):
            profile = instance.guardian_profile
            profile_fields = []
            if "name" in validated_data:
                profile.full_name = validated_data["name"] if validated_data["name"] is not None else ""
                profile_fields.append("full_name")
            if "relationship_to_student" in validated_data:
                profile.relationship_to_student = (
                    validated_data["relationship_to_student"]
                    if validated_data["relationship_to_student"] is not None
                    else ""
                )
                profile_fields.append("relationship_to_student")
            if profile_fields:
                profile.save(update_fields=profile_fields + ["updated_at"])

        if user_fields:
            instance.save(update_fields=user_fields + ["updated_at"])
        if token_adjustment:
            admin_user = self.context["request"].user
            instance = credit_tokens_by_admin(instance, token_adjustment, admin_user, note=token_adjustment_note or "")
        return instance


class AdminTokenSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = TokenSettings
        fields = ["initial_login_bonus", "referral_bonus", "weak_topic_unlock_cost", "timer_reset_cost", "updated_at"]
        read_only_fields = ["updated_at"]


class AdminTokenTransactionSerializer(serializers.ModelSerializer):
    user_email = serializers.EmailField(source="user.email", read_only=True)
    created_by_email = serializers.EmailField(source="created_by.email", read_only=True)

    class Meta:
        model = TokenTransaction
        fields = [
            "id",
            "user",
            "user_email",
            "transaction_type",
            "amount",
            "balance_after",
            "note",
            "metadata",
            "created_by_email",
            "created_at",
        ]


class AdminSubjectSerializer(serializers.ModelSerializer):
    chapter_count = serializers.IntegerField(read_only=True)
    concept_count = serializers.IntegerField(read_only=True)
    question_count = serializers.IntegerField(read_only=True)
    exams = serializers.SerializerMethodField()
    exam_ids = serializers.ListField(child=serializers.UUIDField(), write_only=True, required=False, allow_empty=True)

    class Meta:
        model = Subject
        fields = ["id", "name", "slug", "created_at", "chapter_count", "concept_count", "question_count", "exams", "exam_ids"]
        read_only_fields = ["slug", "created_at", "chapter_count", "concept_count", "question_count", "exams"]

    def get_exams(self, obj):
        return [{"id": exam.id, "name": exam.name, "slug": exam.slug} for exam in obj.exams.all()]

    def validate_exam_ids(self, value):
        exams = list(Exam.objects.filter(id__in=value).order_by("name"))
        if len(exams) != len(set(value)):
            raise serializers.ValidationError("One or more exams were not found.")
        return exams

    def create(self, validated_data):
        exams = validated_data.pop("exam_ids", [])
        validated_data["slug"] = build_unique_slug(Subject, validated_data["name"], max_length=120)
        subject = Subject.objects.create(**validated_data)
        subject.exams.set(exams)
        return subject

    def update(self, instance, validated_data):
        exams = validated_data.pop("exam_ids", None)
        changed_fields = []
        if "name" in validated_data:
            instance.name = validated_data["name"]
            instance.slug = build_unique_slug(Subject, validated_data["name"], max_length=120, exclude_id=instance.id)
            changed_fields.extend(["name", "slug"])
        if changed_fields:
            instance.save(update_fields=changed_fields)
        if exams is not None:
            instance.exams.set(exams)
        return instance


class AdminExamSerializer(serializers.ModelSerializer):
    subject_count = serializers.IntegerField(read_only=True)
    chapter_count = serializers.IntegerField(read_only=True)
    concept_count = serializers.IntegerField(read_only=True)
    question_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Exam
        fields = [
            "id",
            "name",
            "slug",
            "exam_set_type",
            "created_at",
            "subject_count",
            "chapter_count",
            "concept_count",
            "question_count",
        ]
        read_only_fields = ["slug", "created_at", "subject_count", "chapter_count", "concept_count", "question_count"]

    def create(self, validated_data):
        validated_data["slug"] = build_unique_slug(Exam, validated_data["name"], max_length=140)
        return Exam.objects.create(**validated_data)

    def update(self, instance, validated_data):
        changed_fields = []
        if "name" in validated_data:
            instance.name = validated_data["name"]
            instance.slug = build_unique_slug(Exam, validated_data["name"], max_length=140, exclude_id=instance.id)
            changed_fields.extend(["name", "slug"])
        if "exam_set_type" in validated_data:
            instance.exam_set_type = validated_data["exam_set_type"]
            changed_fields.append("exam_set_type")
        if changed_fields:
            instance.save(update_fields=changed_fields)
        return instance


class AdminConceptSerializer(serializers.ModelSerializer):
    subject_name = serializers.CharField(source="subject.name", read_only=True)
    chapter_name = serializers.CharField(source="chapter.name", read_only=True)
    question_count = serializers.IntegerField(read_only=True)
    exams = serializers.SerializerMethodField()
    exam_ids = serializers.ListField(child=serializers.UUIDField(), write_only=True, required=False, allow_empty=True)

    class Meta:
        model = Concept
        fields = [
            "id",
            "subject",
            "subject_name",
            "chapter",
            "chapter_name",
            "name",
            "slug",
            "description",
            "difficulty_level",
            "created_at",
            "question_count",
            "exams",
            "exam_ids",
        ]
        read_only_fields = ["slug", "created_at", "question_count", "exams"]

    def get_exams(self, obj):
        return [{"id": exam.id, "name": exam.name, "slug": exam.slug} for exam in obj.exams.all()]

    def validate_exam_ids(self, value):
        exams = list(Exam.objects.filter(id__in=value).order_by("name"))
        if len(exams) != len(set(value)):
            raise serializers.ValidationError("One or more exams were not found.")
        return exams

    def validate(self, attrs):
        chapter = attrs.get("chapter") or getattr(self.instance, "chapter", None)
        subject = attrs.get("subject") or getattr(self.instance, "subject", None)
        if chapter is None:
            raise serializers.ValidationError({"chapter": "This field is required."})
        if subject and chapter.subject_id != subject.id:
            raise serializers.ValidationError({"chapter": "Chapter must belong to the selected subject."})
        return attrs

    def create(self, validated_data):
        exams = validated_data.pop("exam_ids", [])
        subject = validated_data["subject"]
        chapter = validated_data["chapter"]
        validated_data["subject"] = chapter.subject
        validated_data["slug"] = build_unique_slug(
            Concept,
            validated_data["name"],
            max_length=160,
            scope={"subject": subject},
        )
        concept = Concept.objects.create(**validated_data)
        concept.exams.set(exams)
        return concept

    def update(self, instance, validated_data):
        exams = validated_data.pop("exam_ids", None)
        changed_fields = []
        if "chapter" in validated_data:
            instance.chapter = validated_data["chapter"]
            instance.subject = instance.chapter.subject
            changed_fields.extend(["chapter", "subject"])
        if "subject" in validated_data:
            instance.subject = validated_data["subject"]
            changed_fields.append("subject")
        if "name" in validated_data:
            instance.name = validated_data["name"]
            instance.slug = build_unique_slug(
                Concept,
                validated_data["name"],
                max_length=160,
                scope={"subject": instance.subject},
                exclude_id=instance.id,
            )
            changed_fields.extend(["name", "slug"])
        for field in ["description", "difficulty_level"]:
            if field in validated_data:
                setattr(instance, field, validated_data[field])
                changed_fields.append(field)
        if changed_fields:
            instance.save(update_fields=list(dict.fromkeys(changed_fields)))
        if exams is not None:
            instance.exams.set(exams)
        return instance


class AdminQuestionTemplateSerializer(serializers.ModelSerializer):
    question_type = serializers.CharField()
    template_type = serializers.CharField()
    concept_name = serializers.CharField(source="concept.name", read_only=True)
    secondary_concept_name = serializers.CharField(source="secondary_concept.name", read_only=True)
    subject_id = serializers.UUIDField(source="concept.subject_id", read_only=True)
    chapter_id = serializers.UUIDField(source="concept.chapter_id", read_only=True)
    subject_name = serializers.CharField(source="concept.subject.name", read_only=True)
    chapter_name = serializers.CharField(source="concept.chapter.name", read_only=True)

    class Meta:
        model = QuestionTemplate
        fields = [
            "id",
            "concept",
            "concept_name",
            "secondary_concept",
            "secondary_concept_name",
            "subject_id",
            "subject_name",
            "chapter_id",
            "chapter_name",
            "question_type",
            "template_type",
            "difficulty",
            "template_text",
            "variables",
            "constraints",
            "distractor_logic",
            "formula",
            "correct_answer_formula",
            "jee_tags",
            "expected_time_sec",
            "status",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "concept_name",
            "secondary_concept_name",
            "subject_id",
            "subject_name",
            "chapter_id",
            "chapter_name",
            "created_at",
            "updated_at",
        ]

    def validate(self, attrs):
        if "question_type" in attrs:
            attrs["question_type"] = normalize_question_type(attrs["question_type"])
        elif self.instance is not None:
            attrs["question_type"] = self.instance.question_type

        if "template_type" in attrs:
            attrs["template_type"] = normalize_template_type(attrs["template_type"])
        elif self.instance is not None:
            attrs["template_type"] = self.instance.template_type

        concept = attrs.get("concept") or getattr(self.instance, "concept", None)
        secondary_concept = attrs.get("secondary_concept") or getattr(self.instance, "secondary_concept", None)
        template_type = attrs.get("template_type") or getattr(self.instance, "template_type", QuestionTemplate.TemplateType.LOGIC)
        if secondary_concept and concept and secondary_concept.subject_id != concept.subject_id:
            raise serializers.ValidationError({"secondary_concept": "Secondary concept must belong to the same subject."})
        if template_type == QuestionTemplate.TemplateType.MULTI_CONCEPT and not secondary_concept:
            raise serializers.ValidationError({"secondary_concept": "Multi-concept templates require a secondary concept."})
        return attrs


class AdminChapterSerializer(serializers.ModelSerializer):
    subject_name = serializers.CharField(source="subject.name", read_only=True)
    concept_count = serializers.IntegerField(read_only=True)
    question_count = serializers.IntegerField(read_only=True)
    exams = serializers.SerializerMethodField()
    exam_ids = serializers.ListField(child=serializers.UUIDField(), write_only=True, required=False, allow_empty=True)

    class Meta:
        model = Chapter
        fields = [
            "id",
            "subject",
            "subject_name",
            "name",
            "slug",
            "description",
            "created_at",
            "concept_count",
            "question_count",
            "exams",
            "exam_ids",
        ]
        read_only_fields = ["slug", "created_at", "concept_count", "question_count", "exams"]

    def get_exams(self, obj):
        return [{"id": exam.id, "name": exam.name, "slug": exam.slug} for exam in obj.exams.all()]

    def validate_exam_ids(self, value):
        exams = list(Exam.objects.filter(id__in=value).order_by("name"))
        if len(exams) != len(set(value)):
            raise serializers.ValidationError("One or more exams were not found.")
        return exams

    def create(self, validated_data):
        exams = validated_data.pop("exam_ids", [])
        subject = validated_data["subject"]
        validated_data["slug"] = build_unique_slug(Chapter, validated_data["name"], max_length=160, scope={"subject": subject})
        chapter = Chapter.objects.create(**validated_data)
        chapter.exams.set(exams)
        return chapter

    def update(self, instance, validated_data):
        exams = validated_data.pop("exam_ids", None)
        changed_fields = []
        if "subject" in validated_data:
            instance.subject = validated_data["subject"]
            changed_fields.append("subject")
        if "name" in validated_data:
            instance.name = validated_data["name"]
            instance.slug = build_unique_slug(
                Chapter,
                validated_data["name"],
                max_length=160,
                scope={"subject": instance.subject},
                exclude_id=instance.id,
            )
            changed_fields.extend(["name", "slug"])
        if "description" in validated_data:
            instance.description = validated_data["description"]
            changed_fields.append("description")
        if changed_fields:
            instance.save(update_fields=list(dict.fromkeys(changed_fields)))
        if exams is not None:
            instance.exams.set(exams)
        return instance


class AdminQuestionOptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = QuestionOption
        fields = ["id", "option_text", "is_correct", "display_order"]


class AdminQuestionSerializer(serializers.ModelSerializer):
    subject_name = serializers.CharField(source="subject.name", read_only=True)
    chapter = serializers.UUIDField(source="concept.chapter_id", read_only=True)
    chapter_name = serializers.CharField(source="concept.chapter.name", read_only=True)
    concept_name = serializers.CharField(source="concept.name", read_only=True)
    secondary_concept_name = serializers.CharField(source="secondary_concept.name", read_only=True)
    template_type = serializers.CharField(source="template.template_type", read_only=True)
    options = AdminQuestionOptionSerializer(many=True, read_only=True)
    exams = serializers.SerializerMethodField()

    class Meta:
        model = Question
        fields = [
            "id",
            "subject",
            "subject_name",
            "chapter",
            "chapter_name",
            "concept",
            "concept_name",
            "secondary_concept",
            "secondary_concept_name",
            "exam_type",
            "question_type",
            "prompt",
            "explanation",
            "difficulty_level",
            "generation_source",
            "generation_hash",
            "template",
            "template_type",
            "status",
            "created_at",
            "updated_at",
            "options",
            "exams",
        ]

    def get_exams(self, obj):
        return [{"id": exam.id, "name": exam.name, "slug": exam.slug} for exam in obj.exams.all()]


class AdminQuestionOptionWriteSerializer(serializers.Serializer):
    option_text = serializers.CharField()
    is_correct = serializers.BooleanField(required=False, default=False)
    display_order = serializers.IntegerField(min_value=1)


class AdminQuestionWriteSerializer(serializers.Serializer):
    subject_id = serializers.UUIDField()
    chapter_id = serializers.UUIDField()
    concept_id = serializers.UUIDField()
    secondary_concept_id = serializers.UUIDField(required=False, allow_null=True)
    template_id = serializers.UUIDField(required=False, allow_null=True)
    exam_ids = serializers.ListField(
        child=serializers.UUIDField(),
        required=False,
        allow_empty=True,
    )
    exam_type = serializers.ListField(
        child=serializers.CharField(max_length=100),
        required=False,
        allow_empty=True,
    )
    question_type = serializers.ChoiceField(choices=Question.QuestionType.choices)
    prompt = serializers.CharField()
    explanation = serializers.CharField(required=False, allow_blank=True)
    difficulty_level = serializers.IntegerField(min_value=1, max_value=5, required=False, default=1)
    generation_source = serializers.ChoiceField(
        choices=Question.GenerationSource.choices,
        required=False,
        default=Question.GenerationSource.MANUAL,
    )
    generation_hash = serializers.CharField(required=False, allow_blank=True)
    status = serializers.ChoiceField(choices=Question.Status.choices, required=False, default=Question.Status.ACTIVE)
    options = AdminQuestionOptionWriteSerializer(many=True, required=False)

    def validate(self, attrs):
        subject = Subject.objects.filter(id=attrs["subject_id"]).first()
        if not subject:
            raise serializers.ValidationError({"subject_id": "Subject not found."})
        chapter = Chapter.objects.filter(id=attrs["chapter_id"]).select_related("subject").first()
        if not chapter:
            raise serializers.ValidationError({"chapter_id": "Chapter not found."})
        if chapter.subject_id != subject.id:
            raise serializers.ValidationError({"chapter_id": "Chapter must belong to the selected subject."})

        concept = Concept.objects.filter(id=attrs["concept_id"]).select_related("subject", "chapter").first()
        if not concept:
            raise serializers.ValidationError({"concept_id": "Concept not found."})
        if concept.subject_id != subject.id:
            raise serializers.ValidationError({"concept_id": "Concept must belong to the selected subject."})
        if concept.chapter_id != chapter.id:
            raise serializers.ValidationError({"concept_id": "Concept must belong to the selected chapter."})

        secondary_concept = None
        if attrs.get("secondary_concept_id"):
            secondary_concept = Concept.objects.filter(id=attrs["secondary_concept_id"]).select_related("subject", "chapter").first()
            if not secondary_concept:
                raise serializers.ValidationError({"secondary_concept_id": "Secondary concept not found."})
            if secondary_concept.subject_id != subject.id:
                raise serializers.ValidationError({"secondary_concept_id": "Secondary concept must belong to the selected subject."})

        template = None
        if attrs.get("template_id"):
            template = QuestionTemplate.objects.filter(id=attrs["template_id"]).first()
            if not template:
                raise serializers.ValidationError({"template_id": "Template not found."})

        exam_ids = attrs.get("exam_ids") or []
        exams = list(Exam.objects.filter(id__in=exam_ids).order_by("name"))
        if len(exams) != len(set(exam_ids)):
            raise serializers.ValidationError({"exam_ids": "One or more exams were not found."})
        subject_exam_ids = set(subject.exams.values_list("id", flat=True))
        concept_exam_ids = set(concept.exams.values_list("id", flat=True))
        invalid_exam_ids = [str(exam.id) for exam in exams if exam.id not in subject_exam_ids or exam.id not in concept_exam_ids]
        if invalid_exam_ids:
            raise serializers.ValidationError(
                {"exam_ids": "Questions can only use exams linked to both the selected subject and concept."}
            )

        options = attrs.get("options") or []
        if attrs["question_type"] == Question.QuestionType.NUMERIC:
            if options:
                raise serializers.ValidationError({"options": "Numeric questions should not include options."})
        else:
            if len(options) < 2:
                raise serializers.ValidationError({"options": "MCQ questions require at least two options."})
            correct_count = sum(1 for option in options if option.get("is_correct"))
            if correct_count < 1:
                raise serializers.ValidationError({"options": "At least one option must be marked correct."})
            if attrs["question_type"] == Question.QuestionType.MCQ_SINGLE and correct_count != 1:
                raise serializers.ValidationError({"options": "Single correct MCQ must have exactly one correct option."})

        attrs["subject"] = subject
        attrs["chapter"] = chapter
        attrs["concept"] = concept
        attrs["secondary_concept"] = secondary_concept
        attrs["template"] = template
        attrs["exams"] = exams
        return attrs

    def create(self, validated_data):
        options = validated_data.pop("options", [])
        exams = validated_data.pop("exams", [])
        validated_data["subject"] = validated_data.pop("subject")
        validated_data.pop("chapter", None)
        validated_data["concept"] = validated_data.pop("concept")
        validated_data["secondary_concept"] = validated_data.pop("secondary_concept", None)
        validated_data["template"] = validated_data.pop("template", None)
        validated_data.pop("subject_id", None)
        validated_data.pop("chapter_id", None)
        validated_data.pop("concept_id", None)
        validated_data.pop("secondary_concept_id", None)
        validated_data.pop("template_id", None)
        validated_data.pop("exam_ids", None)
        validated_data["exam_type"] = validated_data.get("exam_type") or [exam.name for exam in exams]
        question = Question.objects.create(**validated_data)
        question.exams.set(exams)
        for option in options:
            QuestionOption.objects.create(question=question, **option)
        return question

    def update(self, instance, validated_data):
        options = validated_data.pop("options", None)
        exams = validated_data.pop("exams", None)
        instance.subject = validated_data.pop("subject")
        validated_data.pop("chapter", None)
        instance.concept = validated_data.pop("concept")
        instance.secondary_concept = validated_data.pop("secondary_concept", None)
        instance.template = validated_data.pop("template", None)
        validated_data.pop("subject_id", None)
        validated_data.pop("chapter_id", None)
        validated_data.pop("concept_id", None)
        validated_data.pop("secondary_concept_id", None)
        validated_data.pop("template_id", None)
        validated_data.pop("exam_ids", None)
        if exams is not None:
            validated_data["exam_type"] = validated_data.get("exam_type") or [exam.name for exam in exams]
        else:
            validated_data["exam_type"] = validated_data.get("exam_type") or list(instance.exams.values_list("name", flat=True))

        for field, value in validated_data.items():
            setattr(instance, field, value)
        instance.save()
        if exams is not None:
            instance.exams.set(exams)

        if options is not None:
            instance.options.all().delete()
            for option in options:
                QuestionOption.objects.create(question=instance, **option)
        return instance


class AdminBulkQuestionItemSerializer(serializers.Serializer):
    exam_ids = serializers.ListField(
        child=serializers.UUIDField(),
        required=False,
        allow_empty=True,
    )
    exam_type = serializers.ListField(
        child=serializers.CharField(max_length=100),
        required=False,
        allow_empty=True,
    )
    question_type = serializers.ChoiceField(choices=Question.QuestionType.choices)
    prompt = serializers.CharField()
    explanation = serializers.CharField(required=False, allow_blank=True)
    difficulty_level = serializers.IntegerField(min_value=1, max_value=5, required=False, default=1)
    status = serializers.ChoiceField(choices=Question.Status.choices, required=False, default=Question.Status.DRAFT)
    options = AdminQuestionOptionWriteSerializer(many=True, required=False)


class AdminBulkQuestionUploadSerializer(serializers.Serializer):
    subject_id = serializers.UUIDField()
    chapter_id = serializers.UUIDField()
    concept_id = serializers.UUIDField()
    exam_ids = serializers.ListField(
        child=serializers.UUIDField(),
        allow_empty=False,
    )
    questions = AdminBulkQuestionItemSerializer(many=True)

    def validate(self, attrs):
        subject = Subject.objects.filter(id=attrs["subject_id"]).first()
        if not subject:
            raise serializers.ValidationError({"subject_id": "Subject not found."})
        chapter = Chapter.objects.filter(id=attrs["chapter_id"]).select_related("subject").first()
        if not chapter:
            raise serializers.ValidationError({"chapter_id": "Chapter not found."})
        if chapter.subject_id != subject.id:
            raise serializers.ValidationError({"chapter_id": "Chapter must belong to the selected subject."})
        concept = Concept.objects.filter(id=attrs["concept_id"]).select_related("subject", "chapter").first()
        if not concept:
            raise serializers.ValidationError({"concept_id": "Concept not found."})
        if concept.subject_id != subject.id:
            raise serializers.ValidationError({"concept_id": "Concept must belong to the selected subject."})
        if concept.chapter_id != chapter.id:
            raise serializers.ValidationError({"concept_id": "Concept must belong to the selected chapter."})
        exam_ids = attrs.get("exam_ids") or []
        if not exam_ids:
            raise serializers.ValidationError({"exam_ids": "Select at least one exam for this upload."})
        exams = list(Exam.objects.filter(id__in=exam_ids).order_by("name"))
        if len(exams) != len(set(exam_ids)):
            raise serializers.ValidationError({"exam_ids": "One or more exams were not found."})
        subject_exam_ids = set(subject.exams.values_list("id", flat=True))
        concept_exam_ids = set(concept.exams.values_list("id", flat=True))
        if any(exam.id not in subject_exam_ids or exam.id not in concept_exam_ids for exam in exams):
            raise serializers.ValidationError(
                {"exam_ids": "Questions can only use exams linked to both the selected subject and concept."}
            )

        attrs["subject"] = subject
        attrs["chapter"] = chapter
        attrs["concept"] = concept
        attrs["exams"] = exams
        return attrs

    def create(self, validated_data):
        subject = validated_data["subject"]
        concept = validated_data["concept"]
        exams = validated_data.get("exams") or []
        created = []
        for item in validated_data["questions"]:
            item_exam_ids = item.get("exam_ids") or [str(exam.id) for exam in exams]
            item_exam_type = item.get("exam_type") or [exam.name for exam in exams]
            serializer = AdminQuestionWriteSerializer(
                data={
                    "subject_id": str(subject.id),
                    "chapter_id": str(validated_data["chapter"].id),
                    "concept_id": str(concept.id),
                    "exam_ids": item_exam_ids,
                    "exam_type": item_exam_type,
                    **item,
                }
            )
            serializer.is_valid(raise_exception=True)
            created.append(serializer.save())
        return created


class AdminQuestionJsonImportItemSerializer(serializers.Serializer):
    concept_name = serializers.CharField(max_length=150)
    exam_names = serializers.ListField(
        child=serializers.CharField(max_length=120),
        required=False,
        allow_empty=True,
    )
    exam_type = serializers.ListField(
        child=serializers.CharField(max_length=100),
        required=False,
        allow_empty=True,
    )
    question_type = serializers.ChoiceField(choices=Question.QuestionType.choices)
    prompt = serializers.CharField()
    explanation = serializers.CharField(required=False, allow_blank=True)
    difficulty_level = serializers.IntegerField(min_value=1, max_value=5, required=False, default=1)
    status = serializers.ChoiceField(choices=Question.Status.choices, required=False, default=Question.Status.DRAFT)
    options = AdminQuestionOptionWriteSerializer(many=True, required=False)


class AdminQuestionJsonImportSerializer(serializers.Serializer):
    subject_name = serializers.CharField(max_length=100)
    chapter_name = serializers.CharField(max_length=150)
    exam_names = serializers.ListField(
        child=serializers.CharField(max_length=120),
        allow_empty=False,
    )
    concept_names = serializers.ListField(
        child=serializers.CharField(max_length=150),
        required=False,
        allow_empty=True,
    )
    questions = AdminQuestionJsonImportItemSerializer(many=True, allow_empty=False)

    def validate_subject_name(self, value):
        normalized = " ".join((value or "").split())
        if not normalized:
            raise serializers.ValidationError("Subject name is required.")
        return normalized

    def validate_chapter_name(self, value):
        normalized = " ".join((value or "").split())
        if not normalized:
            raise serializers.ValidationError("Chapter name is required.")
        return normalized

    def validate_exam_names(self, value):
        return clean_unique_name_list(value, "Provide at least one exam name.")

    def validate_concept_names(self, value):
        return clean_unique_name_list(value, "Provide at least one concept name.")

    def validate_questions(self, value):
        if not value:
            raise serializers.ValidationError("Provide at least one question.")
        return value

    def validate(self, attrs):
        subject = Subject.objects.filter(name__iexact=attrs["subject_name"]).prefetch_related("exams").first()
        if not subject:
            raise serializers.ValidationError({"subject_name": "Subject not found."})

        chapter = Chapter.objects.filter(subject=subject, name__iexact=attrs["chapter_name"]).prefetch_related("exams").first()
        if not chapter:
            raise serializers.ValidationError({"chapter_name": "Chapter not found for the selected subject."})

        exam_names = attrs["exam_names"]
        exam_lookup = {exam.name.casefold(): exam for exam in Exam.objects.all().order_by("name")}
        missing_exam_names = [name for name in exam_names if name.casefold() not in exam_lookup]
        if missing_exam_names:
            raise serializers.ValidationError({"exam_names": f"Unknown exams: {', '.join(missing_exam_names)}"})

        declared_concept_names = clean_unique_name_list(
            attrs.get("concept_names") or [],
            "Provide at least one concept name.",
            allow_empty=True,
        )
        question_concept_names = clean_unique_name_list(
            [item.get("concept_name") for item in attrs["questions"]],
            "Each question must reference a concept name.",
        )
        concept_names = []
        seen_concepts = set()
        for name in [*declared_concept_names, *question_concept_names]:
            key = name.casefold()
            if key in seen_concepts:
                continue
            seen_concepts.add(key)
            concept_names.append(name)

        for index, item in enumerate(attrs["questions"]):
            concept_name = " ".join((item.get("concept_name") or "").split())
            if not concept_name:
                raise serializers.ValidationError({"questions": {index: {"concept_name": "Concept name is required."}}})
            item["concept_name"] = concept_name

            item_exam_names = clean_unique_name_list(item.get("exam_names") or exam_names, "Provide at least one exam name.")
            invalid_item_exam_names = [name for name in item_exam_names if name.casefold() not in exam_lookup]
            if invalid_item_exam_names:
                raise serializers.ValidationError(
                    {"questions": {index: {"exam_names": f"Unknown exams: {', '.join(invalid_item_exam_names)}"}}}
                )
            item["resolved_exams"] = [exam_lookup[name.casefold()] for name in item_exam_names]

        attrs["subject"] = subject
        attrs["chapter"] = chapter
        attrs["exams"] = [exam_lookup[name.casefold()] for name in exam_names]
        attrs["concept_names"] = concept_names
        return attrs

    def create(self, validated_data):
        subject = validated_data["subject"]
        chapter = validated_data["chapter"]
        exams = validated_data["exams"]

        subject.exams.add(*exams)
        chapter.exams.add(*exams)

        concept_lookup = {
            concept.name.strip().casefold(): concept
            for concept in Concept.objects.filter(subject=subject, chapter=chapter).prefetch_related("exams")
        }

        for concept_name in validated_data["concept_names"]:
            key = concept_name.casefold()
            concept = concept_lookup.get(key)
            if not concept:
                concept = Concept.objects.create(
                    subject=subject,
                    chapter=chapter,
                    name=concept_name,
                    slug=build_unique_slug(Concept, concept_name, max_length=160, scope={"subject": subject}),
                )
                concept_lookup[key] = concept
            concept.exams.add(*exams)

        created = []
        for item in validated_data["questions"]:
            concept = concept_lookup[item["concept_name"].casefold()]
            item_exams = item.pop("resolved_exams", []) or exams
            concept.exams.add(*item_exams)
            serializer = AdminQuestionWriteSerializer(
                data={
                    "subject_id": str(subject.id),
                    "chapter_id": str(chapter.id),
                    "concept_id": str(concept.id),
                    "exam_ids": [str(exam.id) for exam in item_exams],
                    "exam_type": item.get("exam_type") or [exam.name for exam in item_exams],
                    "question_type": item["question_type"],
                    "prompt": item["prompt"],
                    "explanation": item.get("explanation", ""),
                    "difficulty_level": item.get("difficulty_level", 1),
                    "status": item.get("status", Question.Status.DRAFT),
                    "options": item.get("options", []),
                }
            )
            serializer.is_valid(raise_exception=True)
            created.append(serializer.save())
        return created


class AdminQuestionSmartImportItemSerializer(serializers.Serializer):
    concept_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    question_type = serializers.ChoiceField(choices=Question.QuestionType.choices)
    prompt = serializers.CharField()
    explanation = serializers.CharField(required=False, allow_blank=True)
    difficulty_level = serializers.IntegerField(min_value=1, max_value=5, required=False, default=1)
    status = serializers.ChoiceField(choices=Question.Status.choices, required=False, default=Question.Status.DRAFT)
    options = AdminQuestionOptionWriteSerializer(many=True, required=False)


class AdminQuestionSmartImportSerializer(serializers.Serializer):
    exam_id = serializers.UUIDField(required=False, allow_null=True)
    exam_name = serializers.CharField(max_length=120, required=False, allow_blank=True)
    exam_set_type = serializers.ChoiceField(choices=Exam.ExamSetType.choices, required=False, default=Exam.ExamSetType.FREE)
    subject_name = serializers.CharField(max_length=100)
    chapter_name = serializers.CharField(max_length=150)
    concept_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    concept_names = serializers.ListField(
        child=serializers.CharField(max_length=150),
        required=False,
        allow_empty=True,
    )
    questions = AdminQuestionSmartImportItemSerializer(many=True, allow_empty=False)

    def validate_exam_name(self, value):
        normalized = " ".join((value or "").split())
        return normalized

    def validate_subject_name(self, value):
        normalized = " ".join((value or "").split())
        if not normalized:
            raise serializers.ValidationError("Subject name is required.")
        return normalized

    def validate_chapter_name(self, value):
        normalized = " ".join((value or "").split())
        if not normalized:
            raise serializers.ValidationError("Chapter name is required.")
        return normalized

    def validate_concept_name(self, value):
        normalized = " ".join((value or "").split())
        return normalized

    def validate_concept_names(self, value):
        return clean_unique_name_list(value, "Provide at least one concept name.", allow_empty=True)

    def validate_questions(self, value):
        if not value:
            raise serializers.ValidationError("Provide at least one question.")
        return value

    def validate(self, attrs):
        exam = None
        exam_id = attrs.get("exam_id")
        exam_name = attrs.get("exam_name") or ""

        if exam_id:
            exam = Exam.objects.filter(id=exam_id).first()
            if not exam:
                raise serializers.ValidationError({"exam_id": "Exam not found."})
            attrs["exam_name"] = exam.name
            attrs["exam_set_type"] = exam.exam_set_type
        elif not exam_name:
            raise serializers.ValidationError({"exam_name": "Select an existing exam or provide exam_name."})

        existing_exam = exam or Exam.objects.filter(name__iexact=attrs["exam_name"]).first()
        if existing_exam and existing_exam.exam_set_type != attrs["exam_set_type"]:
            raise serializers.ValidationError(
                {
                    "exam_name": (
                        f'Exam "{existing_exam.name}" already exists with exam_set_type '
                        f'"{existing_exam.exam_set_type}". Use a different exam name or matching exam_set_type.'
                    )
                }
            )

        default_concept_name = attrs.get("concept_name") or ""
        declared_concept_names = attrs.get("concept_names") or []
        question_concept_names = []
        for index, item in enumerate(attrs["questions"]):
            concept_name = " ".join((item.get("concept_name") or "").split()) or default_concept_name
            if not concept_name:
                raise serializers.ValidationError(
                    {"questions": {index: {"concept_name": "Concept name is required unless a top-level concept_name is provided."}}}
                )
            item["concept_name"] = concept_name
            question_concept_names.append(concept_name)

        concept_names = []
        seen_names = set()
        for name in [default_concept_name, *declared_concept_names, *question_concept_names]:
            normalized = " ".join((name or "").split())
            if not normalized:
                continue
            key = normalized.casefold()
            if key in seen_names:
                continue
            seen_names.add(key)
            concept_names.append(normalized)
        if not concept_names:
            raise serializers.ValidationError({"concept_name": "Provide a concept_name or concept_names."})

        attrs["concept_names"] = concept_names
        attrs["existing_exam"] = existing_exam
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        exam = validated_data.get("existing_exam")
        exam_name = validated_data["exam_name"]
        if not exam:
            exam = Exam.objects.create(
                name=exam_name,
                slug=build_unique_slug(Exam, exam_name, max_length=140),
                exam_set_type=validated_data["exam_set_type"],
            )

        subject = Subject.objects.filter(name__iexact=validated_data["subject_name"]).prefetch_related("exams").first()
        if not subject:
            subject = Subject.objects.create(
                name=validated_data["subject_name"],
                slug=build_unique_slug(Subject, validated_data["subject_name"], max_length=120),
            )
        subject.exams.add(exam)

        chapter = Chapter.objects.filter(subject=subject, name__iexact=validated_data["chapter_name"]).prefetch_related("exams").first()
        if not chapter:
            chapter = Chapter.objects.create(
                subject=subject,
                name=validated_data["chapter_name"],
                slug=build_unique_slug(Chapter, validated_data["chapter_name"], max_length=160, scope={"subject": subject}),
            )
        chapter.exams.add(exam)

        subject_concepts = Concept.objects.filter(subject=subject).select_related("chapter").prefetch_related("exams")
        concept_lookup = {}
        for concept in subject_concepts:
            concept_lookup[concept.name.strip().casefold()] = concept

        for concept_name in validated_data["concept_names"]:
            key = concept_name.casefold()
            concept = concept_lookup.get(key)
            if concept and concept.chapter_id != chapter.id:
                raise serializers.ValidationError(
                    {
                        "concept_name": (
                            f'Concept "{concept.name}" already exists in subject "{subject.name}" under chapter '
                            f'"{concept.chapter.name}". Move it first or use a different concept name.'
                        )
                    }
                )
            if not concept:
                concept = Concept.objects.create(
                    subject=subject,
                    chapter=chapter,
                    name=concept_name,
                    slug=build_unique_slug(Concept, concept_name, max_length=160, scope={"subject": subject}),
                )
                concept_lookup[key] = concept
            concept.exams.add(exam)

        created = []
        for item in validated_data["questions"]:
            concept = concept_lookup[item["concept_name"].casefold()]
            serializer = AdminQuestionWriteSerializer(
                data={
                    "subject_id": str(subject.id),
                    "chapter_id": str(chapter.id),
                    "concept_id": str(concept.id),
                    "exam_ids": [str(exam.id)],
                    "exam_type": [exam.name],
                    "question_type": item["question_type"],
                    "prompt": item["prompt"],
                    "explanation": item.get("explanation", ""),
                    "difficulty_level": item.get("difficulty_level", 1),
                    "status": item.get("status", Question.Status.DRAFT),
                    "options": item.get("options", []),
                }
            )
            serializer.is_valid(raise_exception=True)
            created.append(serializer.save())
        return created


class AdminTemplateJsonImportItemSerializer(serializers.Serializer):
    concept_name = serializers.CharField(max_length=150)
    secondary_concept_name = serializers.CharField(max_length=150, required=False, allow_blank=True, allow_null=True)
    question_type = serializers.CharField(required=False, default=Question.QuestionType.MCQ_SINGLE)
    template_type = serializers.CharField()
    difficulty = serializers.ChoiceField(choices=QuestionTemplate.Difficulty.choices)
    template_text = serializers.CharField()
    variables = serializers.JSONField(required=False, default=dict)
    constraints = serializers.ListField(child=serializers.CharField(), required=False, allow_empty=True, default=list)
    distractor_logic = serializers.ListField(child=serializers.CharField(), required=False, allow_empty=True, default=list)
    answer_formula = serializers.CharField(required=False, allow_blank=True)
    formula = serializers.CharField(required=False, allow_blank=True)
    correct_answer_formula = serializers.CharField(required=False, allow_blank=True)
    jee_tags = serializers.ListField(child=serializers.CharField(max_length=100), required=False, allow_empty=True, default=list)
    expected_time_sec = serializers.IntegerField(required=False, min_value=1, default=60)
    status = serializers.ChoiceField(choices=QuestionTemplate.Status.choices, required=False, default=QuestionTemplate.Status.DRAFT)

    def validate_question_type(self, value):
        return normalize_question_type(value)

    def validate_template_type(self, value):
        return normalize_template_type(value)

    def validate_variables(self, value):
        if not isinstance(value, dict):
            raise serializers.ValidationError("Variables must be an object.")
        for key, config in value.items():
            if not isinstance(key, str) or not key.strip():
                raise serializers.ValidationError("Variable names must be non-empty strings.")
            if isinstance(config, dict):
                if not {"min", "max"}.issubset(set(config.keys())):
                    raise serializers.ValidationError(f"Variable '{key}' must include min and max.")
            elif not (
                isinstance(config, list)
                and len(config) == 2
                and all(isinstance(item, (int, float)) for item in config)
            ) and not isinstance(config, (int, float, str)):
                raise serializers.ValidationError(
                    f"Variable '{key}' must be a range object, numeric pair, number, or derived expression."
                )
        return value

    def validate(self, attrs):
        answer_formula = (attrs.get("answer_formula") or "").strip()
        formula = (attrs.get("formula") or "").strip()
        correct_answer_formula = (attrs.get("correct_answer_formula") or "").strip()

        if answer_formula:
            attrs["formula"] = answer_formula
            attrs["correct_answer_formula"] = answer_formula
        else:
            attrs["formula"] = formula
            attrs["correct_answer_formula"] = correct_answer_formula or formula
        return attrs


class AdminTemplateJsonImportSerializer(serializers.Serializer):
    subject_name = serializers.CharField(max_length=100)
    chapter_name = serializers.CharField(max_length=150)
    exam_names = serializers.ListField(
        child=serializers.CharField(max_length=120),
        allow_empty=False,
    )
    concept_names = serializers.ListField(
        child=serializers.CharField(max_length=150),
        required=False,
        allow_empty=True,
    )
    templates = AdminTemplateJsonImportItemSerializer(many=True, allow_empty=False)

    def _clean_name_list(self, values, error_message, allow_empty=False):
        cleaned_names = []
        seen_names = set()
        for value in values or []:
            normalized_name = " ".join((value or "").split())
            if not normalized_name:
                continue
            normalized_key = normalized_name.casefold()
            if normalized_key in seen_names:
                continue
            seen_names.add(normalized_key)
            cleaned_names.append(normalized_name)
        if not cleaned_names and not allow_empty:
            raise serializers.ValidationError(error_message)
        return cleaned_names

    def validate_subject_name(self, value):
        normalized = " ".join((value or "").split())
        if not normalized:
            raise serializers.ValidationError("Subject name is required.")
        return normalized

    def validate_chapter_name(self, value):
        normalized = " ".join((value or "").split())
        if not normalized:
            raise serializers.ValidationError("Chapter name is required.")
        return normalized

    def validate_exam_names(self, value):
        return self._clean_name_list(value, "Provide at least one exam name.")

    def validate(self, attrs):
        subject = Subject.objects.filter(name__iexact=attrs["subject_name"]).prefetch_related("exams").first()
        if not subject:
            raise serializers.ValidationError({"subject_name": "Subject not found."})

        chapter = Chapter.objects.filter(subject=subject, name__iexact=attrs["chapter_name"]).prefetch_related("exams").first()
        if not chapter:
            raise serializers.ValidationError({"chapter_name": "Chapter not found for the selected subject."})

        exam_names = attrs["exam_names"]

        declared_concept_names = self._clean_name_list(attrs.get("concept_names") or [], "Provide at least one concept name.", allow_empty=True)
        template_concept_names = self._clean_name_list([item.get("concept_name") for item in attrs["templates"]], "Each template must reference a concept name.")

        concept_names = []
        seen_names = set()
        for name in [*declared_concept_names, *template_concept_names]:
            key = name.casefold()
            if key in seen_names:
                continue
            seen_names.add(key)
            concept_names.append(name)

        for index, item in enumerate(attrs["templates"]):
            item["concept_name"] = " ".join((item.get("concept_name") or "").split())
            if not item["concept_name"]:
                raise serializers.ValidationError({"templates": {index: {"concept_name": "Concept name is required."}}})
            secondary_name = " ".join((item.get("secondary_concept_name") or "").split())
            item["secondary_concept_name"] = secondary_name or None
            if item["template_type"] == QuestionTemplate.TemplateType.MULTI_CONCEPT and not secondary_name:
                raise serializers.ValidationError({"templates": {index: {"secondary_concept_name": "Secondary concept is required for multi-concept templates."}}})

        attrs["subject"] = subject
        attrs["chapter"] = chapter
        attrs["exam_names"] = exam_names
        attrs["concept_names"] = concept_names
        return attrs

    def create(self, validated_data):
        subject = validated_data["subject"]
        chapter = validated_data["chapter"]
        exams = []
        for exam_name in validated_data["exam_names"]:
            exam = Exam.objects.filter(name__iexact=exam_name).first()
            if not exam:
                exam = Exam.objects.create(
                    name=exam_name,
                    slug=build_unique_slug(Exam, exam_name, max_length=140),
                )
            exams.append(exam)

        subject.exams.add(*exams)
        chapter.exams.add(*exams)

        concept_lookup = {
            concept.name.strip().casefold(): concept
            for concept in Concept.objects.filter(subject=subject, chapter=chapter).prefetch_related("exams")
        }

        for concept_name in validated_data["concept_names"]:
            key = concept_name.casefold()
            concept = concept_lookup.get(key)
            if not concept:
                concept = Concept.objects.create(
                    subject=subject,
                    chapter=chapter,
                    name=concept_name,
                    slug=build_unique_slug(Concept, concept_name, max_length=160, scope={"subject": subject}),
                )
                concept_lookup[key] = concept
            concept.exams.add(*exams)

        created = []
        for item in validated_data["templates"]:
            concept = concept_lookup[item["concept_name"].casefold()]
            secondary_concept = None
            if item.get("secondary_concept_name"):
                secondary_key = item["secondary_concept_name"].casefold()
                secondary_concept = concept_lookup.get(secondary_key)
                if not secondary_concept:
                    secondary_concept = Concept.objects.create(
                        subject=subject,
                        chapter=chapter,
                        name=item["secondary_concept_name"],
                        slug=build_unique_slug(Concept, item["secondary_concept_name"], max_length=160, scope={"subject": subject}),
                    )
                    secondary_concept.exams.add(*exams)
                    concept_lookup[secondary_key] = secondary_concept

            template = QuestionTemplate.objects.create(
                concept=concept,
                secondary_concept=secondary_concept,
                question_type=item.get("question_type", Question.QuestionType.MCQ_SINGLE),
                template_type=item["template_type"],
                difficulty=item["difficulty"],
                template_text=item["template_text"],
                variables=item.get("variables") or {},
                constraints=item.get("constraints") or [],
                distractor_logic=item.get("distractor_logic") or [],
                formula=item.get("formula", ""),
                correct_answer_formula=item.get("correct_answer_formula", ""),
                jee_tags=item.get("jee_tags") or [],
                expected_time_sec=item.get("expected_time_sec", 60),
                status=item.get("status", QuestionTemplate.Status.DRAFT),
            )
            created.append(template)

        return created


class AdminGeneratedQuestionPreviewSerializer(serializers.Serializer):
    template_id = serializers.UUIDField()
    subject_id = serializers.UUIDField()
    chapter_id = serializers.UUIDField()
    concept_id = serializers.UUIDField()
    secondary_concept_id = serializers.UUIDField(required=False, allow_null=True)
    exam_ids = serializers.ListField(child=serializers.UUIDField(), allow_empty=False)
    exam_type = serializers.ListField(child=serializers.CharField(max_length=100))
    question_type = serializers.ChoiceField(choices=Question.QuestionType.choices)
    prompt = serializers.CharField()
    explanation = serializers.CharField(required=False, allow_blank=True)
    difficulty_level = serializers.IntegerField(min_value=1, max_value=5)
    generation_hash = serializers.CharField()
    options = AdminQuestionOptionWriteSerializer(many=True, required=False)


class AdminTemplateQuestionGenerateSerializer(serializers.Serializer):
    subject_id = serializers.UUIDField()
    chapter_id = serializers.UUIDField()
    concept_id = serializers.UUIDField()
    difficulty = serializers.ChoiceField(choices=QuestionTemplate.Difficulty.choices)
    count = serializers.IntegerField(min_value=1, max_value=25)

    def validate(self, attrs):
        subject = Subject.objects.filter(id=attrs["subject_id"]).first()
        if not subject:
            raise serializers.ValidationError({"subject_id": "Subject not found."})
        chapter = Chapter.objects.filter(id=attrs["chapter_id"], subject=subject).first()
        if not chapter:
            raise serializers.ValidationError({"chapter_id": "Chapter not found for the selected subject."})
        concept = Concept.objects.filter(id=attrs["concept_id"], subject=subject, chapter=chapter).first()
        if not concept:
            raise serializers.ValidationError({"concept_id": "Concept not found for the selected chapter."})

        templates = list(
            QuestionTemplate.objects.select_related("concept", "secondary_concept")
            .filter(concept=concept, difficulty=attrs["difficulty"], status=QuestionTemplate.Status.ACTIVE)
            .order_by("template_type", "-updated_at")
        )
        if not templates:
            raise serializers.ValidationError({"concept_id": "No active templates match this concept and difficulty."})
        if not concept.exams.exists() and not subject.exams.exists():
            raise serializers.ValidationError({"concept_id": "Link at least one exam to this concept or subject before generating questions."})

        attrs["subject"] = subject
        attrs["chapter"] = chapter
        attrs["concept"] = concept
        attrs["templates"] = templates
        return attrs

    def create(self, validated_data):
        subject = validated_data["subject"]
        chapter = validated_data["chapter"]
        concept = validated_data["concept"]
        templates = validated_data["templates"]
        difficulty = validated_data["difficulty"]
        requested_count = validated_data["count"]
        existing_hashes = set(Question.objects.values_list("generation_hash", flat=True))
        previews = []
        attempts = 0

        while len(previews) < requested_count and attempts < requested_count * 8:
            attempts += 1
            template = templates[(attempts - 1) % len(templates)]
            variables = resolve_template_variables(template.variables, difficulty)
            if template.constraints and not validate_template_constraints(template.constraints, variables):
                continue
            answer_formula = template.correct_answer_formula or template.formula
            answer = safe_eval_expression(answer_formula, variables) if answer_formula else ""
            prompt = render_template_text(template.template_text, variables)
            generation_hash = make_generation_hash(prompt, concept.id, template.secondary_concept_id, template.id)
            if generation_hash in existing_hashes or any(item["generation_hash"] == generation_hash for item in previews):
                continue

            options = []
            question_type = template.question_type
            if question_type != Question.QuestionType.NUMERIC and template.template_type in [
                QuestionTemplate.TemplateType.LOGIC,
                QuestionTemplate.TemplateType.MULTI_CONCEPT,
                QuestionTemplate.TemplateType.WORD,
                QuestionTemplate.TemplateType.LOGIC_REVERSE_CONSTRAINT,
            ]:
                options = build_mcq_options(answer, template.distractor_logic, variables)
            preview = {
                "template_id": template.id,
                "subject_id": subject.id,
                "chapter_id": chapter.id,
                "concept_id": concept.id,
                "secondary_concept_id": template.secondary_concept_id,
                "exam_ids": list(concept.exams.values_list("id", flat=True)) or list(subject.exams.values_list("id", flat=True)),
                "exam_type": list(concept.exams.values_list("name", flat=True)) or list(subject.exams.values_list("name", flat=True)),
                "question_type": question_type,
                "prompt": prompt,
                "explanation": f"Generated from template formula: {answer_formula}".strip(),
                "difficulty_level": {"easy": 1, "medium": 3, "hard": 5}[difficulty],
                "generation_hash": generation_hash,
                "options": options,
            }
            previews.append(preview)
            existing_hashes.add(generation_hash)

        if not previews:
            raise QuestionGenerationError("No unique questions could be generated from the selected templates.")
        return previews


class AdminGeneratedQuestionSaveSerializer(serializers.Serializer):
    questions = AdminGeneratedQuestionPreviewSerializer(many=True, allow_empty=False)

    def create(self, validated_data):
        created = []
        for item in validated_data["questions"]:
            serializer = AdminQuestionWriteSerializer(
                data={
                    "subject_id": str(item["subject_id"]),
                    "chapter_id": str(item["chapter_id"]),
                    "concept_id": str(item["concept_id"]),
                    "secondary_concept_id": str(item["secondary_concept_id"]) if item.get("secondary_concept_id") else None,
                    "template_id": str(item["template_id"]),
                    "exam_ids": [str(exam_id) for exam_id in item["exam_ids"]],
                    "exam_type": item["exam_type"],
                    "question_type": item["question_type"],
                    "prompt": item["prompt"],
                    "explanation": item.get("explanation", ""),
                    "difficulty_level": item["difficulty_level"],
                    "generation_source": Question.GenerationSource.GENERATED,
                    "generation_hash": item["generation_hash"],
                    "status": Question.Status.DRAFT,
                    "options": item.get("options", []),
                }
            )
            serializer.is_valid(raise_exception=True)
            created.append(serializer.save())
        return created


class AdminBulkConceptUploadSerializer(serializers.Serializer):
    subject_id = serializers.UUIDField()
    chapter_id = serializers.UUIDField()
    exam_ids = serializers.ListField(
        child=serializers.UUIDField(),
        allow_empty=False,
    )
    concept_names = serializers.ListField(
        child=serializers.CharField(max_length=255),
        allow_empty=False,
    )

    def validate_concept_names(self, value):
        cleaned_names = []
        seen_names = set()
        for name in value:
            normalized_name = " ".join((name or "").split())
            if not normalized_name:
                continue
            normalized_key = normalized_name.casefold()
            if normalized_key in seen_names:
                continue
            seen_names.add(normalized_key)
            cleaned_names.append(normalized_name)
        if not cleaned_names:
            raise serializers.ValidationError("Provide at least one concept name.")
        return cleaned_names

    def validate(self, attrs):
        subject = Subject.objects.filter(id=attrs["subject_id"]).first()
        if not subject:
            raise serializers.ValidationError({"subject_id": "Subject not found."})
        chapter = Chapter.objects.filter(id=attrs["chapter_id"]).select_related("subject").first()
        if not chapter:
            raise serializers.ValidationError({"chapter_id": "Chapter not found."})
        if chapter.subject_id != subject.id:
            raise serializers.ValidationError({"chapter_id": "Chapter must belong to the selected subject."})

        exam_ids = attrs.get("exam_ids") or []
        if not exam_ids:
            raise serializers.ValidationError({"exam_ids": "Select at least one linked exam."})
        exams = list(Exam.objects.filter(id__in=exam_ids).order_by("name"))
        if len(exams) != len(set(exam_ids)):
            raise serializers.ValidationError({"exam_ids": "One or more exams were not found."})

        subject_exam_ids = set(subject.exams.values_list("id", flat=True))
        chapter_exam_ids = set(chapter.exams.values_list("id", flat=True))
        if any(exam.id not in subject_exam_ids or exam.id not in chapter_exam_ids for exam in exams):
            raise serializers.ValidationError(
                {"exam_ids": "Concepts can only use exams linked to both the selected subject and chapter."}
            )

        attrs["subject"] = subject
        attrs["chapter"] = chapter
        attrs["exams"] = exams
        return attrs

    def create(self, validated_data):
        subject = validated_data["subject"]
        chapter = validated_data["chapter"]
        exams = validated_data.get("exams") or []
        requested_names = validated_data["concept_names"]

        existing_keys = {
            concept.name.strip().casefold()
            for concept in Concept.objects.filter(subject=subject, chapter=chapter).only("name")
        }
        created = []
        for name in requested_names:
            normalized_key = name.casefold()
            if normalized_key in existing_keys:
                continue
            concept = Concept.objects.create(
                subject=subject,
                chapter=chapter,
                name=name,
                slug=build_unique_slug(
                    Concept,
                    name,
                    max_length=160,
                    scope={"subject": subject},
                ),
            )
            concept.exams.set(exams)
            created.append(concept)
            existing_keys.add(normalized_key)
        return created


class AdminBulkChapterUploadSerializer(serializers.Serializer):
    subject_id = serializers.UUIDField()
    exam_ids = serializers.ListField(
        child=serializers.UUIDField(),
        allow_empty=False,
    )
    chapter_names = serializers.ListField(
        child=serializers.CharField(max_length=255),
        allow_empty=False,
    )

    def validate_chapter_names(self, value):
        cleaned_names = []
        seen_names = set()
        for name in value:
            normalized_name = " ".join((name or "").split())
            if not normalized_name:
                continue
            normalized_key = normalized_name.casefold()
            if normalized_key in seen_names:
                continue
            seen_names.add(normalized_key)
            cleaned_names.append(normalized_name)
        if not cleaned_names:
            raise serializers.ValidationError("Provide at least one chapter name.")
        return cleaned_names

    def validate(self, attrs):
        subject = Subject.objects.filter(id=attrs["subject_id"]).prefetch_related("exams").first()
        if not subject:
            raise serializers.ValidationError({"subject_id": "Subject not found."})

        exam_ids = attrs.get("exam_ids") or []
        if not exam_ids:
            raise serializers.ValidationError({"exam_ids": "Select at least one linked exam."})
        exams = list(Exam.objects.filter(id__in=exam_ids).order_by("name"))
        if len(exams) != len(set(exam_ids)):
            raise serializers.ValidationError({"exam_ids": "One or more exams were not found."})

        subject_exam_ids = set(subject.exams.values_list("id", flat=True))
        if any(exam.id not in subject_exam_ids for exam in exams):
            raise serializers.ValidationError({"exam_ids": "Chapters can only use exams linked to the selected subject."})

        attrs["subject"] = subject
        attrs["exams"] = exams
        return attrs

    def create(self, validated_data):
        subject = validated_data["subject"]
        exams = validated_data.get("exams") or []
        requested_names = validated_data["chapter_names"]

        existing_keys = {
            chapter.name.strip().casefold()
            for chapter in Chapter.objects.filter(subject=subject).only("name")
        }
        created = []
        for name in requested_names:
            normalized_key = name.casefold()
            if normalized_key in existing_keys:
                continue
            chapter = Chapter.objects.create(
                subject=subject,
                name=name,
                slug=build_unique_slug(
                    Chapter,
                    name,
                    max_length=160,
                    scope={"subject": subject},
                ),
            )
            chapter.exams.set(exams)
            created.append(chapter)
            existing_keys.add(normalized_key)
        return created


class AdminAiQuestionGenerateSerializer(serializers.Serializer):
    subject_id = serializers.UUIDField()
    chapter_id = serializers.UUIDField()
    concept_id = serializers.UUIDField()
    exam_ids = serializers.ListField(
        child=serializers.UUIDField(),
        required=False,
        allow_empty=True,
    )
    exam_type = serializers.ListField(
        child=serializers.CharField(max_length=100),
        required=False,
        allow_empty=True,
    )
    question_type = serializers.ChoiceField(choices=Question.QuestionType.choices)
    question_prompt = serializers.CharField()
    difficulty_level = serializers.IntegerField(min_value=1, max_value=5, required=False, default=1)

    def validate(self, attrs):
        subject = Subject.objects.filter(id=attrs["subject_id"]).first()
        if not subject:
            raise serializers.ValidationError({"subject_id": "Subject not found."})
        chapter = Chapter.objects.filter(id=attrs["chapter_id"]).select_related("subject").first()
        if not chapter:
            raise serializers.ValidationError({"chapter_id": "Chapter not found."})
        if chapter.subject_id != subject.id:
            raise serializers.ValidationError({"chapter_id": "Chapter must belong to the selected subject."})
        concept = Concept.objects.filter(id=attrs["concept_id"]).select_related("subject", "chapter").first()
        if not concept:
            raise serializers.ValidationError({"concept_id": "Concept not found."})
        if concept.subject_id != subject.id:
            raise serializers.ValidationError({"concept_id": "Concept must belong to the selected subject."})
        if concept.chapter_id != chapter.id:
            raise serializers.ValidationError({"concept_id": "Concept must belong to the selected chapter."})
        exam_ids = attrs.get("exam_ids") or []
        exams = list(Exam.objects.filter(id__in=exam_ids).order_by("name"))
        if len(exams) != len(set(exam_ids)):
            raise serializers.ValidationError({"exam_ids": "One or more exams were not found."})
        subject_exam_ids = set(subject.exams.values_list("id", flat=True))
        concept_exam_ids = set(concept.exams.values_list("id", flat=True))
        if any(exam.id not in subject_exam_ids or exam.id not in concept_exam_ids for exam in exams):
            raise serializers.ValidationError(
                {"exam_ids": "Questions can only use exams linked to both the selected subject and concept."}
            )
        attrs["subject"] = subject
        attrs["chapter"] = chapter
        attrs["concept"] = concept
        attrs["exams"] = exams
        return attrs

    def create(self, validated_data):
        subject = validated_data["subject"]
        concept = validated_data["concept"]
        exams = validated_data.get("exams") or []
        try:
            generated = generate_question_with_gemini(
                subject_name=subject.name,
                concept_name=concept.name,
                question_type=validated_data["question_type"],
                exam_type=validated_data.get("exam_type") or [exam.name for exam in exams],
                prompt_seed=validated_data["question_prompt"],
            )
        except QuestionGenerationError as exc:
            raise serializers.ValidationError({"detail": str(exc)}) from exc

        serializer = AdminQuestionWriteSerializer(
            data={
                "subject_id": str(subject.id),
                "chapter_id": str(validated_data["chapter"].id),
                "concept_id": str(concept.id),
                "exam_ids": [str(exam.id) for exam in exams],
                "exam_type": validated_data.get("exam_type") or [exam.name for exam in exams],
                "question_type": validated_data["question_type"],
                "prompt": generated["prompt"],
                "explanation": generated["explanation"],
                "difficulty_level": validated_data.get("difficulty_level", 1),
                "status": Question.Status.DRAFT,
                "options": generated["options"],
            }
        )
        serializer.is_valid(raise_exception=True)
        return serializer.save()


class AdminDashboardSerializer(serializers.Serializer):
    users_total = serializers.IntegerField()
    students_total = serializers.IntegerField()
    guardians_total = serializers.IntegerField()
    admins_total = serializers.IntegerField()
    active_users_total = serializers.IntegerField()
    verified_users_total = serializers.IntegerField()
    subjects_total = serializers.IntegerField()
    chapters_total = serializers.IntegerField()
    concepts_total = serializers.IntegerField()
    questions_total = serializers.IntegerField()
    active_questions_total = serializers.IntegerField()
    attempts_total = serializers.IntegerField()
    completed_attempts_total = serializers.IntegerField()
    guardian_links_total = serializers.IntegerField()
    tokens_in_circulation = serializers.IntegerField()
    recent_users = AdminUserListSerializer(many=True)
    recent_attempts = serializers.SerializerMethodField()

    def get_recent_attempts(self, obj):
        attempts = obj["recent_attempts"]
        return [
            {
                "id": str(attempt.id),
                "student_name": attempt.student.full_name,
                "subject_name": attempt.subject.name,
                "status": attempt.status,
                "score_percent": attempt.score_percent,
                "started_at": attempt.started_at,
            }
            for attempt in attempts
        ]
