from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("students", "0003_remove_studentprofile_target_exam_and_more"),
    ]

    operations = [
        migrations.RenameField(
            model_name="studentprofile",
            old_name="grade_level",
            new_name="class_name",
        ),
    ]
