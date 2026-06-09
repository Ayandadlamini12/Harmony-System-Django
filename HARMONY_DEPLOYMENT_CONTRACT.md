# Harmony Health Deployment & Integration Contract

This document serves as the canonical operational directive for all current and future agent systems deploying to the **Harmony Health MIS** production server. These constraints are established to guarantee zero-downtime frontend releases and protect the critical Keycloak Identity Access Management (IAM) configuration from data-loss.

---

## [CRITICAL] Security and IAM Constraints

> [!IMPORTANT]
> The environment configuration inside **Portainer Stack 69** is currently **incomplete** for Keycloak IAM settings. 
> Do **NOT** treat Portainer Stack 69 env as a complete source of truth. Relying on it directly without merging live values will break authentication.

If a backend redeployment or recreate is ever required:
1. The backend container **must not** be recreated from a partial, stale, or default environment list.
2. The live running container environment variables must be actively inspected and captured first.
3. The complete **Keycloak Environment Block** must be preserved.

### Mandatory Keycloak Configuration Block
Every deployment of the `harmony-django-backend` container must preserve these exact variables:

```ini
KEYCLOAK_ENABLED=true
KEYCLOAK_SERVER_URL=https://auth.harmonyhealthsz.com
KEYCLOAK_REALM=harmony-health
KEYCLOAK_CLIENT_ID=harmony-mis
KEYCLOAK_CLIENT_SECRET=<live_secret>
KEYCLOAK_ALLOW_LOCAL_FALLBACK=true
KEYCLOAK_ADMIN_USERNAME=<live_admin_username>
KEYCLOAK_ADMIN_PASSWORD=<live_admin_password>
KEYCLOAK_ACTION_EMAIL_LIFESPAN=432000
```

*Note: The `harmony-mis` client is registered as a **Confidential Client**; missing the client secret will immediately block all user authentication and MIS logins.*

---

## [DEPLOYMENT] Deployment Workflows

Deployments are strictly segregated by target container concerns to optimize speed and guarantee uptime:

### 1. Frontend-Only Hot-Swap Flow (Preferred for UI Work)
For frontend-only releases (e.g., UI adjustments, Zulip interface, page templates):
- **Bypass Portainer Stack 69 entirely.** Do not redeploy the stack.
- Use the **targeted zero-downtime container swap pipeline**:
  1. `.\scratch-remote-git-pull.ps1` — Syncs/pulls latest code from GitHub into `/data/compose/69/` on the server.
  2. `.\scratch-remote-build-frontend.ps1` — Builds the updated frontend image locally on the ARM64 production server.
  3. `.\scratch-remote-swap-frontend.ps1` — Stops, renames the active container to backup (`harmony-django-frontend-old`), spins up the new container (`harmony_frontend:latest`), attaches it to the network (`harmony_harmony-net` with original aliases), verifies the health check endpoint, and cleans up the backup only after verifying success.

This ensures the backend is completely insulated and untouched, maintaining 100% uptime for authentication.

### 2. Backend Redeploy Flow
If changes to the Django backend or database models are required:
- **Never do a blind recreate.**
- You **must** run `redeploy-harmony.ps1` as the minimum standard.
- This script is hardened to:
  1. Query Portainer API for Stack File Content and current Stack Env.
  2. Connect to the Docker socket to inspect the live running `harmony-django-backend` container.
  3. Extract active Keycloak credentials from the live running environment.
  4. Merge any missing/blank variables into the stack environment before dispatching the stack update.

### 3. Full Stack Redeployment
A full stack redeploy should only be triggered after:
1. Verifying that the docker-compose YAML file is fully aligned with the active runtime configuration.
2. Confirming the environment block contains the complete merged configuration (DB, Redis, Keycloak).

---

## [VERIFICATION] Verification Checklist

Before closing out any deployment run, execute:
- [ ] **Type Check**: `npx tsc --noEmit` on the frontend.
- [ ] **Verify Authentication**: Try logging in with a test user to ensure Keycloak handshake remains healthy.
- [ ] **Integration Logs**: Verify that the outbound Audit/Event Log on the MIS is registering integration actions cleanly.
