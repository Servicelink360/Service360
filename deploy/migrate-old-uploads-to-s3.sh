#!/bin/bash
# On NEW EC2 (13.55.122.55): pull old upload files from OLD server, upload to S3, fix DB URLs.
#
# 1) Sync files from old prod (needs SSH key on this server — one-time):
#      OLD_HOST=ubuntu@3.104.215.45 OLD_PATH=/opt/app/service_link_api-main/public/upload/files bash deploy/sync-old-uploads-from-server.sh
# 2) Upload to S3 + update RDS:
#      bash deploy/migrate-old-uploads-to-s3.sh --apply

set -euo pipefail

APP_DIR="${APP_DIR:-/opt/app}"
UPLOAD_DIR="${UPLOAD_DIR:-$APP_DIR/service_link_api-main/public/upload/files}"
APPLY="${1:-}"

echo "=== Upload folder: $UPLOAD_DIR ==="
COUNT=$(find "$UPLOAD_DIR" -maxdepth 1 -type f 2>/dev/null | wc -l)
echo "Files on disk: $COUNT"

if [ "$COUNT" -lt 10 ]; then
  echo ""
  echo "WARNING: Very few files. Sync from OLD server first:"
  echo "  OLD_HOST=ubuntu@3.104.215.45 bash $APP_DIR/deploy/sync-old-uploads-from-server.sh"
  echo ""
fi

sudo docker cp "$UPLOAD_DIR/." deploy-api-1:/usr/src/app/public/upload/files/
sudo docker cp "$APP_DIR/service_link_api-main/scripts/migrate-uploads-to-s3.js" deploy-api-1:/usr/src/app/migrate-uploads-to-s3.js

ARGS=(node /usr/src/app/migrate-uploads-to-s3.js /usr/src/app/public/upload/files)
[ "$APPLY" = "--apply" ] && ARGS+=(--apply)

sudo docker exec -w /usr/src/app deploy-api-1 "${ARGS[@]}"

# Copy into running container path used by static fallback
echo "=== Done ==="
