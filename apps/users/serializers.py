from django.conf import settings
from django.contrib.auth import authenticate
from rest_framework import serializers
from rest_framework_simplejwt.tokens import RefreshToken

from apps.guardians.models import GuardianProfile
from apps.students.models import StudentProfile
from apps.users.models import User
from apps.users.services import (
    TokenError,
    apply_referral_bonus,
    get_token_settings,
    grant_welcome_tokens_if_eligible,
    serialize_token_settings,
)


def issue_auth_tokens(user):
    user = grant_welcome_tokens_if_eligible(user)
    refresh = RefreshToken.for_user(user)
    return {
        "refresh": str(refresh),
        "access": str(refresh.access_token),
        "user": UserSummarySerializer(user).data,
    }


def verify_google_id_token(credential, audience):
    from google.auth.transport import requests as google_requests
    from google.oauth2 import id_token

    audiences = audience if isinstance(audience, (list, tuple, set)) else [audience]
    last_error = None
    for candidate in audiences:
        if not candidate:
            continue
        try:
            return id_token.verify_oauth2_token(credential, google_requests.Request(), candidate)
        except Exception as exc:
            last_error = exc
    if last_error:
        raise last_error
    raise ValueError("No Google OAuth audience configured.")


class UserSummarySerializer(serializers.ModelSerializer):
    token_settings = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ["id", "email", "phone", "role", "is_verified", "token_balance", "referral_code", "token_settings"]

    def get_token_settings(self, _obj):
        return serialize_token_settings(get_token_settings())


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
    referral_code = serializers.CharField(max_length=24, required=False, allow_blank=True)

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value

    def validate_referral_code(self, value):
        normalized = str(value or "").strip().upper()
        if normalized and not User.objects.filter(referral_code=normalized).exists():
            raise serializers.ValidationError("Invalid referral code.")
        return normalized

    def validate(self, attrs):
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
        referral_code = validated_data.pop("referral_code", "")

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
                class_name=class_name or "",
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
        user = grant_welcome_tokens_if_eligible(user)
        if referral_code:
            try:
                user = apply_referral_bonus(user, referral_code)
            except TokenError as exc:
                raise serializers.ValidationError({"referral_code": str(exc)}) from exc
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
        if user.auth_provider == User.AuthProvider.EMAIL and user.role != User.Role.ADMIN and not user.is_verified:
            raise serializers.ValidationError("Verify your email before logging in.")
        attrs["user"] = user
        return attrs

    def create(self, validated_data):
        user = validated_data["user"]
        return issue_auth_tokens(user)


