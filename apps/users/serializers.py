from django.contrib.auth import authenticate
from rest_framework import serializers
from rest_framework_simplejwt.tokens import RefreshToken

from apps.guardians.models import GuardianProfile
from apps.students.models import StudentProfile
from apps.users.models import User


class UserSummarySerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "email", "phone", "role", "is_verified"]


class RegisterSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=8)
    role = serializers.ChoiceField(choices=[User.Role.STUDENT, User.Role.GUARDIAN])
    phone = serializers.CharField(max_length=20, required=False, allow_blank=True)
    class_name = serializers.CharField(max_length=50, required=False, allow_blank=True)
    date_of_birth = serializers.DateField(required=False, allow_null=True)
    board = serializers.CharField(max_length=50, required=False, allow_blank=True)
    school_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    primary_target_exam = serializers.CharField(max_length=100, required=False, allow_blank=True)
    secondary_target_exam = serializers.CharField(max_length=100, required=False, allow_blank=True)
    relationship_to_student = serializers.CharField(max_length=50, required=False, allow_blank=True)

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value

    def validate(self, attrs):
        if attrs["role"] == User.Role.STUDENT and not attrs.get("class_name"):
            raise serializers.ValidationError({"class_name": "This field is required for students."})
        return attrs

    def create(self, validated_data):
        name = validated_data.pop("name")
        role = validated_data["role"]
        phone = validated_data.pop("phone", "")
        class_name = validated_data.pop("class_name", "")
        date_of_birth = validated_data.pop("date_of_birth", None)
        board = validated_data.pop("board", "")
        school_name = validated_data.pop("school_name", "")
        primary_target_exam = validated_data.pop("primary_target_exam", "")
        secondary_target_exam = validated_data.pop("secondary_target_exam", "")
        relationship_to_student = validated_data.pop("relationship_to_student", "")

        user = User.objects.create_user(
            email=validated_data["email"],
            password=validated_data["password"],
            role=role,
            phone=phone,
        )
        if role == User.Role.STUDENT:
            StudentProfile.objects.create(
                user=user,
                full_name=name,
                class_name=class_name,
                date_of_birth=date_of_birth,
                board=board,
                school_name=school_name,
                primary_target_exam=primary_target_exam,
                secondary_target_exam=secondary_target_exam,
            )
        else:
            GuardianProfile.objects.create(
                user=user,
                full_name=name,
                relationship_to_student=relationship_to_student,
            )
        return user


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        email = attrs.get("email")
        password = attrs.get("password")
        user = authenticate(request=self.context.get("request"), email=email, password=password)
        if not user:
            raise serializers.ValidationError("Invalid email or password.")
        if not user.is_active:
            raise serializers.ValidationError("This account is inactive.")
        attrs["user"] = user
        return attrs

    def create(self, validated_data):
        user = validated_data["user"]
        refresh = RefreshToken.for_user(user)
        return {
            "refresh": str(refresh),
            "access": str(refresh.access_token),
            "user": UserSummarySerializer(user).data,
        }
