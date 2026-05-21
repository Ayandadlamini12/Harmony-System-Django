from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("clinic", "0003_patientcondition_confidential_flags"),
    ]

    operations = [
        migrations.AddField(
            model_name="vital",
            name="glucose_food_type",
            field=models.CharField(blank=True, max_length=180),
        ),
    ]
