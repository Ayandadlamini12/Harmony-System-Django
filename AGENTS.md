# Harmony System Django — Agent Onboarding

## Project Overview

**Harmony Health System** is a Django + Next.js healthcare MIS (Management Information System) for a clinic in Eswatini. It manages patients, visits, vitals, clinical cases, appointments, check-ins, consent forms, and document generation.

**Live URL:** `https://mis.harmonyhealthsz.com`

### Tech Stack
| Layer | Tech |
|---|---|
| Backend | Django 5.2 + Django REST Framework |
| Frontend | Next.js 15 (App Router, standalone output) |
| Database | PostgreSQL 16 |
| Cache/Queue | Redis 7 |
| CSS | Tailwind + custom CSS variables (Harmony design system) |
| UI Components | shadcn/ui + Lucide React icons |
| PDF | WeasyPrint (consent forms) |
| Container Runtime | Docker Compose (ARM64/aarch64 server) |
| Reverse Proxy/Tunnel | Cloudflare Tunnel (cloudflared) |
| Container Management | Portainer (self-hosted) |
| CI/CD | None — manual deployment via Portainer API + docker exec |

---

## Container Architecture (Production Server)

The production server is **ARM64 (aarch64)**. All containers run on a single host managed by Portainer.

### The Harmony Stack (Portainer Stack ID: 69)

| Container | Image | Role |
|---|---|---|
| `harmony-django-db` | postgres:16-alpine | PostgreSQL database |
| `harmony-django-redis` | redis:7-alpine | Redis cache + Celery broker |
| `harmony-django-backend` | harmony-backend:latest (built from `backend/Dockerfile`) | Django + Gunicorn on port 8000 |
| `harmony-django-frontend` | 69-frontend:latest (built from `frontend/Dockerfile`) | Next.js standalone on port 3000 (mapped to host 30001) |
| `harmony-django-celery` | harmony-celery:latest | Celery worker |
| `harmony-django-beat` | harmony-celery-beat:latest | Celery beat scheduler |
| `cloudflared-harmony-django` | cloudflare/cloudflared:latest | Cloudflare Tunnel |

### Docker Network
All Harmony containers communicate on `harmony_harmony-net` (Docker Compose project name "harmony" + network "harmony-net").

### How Cloudflare Tunnel Works
- Cloudflare Tunnel routes `mis.harmonyhealthsz.com` → `http://harmony-django-frontend:3000`
- The tunnel config is managed in Cloudflare Zero Trust dashboard (not in a local config file)
- The cloudflared container has **NO shell** (scratch image) — can't exec into it
- Tunnel config (seen in cloudflared logs):
  ```json
  {"ingress":[{"hostname":"mis.harmonyhealthsz.com","service":"http://harmony-django-frontend:3000"},{"service":"http_status:404"}]}
  ```
- **Important:** The tunnel routes ALL traffic to the frontend. API calls to `/api/*` also go to the frontend Next.js server. There is NO separate backend route in Cloudflare.

### Data Flow for Web Requests
```
Browser → Cloudflare CDN → cloudflared container → Next.js frontend (port 3000)
                                                         │
                                                    Server-side fetch to backend:8000
```

Client-side API calls (`/api/cases/`) hit Next.js first. Next.js must either:
- Have an API route handler to proxy the request, OR
- The data must be fetched server-side and passed as props

---

## How Codex Deployed (The Workflow You Inherit)

### Original Codex Deployment Pattern

1. **Code changes** made locally in `C:\Users\ayand\OneDrive - asdevelopers\Documents\GitHub\Harmony-System-Django`
2. **Git commit + push** to GitHub (`Ayandadlamini12/Harmony-System-Django`)
3. **Sync code to `/data/compose/69/`** on the production server:
   - Create a temp Alpine container with `/data:/data` mounted
   - Use `base64` encoding to write files via `docker exec`
   - Files are written to BOTH the running container AND `/data/compose/69/`
4. **Rebuild** the affected image on the server using `docker build` (via `docker:cli` container with Docker socket)
5. **Swap containers** — stop old, recreate from new image with proper network (`harmony_harmony-net`)

### Portainer API Configuration
```
URL: https://portainer.fmtagency.online
Endpoint ID: 5 (local Docker socket)
Stack ID: 69 (harmony)
API Key: In environment variable HARMONY_PORTAINER_API_KEY
```

### Key PowerShell Functions for Deployment

```powershell
# Write a file to the production server's /data/compose/69/
function WriteToData($LocalPath, $RemoteRel) {
    $content = Get-Content -LiteralPath $LocalPath -Raw
    $b64 = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($content))
    $cmd = "echo '$b64' | base64 -d > /data/compose/69/$RemoteRel"
    # Create temp alpine container with /data mount, run command
}

# Build Docker image on server
# Use docker:cli image with /var/run/docker.sock and /data mounts
# Command: cd /data/compose/69 && docker build -t 69-frontend:latest -f frontend/Dockerfile frontend/

# Swap frontend container
# Stop + remove old, create new with:
#   Image: 69-frontend:latest
#   NetworkingConfig.EndpointsConfig: harmony_harmony-net
#   PortBindings: 30001:3000
#   Env: API_BASE_URL, NEXT_PUBLIC_API_BASE_URL, APP_BASE_URL, COOKIE_SECURE
```

### Running Commands Inside Containers

```powershell
# Backend (has Python + shell)
docker exec harmony-django-backend sh -c "python manage.py shell -c '...'"

# Frontend (has Node + shell)
docker exec harmony-django-frontend sh -c "..."

# Cloudflared (NO SHELL - scratch image)
# Cannot exec into this container
```

