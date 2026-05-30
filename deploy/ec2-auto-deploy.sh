#!/bin/bash
# Cron entry point — always use latest script from git clone.
set -e
APP_DIR="${APP_DIR:-/opt/app}"
LOG="${LOG:-/var/log/service360-deploy.log}"
exec >> "$LOG" 2>&1
echo "$(date -Is) auto-deploy start"
cd "$APP_DIR"
git fetch origin main 2>/dev/null || exit 0
LOCAL=$(git rev-parse HEAD 2>/dev/null || echo none)
REMOTE=$(git rev-parse origin/main 2>/dev/null || echo other)
if [ "$LOCAL" = "$REMOTE" ]; then
  echo "$(date -Is) no change ($LOCAL)"
  exit 0
fi
echo "$(date -Is) deploying $REMOTE (was ${LOCAL:0:8})"
git reset --hard origin/main
PREV_COMMIT="$LOCAL" bash "$APP_DIR/deploy/ec2-deploy.sh"
echo "$(date -Is) auto-deploy end"
