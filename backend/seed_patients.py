import os
import django
from datetime import date, timedelta
from random import choice, randint

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from clinic.models import Patient, PatientProfile, Visit, Case, Vital

def run_seeder(delete_first=False):
    # Clear existing patients
    if delete_first:
        print("Deleting existing patients...")
        Patient.objects.all().delete()
        print("Deleted all patients.")

    # Seed 3 patients with proper profile, visit, case, and vital
    patients_data = [
        {
            "full_name_display": "Wandile Dlamini",
            "first_name": "Wandile",
            "last_name": "Dlamini",
            "gender": "male",
            "date_of_birth": date.today() - timedelta(days=365 * 30),
            "primary_phone": "+26876543210",
            "region": "manzini",
            "status": "active"
        },
        {
            "full_name_display": "Sipho Magagula",
            "first_name": "Sipho",
            "last_name": "Magagula",
            "gender": "male",
            "date_of_birth": date.today() - timedelta(days=365 * 45),
            "primary_phone": "+26878901234",
            "region": "hoho",
            "status": "active"
        },
        {
            "full_name_display": "Tengetile Mamba",
            "first_name": "Tengetile",
            "last_name": "Mamba",
            "gender": "female",
            "date_of_birth": date.today() - timedelta(days=365 * 25),
            "primary_phone": "+26876123456",
            "region": "shiselweni",
            "status": "active"
        }
    ]

    for p_data in patients_data:
        patient = Patient.objects.create(**p_data)
        
        # Profile
        PatientProfile.objects.create(
            patient=patient,
            past_medical_history="None",
            family_medical_history="Diabetes",
            allopathic_medication="None",
            other_important_information="Patient prefers evening appointments.",
            children_count=randint(0, 3)
        )

        # Visit
        visit = Visit.objects.create(
            patient=patient,
            visit_date=date.today(),
            visit_type="first_consultation",
            main_complaint="Headache and fever",
            physical_examination="Patient looks pale",
            diagnosis="Viral Fever",
            remedy="Rest and hydration"
        )

        # Case
        Case.objects.create(
            patient=patient,
            visit=visit,
            title=f"Viral Fever - {patient.first_name}",
            main_complaint="Headache and fever",
            diagnosis="Viral Fever",
            status="open"
        )

        # Vitals
        Vital.objects.create(
            visit=visit,
            bp_first_reading=choice(["120/80", "130/85", "140/90"]),
            pulse=randint(60, 100),
            temperature=choice(["36.5", "37.0", "38.5"]),
            weight=choice(["70.5", "85.0", "60.0"])
        )
        
        print(f"Created patient {patient.full_name_display} and related records.")

if __name__ == "__main__":
    run_seeder(delete_first=True)
