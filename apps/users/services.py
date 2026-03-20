import json
from urllib import error, request

from django.conf import settings
from django.contrib.auth import get_user_model
from django.db import transaction
from django.utils import timezone

from apps.users.models import PushDevice, TokenSettings, TokenTopUpPurchase, TokenTransaction


User = get_user_model()


TOKEN_TOP_UP_PACKS = (
    {"id": "starter", "tokens": 250, "amount": 49},
    {"id": "standard", "tokens": 600, "amount": 99},
    {"id": "power", "tokens": 1500, "amount": 199},
)


class TokenError(Exception):
    pass


class PushNotificationError(Exception):
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


@transaction.atomic
def register_push_device(user, expo_push_token, platform, *, device_id="", app_version=""):
    normalized_token = str(expo_push_token or "").strip()
    if not normalized_token:
        raise PushNotificationError("Push token is required.")

    PushDevice.objects.exclude(user=user).filter(expo_push_token=normalized_token).delete()
    device, _created = PushDevice.objects.update_or_create(
        expo_push_token=normalized_token,
        defaults={
            "user": user,
            "platform": platform,
            "device_id": device_id or "",
            "app_version": app_version or "",
            "is_active": True,
            "last_error": "",
        },
    )
    return device


def mark_push_opened(expo_push_token):
    PushDevice.objects.filter(expo_push_token=str(expo_push_token or "").strip()).update(last_opened_at=timezone.now())


def send_expo_push_notification(devices, *, title, body, data=None):
    active_devices = [device for device in devices if device.is_active and device.expo_push_token]
    if not active_devices:
        return []

    headers = {
        "Content-Type": "application/json",
        "Accept": "application/json",
    }
    if settings.EXPO_PUSH_ACCESS_TOKEN:
        headers["Authorization"] = f"Bearer {settings.EXPO_PUSH_ACCESS_TOKEN}"

    payload = [
        {
            "to": device.expo_push_token,
            "title": title,
            "body": body,
            "data": data or {},
            "sound": "default",
            "channelId": "default",
        }
        for device in active_devices
    ]
    req = request.Request(
        settings.EXPO_PUSH_API_URL,
        data=json.dumps(payload).encode("utf-8"),
        headers=headers,
        method="POST",
    )

    try:
        with request.urlopen(req, timeout=10) as response:
            raw_payload = response.read().decode("utf-8")
            parsed = json.loads(raw_payload or "{}")
    except error.HTTPError as exc:
        message = exc.read().decode("utf-8", errors="ignore") or str(exc)
        raise PushNotificationError(message) from exc
    except error.URLError as exc:
        raise PushNotificationError(str(exc)) from exc

    tickets = parsed.get("data", [])
    now = timezone.now()
    for index, device in enumerate(active_devices):
        ticket = tickets[index] if index < len(tickets) else {}
        status = ticket.get("status")
        details = ticket.get("details") or {}
        if status == "ok":
            PushDevice.objects.filter(pk=device.pk).update(last_sent_at=now, last_error="")
        else:
            message = details.get("error") or ticket.get("message") or "Push delivery failed."
            updates = {"last_error": message}
            if message == "DeviceNotRegistered":
                updates["is_active"] = False
            PushDevice.objects.filter(pk=device.pk).update(**updates)
    return tickets
