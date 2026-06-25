#!/bin/bash
# READ-ONLY RDS backup via EC2 (pg_dump). Does not modify the database.
set -euo pipefail

TIMESTAMP="${1:-$(date +%Y-%m-%d_%H%M)}"
OUT="/tmp/backup_rds_${TIMESTAMP}.sql"

ENV=$(sudo docker inspect deploy-api-1 --format '{{range .Config.Env}}{{println .}}{{end}}')
DB_PASS=$(echo "$ENV" | sed -n 's/^DATABASE_PASSWORD=//p' | head -1)
DB_HOST=$(echo "$ENV" | sed -n 's/^DATABASE_HOST=//p' | head -1)
DB_USER=$(echo "$ENV" | sed -n 's/^DATABASE_USERNAME=//p' | head -1)
DB_NAME=$(echo "$ENV" | sed -n 's/^DATABASE_DB_NAME=//p' | head -1)

DB_USER="${DB_USER:-postgres}"
DB_NAME="${DB_NAME:-service360}"

if [[ -z "$DB_PASS" || -z "$DB_HOST" ]]; then
  echo "Could not read DATABASE_HOST / DATABASE_PASSWORD from deploy-api-1" >&2
  exit 1
fi

echo "READ-ONLY pg_dump: ${DB_HOST}/${DB_NAME} -> ${OUT}"

sudo docker run --rm \
  -v /tmp:/backup \
  -e PGPASSWORD="$DB_PASS" \
  -e PGSSLMODE=require \
  postgres:18-alpine \
  pg_dump \
  -h "$DB_HOST" \
  -p 5432 \
  -U "$DB_USER" \
  -d "$DB_NAME" \
  --no-owner \
  --no-acl \
  -F p \
  -f "/backup/$(basename "$OUT")"

SIZE=$(du -h "$OUT" | cut -f1)
echo "Backup ready on EC2: $OUT ($SIZE)"
echo "$OUT"
