from django.contrib.auth import get_user_model
from django.utils.text import slugify
from rest_framework import serializers

from apps.diagnostics.models import Concept, Exam, Question, QuestionOption, Subject, TestAttempt
from apps.guardians.models import GuardianProfile, GuardianStudentLink
from apps.internal_admin.services import QuestionGenerationError, generate_question_with_gemini
from apps.students.models import StudentProfile

User = get_user_model()


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


class AdminUserListSerializer(serializers.ModelSerializer):
    name = serializers.SerializerMethodField()
    class_name = serializers.CharField(source="student_profile.class_name", read_only=True)
    board = serializers.CharField(source="student_profile.board", read_only=True)
    school_name = serializers.CharField(source="student_profile.school_name", read_only=True)
    relationship_to_student = serializers.CharField(source="guardian_profile.relationship_to_student", read_only=True)
    linked_students = serializers.SerializerMethodField()

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

    def update(self, instance, validated_data):
        user_fields = []
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
        return instance


class AdminSubjectSerializer(serializers.ModelSerializer):
    concept_count = serializers.IntegerField(read_only=True)
    question_count = serializers.IntegerField(read_only=True)
    exams = serializers.SerializerMethodField()
    exam_ids = serializers.ListField(child=serializers.UUIDField(), write_only=True, required=False, allow_empty=True)

    class Meta:
        model = Subject
        fields = ["id", "name", "slug", "created_at", "concept_count", "question_count", "exams", "exam_ids"]
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
    concept_count = serializers.IntegerField(read_only=True)
    question_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Exam
        fields = ["id", "name", "slug", "created_at", "subject_count", "concept_count", "question_count"]
        read_only_fields = ["slug", "created_at", "subject_count", "concept_count", "question_count"]

    def create(self, validated_data):
        validated_data["slug"] = build_unique_slug(Exam, validated_data["name"], max_length=140)
        return Exam.objects.create(**validated_data)

    def update(self, instance, validated_data):
        if "name" in validated_data:
            instance.name = validated_data["name"]
            instance.slug = build_unique_slug(Exam, validated_data["name"], max_length=140, exclude_id=instance.id)
            instance.save(update_fields=["name", "slug"])
        return instance


class AdminConceptSerializer(serializers.ModelSerializer):
    subject_name = serializers.CharField(source="subject.name", read_only=True)
    question_count = serializers.IntegerField(read_only=True)
    exams = serializers.SerializerMethodField()
    exam_ids = serializers.ListField(child=serializers.UUIDField(), write_only=True, required=False, allow_empty=True)

    class Meta:
        model = Concept
        fields = [
            "id",
            "subject",
            "subject_name",
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

    def create(self, validated_data):
        exams = validated_data.pop("exam_ids", [])
        subject = validated_data["subject"]
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


class AdminQuestionOptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = QuestionOption
        fields = ["id", "option_text", "is_correct", "display_order"]


class AdminQuestionSerializer(serializers.ModelSerializer):
    subject_name = serializers.CharField(source="subject.name", read_only=True)
    concept_name = serializers.CharField(source="concept.name", read_only=True)
    options = AdminQuestionOptionSerializer(many=True, read_only=True)
    exams = serializers.SerializerMethodField()

    class Meta:
        model = Question
        fields = [
            "id",
            "subject",
            "subject_name",
            "concept",
            "concept_name",
            "exam_type",
            "question_type",
            "prompt",
            "explanation",
            "difficulty_level",
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
    prompt = serializers.CharField()
    explanation = serializers.CharField(required=False, allow_blank=True)
    difficulty_level = serializers.IntegerField(min_value=1, max_value=5, required=False, default=1)
    status = serializers.ChoiceField(choices=Question.Status.choices, required=False, default=Question.Status.ACTIVE)
    options = AdminQuestionOptionWriteSerializer(many=True, required=False)

    def validate(self, attrs):
        subject = Subject.objects.filter(id=attrs["subject_id"]).first()
        if not subject:
            raise serializers.ValidationError({"subject_id": "Subject not found."})

        concept = Concept.objects.filter(id=attrs["concept_id"]).select_related("subject").first()
        if not concept:
            raise serializers.ValidationError({"concept_id": "Concept not found."})
        if concept.subject_id != subject.id:
            raise serializers.ValidationError({"concept_id": "Concept must belong to the selected subject."})

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
        attrs["concept"] = concept
        attrs["exams"] = exams
        return attrs

    def create(self, validated_data):
        options = validated_data.pop("options", [])
        exams = validated_data.pop("exams", [])
        validated_data["subject"] = validated_data.pop("subject")
        validated_data["concept"] = validated_data.pop("concept")
        validated_data.pop("subject_id", None)
        validated_data.pop("concept_id", None)
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
        instance.concept = validated_data.pop("concept")
        validated_data.pop("subject_id", None)
        validated_data.pop("concept_id", None)
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
    concept_id = serializers.UUIDField()
    exam_ids = serializers.ListField(
        child=serializers.UUIDField(),
        required=False,
        allow_empty=True,
    )
    questions = AdminBulkQuestionItemSerializer(many=True)

    def validate(self, attrs):
        subject = Subject.objects.filter(id=attrs["subject_id"]).first()
        if not subject:
            raise serializers.ValidationError({"subject_id": "Subject not found."})
        concept = Concept.objects.filter(id=attrs["concept_id"]).select_related("subject").first()
        if not concept:
            raise serializers.ValidationError({"concept_id": "Concept not found."})
        if concept.subject_id != subject.id:
            raise serializers.ValidationError({"concept_id": "Concept must belong to the selected subject."})
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
                    "concept_id": str(concept.id),
                    "exam_ids": item_exam_ids,
                    "exam_type": item_exam_type,
                    **item,
                }
            )
            serializer.is_valid(raise_exception=True)
            created.append(serializer.save())
        return created


class AdminAiQuestionGenerateSerializer(serializers.Serializer):
    subject_id = serializers.UUIDField()
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
        concept = Concept.objects.filter(id=attrs["concept_id"]).select_related("subject").first()
        if not concept:
            raise serializers.ValidationError({"concept_id": "Concept not found."})
        if concept.subject_id != subject.id:
            raise serializers.ValidationError({"concept_id": "Concept must belong to the selected subject."})
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
    concepts_total = serializers.IntegerField()
    questions_total = serializers.IntegerField()
    active_questions_total = serializers.IntegerField()
    attempts_total = serializers.IntegerField()
    completed_attempts_total = serializers.IntegerField()
    guardian_links_total = serializers.IntegerField()
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
