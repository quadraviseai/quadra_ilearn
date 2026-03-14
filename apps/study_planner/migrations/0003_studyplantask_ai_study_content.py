from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("study_planner", "0002_add_in_progress_status"),
    ]

    operations = [
        migrations.AddField(
            model_name="studyplantask",
            name="ai_study_content",
            field=models.JSONField(blank=True, default=dict),
        ),
        migrations.AddField(
            model_name="studyplantask",
            name="ai_study_content_generated_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
