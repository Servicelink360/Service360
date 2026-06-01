#!/bin/bash
# Rsync public/upload/files from OLD prod EC2 into NEW server folder.
# Requires: SSH key for old server at ~/.ssh/old-prod.pem (or set OLD_SSH_KEY)
#
#   OLD_HOST=ubuntu@3.104.215.45 bash deploy/sync-old-uploads-from-server.sh

set -euo pipefail

APP_DIR="${APP_DIR:-/opt/app}"
DEST="${DEST:-$APP_DIR/service_link_api-main/public/upload/files}"
OLD_HOST="${OLD_HOST:-ubuntu@3.104.215.45}"
OLD_PATH="${OLD_PATH:-/opt/app/service_link_api-main/public/upload/files}"
OLD_SSH_KEY="${OLD_SSH_KEY:-$HOME/.ssh/old-prod.pem}"

SSH=(ssh -o StrictHostKeyChecking=no)
RSYNC=(rsync -avz --progress)
if [ -f "$OLD_SSH_KEY" ]; then
  SSH+=(-i "$OLD_SSH_KEY")
  RSYNC+=(-e "ssh -i $OLD_SSH_KEY -o StrictHostKeyChecking=no")
fi

mkdir -p "$DEST"
echo "=== rsync $OLD_HOST:$OLD_PATH/ -> $DEST/ ==="
"${RSYNC[@]}" "${OLD_HOST}:${OLD_PATH}/" "$DEST/"

echo "=== $(find "$DEST" -maxdepth 1 -type f | wc -l) files in $DEST ==="
echo "Next: sudo bash $APP_DIR/deploy/migrate-old-uploads-to-s3.sh --apply"
