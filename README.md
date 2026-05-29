# Harmony System Django

This repository is a clean redesign of the Laravel + Vue + Inertia Harmony Health prototype as a separated Django REST API and Next.js frontend.

## Stack

- Backend API: Django 5, Django REST Framework, SimpleJWT
- Frontend: Next.js, React, TypeScript
- Database: PostgreSQL
- Cache and queue: Redis, Celery, Celery Beat
- Containers: Docker Compose

## Migrated modules

- Staff users with `admin`, `clinician`, and `receptionist` roles
- Patient master records with generated `PAT-YYYY-000001` codes
- Patient profiles for semi-stable clinical history
- Confidential patient condition records with yes/no flags
- Visits and vitals
- Glucose food type capture in vitals
- Follow-up evaluations
- Audit logs
- Dashboard stats endpoint
- Patient import webhook compatible with the previous n8n-style flow

## Local development

Copy the example environment file:

```bash
cp .env.example .env
```

Run the stack:

```bash
docker compose up --build
```

Open:

- Frontend: http://localhost:3000
- API: http://localhost:8000/api/
- Admin: http://localhost:8000/admin/

Create a Django superuser:

```bash
docker compose exec backend python manage.py createsuperuser
```

## Manual backend run

```bash
cd backend
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

## Manual frontend run

```bash
cd frontend
npm install
npm run dev
```

## API highlights

- `POST /api/auth/token/`
- `POST /api/auth/token/refresh/`
- `GET /api/dashboard/stats/`
- `GET /api/patients/`
- `POST /api/patients/`
- `GET /api/visits/`
- `POST /api/patients/{id}/visits/`
- `GET /api/audit-logs/`
- `POST /api/webhooks/patient-import/`

Authenticated API requests use JWT bearer tokens. The webhook uses the `X-Harmony-Secret` header.
