import uuid
from secrets import choice

from django.contrib.auth.base_user import BaseUserManager
from django.contrib.auth.models import AbstractUser
from django.db import models


REFERRAL_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"


def generate_referral_code(length=8):
    return "".join(choice(REFERRAL_CODE_ALPHABET) for _ in range(length))


class UserManager(BaseUserManager):
    use_in_migrations = True

    def _create_user(self, email, password, **extra_fields):
        if not email:
            raise ValueError("The email field is required.")
        email = self.normalize_email(email)
        if not extra_fields.get("referral_code"):
            extra_fields["referral_code"] = self.model.generate_unique_referral_code()
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_user(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", False)
        extra_fields.setdefault("is_superuser", False)
        return self._create_user(email, password, **extra_fields)

    def create_superuser(self, email, password, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("role", User.Role.ADMIN)
        if extra_fields.get("is_staff") is not True:
            raise ValueError("Superuser must have is_staff=True.")
        if extra_fields.get("is_superuser") is not True:
            raise ValueError("Superuser must have is_superuser=True.")
        return self._create_user(email, password, **extra_fields)


class User(AbstractUser):
    class AuthProvider(models.TextChoices):
        EMAIL = "email", "Email"
        GOOGLE = "google", "Google"

    class Role(models.TextChoices):
        STUDENT = "student", "Student"
        GUARDIAN = "guardian", "Guardian"
        ADMIN = "admin", "Admin"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    username = None
    email = models.EmailField(unique=True)
    phone = models.CharField(max_length=20, blank=True)
    auth_provider = models.CharField(max_length=20, choices=AuthProvider.choices, default=AuthProvider.EMAIL)
    google_subject = models.CharField(max_length=255, blank=True, null=True, unique=True)
    role = models.CharField(max_length=20, choices=Role.choices)
    is_verified = models.BooleanField(default=False)
    token_balance = models.PositiveIntegerField(default=0)
    referral_code = models.CharField(max_length=24, unique=True, blank=True)
    referred_by = models.ForeignKey("self", null=True, blank=True, on_delete=models.SET_NULL, related_name="referrals")
    welcome_tokens_granted_at = models.DateTimeField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []

    objects = UserManager()

    @classmethod
    def generate_unique_referral_code(cls):
        while True:
            candidate = generate_referral_code()
            if not cls.objects.filter(referral_code=candidate).exists():
                return candidate

    def __str__(self):
        return f"{self.email} ({self.role})"

    def save(self, *args, **kwargs):
        if not self.referral_code:
            self.referral_code = self.generate_unique_referral_code()
        super().save(*args, **kwargs)


class TokenSettings(models.Model):
    initial_login_bonus = models.PositiveIntegerField(default=1000)
    referral_bonus = models.PositiveIntegerField(default=200)
    weak_topic_unlock_cost = models.PositiveIntegerField(default=25)
    timer_reset_cost = models.PositiveIntegerField(default=50)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        self.pk = 1
        super().save(*args, **kwargs)

    def __str__(self):
        return "Token Settings"


class TokenTransaction(models.Model):
    class TransactionType(models.TextChoices):
        WELCOME_BONUS = "welcome_bonus", "Welcome Bonus"
        REFERRAL_BONUS = "referral_bonus", "Referral Bonus"
        ADMIN_ADJUSTMENT = "admin_adjustment", "Admin Adjustment"
        WEAK_TOPIC_UNLOCK = "weak_topic_unlock", "Weak Topic Unlock"
        TIMER_RESET = "timer_reset", "Timer Reset"
        TOKEN_TOPUP = "token_topup", "Token Top-up"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey("User", on_delete=models.CASCADE, related_name="token_transactions")
    transaction_type = models.CharField(max_length=50, choices=TransactionType.choices)
    amount = models.IntegerField()
    balance_after = models.PositiveIntegerField()
    note = models.CharField(max_length=255, blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    created_by = models.ForeignKey("User", null=True, blank=True, on_delete=models.SET_NULL, related_name="managed_token_transactions")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.user.email}: {self.amount} ({self.transaction_type})"


class TokenTopUpPurchase(models.Model):
    class Status(models.TextChoices):
        SUCCESS = "success", "Success"
        FAILED = "failed", "Failed"
        PENDING = "pending", "Pending"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey("User", on_delete=models.CASCADE, related_name="token_topup_purchases")
    token_amount = models.PositiveIntegerField()
    amount = models.DecimalField(max_digits=8, decimal_places=2)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.SUCCESS)
    provider = models.CharField(max_length=50, blank=True, default="manual")
    provider_reference = models.CharField(max_length=120, blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.user.email}: {self.token_amount} tokens"


class PushDevice(models.Model):
    class Platform(models.TextChoices):
        ANDROID = "android", "Android"
        IOS = "ios", "iOS"
        WEB = "web", "Web"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey("User", on_delete=models.CASCADE, related_name="push_devices")
    expo_push_token = models.CharField(max_length=255, unique=True)
    platform = models.CharField(max_length=20, choices=Platform.choices)
    device_id = models.CharField(max_length=255, blank=True)
    app_version = models.CharField(max_length=50, blank=True)
    is_active = models.BooleanField(default=True)
    last_registered_at = models.DateTimeField(auto_now=True)
    last_sent_at = models.DateTimeField(null=True, blank=True)
    last_opened_at = models.DateTimeField(null=True, blank=True)
    last_error = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-last_registered_at", "-created_at"]

    def __str__(self):
        return f"{self.user.email}: {self.platform}"
