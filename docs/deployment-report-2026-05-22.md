# Deployment Report - 2026-05-22

## Summary

This report records the deployment preparation for the live Harmony Health Django/Next.js system.

No destructive changes were made to CyberPanel or unrelated containers. The live Harmony stack is isolated in Docker and exposed through Cloudflare Tunnel.

## Live Stack Observed

- Portainer URL: `https://portainer.fmtagency.online`
- Endpoint ID: `5`
- Endpoint name: `local`
- Stack name: `harmony`
- Stack ID: `69`
- Stack entrypoint: `remote-deployment-stack.yml`
- Portainer project path: `/data/compose/69`
- Public app URL: `https://mis.harmonyhealthsz.com`

Running Harmony containers observed:

- `cloudflared-harmony-django`
- `harmony-django-backend`
- `harmony-django-frontend`
- `harmony-django-db`
- `harmony-django-redis`
- `harmony-django-celery`
- `harmony-django-beat`

## Deployment Source Behavior

The live stack builds from local folders inside `/data/compose/69`:

```yaml
backend:
  build: ./backend

frontend:
  build: ./frontend
```

Therefore, Portainer does not automatically pull new commits from GitHub. The safe deployment sequence is:

1. Commit and push changes to GitHub.
2. Sync the committed source into `/data/compose/69`.
3. Rebuild/redeploy the `harmony` stack in Portainer.
4. Verify migrations and live routes.

## Current Feature Changes Prepared

Recent commits prepared for deployment:

- `95d0b44` - Add confidential patient condition records
- `175c4e3` - Refine confidential HIV and condition indicators
- `375da26` - Add glucose food type to vitals

These changes add:

- Structured confidential patient condition records.
- Yes/no condition flags with tick/cross UI.
- Separate confidential HIV status display.
- Glucose food type capture next to glucose records.
- Backend migrations:
  - `0003_patientcondition_confidential_flags.py`
  - `0004_vital_glucose_food_type.py`

## Migration Behavior

The live backend startup command already runs:

```sh
python manage.py migrate --noinput
python manage.py collectstatic --noinput
gunicorn config.wsgi:application --bind 0.0.0.0:8000
```

So once the backend image is rebuilt from the updated source, migrations should apply automatically.

Before deployment, the live database showed only these `clinic` migrations applied:

- `0001_initial`
- `0002_elevatedaccessrequest`

After deployment, confirm:

- `0003_patientcondition_confidential_flags`
- `0004_vital_glucose_food_type`

## Test Patient

A live test patient was added for UI review:

- Name: `Zahara Dlamini`
- Patient ID: `1`
- Patient code: `PAT-2026-000001`
- URL: `https://mis.harmonyhealthsz.com/patients/1`

## Recommended Follow-up

Keep this current deployment method for the immediate safe release. Later, convert the Portainer stack to a Git-backed deployment so GitHub becomes the source of truth and `/data/compose/69` is no longer manually synced.

## Deployment Completed

The deployment was completed using the safe current-stack method:

1. Local commits were pushed to GitHub.
2. The previous `/data/compose/69` stack workspace was backed up locally.
3. The committed source at `2b4b465` was archived with `git archive`.
4. The archive was uploaded into Portainer's `/data/compose/69` workspace.
5. The `harmony` stack was rebuilt from `/data/compose/69` with:

   ```sh
   docker compose -p harmony -f remote-deployment-stack.yml up -d --build --remove-orphans
   ```

6. The temporary Docker CLI deployment container exited successfully and was removed.

## Post-Deployment Verification

The live backend containers were recreated and the backend startup command applied the new migrations:

```text
Applying clinic.0003_patientcondition_confidential_flags... OK
Applying clinic.0004_vital_glucose_food_type... OK
```

Confirmed live migration state:

```text
[X] 0001_initial
[X] 0002_elevatedaccessrequest
[X] 0003_patientcondition_confidential_flags
[X] 0004_vital_glucose_food_type
```

Confirmed live model fields:

```text
glucose_food_type True
condition_present True
condition_confidential True
```

Confirmed public app health:

- `https://mis.harmonyhealthsz.com` returned HTTP `200`
- `https://mis.harmonyhealthsz.com/login` returned HTTP `200`
- `https://mis.harmonyhealthsz.com/patients/1` correctly redirected unauthenticated users to `/login?redirect=%2Fpatients%2F1`
