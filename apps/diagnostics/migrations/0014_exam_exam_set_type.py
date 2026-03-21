from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("diagnostics", "0013_weaktopicaireview"),
    ]

    operations = [
        migrations.AddField(
            model_name="exam",
            name="exam_set_type",
            field=models.CharField(
                choices=[
                    ("free", "Free exam set"),
                    ("registered", "Registered user mock test set"),
                ],
                default="free",
                max_length=20,
            ),
        ),
    ]
