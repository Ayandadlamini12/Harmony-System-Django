# Deployment Prep - 2026-05-22

## Current Source State

- Repository: `Ayandadlamini12/Harmony-System-Django`
- Branch: `master`
- Latest commit prepared for deployment: `28a4e6d Force patient action button text contrast`
- Local working tree status: clean except an unrelated untracked nested `Harmony-System-Django` directory that was not touched.

## Changes Included Since Last Live Verification

- Added shadcn-style frontend component foundation.
- Reworked patient workspace layout toward the approved Harmony Health MIS design.
- Added collapsible fixed sidebar layout.
- Updated sidebar modules to: Dashboard, Patients, Visits, Appointments, Approvals, Messages, Inventory, Reports, Settings.
- Fixed local login API handling for `127.0.0.1` backend access.
- Fixed collapsed-sidebar content width issue.
- Fixed primary purple button contrast, including the patient workspace `New visit note` action.

## Local Verification Completed

- Frontend typecheck: passed.
- Frontend production build: passed.
- Backend Django tests: passed, 6 tests.
- Local patient route: `http://localhost:3000/patients/1` returned HTTP 200.
- Local backend containers running for verification:
  - PostgreSQL
  - Redis
  - Django backend

## Live Portainer Stack Observed

- Stack name: `harmony`
- Stack ID: `69`
- Endpoint ID: `5`
- Stack status: active
- Stack source mode: local compose source on server, not automatic GitHub pull.

The live stack still uses:

```yaml
backend:
  build: ./backend

frontend:
  build: ./frontend
```

That means Portainer rebuilds from the files already present under the server stack directory, expected to be `/data/compose/69`. Pushing to GitHub alone is not enough for live deployment.

## Required Deployment Order

1. Confirm no one is actively using the live system for a critical workflow.
2. Sync the server source directory with GitHub:

```bash
cd /data/compose/69
git status
git pull origin master
git rev-parse --short HEAD
```

Expected commit after sync:

```text
28a4e6d
```

3. Redeploy with rebuild in Portainer, or over SSH:

```bash
cd /data/compose/69
docker compose -p harmony -f remote-deployment-stack.yml up -d --build --remove-orphans
```

4. Confirm backend migrations run at startup. Current stack command already runs:

```bash
python manage.py migrate --noinput
python manage.py collectstatic --noinput
gunicorn config.wsgi:application --bind 0.0.0.0:8000
```

5. Verify live routes:

```text
https://mis.harmonyhealthsz.com/login
https://mis.harmonyhealthsz.com/patients/1
```

6. Verify live UI:

- Sidebar does not crush the page content.
- Patient workspace uses the full available width.
- Purple primary buttons have white text and white icons.
- Sidebar modules show the approved module set.

## Important Constraint

Do not use only Portainer "Update stack" unless the server source has already been synced. Updating the stack definition alone will not fetch the new GitHub commits because the compose file uses local `build:` paths.
