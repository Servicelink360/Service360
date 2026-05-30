#!/bin/bash
# Polls GitHub main every 2 min; runs ec2-deploy.sh when a new commit appears.
# Installed by: sudo bash deploy/ec2-install-auto-deploy.sh
set -e
APP_DIR="${APP_DIR:-/opt/app}"
LOG="${LOG:-/var/log/service360-deploy.log}"
cd "$APP_DIR"
git fetch origin main 2>/dev/null || exit 0
LOCAL=$(git rev-parse HEAD 2>/dev/null || echo none)
REMOTE=$(git rev-parse origin/main 2>/dev/null || echo other)
if [ "$LOCAL" = "$REMOTE" ]; then exit 0; fi
echo "$(date -Is) new commit $REMOTE (was $LOCAL)" >> "$LOG"
git reset --hard origin/main
bash "$APP_DIR/deploy/ec2-deploy.sh" >> "$LOG" 2>&1
echo "$(date -Is) done" >> "$LOG"
