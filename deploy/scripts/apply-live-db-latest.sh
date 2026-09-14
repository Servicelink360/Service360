#!/bin/bash
# Apply latest-change DB data on live RDS via API container env.
# Run on EC2: bash /tmp/apply-live-db-latest.sh
set -euo pipefail

echo "=== Ensure report_template_staffs (idempotent SQL) ==="
ENV=$(sudo docker inspect deploy-api-1 --format '{{range .Config.Env}}{{println .}}{{end}}')
DB_PASS=$(echo "$ENV" | sed -n 's/^DATABASE_PASSWORD=//p')
DB_HOST=$(echo "$ENV" | sed -n 's/^DATABASE_HOST=//p')
DB_USER=$(echo "$ENV" | sed -n 's/^DATABASE_USERNAME=//p')
DB_NAME=$(echo "$ENV" | sed -n 's/^DATABASE_DB_NAME=//p')

sudo docker run --rm -v /tmp/ensure-report-template-staffs.sql:/m.sql postgres:16-alpine \
  psql "postgresql://${DB_USER}:${DB_PASS}@${DB_HOST}:5432/${DB_NAME}?sslmode=require" \
  -v ON_ERROR_STOP=1 -f /m.sql

echo "=== Seed Incident template ==="
sudo docker cp /tmp/seed-incident-report-template.js deploy-api-1:/usr/src/app/seed-incident-report-template.js
sudo docker exec -w /usr/src/app deploy-api-1 node seed-incident-report-template.js

echo "=== Seed Safety Audit template ==="
sudo docker cp /tmp/seed-safety-audit-template.js deploy-api-1:/usr/src/app/seed-safety-audit-template.js
sudo docker exec -w /usr/src/app deploy-api-1 node seed-safety-audit-template.js

echo "=== Verify ==="
sudo docker run --rm -v /tmp/verify-live-db-latest.sql:/m.sql postgres:16-alpine \
  psql "postgresql://${DB_USER}:${DB_PASS}@${DB_HOST}:5432/${DB_NAME}?sslmode=require" \
  -v ON_ERROR_STOP=1 -f /m.sql

echo "=== Done ==="
