from django.contrib.auth import get_user_model
from django.db import transaction
from django.utils import timezone

from apps.users.models import TokenSettings, TokenTopUpPurchase, TokenTransaction


User = get_user_model()


TOKEN_TOP_UP_PACKS = (
    {"id": "starter", "tokens": 250, "amount": 49},
    {"id": "standard", "tokens": 600, "amount": 99},
    {"id": "power", "tokens": 1500, "amount": 199},
)


class TokenError(Exception):
    pass


def get_token_settings():
    settings, _created = TokenSettings.objects.get_or_create(pk=1)
    return settings


def serialize_token_settings(settings=None):
    active_settings = settings or get_token_settings()
    return {
        "initial_login_bonus": active_settings.initial_login_bonus,
        "referral_bonus": active_settings.referral_bonus,
        "weak_topic_unlock_cost": active_settings.weak_topic_unlock_cost,
        "timer_reset_cost": active_settings.timer_reset_cost,
    }


def get_token_top_up_packs():
    return [dict(pack) for pack in TOKEN_TOP_UP_PACKS]


@transaction.atomic
def adjust_user_tokens(user, amount, transaction_type, *, note="", metadata=None, created_by=None):
    locked_user = User.objects.select_for_update().get(pk=user.pk)
    next_balance = locked_user.token_balance + amount
    if next_balance < 0:
        raise TokenError("Insufficient tokens.")

    locked_user.token_balance = next_balance
    locked_user.save(update_fields=["token_balance", "updated_at"])
    TokenTransaction.objects.create(
        user=locked_user,
        transaction_type=transaction_type,
        amount=amount,
        balance_after=next_balance,
        note=note,
        metadata=metadata or {},
        created_by=created_by,
    )
    locked_user.refresh_from_db()
    return locked_user


def grant_welcome_tokens_if_eligible(user):
    settings = get_token_settings()
    if settings.initial_login_bonus <= 0 or user.welcome_tokens_granted_at:
        return user

    with transaction.atomic():
        locked_user = User.objects.select_for_update().get(pk=user.pk)
        if locked_user.welcome_tokens_granted_at:
            return locked_user

        now = timezone.now()
        locked_user.token_balance += settings.initial_login_bonus
        locked_user.welcome_tokens_granted_at = now
        locked_user.save(update_fields=["token_balance", "welcome_tokens_granted_at", "updated_at"])
        TokenTransaction.objects.create(
            user=locked_user,
            transaction_type=TokenTransaction.TransactionType.WELCOME_BONUS,
            amount=settings.initial_login_bonus,
            balance_after=locked_user.token_balance,
            note="Welcome token bonus",
            metadata={"source": "signup_or_first_login"},
        )
        locked_user.refresh_from_db()
        return locked_user


def apply_referral_bonus(new_user, referral_code):
    normalized_code = str(referral_code or "").strip().upper()
    if not normalized_code:
        return new_user
    if new_user.referred_by_id:
        raise TokenError("Referral code has already been applied.")

    referrer = User.objects.filter(referral_code=normalized_code).exclude(pk=new_user.pk).first()
    if not referrer:
        raise TokenError("Invalid referral code.")

    settings = get_token_settings()
    with transaction.atomic():
        locked_new_user = User.objects.select_for_update().get(pk=new_user.pk)
        if locked_new_user.referred_by_id:
            raise TokenError("Referral code has already been applied.")

        locked_referrer = User.objects.select_for_update().get(pk=referrer.pk)
        locked_new_user.referred_by = locked_referrer
        locked_new_user.save(update_fields=["referred_by", "updated_at"])

        if settings.referral_bonus > 0:
            locked_referrer.token_balance += settings.referral_bonus
            locked_referrer.save(update_fields=["token_balance", "updated_at"])
            TokenTransaction.objects.create(
                user=locked_referrer,
                transaction_type=TokenTransaction.TransactionType.REFERRAL_BONUS,
                amount=settings.referral_bonus,
                balance_after=locked_referrer.token_balance,
                note=f"Referral bonus for inviting {locked_new_user.email}",
                metadata={
                    "referred_user_id": str(locked_new_user.id),
                    "referred_user_email": locked_new_user.email,
                },
            )

        locked_new_user.refresh_from_db()
        return locked_new_user


def spend_tokens(user, amount, transaction_type, *, note="", metadata=None):
    token_cost = int(amount or 0)
    if token_cost <= 0:
        return user
    return adjust_user_tokens(
        user,
        -token_cost,
        transaction_type,
        note=note,
        metadata=metadata,
    )


def credit_tokens_by_admin(user, amount, admin_user, note=""):
    adjustment = int(amount or 0)
    if adjustment == 0:
        return user
    return adjust_user_tokens(
        user,
        adjustment,
        TokenTransaction.TransactionType.ADMIN_ADJUSTMENT,
        note=note or "Admin token adjustment",
        metadata={"admin_user_id": str(admin_user.id)},
        created_by=admin_user,
    )


@transaction.atomic
def purchase_token_pack(user, pack_id, *, provider="manual", provider_reference=""):
    selected_pack = next((pack for pack in TOKEN_TOP_UP_PACKS if pack["id"] == str(pack_id or "").strip()), None)
    if not selected_pack:
        raise TokenError("Selected token pack is not available.")

    purchase = TokenTopUpPurchase.objects.create(
        user=user,
        token_amount=selected_pack["tokens"],
        amount=selected_pack["amount"],
        status=TokenTopUpPurchase.Status.SUCCESS,
        provider=provider or "manual",
        provider_reference=provider_reference,
        metadata={"pack_id": selected_pack["id"]},
    )
    updated_user = adjust_user_tokens(
        user,
        selected_pack["tokens"],
        TokenTransaction.TransactionType.TOKEN_TOPUP,
        note=f"Token top-up: {selected_pack['tokens']} tokens",
        metadata={
            "purchase_id": str(purchase.id),
            "pack_id": selected_pack["id"],
            "amount": str(selected_pack["amount"]),
            "provider": purchase.provider,
        },
    )
    purchase.metadata = {
        **purchase.metadata,
        "balance_after": updated_user.token_balance,
    }
    purchase.save(update_fields=["metadata"])
    return purchase, updated_user
