import os
import uuid
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.utils import timezone
from clinic.models import Patient, Visit, Case

User = get_user_model()

class Command(BaseCommand):
    help = "Seeds local database with mock Patients, Visits, and Cases for development."

    def handle(self, *args, **options):
        self.stdout.write(self.style.WARNING("Starting database seed..."))

        # 1. Create clinical users if they do not exist
        admin_user, created = User.objects.get_or_create(
            username="admin",
            defaults={
                "email": "admin@harmonyhealthsz.com",
                "role": "admin",
                "is_staff": True,
                "is_superuser": True,
            }
        )
        if created:
            admin_user.set_password("admin123")
            admin_user.save()
            self.stdout.write(self.style.SUCCESS("Created admin user (username: admin, password: admin123)"))
        else:
            self.stdout.write(self.style.SUCCESS("Admin user already exists"))

        clinician_user, created = User.objects.get_or_create(
            username="clinician",
            defaults={
                "email": "clinician@harmonyhealthsz.com",
                "role": "clinician",
                "is_staff": True,
            }
        )
        if created:
            clinician_user.set_password("clinician123")
            clinician_user.save()
            self.stdout.write(self.style.SUCCESS("Created clinician user (username: clinician, password: clinician123)"))
        else:
            self.stdout.write(self.style.SUCCESS("Clinician user already exists"))

        # 2. Seed Patient 1 (Thabo Dlamini)
        p1, created = Patient.objects.get_or_create(
            first_name="Thabo",
            last_name="Dlamini",
            defaults={
                "email": "thabo@gmail.com",
                "primary_phone": "+26876123456",
                "gender": "male",
                "date_of_birth": "1992-05-15",
                "town_or_locality": "Manzini",
                "region": "Manzini",
                "status": "active",
                "consent_status": "verified",
                "created_by": clinician_user,
            }
        )
        if created:
            self.stdout.write(self.style.SUCCESS(f"Created Patient: {p1.full_name_display}"))
        else:
            self.stdout.write(self.style.SUCCESS(f"Patient {p1.full_name_display} already exists"))

        # Seed Visit for Patient 1
        v1, created = Visit.objects.get_or_create(
            patient=p1,
            visit_date=timezone.now().date(),
            defaults={
                "visit_type": "new_consultation",
                "main_complaint": "Severe pressure around temples",
                "practitioner": clinician_user,
            }
        )
        if created:
            self.stdout.write(self.style.SUCCESS(f"Created Visit for {p1.full_name_display}"))
        else:
            self.stdout.write(self.style.SUCCESS(f"Visit already exists"))

        # Seed Open Case for Patient 1
        c1, created = Case.objects.get_or_create(
            patient=p1,
            visit=v1,
            title="Chronic Tension Headache",
            defaults={
                "main_complaint": "Frequent, severe pressure around the temples and forehead, worse in the afternoon",
                "physical_examination": "Tension in neck and shoulder muscles, normal cranial nerve exam",
                "diagnosis": "Tension headache secondary to neck muscular hypertonicity and stress",
                "remedy": "Neck muscle releases, magnesium glycinate supplement, stress management",
                "status": "open",
                "practitioner": clinician_user,
            }
        )
        if created:
            self.stdout.write(self.style.SUCCESS(f"Created Open Case: '{c1.title}' for {p1.full_name_display}"))
        else:
            self.stdout.write(self.style.SUCCESS(f"Case '{c1.title}' already exists"))

        # 3. Seed Patient 2 (Sarah Nxumalo)
        p2, created = Patient.objects.get_or_create(
            first_name="Sarah",
            last_name="Nxumalo",
            defaults={
                "email": "sarah@gmail.com",
                "primary_phone": "+26878987654",
                "gender": "female",
                "date_of_birth": "1988-11-20",
                "town_or_locality": "Mbabane",
                "region": "Hhohho",
                "status": "active",
                "consent_status": "verified",
                "created_by": clinician_user,
            }
        )
        if created:
            self.stdout.write(self.style.SUCCESS(f"Created Patient: {p2.full_name_display}"))
        else:
            self.stdout.write(self.style.SUCCESS(f"Patient {p2.full_name_display} already exists"))

        # Seed Visit for Patient 2
        v2, created = Visit.objects.get_or_create(
            patient=p2,
            visit_date=timezone.now().date(),
            defaults={
                "visit_type": "new_consultation",
                "main_complaint": "Burning chest/stomach pain",
                "practitioner": clinician_user,
            }
        )
        if created:
            self.stdout.write(self.style.SUCCESS(f"Created Visit for {p2.full_name_display}"))
        else:
            self.stdout.write(self.style.SUCCESS(f"Visit already exists"))

        # Seed Resolved Case for Patient 2
        c2, created = Case.objects.get_or_create(
            patient=p2,
            visit=v2,
            title="Mild Gastritis",
            defaults={
                "main_complaint": "Burning sensation in upper abdomen after meals",
                "physical_examination": "Mild epigastric tenderness to palpation",
                "diagnosis": "Acute gastritis likely diet-induced",
                "remedy": "Avoid spicy foods, chamomile tea, standard antacid as needed",
                "status": "resolved",
                "resolved_at": timezone.now(),
                "practitioner": clinician_user,
            }
        )
        if created:
            self.stdout.write(self.style.SUCCESS(f"Created Resolved Case: '{c2.title}' for {p2.full_name_display}"))
        else:
            self.stdout.write(self.style.SUCCESS(f"Case '{c2.title}' already exists"))

        self.stdout.write(self.style.SUCCESS("Database seeding completed successfully!"))
