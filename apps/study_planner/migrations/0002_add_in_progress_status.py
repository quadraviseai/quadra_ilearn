from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("study_planner", "0001_initial"),
    ]

    operations = [
        migrations.AlterField(
            model_name="studyplantask",
            name="status",
            field=models.CharField(
                choices=[
                    ("pending", "Pending"),
                    ("in_progress", "In Progress"),
                    ("done", "Done"),
                    ("skipped", "Skipped"),
                ],
                default="pending",
                max_length=20,
            ),
        ),
    ]
