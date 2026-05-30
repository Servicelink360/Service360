#!/bin/bash
# Fast deploy: rebuild ONLY the service that changed (docker layer cache — skips npm install when package.json unchanged).
# API ~30s–2min | Admin ~8–12min (React compile — unavoidable for UI changes)
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/app}"
COMPOSE_FILE="${APP_DIR}/deploy/docker-compose.aws-test.yml"
HTTPS_ENV="${APP_DIR}/deploy/https.env"
API_URL="${API_URL:-http://13.55.122.55:5301/}"
if [ -f "$HTTPS_ENV" ]; then
  # shellcheck disable=SC1090
  source "$HTTPS_ENV"
  API_URL="${API_URL:-https://${API_DOMAIN}/}"
fi

if [ "$(id -u)" = "0" ]; then
  DC=(docker compose)
else
  DC=(sudo docker compose)
fi

export REACT_APP_ORDER_API_URL="${API_URL}"

fast_api() {
  echo "=== fast API (cached docker build, api only) ==="
  "${DC[@]}" -f "$COMPOSE_FILE" build api
  "${DC[@]}" -f "$COMPOSE_FILE" up -d --no-deps api
  echo "=== API done ==="
}

fast_admin() {
  echo "=== fast admin (cached docker build, admin only — React compile ~8 min) ==="
  # Free memory: stop admin during build (nginx not needed while compiling)
  "${DC[@]}" -f "$COMPOSE_FILE" stop admin 2>/dev/null || true
  "${DC[@]}" -f "$COMPOSE_FILE" build admin
  "${DC[@]}" -f "$COMPOSE_FILE" up -d --no-deps admin
  echo "=== admin done ==="
}

case "${1:-}" in
  api) fast_api ;;
  admin) fast_admin ;;
  both)
    fast_api
    fast_admin
    ;;
  *)
    echo "Usage: $0 api|admin|both" >&2
    exit 1
    ;;
esac
