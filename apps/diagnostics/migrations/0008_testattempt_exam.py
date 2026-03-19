from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("diagnostics", "0007_chapter_and_concept_chapter"),
    ]

    operations = [
        migrations.AddField(
            model_name="testattempt",
            name="exam",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="test_attempts",
                to="diagnostics.exam",
            ),
        ),
    ]
