from django.db import migrations


def migrate_visit_data_to_cases(apps, schema_editor):
    Visit = apps.get_model("clinic", "Visit")
    Case = apps.get_model("clinic", "Case")
    FollowUpEvaluation = apps.get_model("clinic", "FollowUpEvaluation")

    for visit in Visit.objects.all().iterator():
        if Case.objects.filter(visit=visit).exists():
            continue
        has_clinical_data = any([
            visit.main_complaint,
            visit.diagnosis,
            visit.remedy,
            visit.physical_examination,
            visit.dietary_recommendation,
            visit.lifestyle_recommendation,
            visit.reason_for_remedy,
        ])
        if not has_clinical_data:
            continue

        title = f"Consultation - {visit.visit_date}"
        if visit.main_complaint:
            title = visit.main_complaint[:80]
            if len(visit.main_complaint) > 80:
                title = title[:77] + "..."

        case_kwargs = {
            "patient": visit.patient,
            "visit": visit,
            "title": title,
            "main_complaint": visit.main_complaint or "",
            "physical_examination": visit.physical_examination or "",
            "diagnosis": visit.diagnosis or "",
            "remedy": visit.remedy or "",
            "reason_for_remedy": visit.reason_for_remedy or "",
            "dietary_recommendation": visit.dietary_recommendation or "",
            "lifestyle_recommendation": visit.lifestyle_recommendation or "",
            "practitioner": visit.practitioner,
            "status": "resolved",
            "resolved_at": visit.created_at,
        }

        try:
            fup = FollowUpEvaluation.objects.get(visit=visit)
            case_kwargs.update({
                "previous_consult_symptoms": fup.previous_consult_symptoms or "",
                "dietary_changes": fup.dietary_changes or "",
                "lifestyle_changes": fup.lifestyle_changes or "",
                "exercise_notes": fup.exercise_notes or "",
                "energy_notes": fup.energy_notes or "",
                "evaluation_notes": fup.evaluation_notes or "",
            })
        except FollowUpEvaluation.DoesNotExist:
            pass

        Case.objects.create(**case_kwargs)


class Migration(migrations.Migration):

    dependencies = [
        ("clinic", "0014_alter_visit_main_complaint_case"),
    ]

    operations = [
        migrations.RunPython(migrate_visit_data_to_cases, migrations.RunPython.noop),
    ]
