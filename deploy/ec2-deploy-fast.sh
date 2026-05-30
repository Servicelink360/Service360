#!/bin/bash
# Fast deploy: compile changed code and copy into running containers (no full docker image rebuild).
# API ~1-2 min | Admin ~5-8 min (cached node_modules; React build still runs but skips npm install + image rebuild)
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/app}"
API_DIR="${APP_DIR}/service_link_api-main"
ADMIN_DIR="${APP_DIR}/service_link_admin-main"
COMPOSE_FILE="${APP_DIR}/deploy/docker-compose.aws-test.yml"
CACHE_ROOT="${APP_DIR}/.deploy-cache"
API_CONTAINER="${API_CONTAINER:-deploy-api-1}"
ADMIN_CONTAINER="${ADMIN_CONTAINER:-deploy-admin-1}"

API_URL="${API_URL:-http://13.55.122.55:5301/}"
HTTPS_ENV="${APP_DIR}/deploy/https.env"
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

fast_deploy_api() {
  echo "=== fast API: nest build + copy dist (no image rebuild) ==="
  mkdir -p "${CACHE_ROOT}/api-node_modules"
  docker run --rm \
    -v "${API_DIR}:/src" \
    -v "${CACHE_ROOT}/api-node_modules:/src/node_modules" \
    -w /src \
    -e PUPPETEER_SKIP_DOWNLOAD=true \
    node:20-bookworm-slim \
    bash -c 'if [ ! -f node_modules/.package-lock.json ] && [ ! -d node_modules/@nestjs/core ]; then echo "npm install (first time)..."; npm install --legacy-peer-deps; fi && npm run build'

  docker cp "${API_DIR}/dist/." "${API_CONTAINER}:/usr/src/app/dist/"
  [ -f "${API_DIR}/template.html" ] && docker cp "${API_DIR}/template.html" "${API_CONTAINER}:/usr/src/app/template.html"
  docker restart "${API_CONTAINER}"
  echo "=== fast API done ==="
}

fast_deploy_admin() {
  echo "=== fast admin: react build + copy static files (no image rebuild) ==="
  mkdir -p "${CACHE_ROOT}/admin-node_modules" "${CACHE_ROOT}/ckeditor-node_modules"

  rm -f "${ADMIN_DIR}/.env" "${ADMIN_DIR}/.env.production" "${ADMIN_DIR}/.env.local"
  printf 'REACT_APP_ORDER_API_URL=%s\nREACT_APP_MODE=PROD\nGENERATE_SOURCEMAP=false\n' \
    "${API_URL}" > "${ADMIN_DIR}/.env.production"

  docker run --rm \
    -v "${ADMIN_DIR}:/app" \
    -v "${CACHE_ROOT}/admin-node_modules:/app/node_modules" \
    -v "${CACHE_ROOT}/ckeditor-node_modules:/app/ckeditor5/node_modules" \
    -w /app \
    -e NODE_OPTIONS=--openssl-legacy-provider --max_old_space_size=3072 \
    -e CI=false \
    -e DISABLE_ESLINT_PLUGIN=true \
    node:18-bookworm-slim \
    bash -c '
      set -e
      if [ -f ckeditor5/package.json ]; then
        cd ckeditor5
        if [ ! -d node_modules/.bin ]; then echo "ckeditor npm install (first time)..."; npm install; fi
        npm run build
        cd /app
      fi
      if [ ! -d node_modules/.bin ]; then echo "admin npm install (first time)..."; npm install --legacy-peer-deps; fi
      npm run build
    '

  docker cp "${ADMIN_DIR}/build/." "${ADMIN_CONTAINER}:/usr/share/nginx/html/"
  docker exec "${ADMIN_CONTAINER}" nginx -s reload 2>/dev/null || true
  echo "=== fast admin done ==="
}

# Usage: fast_deploy_api | fast_deploy_admin | fast_deploy_both
case "${1:-}" in
  api) fast_deploy_api ;;
  admin) fast_deploy_admin ;;
  both)
    fast_deploy_api
    fast_deploy_admin
    ;;
  *)
    echo "Usage: $0 api|admin|both" >&2
    exit 1
    ;;
esac
