#!/bin/bash
# Re-run after git pull to refresh cron (uses script from repo, not stale copy).
set -euo pipefail
APP_DIR="${APP_DIR:-/opt/app}"
LOG="/var/log/service360-deploy.log"
cat > /etc/cron.d/service360-auto-deploy << CRON
*/2 * * * * root /bin/bash ${APP_DIR}/deploy/ec2-auto-deploy.sh
CRON
chmod 644 /etc/cron.d/service360-auto-deploy
touch "$LOG"
echo "Cron updated. Log: $LOG"