### Seeding Data Pattern
```powershell
$script = @'
import django, os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()
# ... your code ...
'@
$b64 = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($script))
$cmd = "python3 -c `"import base64; exec(base64.b64decode('$b64'))`""
# Send via Portainer exec to harmony-django-backend
```

⚠️ **Warning:** `echo '$b64'` can corrupt base64. Use `printf '%s'` or the Python exec approach above.

### Cannot Read stdout Through Portainer Proxy

Portainer's Docker exec proxy returns `Content-Length: 0` for exec output. You CANNOT see stdout. Use exit codes to verify commands. File-based checks work:
```powershell
# Check if file exists
Cmd = @("test", "-f", "/tmp/myfile.txt")
# Check for specific content
Cmd = @("grep", "-c", "SUCCESS", "/tmp/myfile.txt")
```

### Image Registry
- **GHCR:** `ghcr.io/ayandadlamini12/harmony-frontend:latest` (x86 only — don't use on ARM64)
- **Local ARM64 builds:** `69-frontend:latest` and `harmony-frontend:latest`
- **Important:** Images MUST be built on the ARM64 server. NEVER push x86 images for ARM64 deployment.

---

## What I Was Working On: Cases Feature

### Goal
Migrate from a **visit-centric** to a **case-centric** clinical records model. A Visit is now just an encounter header (date, type). All clinical data (complaint, diagnosis, remedy, follow-ups) lives on **Case**.

### What's Done

#### Backend (DEPLOYED)
- **Case model** (`backend/clinic/models.py`): 24 fields including title, main_complaint, diagnosis, remedy, physical_examination, dietary/lifestyle recs, all follow-up fields, status (open/resolved), parent_case self-FK, practitioner
- **Case API** (`/api/cases/`): CaseViewSet with search/filter/audit, CaseSerializer with patient_public_id
- **Data migration (0015)**: Auto-creates Cases from existing Visit clinical data + FollowUpEvaluation data
- **FollowUpEvaluation removed (0016)**: Model deleted, fields merged into Case
- **Check-in auto-creates Visit**: `start_journey_for_check_in()` creates a Visit so cases can be added immediately
- **Visit.main_complaint**: Changed from required to optional (blank=True, default="")

#### Frontend (PARTIALLY DEPLOYED)
- **`/cases/new` page**: Case entry form, supports `?patient=X` and `?parent=Y` for follow-ups
- **Case TypeScript type** (`frontend/src/types/clinic.ts`): Full Case interface with patient_public_id
- **Cases tab in patient view**: Shows cases for a patient, expandable detail view, follow-up button
- **"New Case" button**: On patient page, links to `/cases/new?patient=X`
- **Cases REMOVED from sidebar**: Cases are per-patient, accessed from patient view only
- **getCases() API function**: Server-side fetch to backend with filter support

### Current Issues

1. **Cases tab shows "No cases recorded yet"** — The `getCases()` function may not be filtering by patient correctly
2. **No client-side API proxy** — Next.js cannot proxy `/api/cases/*` to backend. All case data must be fetched server-side
3. **Resolve button removed** — Client-side PATCH to `/api/cases/{id}/` doesn't work (no proxy route)
4. **Fresh frontend rebuild required for every change** — Next.js standalone output must be rebuilt with `docker build`

### Next Steps (Suggested)
1. Verify `getCases("patient=X")` correctly calls `/api/cases/?patient=X` (not `?search=patient=X`)
2. Test that seeded cases appear in the Cases tab
3. Add a server action or API route for resolving cases (PATCH)
4. Add a server action for creating cases (POST)
5. Test the full flow: check-in → visit created → case added → follow-up case

---

## Key Files

| File | Purpose |
|---|---|
| `backend/clinic/models.py` | All models (Case, Visit, Patient, etc.) |
| `backend/clinic/serializers.py` | DRF serializers |
| `backend/clinic/views.py` | ViewSets, check-in logic |
| `backend/clinic/urls.py` | API routes |
| `backend/clinic/migrations/` | DB migrations (0015 = data migration, 0016 = FollowUpEvaluation removal) |
| `frontend/next.config.ts` | Next.js config (standalone output, no rewrites) |
| `frontend/src/middleware.ts` | Auth middleware (excludes /api/ routes) |
| `frontend/src/lib/api.ts` | Server-side API functions |
| `frontend/src/lib/role-workflows.ts` | Sidebar nav + workflow cards |
| `frontend/src/types/clinic.ts` | TypeScript types |
| `frontend/src/components/patient-record-workspace.tsx` | Patient view with CasesTab |
| `frontend/src/components/case-form.tsx` | Case entry form |
| `frontend/src/app/cases/new/page.tsx` | `/cases/new` route |
| `frontend/src/app/patients/[id]/page.tsx` | Patient detail page |
| `frontend/Dockerfile` | Multi-stage Node 24 Alpine build |
| `backend/Dockerfile` | Python 3.13 slim build |
| `remote-deployment-stack.yml` | Docker Compose for production (in /data/compose/69) |
| `redeploy-harmony.ps1` | Powershell script that Codex used for stack redeployment |
| `portainer-create-stack.json` | Portainer stack creation payload |

---

## Questions for the New Agent

1. Do you have Portainer access? What's your API key and URL?
2. Can you see the current state of the production containers?
3. Do you understand the deployment workflow (sync files → build on server → swap containers)?
4. Shall we fix the Cases tab to show seeded cases first, or do you want to review everything first?
5. What else would you like to know about the project?
