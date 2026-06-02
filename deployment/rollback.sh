#!/usr/bin/env sh
set -eu

APP_DIR="${APP_DIR:-/opt/harmony-mis}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.images.yml}"

cd "$APP_DIR"

if [ ! -f PREVIOUS_VERSION ]; then
  echo "No previous version is available."
  exit 1
fi

PREVIOUS_TAG="$(cat PREVIOUS_VERSION)"
./deploy.sh "$PREVIOUS_TAG"
