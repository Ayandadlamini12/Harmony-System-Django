from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("clinic", "0002_elevatedaccessrequest"),
    ]

    operations = [
        migrations.AddField(
            model_name="patientcondition",
            name="is_confidential",
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name="patientcondition",
            name="present",
            field=models.BooleanField(default=True),
        ),
        migrations.AlterModelOptions(
            name="patientcondition",
            options={"ordering": ("condition_label",)},
        ),
        migrations.AddConstraint(
            model_name="patientcondition",
            constraint=models.UniqueConstraint(
                fields=("patient", "condition_code"),
                name="unique_patient_condition_code",
            ),
        ),
    ]
