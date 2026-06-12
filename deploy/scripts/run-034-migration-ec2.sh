#!/bin/bash
set -euo pipefail
ENV=$(sudo docker inspect deploy-api-1 --format '{{range .Config.Env}}{{println .}}{{end}}')
DB_PASS=$(echo "$ENV" | sed -n 's/^DATABASE_PASSWORD=//p')
DB_HOST=$(echo "$ENV" | sed -n 's/^DATABASE_HOST=//p')
DB_USER=$(echo "$ENV" | sed -n 's/^DATABASE_USERNAME=//p')
DB_NAME=$(echo "$ENV" | sed -n 's/^DATABASE_DB_NAME=//p')
sudo docker run --rm -v /tmp/034_migration.sql:/m.sql postgres:16-alpine \
  psql "postgresql://${DB_USER}:${DB_PASS}@${DB_HOST}:5432/${DB_NAME}?sslmode=require" \
  -v ON_ERROR_STOP=1 -f /m.sql
echo "Migration applied OK"
