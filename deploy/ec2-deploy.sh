#!/bin/bash
# Auto-deploy on EC2 — only rebuilds what changed (API ~3 min, admin ~15 min).
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/app}"
API_URL="${API_URL:-http://13.55.122.55:5301/}"
COMPOSE_FILE="${APP_DIR}/deploy/docker-compose.aws-test.yml"
ENV_PROD="${APP_DIR}/service_link_api-main/.env.prod"
PREV_COMMIT="${PREV_COMMIT:-}"
FORCE_SERVICES="${DEPLOY_SERVICES:-}"

cd "$APP_DIR"

LOCK="/var/lock/service360-deploy.lock"
exec 9>"$LOCK"
if ! flock -n 9; then
  echo "=== another deploy is running — skip ==="
  exit 0
fi

if [ "$(id -u)" = "0" ]; then
  DC=(docker compose)
else
  DC=(sudo docker compose)
fi

write_status() {
  cat > "${APP_DIR}/deploy-status.json" << EOF
{"status":"$1","commit":"$(git rev-parse --short HEAD 2>/dev/null || echo unknown)","startedAt":"${STARTED_AT:-}","finishedAt":"${2:-}","message":"$3"}
EOF
}

set_env() {
  local key="$1" val="$2"
  [ -f "$ENV_PROD" ] || return 0
  if grep -q "^${key}=" "$ENV_PROD" 2>/dev/null; then
    sed -i "s|^${key}=.*|${key}=${val}|" "$ENV_PROD"
  else
    echo "${key}=${val}" >> "$ENV_PROD"
  fi
}

STARTED_AT="$(date -Is)"

echo "=== git pull ==="
git fetch origin main
git reset --hard origin/main

BUILD_API=false
BUILD_ADMIN=false

if [ -n "$FORCE_SERVICES" ]; then
  echo "=== force build: $FORCE_SERVICES ==="
  [[ "$FORCE_SERVICES" == *api* ]] && BUILD_API=true
  [[ "$FORCE_SERVICES" == *admin* ]] && BUILD_ADMIN=true
else
  BASE="${PREV_COMMIT:-HEAD~1}"
  CHANGED="$(git diff --name-only "$BASE" HEAD 2>/dev/null || true)"
  echo "=== changed files (since ${BASE:0:8}) ==="
  echo "$CHANGED" | head -20

  if echo "$CHANGED" | grep -qE '^service_link_api-main/'; then BUILD_API=true; fi
  if echo "$CHANGED" | grep -qE '^service_link_admin-main/'; then BUILD_ADMIN=true; fi
  if echo "$CHANGED" | grep -qE '^deploy/docker-compose|^deploy/nginx-host'; then
    BUILD_API=true
    BUILD_ADMIN=true
  fi
  # Deploy script-only changes: skip rebuild
  if [ -z "$CHANGED" ] || echo "$CHANGED" | grep -qvE '^deploy/'; then
    : # keep api/admin flags from above
  elif [ "$BUILD_API" = false ] && [ "$BUILD_ADMIN" = false ]; then
    echo "=== deploy scripts only — skip docker build ==="
    write_status "ready" "$(date -Is)" "No app changes"
    set_env DEPLOY_STATUS ready
    set_env DEPLOY_COMMIT "$(git rev-parse --short HEAD)"
    set_env DEPLOY_FINISHED_AT "$(date -Is)"
    set_env DEPLOY_MESSAGE "No app changes"
    exit 0
  fi
  # Default: API only (fast path for small backend fixes)
  if [ "$BUILD_API" = false ] && [ "$BUILD_ADMIN" = false ]; then
    BUILD_API=true
  fi
fi

SERVICES=()
$BUILD_API && SERVICES+=(api)
$BUILD_ADMIN && SERVICES+=(admin)
MSG="Building: ${SERVICES[*]:-none}"
echo "=== $MSG ==="

write_status "deploying" "" "$MSG"
set_env DEPLOY_STATUS deploying
set_env DEPLOY_STARTED_AT "$STARTED_AT"
set_env DEPLOY_MESSAGE "$MSG"

if [ -f "$ENV_PROD" ]; then
  sed -i "s|^BASE_UPLOAD_URL=.*|BASE_UPLOAD_URL=${API_URL}|" "$ENV_PROD"
  sed -i 's|^REDIS_IP=.*|REDIS_IP=redis|' "$ENV_PROD" 2>/dev/null || true
  grep -q '^REDIS_IP=' "$ENV_PROD" || echo 'REDIS_IP=redis' >> "$ENV_PROD"
fi

export REACT_APP_ORDER_API_URL="${API_URL}"

if [ "${#SERVICES[@]}" -gt 0 ]; then
  "${DC[@]}" -f "$COMPOSE_FILE" build "${SERVICES[@]}"
  "${DC[@]}" -f "$COMPOSE_FILE" up -d --force-recreate "${SERVICES[@]}"
fi

"${DC[@]}" -f "$COMPOSE_FILE" ps

COMMIT="$(git rev-parse --short HEAD 2>/dev/null || echo unknown)"
write_status "ready" "$(date -Is)" "Deploy complete ($MSG)"
set_env DEPLOY_STATUS ready
set_env DEPLOY_COMMIT "$COMMIT"
set_env DEPLOY_FINISHED_AT "$(date -Is)"
set_env DEPLOY_MESSAGE "Deploy complete ($MSG)"

echo "=== done ($MSG) ==="
