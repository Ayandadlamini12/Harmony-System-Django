# Harmony MIS Image-Based Deployment

This folder prepares Harmony MIS for faster, safer production deployment using prebuilt Docker images.

The current live Portainer stack can stay unchanged until this flow is tested with a staging stack.

## Target Flow

1. Push code to GitHub.
2. GitHub Actions builds ARM64 images:
   - `ghcr.io/ayandadlamini12/harmony-mis-backend:<commit-sha>`
   - `ghcr.io/ayandadlamini12/harmony-mis-frontend:<commit-sha>`
3. The server pulls the exact image tag.
4. Docker Compose recreates only changed services.
5. Health checks verify backend and frontend.

## Server Folder

Recommended server folder:

```sh
/opt/harmony-mis
```

Copy these files there:

```sh
deployment/docker-compose.images.yml
deployment/deploy.sh
deployment/rollback.sh
```

Create a server-only `.env` file in `/opt/harmony-mis`. Do not commit runtime secrets.

Required `.env` keys include:

```sh
IMAGE_TAG=<commit-sha>
APP_URL=https://mis.harmonyhealthsz.com
APP_HOSTS=mis.harmonyhealthsz.com,localhost,127.0.0.1,backend
DJANGO_SECRET_KEY=<secret>
DB_DATABASE=harmony
DB_USERNAME=harmony
DB_PASSWORD=<secret>
HARMONY_WEBHOOK_SECRET=<secret>
TUNNEL_TOKEN=<cloudflare-token>
KEYCLOAK_ENABLED=true
KEYCLOAK_SERVER_URL=https://auth.harmonyhealthsz.com
KEYCLOAK_REALM=harmony-health
KEYCLOAK_CLIENT_ID=harmony-mis
KEYCLOAK_CLIENT_SECRET=<secret-if-used>
KEYCLOAK_ADMIN_USERNAME=<admin-user>
KEYCLOAK_ADMIN_PASSWORD=<admin-password>
```

## Deploy

```sh
cd /opt/harmony-mis
./deploy.sh <commit-sha>
```

## Rollback

```sh
cd /opt/harmony-mis
./rollback.sh
```

## Important

Do not switch the live stack until a staging stack has successfully pulled and run both Harmony images.
