import secrets

from django.utils import timezone
from rest_framework import serializers

from apps.guardians.models import GuardianStudentLink
from apps.learning_health.serializers import LearningHealthSnapshotSerializer
from apps.students.models import StudentProfile
from apps.users.models import User


class InviteStudentSerializer(serializers.Serializer):
    email = serializers.EmailField()

    def validate(self, attrs):
        request = self.context["request"]
        guardian_profile = request.user.guardian_profile
        student_user = User.objects.filter(email=attrs["email"], role=User.Role.STUDENT).first()
        if student_user and GuardianStudentLink.objects.filter(
            guardian=guardian_profile,
            student=student_user.student_profile,
        ).exists():
            raise serializers.ValidationError({"email": "This student is already linked to the guardian."})
        attrs["student_user"] = student_user
        return attrs

    def create(self, validated_data):
        guardian_profile = self.context["request"].user.guardian_profile
        student_user = validated_data["student_user"]
        link = None
        if student_user:
            link, _ = GuardianStudentLink.objects.get_or_create(
                guardian=guardian_profile,
                student=student_user.student_profile,
                defaults={
                    "status": GuardianStudentLink.Status.INVITED,
                    "invite_token": secrets.token_urlsafe(24),
                    "invited_at": timezone.now(),
                },
            )
        return {
            "invite_token": link.invite_token if link else secrets.token_urlsafe(24),
            "student_exists": bool(student_user),
        }


class AcceptInviteSerializer(serializers.Serializer):
    invite_token = serializers.CharField(max_length=255)


class CreateStudentSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    class_name = serializers.CharField(max_length=50)
    date_of_birth = serializers.DateField(required=False, allow_null=True)
    board = serializers.CharField(max_length=50, required=False, allow_blank=True)
    school_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    primary_target_exam = serializers.CharField(max_length=100, required=False, allow_blank=True)
    secondary_target_exam = serializers.CharField(max_length=100, required=False, allow_blank=True)
    target_exam = serializers.CharField(max_length=100, required=False, allow_blank=True, write_only=True)

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value

    def create(self, validated_data):
        guardian_profile = self.context["request"].user.guardian_profile
        temp_password = secrets.token_urlsafe(10)
        user = User.objects.create_user(
            email=validated_data["email"],
            password=temp_password,
            role=User.Role.STUDENT,
        )
        student = StudentProfile.objects.create(
            user=user,
            full_name=validated_data["name"],
            class_name=validated_data["class_name"],
            date_of_birth=validated_data.get("date_of_birth"),
            board=validated_data.get("board", ""),
            school_name=validated_data.get("school_name", ""),
            primary_target_exam=validated_data.get("primary_target_exam") or validated_data.get("target_exam", ""),
            secondary_target_exam=validated_data.get("secondary_target_exam", ""),
        )
        GuardianStudentLink.objects.create(
            guardian=guardian_profile,
            student=student,
            status=GuardianStudentLink.Status.ACTIVE,
            invite_token=secrets.token_urlsafe(24),
            invited_at=timezone.now(),
            accepted_at=timezone.now(),
        )
        return {
            "student_id": str(student.id),
            "student_email": user.email,
            "temporary_password": temp_password,
        }


class GuardianStudentSummarySerializer(serializers.ModelSerializer):
    email = serializers.EmailField(source="user.email", read_only=True)
    latest_learning_health = serializers.SerializerMethodField()
    streak = serializers.SerializerMethodField()
    recent_attempt = serializers.SerializerMethodField()
    link_status = serializers.SerializerMethodField()

    class Meta:
        model = StudentProfile
        fields = [
            "id",
            "full_name",
            "email",
            "class_name",
            "board",
            "primary_target_exam",
            "secondary_target_exam",
            "link_status",
            "latest_learning_health",
            "streak",
            "recent_attempt",
        ]

    def get_latest_learning_health(self, obj):
        snapshot = obj.learning_health_snapshots.first()
        return LearningHealthSnapshotSerializer(snapshot).data if snapshot else None

    def get_streak(self, obj):
        streak = getattr(obj, "streak", None)
        if not streak:
            return {
                "current_streak_days": 0,
                "best_streak_days": 0,
                "last_activity_date": None,
            }
        return {
            "current_streak_days": streak.current_streak_days,
            "best_streak_days": streak.best_streak_days,
            "last_activity_date": streak.last_activity_date,
        }

    def get_recent_attempt(self, obj):
        attempt = obj.test_attempts.select_related("subject").order_by("-started_at").first()
        if not attempt:
            return None
        return {
            "id": attempt.id,
            "subject_name": attempt.subject.name,
            "status": attempt.status,
            "score_percent": attempt.score_percent,
            "started_at": attempt.started_at,
            "submitted_at": attempt.submitted_at,
        }

    def get_link_status(self, obj):
        link_map = self.context.get("link_map", {})
        link = link_map.get(obj.id)
        return link.status if link else None
