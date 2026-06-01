#!/bin/bash
# Rsync report PDFs from OLD prod EC2 into NEW server folder.
# Requires: SSH key for old server at ~/.ssh/old-prod.pem (or set OLD_SSH_KEY)
#
#   OLD_HOST=ubuntu@3.104.215.45 bash deploy/sync-old-pdfs-from-server.sh

set -euo pipefail

APP_DIR="${APP_DIR:-/opt/app}"
DEST="${DEST:-$APP_DIR/service_link_api-main/public/pdf/legacy}"
OLD_HOST="${OLD_HOST:-ubuntu@3.104.215.45}"
OLD_PATH="${OLD_PATH:-/opt/app/service_link_api-main/public/pdf}"
OLD_SSH_KEY="${OLD_SSH_KEY:-$HOME/.ssh/old-prod.pem}"

RSYNC=(rsync -avz --progress --include='*.pdf' --include='*.PDF' --exclude='*')
if [ -f "$OLD_SSH_KEY" ]; then
  RSYNC+=(-e "ssh -i $OLD_SSH_KEY -o StrictHostKeyChecking=no")
else
  RSYNC+=(-e "ssh -o StrictHostKeyChecking=no")
fi

sudo mkdir -p "$DEST"
sudo chown -R "$(whoami):$(whoami)" "$DEST" 2>/dev/null || true
echo "=== rsync $OLD_HOST:$OLD_PATH/ -> $DEST/ ==="
"${RSYNC[@]}" "${OLD_HOST}:${OLD_PATH}/" "$DEST/"

COUNT=$(find "$DEST" -maxdepth 1 -type f -name '*.pdf' 2>/dev/null | wc -l)
echo "=== $COUNT PDF files in $DEST ==="
echo "Next: bash $APP_DIR/deploy/migrate-old-pdfs-to-s3.sh --apply"