class GoogleAuthSerializer(serializers.Serializer):
    credential = serializers.CharField(write_only=True)
    intent = serializers.ChoiceField(choices=["login", "register"], required=False, default="login")
    role = serializers.ChoiceField(choices=[User.Role.STUDENT, User.Role.GUARDIAN], required=False)
    name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    phone = serializers.CharField(max_length=20, required=False, allow_blank=True)
    class_name = serializers.CharField(max_length=50, required=False, allow_blank=True)
    date_of_birth = serializers.DateField(required=False, allow_null=True)
    board = serializers.CharField(max_length=50, required=False, allow_blank=True)
    school_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    primary_target_exam = serializers.CharField(max_length=100, required=False, allow_blank=True)
    secondary_target_exam = serializers.CharField(max_length=100, required=False, allow_blank=True)
    relationship_to_student = serializers.CharField(max_length=50, required=False, allow_blank=True)
    referral_code = serializers.CharField(max_length=24, required=False, allow_blank=True)

    default_error_messages = {
        "google_not_configured": "Google authentication is not configured on the server.",
        "google_invalid": "Google sign-in could not be verified.",
        "google_email": "Google account email is unavailable or not verified.",
        "login_provider_mismatch": "This account was not registered with Google. Use email/password login instead.",
        "register_exists_email": "An account with this email already exists. Use email/password login instead.",
        "google_subject_mismatch": "This Google account does not match the registered Google user.",
    }

    def validate_referral_code(self, value):
        normalized = str(value or "").strip().upper()
        if normalized and not User.objects.filter(referral_code=normalized).exists():
            raise serializers.ValidationError("Invalid referral code.")
        return normalized

    def validate(self, attrs):
        client_ids = [
            (settings.GOOGLE_OAUTH_CLIENT_ID or "").strip(),
            (settings.GOOGLE_OAUTH_ANDROID_CLIENT_ID or "").strip(),
        ]
        client_ids = [client_id for client_id in client_ids if client_id]
        if not client_ids:
            raise serializers.ValidationError({"detail": self.error_messages["google_not_configured"]})

        try:
            google_payload = verify_google_id_token(attrs["credential"], client_ids)
        except ImportError as exc:
            raise serializers.ValidationError({"detail": self.error_messages["google_not_configured"]}) from exc
        except Exception as exc:
            raise serializers.ValidationError({"detail": self.error_messages["google_invalid"]}) from exc

        email = (google_payload.get("email") or "").strip().lower()
        if not email or not google_payload.get("email_verified"):
            raise serializers.ValidationError({"detail": self.error_messages["google_email"]})

        google_subject = (google_payload.get("sub") or "").strip()
        user = User.objects.filter(email__iexact=email).first()

        if user:
            if not user.is_active:
                raise serializers.ValidationError({"detail": "This account is inactive."})
            if user.auth_provider != User.AuthProvider.GOOGLE:
                raise serializers.ValidationError({"detail": self.error_messages["login_provider_mismatch"]})
            if user.google_subject and google_subject and user.google_subject != google_subject:
                raise serializers.ValidationError({"detail": self.error_messages["google_subject_mismatch"]})
            attrs["user"] = user
            return attrs

        if attrs["intent"] == "login":
            attrs["role"] = User.Role.STUDENT
            attrs["google_payload"] = google_payload
            attrs["google_subject"] = google_subject or None
            attrs["email"] = email
            attrs["name"] = (google_payload.get("name") or email.split("@")[0]).strip()
            attrs["auto_registered"] = True
            return attrs

        requested_role = attrs.get("role")
        attrs["role"] = requested_role or User.Role.STUDENT
        attrs["google_payload"] = google_payload
        attrs["google_subject"] = google_subject or None
        attrs["email"] = email
        attrs["name"] = (attrs.get("name") or google_payload.get("name") or email.split("@")[0]).strip()
        return attrs

    def create(self, validated_data):
        user = validated_data.get("user")
        if user:
            return issue_auth_tokens(user)

        role = validated_data["role"]
        referral_code = validated_data.get("referral_code", "")
        user = User.objects.create_user(
            email=validated_data["email"],
            password=None,
            role=role,
            phone=validated_data.get("phone", ""),
            auth_provider=User.AuthProvider.GOOGLE,
            google_subject=validated_data.get("google_subject"),
            is_verified=True,
        )

        if role == User.Role.STUDENT:
            StudentProfile.objects.create(
                user=user,
                full_name=validated_data["name"],
                class_name=validated_data.get("class_name", "") or "",
                date_of_birth=validated_data.get("date_of_birth"),
                board=validated_data.get("board", ""),
                school_name=validated_data.get("school_name", ""),
                primary_target_exam=validated_data.get("primary_target_exam", ""),
                secondary_target_exam=validated_data.get("secondary_target_exam", ""),
            )
        else:
            GuardianProfile.objects.create(
                user=user,
                full_name=validated_data["name"],
                relationship_to_student=validated_data.get("relationship_to_student", ""),
            )

        user = grant_welcome_tokens_if_eligible(user)
        if referral_code:
            try:
                user = apply_referral_bonus(user, referral_code)
            except TokenError as exc:
                raise serializers.ValidationError({"referral_code": str(exc)}) from exc
        return issue_auth_tokens(user)
