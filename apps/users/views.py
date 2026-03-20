from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import send_mail
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from urllib.parse import urlencode
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.users.serializers import GoogleAuthSerializer, LoginSerializer, RegisterSerializer, UserSummarySerializer

User = get_user_model()


def build_client_url(base_url, path, **params):
    if not base_url:
        return ""
    separator = "" if base_url.endswith(("://", "/")) else "/"
    query = urlencode({key: value for key, value in params.items() if value})
    return f"{base_url}{separator}{path.lstrip('/')}" + (f"?{query}" if query else "")


def send_verification_email(user):
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = default_token_generator.make_token(user)
    web_url = build_client_url(settings.FRONTEND_BASE_URL.rstrip("/"), "/verify-email", uid=uid, token=token)
    mobile_url = build_client_url(settings.MOBILE_APP_BASE_URL, "verify-email", uid=uid, token=token)
    send_mail(
        subject="Verify your QuadraILearn email",
        message=(
            "Welcome to QuadraILearn.\n\n"
            "Verify your email before signing in with password.\n\n"
            f"Web verification: {web_url}\n"
            f"Mobile verification: {mobile_url}\n\n"
            "If you did not create this account, you can ignore this email."
        ),
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
        fail_silently=False,
    )


def send_password_reset_email(user):
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = default_token_generator.make_token(user)
    web_url = build_client_url(settings.FRONTEND_BASE_URL.rstrip("/"), "/reset-password", uid=uid, token=token)
    mobile_url = build_client_url(settings.MOBILE_APP_BASE_URL, "reset-password", uid=uid, token=token)
    send_mail(
        subject="QuadraILearn password reset",
        message=(
            "We received a request to reset your QuadraILearn password.\n\n"
            f"Web reset: {web_url}\n"
            f"Mobile reset: {mobile_url}\n\n"
            "If you did not request this, you can ignore this email."
        ),
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
        fail_silently=False,
    )


class RegisterView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        send_verification_email(user)
        return Response(
            {
                "message": "Registration successful. Check your email to verify the account.",
                "user": UserSummarySerializer(user).data,
            },
            status=status.HTTP_201_CREATED,
        )


class LoginView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        return Response(serializer.save(), status=status.HTTP_200_OK)


class GoogleAuthView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = GoogleAuthSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return Response(serializer.save(), status=status.HTTP_200_OK)


class CurrentUserView(APIView):
    def get(self, request):
        return Response(UserSummarySerializer(request.user).data, status=status.HTTP_200_OK)


class VerifyEmailView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        uid = request.data.get("uid")
        token = request.data.get("token")

        if not uid or not token:
            return Response({"detail": "uid and token are required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user_id = force_str(urlsafe_base64_decode(uid))
            user = User.objects.get(pk=user_id)
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            return Response({"detail": "Invalid verification link."}, status=status.HTTP_400_BAD_REQUEST)

        if not default_token_generator.check_token(user, token):
            return Response({"detail": "Invalid or expired verification link."}, status=status.HTTP_400_BAD_REQUEST)

        if not user.is_verified:
            user.is_verified = True
            user.save(update_fields=["is_verified", "updated_at"])

        return Response({"message": "Email verified successfully."}, status=status.HTTP_200_OK)


class ForgotPasswordView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = (request.data.get("email") or "").strip().lower()
        if not email:
            return Response({"detail": "Email is required."}, status=status.HTTP_400_BAD_REQUEST)

        user = User.objects.filter(email=email).first()
        if user:
            send_password_reset_email(user)

        return Response(
            {"message": "If an account exists for this email, a password reset link has been sent."},
            status=status.HTTP_200_OK,
        )


class ResetPasswordView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        uid = request.data.get("uid")
        token = request.data.get("token")
        password = request.data.get("password")

        if not uid or not token or not password:
            return Response(
                {"detail": "uid, token, and password are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            user_id = force_str(urlsafe_base64_decode(uid))
            user = User.objects.get(pk=user_id)
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            return Response({"detail": "Invalid reset link."}, status=status.HTTP_400_BAD_REQUEST)

        if not default_token_generator.check_token(user, token):
            return Response({"detail": "Invalid or expired reset link."}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(password)
        user.save(update_fields=["password"])
        return Response({"message": "Password updated successfully."}, status=status.HTTP_200_OK)
