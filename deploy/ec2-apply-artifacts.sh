#!/bin/bash
# Apply pre-built artifacts copied to /tmp/deploy-artifacts (from GitHub Actions).
set -euo pipefail

WHAT="${1:-both}"
ARTIFACT_ROOT="${ARTIFACT_ROOT:-/tmp/deploy-artifacts}"
API_CONTAINER="${API_CONTAINER:-deploy-api-1}"
ADMIN_CONTAINER="${ADMIN_CONTAINER:-deploy-admin-1}"

apply_api() {
  local dir="${ARTIFACT_ROOT}/api"
  [ -d "$dir/dist" ] || { echo "missing ${dir}/dist" >&2; exit 1; }
  echo "=== apply API dist ==="
  docker cp "${dir}/dist/." "${API_CONTAINER}:/usr/src/app/dist/"
  [ -f "${dir}/template.html" ] && docker cp "${dir}/template.html" "${API_CONTAINER}:/usr/src/app/template.html"
  docker restart "${API_CONTAINER}"
  echo "=== API live ==="
}

apply_admin() {
  local dir="${ARTIFACT_ROOT}/admin/build"
  local nginx_conf="${ARTIFACT_ROOT}/admin/nginx.conf"
  [ -d "$dir" ] || { echo "missing ${dir}" >&2; exit 1; }
  echo "=== apply admin static files ==="
  docker exec "${ADMIN_CONTAINER}" sh -c 'rm -rf /usr/share/nginx/html/*'
  docker cp "${dir}/." "${ADMIN_CONTAINER}:/usr/share/nginx/html/"
  if [ -f "$nginx_conf" ]; then
    docker cp "$nginx_conf" "${ADMIN_CONTAINER}:/etc/nginx/conf.d/default.conf"
  fi
  docker restart "${ADMIN_CONTAINER}" >/dev/null
  echo "=== admin live ==="
}

case "$WHAT" in
  api) apply_api ;;
  admin) apply_admin ;;
  both)
    apply_api
    apply_admin
    ;;
  *)
    echo "Usage: $0 api|admin|both" >&2
    exit 1
    ;;
esac

docker ps --format 'table {{.Names}}\t{{.Status}}'
