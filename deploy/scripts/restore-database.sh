#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
DUMP="${DATABASE_DUMP_PATH:-$ROOT/deploy/database/29__05_2026.sql}"
RDS_HOST="${RDS_HOST:?Set RDS_HOST}"
RDS_USER="${RDS_USER:-postgres}"
RDS_PASSWORD="${RDS_PASSWORD:?Set RDS_PASSWORD}"
DB="${RDS_DB:-service360}"

if [[ ! -f "$DUMP" ]]; then
  echo "Dump not found: $DUMP"
  exit 1
fi

export PGPASSWORD="$RDS_PASSWORD"
psql -h "$RDS_HOST" -U "$RDS_USER" -d postgres -tc "SELECT 1 FROM pg_database WHERE datname='$DB'" | grep -q 1 \
  || psql -h "$RDS_HOST" -U "$RDS_USER" -d postgres -c "CREATE DATABASE $DB"

TEMP="/tmp/service360-restore.sql"
sed '/^\\restrict/d' "$DUMP" > "$TEMP"
psql -h "$RDS_HOST" -U "$RDS_USER" -d "$DB" -v ON_ERROR_STOP=0 -f "$TEMP" || true

for f in "$ROOT/service_link_api-main/database/migrations/"*.sql; do
  echo "Migration: $(basename "$f")"
  psql -h "$RDS_HOST" -U "$RDS_USER" -d "$DB" -v ON_ERROR_STOP=0 -f "$f" || true
done
echo "Database restore finished."
