# UI Deployment Report - 2026-05-22

## Deployment Target

- Live URL: `https://mis.harmonyhealthsz.com`
- Portainer stack: `harmony`
- Stack ID: `69`
- Endpoint ID: `5`
- Git branch: `master`
- Deployed source commit: `4dc3711 Document deployment preflight status`

## Deployment Action

Triggered Portainer Git redeploy for stack `69`.

Portainer returned a Cloudflare `524` timeout while the rebuild was still running. The timeout did not stop the deployment. Follow-up container inspection showed the stack containers were recreated successfully.

## Verification

- Live login route returned HTTP `200`:
  - `https://mis.harmonyhealthsz.com/login`
- Protected patient route returned HTTP `307`, expected for unauthenticated access:
  - `https://mis.harmonyhealthsz.com/patients/1`
- Backend startup logs showed:
  - migrations checked
  - no migrations pending
  - static files collected
  - Gunicorn started on port `8000`
- All Harmony stack containers were running after recreate:
  - `harmony-django-db`
  - `harmony-django-redis`
  - `harmony-django-backend`
  - `harmony-django-celery`
  - `harmony-django-beat`
  - `harmony-django-frontend`
  - `cloudflared-harmony-django`

## Code Presence Confirmed In Live Frontend Container

The rebuilt frontend container contains the new UI code, including:

- fixed sidebar/main content layout using `lg:ml-[260px]` and `lg:ml-[76px]`
- forced white primary button text through the shared button variant
- updated patient workspace route code
- updated sidebar module set

## Notes

The live stack is Git-backed in Portainer and uses `remote-deployment-stack.yml` from the repository. Future deployments should use Portainer Pull/Redeploy or the Git redeploy API, then verify container recreation and live route health.
