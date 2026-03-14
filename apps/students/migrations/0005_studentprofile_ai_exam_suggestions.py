from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("students", "0004_rename_grade_level_studentprofile_class_name"),
    ]

    operations = [
        migrations.AddField(
            model_name="studentprofile",
            name="ai_exam_suggestions",
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.AddField(
            model_name="studentprofile",
            name="ai_exam_suggestions_generated_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
