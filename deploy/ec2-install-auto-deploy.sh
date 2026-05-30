#!/bin/bash
# Run ONCE on EC2: sudo bash deploy/ec2-install-auto-deploy.sh
# After that: push to GitHub main → auto deploy to AWS within ~2 minutes.
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/app}"
LOG="/var/log/service360-deploy.log"

install -m 755 "${APP_DIR}/deploy/ec2-auto-deploy.sh" /usr/local/bin/service360-auto-deploy

cat > /etc/cron.d/service360-auto-deploy << 'CRON'
# GitHub main → AWS: check every 2 minutes
*/2 * * * * root /usr/local/bin/service360-auto-deploy
CRON
chmod 644 /etc/cron.d/service360-auto-deploy
touch "$LOG"

echo "$(date -Is) first deploy" >> "$LOG"
bash "${APP_DIR}/deploy/ec2-deploy.sh" >> "$LOG" 2>&1 || true

echo "OK — git push to main auto-deploys to AWS (~2 min)."
echo "Log: tail -f ${LOG}"
