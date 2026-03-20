from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):

    dependencies = [
        ("diagnostics", "0012_questiontemplate_richer_schema"),
    ]

    operations = [
        migrations.CreateModel(
            name="WeakTopicAIReview",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("content", models.JSONField(blank=True, default=dict)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("attempt", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="weak_topic_ai_reviews", to="diagnostics.testattempt")),
                ("concept", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="attempt_ai_reviews", to="diagnostics.concept")),
            ],
            options={"ordering": ["-updated_at"]},
        ),
        migrations.AddConstraint(
            model_name="weaktopicaireview",
            constraint=models.UniqueConstraint(fields=("attempt", "concept"), name="unique_weak_topic_ai_review_per_attempt"),
        ),
    ]
