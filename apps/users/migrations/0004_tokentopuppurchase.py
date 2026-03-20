import uuid

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("users", "0003_tokensettings_user_referral_code_user_referred_by_and_more"),
    ]

    operations = [
        migrations.CreateModel(
            name="TokenTopUpPurchase",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("token_amount", models.PositiveIntegerField()),
                ("amount", models.DecimalField(decimal_places=2, max_digits=8)),
                ("status", models.CharField(choices=[("success", "Success"), ("failed", "Failed"), ("pending", "Pending")], default="success", max_length=20)),
                ("provider", models.CharField(blank=True, default="manual", max_length=50)),
                ("provider_reference", models.CharField(blank=True, max_length=120)),
                ("metadata", models.JSONField(blank=True, default=dict)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("user", models.ForeignKey(on_delete=models.CASCADE, related_name="token_topup_purchases", to="users.user")),
            ],
            options={
                "ordering": ["-created_at"],
            },
        ),
    ]
