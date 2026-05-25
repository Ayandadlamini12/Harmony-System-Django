import uuid

from django.db import migrations, models


def populate_public_ids(apps, schema_editor):
    Patient = apps.get_model("clinic", "Patient")
    for patient in Patient.objects.filter(public_id__isnull=True):
        patient.public_id = uuid.uuid4()
        patient.save(update_fields=["public_id"])


class Migration(migrations.Migration):
    dependencies = [
        ("clinic", "0011_appointment_patientjourney_appointment_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="patient",
            name="public_id",
            field=models.UUIDField(default=uuid.uuid4, editable=False, null=True),
        ),
        migrations.RunPython(populate_public_ids, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="patient",
            name="public_id",
            field=models.UUIDField(default=uuid.uuid4, editable=False, unique=True),
        ),
        migrations.AddIndex(
            model_name="patient",
            index=models.Index(fields=["public_id"], name="clinic_pati_public__3b8d94_idx"),
        ),
    ]
