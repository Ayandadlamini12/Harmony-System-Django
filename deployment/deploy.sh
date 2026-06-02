#!/usr/bin/env sh
set -eu

APP_DIR="${APP_DIR:-/opt/harmony-mis}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.images.yml}"
NEW_TAG="${1:-}"

if [ -z "$NEW_TAG" ]; then
  echo "Usage: ./deploy.sh <image-tag>"
  exit 1
fi

cd "$APP_DIR"

if [ -f VERSION ]; then
  cp VERSION PREVIOUS_VERSION
fi

echo "$NEW_TAG" > VERSION

if grep -q "^IMAGE_TAG=" .env; then
  sed -i "s/^IMAGE_TAG=.*/IMAGE_TAG=$NEW_TAG/" .env
else
  printf "IMAGE_TAG=%s\n" "$NEW_TAG" >> .env
fi

docker compose -f "$COMPOSE_FILE" pull backend frontend celery celery-beat
docker compose -f "$COMPOSE_FILE" up -d --remove-orphans

sleep 10
docker compose -f "$COMPOSE_FILE" ps

docker exec harmony-django-backend python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/health/', timeout=5).read()"
docker exec harmony-django-frontend node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

echo "Deployment complete: $NEW_TAG"
