# Harmony Health System — Complete Documentation

> **Version:** 1.0.0.0  
> **Developed By:** FMT Digital Agency  
> **Copyright:** © 2026 Harmony Health Eswatini. All Rights Reserved.

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Architecture](#2-architecture)
3. [Technology Stack](#3-technology-stack)
4. [Project Structure](#4-project-structure)
5. [Backend Modules](#5-backend-modules)
6. [Frontend Pages](#6-frontend-pages)
7. [Database Schema](#7-database-schema)
8. [API Reference](#8-api-reference)
9. [Authentication & Roles](#9-authentication--roles)
10. [Deployment Configuration](#10-deployment-configuration)
11. [Hosting Infrastructure](#11-hosting-infrastructure)
12. [Update & Deployment Procedures](#12-update--deployment-procedures)
13. [Current Status & Remaining Modules](#13-current-status--remaining-modules)
14. [Getting Started for New Developers](#14-getting-started-for-new-developers)
15. [Troubleshooting](#15-troubleshooting)

---

## 1. System Overview

Harmony Health System is a clinic management platform for **Harmony Health & Wellness** in Eswatini. It provides:

- **Patient management** — registration, demographics, clinical profiles
- **Visit tracking** — consultations, vitals, diagnosis, remedies, follow-ups
- **Role-based access control** — admin, clinician, receptionist roles with elevated access workflow
- **Audit logging** — full trail of all data changes
- **Cloudflare tunnel** — zero-trust network access, no public ports exposed

The system was migrated from a legacy Laravel application to a modern Django + Next.js stack with containerized deployment via Portainer.

---

## 2. Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Cloudflare Tunnel                        │
│              (mis.harmonyhealthsz.com)                      │
└──────────────────┬──────────────────────────────────────────┘
                   │ HTTPS
                   ▼
┌─────────────────────────────────────────────────────────────┐
│                   Portainer Host (ARM64)                    │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │  Frontend   │  │   Backend   │  │    Cloudflared      │  │
│  │  Next.js    │◄─┤  Django     │  │   (Tunnel Agent)    │  │
│  │  :3000      │  │  Gunicorn   │  │                     │  │
│  └──────┬──────┘  │  :8000      │  ─────────────────────┘  │
│         │         └──────┬──────┘                            │
│         │                │                                   │
│  ┌──────▼──────┐  ┌──────▼──────┐  ┌─────────────────────┐  │
│  │   Celery    │  │  PostgreSQL │  │       Redis         │  │
│  │   Worker    │  │  :5432      │  │       :6379         │  │
│  └─────────────┘  └─────────────┘  └─────────────────────  │
│                                                             │
│  ─────────────┐                                            │
│  │  Celery     │                                            │
│  │  Beat       │                                            │
│  └─────────────┘                                            │
└─────────────────────────────────────────────────────────────┘
```

### Network Topology
- All containers communicate over a Docker bridge network (`harmony-net`)
- **No public ports** are exposed — all external access goes through Cloudflare Tunnel
- Non-standard internal ports avoid conflicts with CyberPanel (PostgreSQL `54321`, Redis `63791`, Frontend `30001`)

---

## 3. Technology Stack

### Backend
| Component | Version | Purpose |
|---|---|---|
| Python | 3.13 | Runtime |
| Django | 5.2.6 | Web framework |
| Django REST Framework | 3.16.1 | API framework |
| SimpleJWT | 5.5.1 | JWT authentication |
| Celery | 5.5.3 | Async task queue |
| PostgreSQL | 16/17 | Relational database |
| Redis | 7 | Cache + message broker |
| Gunicorn | 23.0.0 | WSGI server |
| Whitenoise | 6.9.0 | Static file serving |

### Frontend
| Component | Version | Purpose |
|---|---|---|
| Next.js | 15.5.x | React framework (App Router) |
| React | 19.1.x | UI library |
| TypeScript | 5.9.x | Type safety |
| Tailwind CSS | 4.1.x | Styling |
| Radix UI | Various | Headless UI primitives |
| React Hook Form | 7.62.x | Form handling |
| Zod | 4.1.x | Schema validation |

### Infrastructure
| Component | Version | Purpose |
|---|---|---|
| Docker | 29.x | Container runtime |
| Portainer | 2.39.2 | Container management UI |
| Cloudflare Tunnel | latest | Zero-trust network access |
| Ubuntu | 22.04.5 LTS | Host OS (aarch64/ARM64) |

---

## 4. Project Structure

```
Harmony-System-Django/
├── backend/                    # Django REST API
│   ├── accounts/               # User auth & management
│   │   ├── models.py           # Custom User model with roles
│   │   ├── views.py            # User CRUD, register, change-password
│   │   ├── serializers.py      # User, Register, ChangePassword serializers
│   │   ├── urls.py             # /api/users/, /api/auth/register/, /api/auth/change-password/
│   │   └── admin.py            # Django admin registration
│   ├── clinic/                 # Clinical domain
│   │   ├── models.py           # Patient, Visit, Vital, AuditLog, etc.
│   │   ├── views.py            # Patient, Visit, AccessRequest viewsets
│   │   ├── serializers.py      # All clinic serializers
│   │   ├── urls.py             # /api/patients/, /api/visits/, etc.
│   │   ├── access.py           # Role-based access helpers
│   │   ├── permissions.py      # DRF permission classes
│   │   └── admin.py            # Django admin for clinic models
│   ├── config/                 # Django project settings
│   │   ├── settings.py         # Django configuration
│   │   ├── urls.py             # Root URL routing
│   │   ├── wsgi.py             # WSGI entry point
│   │   └── celery.py           # Celery app configuration
│   ├── requirements.txt        # Python dependencies
│   ├── Dockerfile              # Backend container image
│   └── manage.py               # Django CLI
├── frontend/                   # Next.js frontend
│   ├── src/
│   │   ├── app/                # App Router pages
│   │   │   ├── api/auth/       # Auth route handlers (login, logout, register, change-password)
│   │   │   ├── patients/       # Patient pages (list, new, detail, edit)
│   │   │   ├── visits/         # Visit pages
│   │   │   ├── users/          # User management (admin only)
│   │   │   ├── account/        # Profile + password change
│   │   │   ├── access-requests/ # Elevated access requests
│   │   │   └── ...             # Other pages
│   │   ├── components/         # Shared UI (AppShell, Footer, Button, etc.)
│   │   ├── lib/                # API client, session, role utilities
│   │   └── types/              # TypeScript type definitions
│   ├── package.json            # Node dependencies
│   ├── Dockerfile              # Frontend container (multi-stage)
│   ── next.config.ts          # Next.js config (standalone output)
├── docker-compose.yml          # Local dev stack
├── docker-compose.prod.yml     # Production stack
├── remote-deployment-stack.yml # Portainer deployment compose
├── .env.example                # Environment variable template
── .env.remote.template        # Remote deployment template
└── README.md                   # Project README
```

---

## 5. Backend Modules

### 5.1 Accounts App

**User Model** (`accounts/models.py`)
- Extends Django's `AbstractUser`
- Custom fields: `role` (admin/clinician/receptionist), `is_active`
- Default role: `receptionist`

**Views:**
| View | URL | Permission | Description |
|---|---|---|---|
| `UserViewSet` | `/api/users/` | Admin only | Full CRUD for users |
| `UserViewSet.toggle_status` | `POST /api/users/{id}/toggle_status/` | Admin only | Activate/deactivate user |
| `UserViewSet.me` | `GET /api/users/me/` | Authenticated | Current user profile |
| `RegisterView` | `POST /api/auth/register/` | Public | Self-registration (creates receptionist) |
| `ChangePasswordView` | `POST /api/auth/change-password/` | Authenticated | Change own password |

### 5.2 Clinic App

**Models:**
| Model | Description |
|---|---|
| `Patient` | Master patient records with auto-generated codes (PAT-YYYY-000001) |
| `PatientProfile` | One-to-one clinical history (HIV status, medical history, medications) |
| `PatientCondition` | Patient conditions (active/historical/suspected) |
| `Visit` | Consultation records (complaints, diagnosis, remedy, recommendations) |
| `Vital` | One-to-one vitals per visit (BP, pulse, temp, weight, glucose) |
| `FollowUpEvaluation` | One-to-one follow-up notes per visit |
| `AuditLog` | Audit trail for all entity changes (who, what, when, IP) |
| `ElevatedAccessRequest` | Role-based access approval workflow |

**Views:**
| View | URL | Permission |
|---|---|---|
| `PatientViewSet` | `/api/patients/` | Authenticated |
| `PatientViewSet.visits` | `GET/POST /api/patients/{id}/visits/` | Authenticated + clinical access check |
| `VisitViewSet` | `/api/visits/` | Authenticated (filtered by access) |
| `AuditLogViewSet` | `/api/audit-logs/` | Authenticated (read-only) |
| `ElevatedAccessRequestViewSet` | `/api/access-requests/` | Authenticated |
| `ElevatedAccessRequestViewSet.approve` | `POST /api/access-requests/{id}/approve/` | Clinical user |
| `ElevatedAccessRequestViewSet.reject` | `POST /api/access-requests/{id}/reject/` | Clinical user |
| `dashboard_stats` | `GET /api/dashboard/stats/` | Authenticated |
| `patient_import_webhook` | `POST /api/webhooks/patient-import/` | AllowAny (X-Harmony-Secret header) |

### 5.3 Access Control (`clinic/access.py`)

```python
CLINICAL_ROLES = {"admin", "clinician"}

def is_clinical_user(user) -> bool:
    """Returns True for admin or clinician roles."""

def has_patient_clinical_access(user, patient_id) -> bool:
    """Clinical roles always have access. Non-clinical users need an
    approved, non-expired ElevatedAccessRequest for the specific patient."""
```

---

## 6. Frontend Pages

### Ready (Production)
| Route | Description | Role Access |
|---|---|---|
| `/` | Dashboard with stats, workspace cards, recent patients/visits | All roles |
| `/login` | Sign-in form | Public |
| `/register` | Self-registration form | Public |
| `/patients` | Patient directory with search | All roles |
| `/patients/new` | Multi-step patient registration | Admin, Receptionist |
| `/patients/[id]` | Patient detail with clinical access gating | All roles (gated) |
| `/patients/[id]/edit` | Edit patient demographics | Admin, Receptionist |
| `/patients/dashboard` | Patient management hub | All roles |
| `/visits` | Visit records list | Admin, Clinician |
| `/visits/new` | Add visit form | Admin, Clinician |
| `/users` | User management (list, edit, toggle status) | Admin only |
| `/account` | Profile display + password change | All roles |
| `/access-requests` | Request elevated access | Receptionist |
| `/approvals` | Approve/reject access requests | Admin, Clinician |
| `/messages` | Internal user messaging | Staff conversations with extensible patient, appointment, visit, case, and document references |

### Planned (Placeholder)
| Route | Status | Notes |
|---|---|---|
| `/waiting-list` | Placeholder | Shows recent visits; no real check-in backend |
| `/check-ins` | Placeholder | Shows all patients; no arrival status tracking |
| `/appointments` | Placeholder | No appointment booking model exists |
| `/reports` | Partial | Shows dashboard stats; export filters not implemented |
| `/inventory` | Placeholder | Cards for stock items, reorder alerts, stock movement |
| `/staff` | Static | Role description cards only |

---

## 7. Database Schema

### Entity Relationship Overview

```
User (accounts)
 ├── created_by ───► Patient
 ├── practitioner ──► Visit
 ├── requested_by ──► ElevatedAccessRequest
 ├── reviewed_by ───► ElevatedAccessRequest
 └── user ──────────► AuditLog

Patient (clinic)
 ├── profile ───────► PatientProfile (1:1)
 ├── conditions ────► PatientCondition (1:N)
 ├── visits ────────► Visit (1:N)
 └── access_requests ► ElevatedAccessRequest (1:N)

Visit (clinic)
 ├── vitals ────────► Vital (1:1)
 └── follow_up ─────► FollowUpEvaluation (1:1)
```

### Key Fields

**Patient:**
- `patient_code` — Auto-generated: `PAT-YYYY-NNNNNN`
- `national_id` — Optional national ID number
- `status` — Active/Inactive/Archived

**Visit:**
- `visit_type` — Consultation/Follow-up/Emergency
- `visit_date`, `visit_time` — When the visit occurred
- `main_complaint`, `diagnosis`, `remedy` — Clinical notes

**ElevatedAccessRequest:**
- `scope` — What data the user needs access to
- `status` — Pending/Approved/Rejected/Expired
- `expires_at` — When the access grant expires

---

## 8. API Reference

### Authentication
| Method | Path | Description |
|---|---|---|
| POST | `/api/auth/token/` | Login — returns access + refresh JWT |
| POST | `/api/auth/token/refresh/` | Refresh access token |
| POST | `/api/auth/register/` | Self-registration |
| POST | `/api/auth/change-password/` | Change own password |

### Users
| Method | Path | Description |
|---|---|---|
| GET | `/api/users/` | List all users (admin only) |
| POST | `/api/users/` | Create user (admin only) |
| GET | `/api/users/{id}/` | Get user detail (admin only) |
| PUT/PATCH | `/api/users/{id}/` | Update user (admin only) |
| DELETE | `/api/users/{id}/` | Delete user (admin only) |
| POST | `/api/users/{id}/toggle_status/` | Toggle active/inactive (admin only) |
| GET | `/api/users/me/` | Current user profile |

### Patients
| Method | Path | Description |
|---|---|---|
| GET | `/api/patients/` | List patients (searchable) |
| POST | `/api/patients/` | Create patient |
| GET | `/api/patients/{id}/` | Get patient detail |
| PUT/PATCH | `/api/patients/{id}/` | Update patient |
| DELETE | `/api/patients/{id}/` | Delete patient |
| GET | `/api/patients/{id}/visits/` | Get patient's visits |
| POST | `/api/patients/{id}/visits/` | Add visit for patient |

### Visits
| Method | Path | Description |
|---|---|---|
| GET | `/api/visits/` | List visits (filtered by access) |
| POST | `/api/visits/` | Create visit |
| GET/PUT/DELETE | `/api/visits/{id}/` | Visit CRUD |

### Access Requests
| Method | Path | Description |
|---|---|---|
| GET | `/api/access-requests/` | List access requests |
| POST | `/api/access-requests/` | Create access request |
| POST | `/api/access-requests/{id}/approve/` | Approve request (clinical user) |
| POST | `/api/access-requests/{id}/reject/` | Reject request (clinical user) |

### Other
| Method | Path | Description |
|---|---|---|
| GET | `/api/dashboard/stats/` | Dashboard statistics |
| GET | `/api/audit-logs/` | Audit trail (read-only) |
| POST | `/api/webhooks/patient-import/` | Patient import webhook (X-Harmony-Secret) |

---

## 9. Authentication & Roles

### JWT Configuration
- **Access token lifetime:** 30 minutes
- **Refresh token lifetime:** 7 days
- **Default permission:** `IsAuthenticated` on all API endpoints
- **Auth header:** `Authorization: Bearer <token>`

### Role System
| Role | Capabilities |
|---|---|
| **Admin** | Full access: user management, patient CRUD, visit CRUD, elevated access approval, audit logs, all frontend pages |
| **Clinician** | Clinical access: patient CRUD, visit CRUD, elevated access approval, dashboard, patient records, clinical records |
| **Receptionist** | Limited: patient registration/demographics, patient directory, dashboard. Needs elevated access approval for medical records. Cannot create visits. |

### Frontend Session
- JWT access token stored in `harmony_access` cookie (httpOnly, 30 min)
- Refresh token stored in `harmony_refresh` cookie (httpOnly, 7 days)
- Role stored in `harmony_role` cookie
- Name stored in `harmony_name` cookie
- Username stored in `harmony_username` cookie
- All cookies: `httpOnly`, `sameSite: "lax"`, `secure` flag configurable

### Elevated Access Workflow
1. Receptionist requests access to a specific patient's medical records
2. Clinician reviews and approves/rejects the request
3. If approved, access is granted until `expires_at` (default 4 hours)
4. `has_patient_clinical_access()` checks for approved, non-expired requests

---

## 10. Deployment Configuration

### Environment Variables

#### Required (Production)
| Variable | Description | Example |
|---|---|---|
| `DB_DATABASE` | PostgreSQL database name | `harmony` |
| `DB_USERNAME` | PostgreSQL user | `harmony` |
| `DB_PASSWORD` | PostgreSQL password | *(secure random)* |
| `DJANGO_SECRET_KEY` | Django secret key | *(secure random)* |
| `DJANGO_DEBUG` | Debug mode | `false` |
| `APP_URL` | Public domain | `https://mis.harmonyhealthsz.com` |
| `HARMONY_WEBHOOK_SECRET` | Webhook auth secret | *(secure random)* |
| `TUNNEL_TOKEN` | Cloudflare tunnel token | *(from Cloudflare dashboard)* |

#### Optional
| Variable | Default | Description |
|---|---|---|
| `POSTGRES_HOST` | `postgres` | Database host |
| `POSTGRES_PORT` | `5432` | Database port |
| `CELERY_BROKER_URL` | `redis://redis:6379/0` | Celery broker |
| `CELERY_RESULT_BACKEND` | `redis://redis:6379/1` | Celery result backend |
| `API_BASE_URL` | `http://backend:8000/api` | Frontend server-side API URL |
| `NEXT_PUBLIC_API_BASE_URL` | `${APP_URL}/api` | Frontend client-side API URL |
| `COOKIE_SECURE` | `true` | Secure cookie flag |

### Container Configuration

| Container | Image/Build | Internal Port | External Port | Restart |
|---|---|---|---|---|
| `harmony-django-db` | `postgres:16-alpine` | 5432 | 54321 | always |
| `harmony-django-redis` | `redis:7-alpine` | 6379 | 63791 | always |
| `harmony-django-backend` | `build: ./backend` | 8000 | — | always |
| `harmony-django-celery` | `build: ./backend` | — | — | always |
| `harmony-django-beat` | `build: ./backend` | — | — | always |
| `harmony-django-frontend` | `build: ./frontend` | 3000 | 30001 | always |
| `cloudflared-harmony-django` | `cloudflare/cloudflared:latest` | — | — | always |

### Volumes
- `postgres_django_data` — PostgreSQL data persistence

### Networks
- `harmony-net` — Docker bridge network (all containers)

---

## 11. Hosting Infrastructure

### Server Details
- **OS:** Ubuntu 22.04.5 LTS
- **Architecture:** aarch64 (ARM64)
- **Docker:** 29.x
- **Portainer:** 2.39.2
- **Control Panel:** CyberPanel (hosts other sites — do not disturb)

### Portainer
- **URL:** `https://portainer.fmtagency.online`
- **Endpoint ID:** `5` (local Docker socket)
- **Stack name:** `harmony`
- **Stack ID:** `69`
- **Deployment method:** Git repository (pulls from `master` branch)
- **Compose file:** `remote-deployment-stack.yml`

### Cloudflare Tunnel
- **Public hostname:** `mis.harmonyhealthsz.com`
- **Service:** `http://harmony-django-frontend:3000`
- **Configuration:** Managed via Cloudflare Zero Trust dashboard
- **Token:** Stored in `TUNNEL_TOKEN` environment variable

### Network Security
- **No public ports exposed** on the server
- All external traffic flows through Cloudflare Tunnel
- Internal services communicate over Docker bridge network
- PostgreSQL and Redis ports mapped to non-standard ports (54321, 63791) to avoid CyberPanel conflicts

---

## 12. Update & Deployment Procedures

### 12.1 Standard Deployment (Git-based)

The stack is configured to pull from the GitHub repository. To deploy updates:

1. **Push changes to GitHub:**
   ```bash
   git add .
   git commit -m "Your commit message"
   git push origin master
   ```

2. **Redeploy in Portainer:**
   - Go to **Portainer → Stacks → harmony**
   - Click **"Pull and redeploy"**
   - Enable **"Re-pull image and redeploy"** toggle if Docker images changed
   - Click **"Update"**
   - Wait 2-3 minutes for rebuild

### 12.2 What Gets Rebuilt

| Service | Rebuild Trigger |
|---|---|
| Backend | Any change in `backend/` directory |
| Frontend | Any change in `frontend/` directory |
| PostgreSQL | Never (data persists in volume) |
| Redis | Never |
| Celery/Celery Beat | With backend (same build context) |
| Cloudflared | Only if image tag changes |

### 12.3 Manual Redeploy via API

If Portainer UI is unavailable, use the API:

```powershell
# Get stack details
Invoke-RestMethod -Uri "https://portainer.fmtagency.online/api/stacks/69" `
  -Headers @{ "X-API-Key" = "YOUR_API_TOKEN" }

# Redeploy (PUT with env vars)
$body = @{
  Env = @(
    @{ name = "DB_DATABASE"; value = "harmony" }
    # ... all env vars
  )
  Prune = $true
} | ConvertTo-Json

Invoke-RestMethod -Method Put `
  -Uri "https://portainer.fmtagency.online/api/stacks/69?endpointId=5" `
  -Headers @{ "X-API-Key" = "YOUR_API_TOKEN" } `
  -ContentType "application/json" `
  -Body $body
```

### 12.4 Local Development

```bash
# Clone and setup
git clone https://github.com/Ayandadlamini12/Harmony-System-Django.git
cd Harmony-System-Django
cp .env.example .env
# Edit .env with your values

# Start local stack
docker compose up -d

# Run migrations
docker compose exec backend python manage.py migrate

# Create superuser
docker compose exec backend python manage.py createsuperuser

# Stop
docker compose down
```

### 12.5 Database Migrations

Migrations are applied automatically on container start via the backend's startup command:
```yaml
command: >
  sh -c "python manage.py migrate --noinput &&
         python manage.py collectstatic --noinput &&
         gunicorn config.wsgi:application --bind 0.0.0.0:8000"
```

To run migrations manually:
```bash
# On server via Portainer exec
docker exec harmony-django-backend python manage.py migrate

# Or create new migrations
docker exec harmony-django-backend python manage.py makemigrations
```

### 12.6 Backup Procedures

```bash
# PostgreSQL backup
docker exec harmony-django-db pg_dump -U harmony harmony > backup_$(date +%Y%m%d).sql

# Restore
docker exec -i harmony-django-db psql -U harmony harmony < backup_20260517.sql

# Volume backup
docker run --rm -v postgres_django_data:/data -v $(pwd):/backup alpine tar czf /backup/postgres_data.tar.gz -C /data .
```

---

## 13. Current Status & Remaining Modules

### ✅ Completed Modules

| Module | Status | Notes |
|---|---|---|
| User Authentication | ✅ Complete | JWT, login, logout, register, change-password |
| User Management | ✅ Complete | Admin CRUD, toggle status, role assignment |
| Patient Registration | ✅ Complete | Multi-step form, auto-generated codes |
| Patient Directory | ✅ Complete | Search, list, detail, edit |
| Visit Records | ✅ Complete | List, create, vitals, follow-up |
| Dashboard | ✅ Complete | Stats cards, recent patients/visits |
| Elevated Access | ✅ Complete | Request, approve, reject workflow |
| Audit Logging | ✅ Complete | Full trail of all changes |
| Role-Based UI | ✅ Complete | Navigation adapts by role |
| Cloudflare Tunnel | ✅ Complete | Zero-trust access |
| Container Deployment | ✅ Complete | Portainer + Docker Compose |
| Brand Theme | ✅ Complete | Purple + green brand colors |
| Footer | ✅ Complete | Copyright + FMT Digital Agency link |

### 🚧 In Progress / Partial

| Module | Status | What's Missing |
|---|---|---|
| Reports |  Partial | Export filters, date range selection, PDF generation |
| Visits New Form | 🟡 Partial | Backend route handler for form submission |

### 📋 Planned Modules

| Module | Priority | Description |
|---|---|---|
| **Waiting List** | High | Real-time patient arrival tracking, check-in flow, status updates |
| **Check-ins** | High | Mark arrivals, update demographics on arrival, move to waiting list |
| **Appointments** | Medium | Appointment booking, calendar view, reminders, rescheduling |
| **Messages** | Medium | Internal messaging foundation is active; next work is notification counts, attachments, and n8n delivery connectors for email, WhatsApp, and Telegram |
| **Inventory** | Medium | Stock items, reorder alerts, stock movement tracking, supplier management |
| **Reports** | Medium | Operational reporting, exports, patient activity, visit trends, inventory reports |
| **Staff Page** | Low | Convert from static to dynamic staff directory |
| **Password Reset** | Low | Email-based forgot password flow (requires SMTP config) |
| **Notifications** | Low | In-app notifications, email alerts, SMS reminders |
| **Multi-language** | Low | i18n support (siSwati + English) |

### 📊 Module Completion Summary

```
Completed:    ████████████████████ 12 modules
In Progress:  ████░░░░░░░░░░░░░░░░  2 modules
Planned:      ████████░░░░░░░░░░░░  8 modules
────────────────────────────────────
Total:        █████████████████████ 22 modules (55% complete)
```

---

## 14. Getting Started for New Developers

### 14.1 Prerequisites

- Python 3.13+
- Node.js 24+
- Docker + Docker Compose
- Git
- PostgreSQL (for local dev, or use Docker)
- Redis (for local dev, or use Docker)

### 14.2 Local Setup

```bash
# 1. Clone the repository
git clone https://github.com/Ayandadlamini12/Harmony-System-Django.git
cd Harmony-System-Django

# 2. Copy environment template
cp .env.example .env
# Edit .env with your values (or use defaults for local dev)

# 3. Start the full stack
docker compose up -d

# 4. Wait for services to be ready (check with docker compose ps)

# 5. Access the application
# Frontend: http://localhost:3000
# Backend API: http://localhost:8000/api
# Django Admin: http://localhost:8000/admin
```

### 14.3 Creating a Superuser

```bash
docker compose exec backend python manage.py createsuperuser
```

### 14.4 Running Tests

```bash
# Backend tests
docker compose exec backend python manage.py test

# Frontend type check
cd frontend && npm run typecheck

# Frontend lint
cd frontend && npm run lint
```

### 14.5 Making Changes

1. **Backend changes:**
   - Edit files in `backend/`
   - Create new migrations: `docker compose exec backend python manage.py makemigrations`
   - Apply migrations: `docker compose exec backend python manage.py migrate`
   - Restart backend: `docker compose restart backend`

2. **Frontend changes:**
   - Edit files in `frontend/src/`
   - Hot reload works in dev mode (`npm run dev`)
   - Build for production: `cd frontend && npm run build`

3. **Deploy to production:**
   - Commit and push to `master` branch
   - Redeploy in Portainer (see Section 12.1)

### 14.6 Code Conventions

**Backend (Python/Django):**
- Follow PEP 8 style guide
- Use type hints where possible
- Docstrings for public functions and classes
- Model field names: snake_case
- API endpoints: kebab-case in URLs, snake_case in JSON

**Frontend (TypeScript/Next.js):**
- Use TypeScript for all new code
- Server Components by default (async page.tsx)
- Client Components only when needed (`"use client"`)
- Form submissions via Server Actions or Route Handlers
- API calls server-side only (no client-side fetch)
- Styling: Tailwind CSS with custom `hh-*` utility classes

### 14.7 Project-Specific Patterns

**Authentication Flow:**
- Login form POSTs to `/api/auth/login` (Next.js Route Handler)
- Route Handler calls Django `/api/auth/token/` for JWT
- Sets httpOnly cookies (`harmony_access`, `harmony_refresh`, etc.)
- All subsequent API calls read `harmony_access` cookie for Bearer token

**Role-Based Rendering:**
- `src/lib/role-workflows.ts` defines nav items and workflow cards with `roles` array
- `allowedForRole()` filters items by current user's role
- Server components check role before rendering sensitive content

**Elevated Access:**
- Receptionist requests access via `/access-requests` page
- Clinician approves via `/approvals` page
- Backend `has_patient_clinical_access()` checks for approved, non-expired requests
- Patient detail page gates clinical data based on access

---

## 15. Troubleshooting

### Common Issues

#### Frontend build fails with "exit code: 1"
- **Cause:** TypeScript errors or missing imports
- **Fix:** Run `cd frontend && npm run build` locally to see full error output
- **Common fix:** Ensure all imported types are included in the import statement

#### Button text not visible (white on white)
- **Cause:** CSS specificity issue with Tailwind
- **Fix:** Check `globals.css` for `.hh-button` color rules. Primary buttons should have white text, secondary buttons should have dark text.

#### Cannot access admin pages
- **Cause:** User role is not `admin`
- **Fix:** Update user role in Django admin or via API:
  ```bash
  docker exec harmony-django-backend python manage.py shell -c "from accounts.models import User; u = User.objects.get(username='youruser'); u.role = 'admin'; u.save()"
  ```

#### Cloudflare tunnel not connecting
- **Cause:** Invalid or expired tunnel token
- **Fix:** Generate new token in Cloudflare Zero Trust dashboard, update `TUNNEL_TOKEN` env var, redeploy

#### Database connection refused
- **Cause:** PostgreSQL not healthy or wrong credentials
- **Fix:** Check `docker compose logs postgres`, verify `DB_PASSWORD` matches

#### CORS errors
- **Cause:** Frontend domain not in `CORS_ALLOWED_ORIGINS`
- **Fix:** Add domain to env var: `CORS_ALLOWED_ORIGINS=http://localhost:3000,https://mis.harmonyhealthsz.com`

#### Celery worker not processing tasks
- **Cause:** Redis connection issue or worker not started
- **Fix:** Check `docker compose logs celery`, verify `CELERY_BROKER_URL` points to correct Redis instance

### Debug Commands

```bash
# Check container status
docker compose ps

# View logs for a service
docker compose logs backend
docker compose logs frontend
docker compose logs celery

# Exec into a container
docker compose exec backend bash
docker compose exec frontend sh

# Check database connectivity
docker compose exec backend python manage.py dbshell

# Check Redis connectivity
docker compose exec redis redis-cli ping

# View Docker network
docker network inspect harmony-net

# Check Portainer stack status
curl -H "X-API-Key: YOUR_TOKEN" https://portainer.fmtagency.online/api/stacks/69
```

### Getting Help

- **Project repository:** https://github.com/Ayandadlamini12/Harmony-System-Django
- **Portainer:** https://portainer.fmtagency.online
- **Live application:** https://mis.harmonyhealthsz.com
- **Developer:** FMT Digital Agency — https://website.fmtagency.online

---

*Last updated: May 17, 2026*
