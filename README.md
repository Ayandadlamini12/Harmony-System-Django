# Harmony Health MIS

Harmony Health MIS is the Django REST API + Next.js redesign of the former Laravel + Vue + Inertia Harmony Health prototype. It is being built as a clinic operating system for Harmony Health and Wellness.

## Current Stack

- Backend: Django 5, Django REST Framework, SimpleJWT, Keycloak integration
- Frontend: Next.js 15 App Router, React 19, TypeScript
- UI: Tailwind CSS 4, Radix UI primitives, lucide-react, shared Harmony components
- Forms: React Hook Form, Zod, staged/custom workflow forms
- Database: PostgreSQL in production, SQLite supported for local development
- Queue/cache: Redis, Celery, Celery Beat
- Email: Brevo through django-anymail, SMTP fallback settings
- Documents: WeasyPrint, ReportLab, Pillow, qrcode, signature_pad
- Containers: Docker and Portainer
- Public access: Cloudflare Tunnel

## Main Implemented Areas

- Role-based dashboards for admin, clinician, and receptionist workflows
- Patient registration with Harmony patient number generation
- National / Passport ID support for alphanumeric IDs
- Phone country-code driven region/locality selection
- Next of kin details
- Patient soft-delete and admin restore
- Consent form generation, document storage, and signature workflow foundation
- Check-in desk and tablet self check-in
- Appointment records and appointment check-in routing
- Patient journey/process tracking
- Medical/family history and confidential condition records
- Vitals linked to visits, including glucose food type
- Visit forms with staged clinical sections and draft/autosave work
- Symptom/problem tracking for follow-up continuity
- Elevated access approval for protected records
- Role module permission matrix
- User/profile/account management foundation
- Clinician resume/profile completion tracking
- Employee enrollment request review
- System email settings and email delivery logs
- Internal messaging foundation
- Support tickets
- Audit logs
- n8n-compatible employee onboarding and patient import workflow endpoints

## Important Documentation

- [System documentation](SYSTEM_DOCUMENTATION.md)
- [Future workflows roadmap](docs/future-workflows-roadmap.md)
- [Patient workflow notes](docs/patient-workflow-2026-05-24.md)
- [Keycloak rollout notes](docs/keycloak-login-rollout-2026-06-02.md)
- [n8n employee onboarding](docs/n8n-employee-onboarding.md)
- [UI loading system](docs/ui-loading-system-2026-05-24.md)

## Local Development

Backend:

```bash
cd backend
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver 127.0.0.1:8000
```

Frontend:

```bash
cd frontend
npm install
npm run dev -- -H 0.0.0.0 -p 3000
```

Open:

- Frontend: http://localhost:3000
- API: http://127.0.0.1:8000/api/
- Django admin: http://127.0.0.1:8000/admin/

Full local stack:

```bash
docker compose up --build
```

## Production Deployment Note

The live system has used a faster deployment flow that can differ from the original Portainer stack definition. Before deploying, verify the current running containers and do not blindly trigger Portainer "Redeploy stack" unless the compose definition is confirmed to match production.

Recommended direction:

- GitHub remains the source of truth.
- Backend/frontend image builds should be repeatable and versioned.
- Frontend-only changes can use the targeted rebuild/hot-swap method if still active.
- Backend changes must include migration and health checks.

## Workflow Rules To Keep

- Harmony remains the source of truth for patient records, visits, documents, drafts, and audit logs.
- n8n is a workflow helper only; it should call Harmony APIs and must not write directly to the database.
- AI/OCR extracted patient data must be saved as drafts for human review.
- Confidential records require clinician/admin access or an approved elevated access workflow.
- Vitals and clinical records should not be recorded before consent is signed.
- Audit logging should be expanded consistently for all create/update/delete actions.

