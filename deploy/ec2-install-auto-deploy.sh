#!/bin/bash
# Install cron: git sync only (no docker build). Run ec2-setup-stability.sh for full OOM protection.
set -euo pipefail
APP_DIR="${APP_DIR:-/opt/app}"
LOG="/var/log/service360-deploy.log"
cat > /etc/cron.d/service360-auto-deploy << CRON
*/5 * * * * root /bin/bash ${APP_DIR}/deploy/ec2-auto-deploy.sh
CRON
chmod 644 /etc/cron.d/service360-auto-deploy
touch "$LOG"
echo "Cron: git sync only every 5 min (no docker build). Log: $LOG"
echo "Run: sudo bash ${APP_DIR}/deploy/ec2-setup-stability.sh for swap + watchdog"
