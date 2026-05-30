#!/bin/bash
# Auto-deploy on EC2 (called by GitHub Actions or manually).
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/app}"
API_URL="${API_URL:-http://13.55.122.55:5301/}"
COMPOSE_FILE="${APP_DIR}/deploy/docker-compose.aws-test.yml"
ENV_PROD="${APP_DIR}/service_link_api-main/.env.prod"

cd "$APP_DIR"

echo "=== git pull ==="
git fetch origin main
git reset --hard origin/main

if [ -f "$ENV_PROD" ]; then
  echo "=== update .env.prod ==="
  sed -i "s|^BASE_UPLOAD_URL=.*|BASE_UPLOAD_URL=${API_URL}|" "$ENV_PROD"
  sed -i 's|^REDIS_IP=.*|REDIS_IP=redis|' "$ENV_PROD" || true
  grep -q '^REDIS_IP=' "$ENV_PROD" || echo 'REDIS_IP=redis' >> "$ENV_PROD"
fi

export REACT_APP_ORDER_API_URL="${API_URL}"

echo "=== docker build + up ==="
docker compose -f "$COMPOSE_FILE" build api admin
docker compose -f "$COMPOSE_FILE" up -d --force-recreate

echo "=== status ==="
docker compose -f "$COMPOSE_FILE" ps

echo "=== done ==="
echo "Admin: http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || echo EC2-IP)/"
echo "API:   ${API_URL}"
