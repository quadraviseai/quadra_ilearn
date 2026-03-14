from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from apps.users.views import ForgotPasswordView, LoginView, RegisterView, ResetPasswordView


urlpatterns = [
    path("register", RegisterView.as_view(), name="auth-register"),
    path("login", LoginView.as_view(), name="auth-login"),
    path("forgot-password", ForgotPasswordView.as_view(), name="auth-forgot-password"),
    path("reset-password", ResetPasswordView.as_view(), name="auth-reset-password"),
    path("refresh", TokenRefreshView.as_view(), name="auth-refresh"),
]
