#!/bin/bash
# Auto-deploy on EC2 — only rebuilds what changed (API ~3 min, admin ~15 min).
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/app}"
API_URL="${API_URL:-http://13.55.122.55:5301/}"
HTTPS_ENV="${APP_DIR}/deploy/https.env"
if [ -f "$HTTPS_ENV" ]; then
  # shellcheck disable=SC1090
  source "$HTTPS_ENV"
  API_URL="${API_URL:-https://${API_DOMAIN}/}"
fi
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

needs_full_api_build() {
  local base="${1:-HEAD~1}"
  git diff --name-only "$base" HEAD 2>/dev/null | grep -qE '^service_link_api-main/(Dockerfile|package\.json|package-lock\.json)' \
    || git diff --name-only "$base" HEAD 2>/dev/null | grep -qE '^deploy/docker-compose'
}

needs_full_admin_build() {
  local base="${1:-HEAD~1}"
  git diff --name-only "$base" HEAD 2>/dev/null | grep -qE '^service_link_admin-main/(Dockerfile|package\.json|package-lock\.json|ckeditor5/)' \
    || git diff --name-only "$base" HEAD 2>/dev/null | grep -qE '^deploy/docker-compose|^deploy/nginx'
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

BASE="${PREV_COMMIT:-HEAD~1}"
USE_FAST="${DEPLOY_FAST:-1}"

if [ "${#SERVICES[@]}" -gt 0 ]; then
  if [ "$USE_FAST" = "1" ]; then
    if $BUILD_API && ! $BUILD_ADMIN && ! needs_full_api_build "$BASE"; then
      bash "$APP_DIR/deploy/ec2-deploy-fast.sh" api
    elif $BUILD_ADMIN && ! $BUILD_API && ! needs_full_admin_build "$BASE"; then
      bash "$APP_DIR/deploy/ec2-deploy-fast.sh" admin
    elif $BUILD_API && $BUILD_ADMIN \
        && ! needs_full_api_build "$BASE" && ! needs_full_admin_build "$BASE"; then
      bash "$APP_DIR/deploy/ec2-deploy-fast.sh" both
    elif $BUILD_API && ! needs_full_api_build "$BASE"; then
      bash "$APP_DIR/deploy/ec2-deploy-fast.sh" api
      if $BUILD_ADMIN; then
        if needs_full_admin_build "$BASE"; then
          "${DC[@]}" -f "$COMPOSE_FILE" build admin
          "${DC[@]}" -f "$COMPOSE_FILE" up -d --force-recreate admin
        else
          bash "$APP_DIR/deploy/ec2-deploy-fast.sh" admin
        fi
      fi
    elif $BUILD_ADMIN && ! needs_full_admin_build "$BASE"; then
      bash "$APP_DIR/deploy/ec2-deploy-fast.sh" admin
    else
      echo "=== full docker build (Dockerfile or package.json changed) ==="
      "${DC[@]}" -f "$COMPOSE_FILE" build "${SERVICES[@]}"
      "${DC[@]}" -f "$COMPOSE_FILE" up -d --force-recreate "${SERVICES[@]}"
    fi
  else
    "${DC[@]}" -f "$COMPOSE_FILE" build "${SERVICES[@]}"
    "${DC[@]}" -f "$COMPOSE_FILE" up -d --force-recreate "${SERVICES[@]}"
  fi
fi

"${DC[@]}" -f "$COMPOSE_FILE" ps

COMMIT="$(git rev-parse --short HEAD 2>/dev/null || echo unknown)"
write_status "ready" "$(date -Is)" "Deploy complete ($MSG)"
set_env DEPLOY_STATUS ready
set_env DEPLOY_COMMIT "$COMMIT"
set_env DEPLOY_FINISHED_AT "$(date -Is)"
set_env DEPLOY_MESSAGE "Deploy complete ($MSG)"

echo "=== done ($MSG) ==="
