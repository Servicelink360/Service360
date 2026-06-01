#!/bin/bash
# On NEW EC2 (13.55.122.55): pull old report PDFs, upload to S3, fix DB pdf_file URLs.
#
# Option A — rsync from old EC2 (old server must be running + SSH key at ~/.ssh/old-prod.pem):
#      OLD_HOST=ubuntu@3.104.215.45 bash deploy/sync-old-pdfs-from-server.sh
#
# Option B — HTTP download from dump URLs (if old API still serves /public/pdf/):
#      node service_link_api-main/scripts/download-legacy-pdfs.js public/pdf/legacy
#
# Then upload to S3 + update RDS:
#      bash deploy/migrate-old-pdfs-to-s3.sh --apply

set -euo pipefail

APP_DIR="${APP_DIR:-/opt/app}"
PDF_DIR="${PDF_DIR:-$APP_DIR/service_link_api-main/public/pdf/legacy}"
APPLY="${1:-}"

echo "=== Legacy PDF folder: $PDF_DIR ==="
COUNT=$(find "$PDF_DIR" -maxdepth 1 -type f -name '*.pdf' 2>/dev/null | wc -l)
echo "PDF files on disk: $COUNT"

if [ "$COUNT" -lt 1 ]; then
  echo ""
  echo "No PDFs found. Sync from OLD server first:"
  echo "  OLD_HOST=ubuntu@3.104.215.45 bash $APP_DIR/deploy/sync-old-pdfs-from-server.sh"
  echo ""
  exit 1
fi

sudo docker cp "$PDF_DIR/." deploy-api-1:/usr/src/app/public/pdf/legacy/
sudo docker cp "$APP_DIR/service_link_api-main/scripts/migrate-legacy-pdfs-to-s3.js" \
  deploy-api-1:/usr/src/app/migrate-legacy-pdfs-to-s3.js

ARGS=(node /usr/src/app/migrate-legacy-pdfs-to-s3.js /usr/src/app/public/pdf/legacy)
[ "$APPLY" = "--apply" ] && ARGS+=(--apply)

sudo docker exec -w /usr/src/app deploy-api-1 "${ARGS[@]}"
echo "=== Done ==="
