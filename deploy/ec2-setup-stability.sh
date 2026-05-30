#!/bin/bash
# One-time (or after reboot): swap + watchdog cron + no heavy builds on EC2.
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/app}"

echo "=== 1. Swap (2GB) ==="
if ! swapon --show | grep -q /swapfile; then
  if [ ! -f /swapfile ]; then
    fallocate -l 2G /swapfile 2>/dev/null || dd if=/dev/zero of=/swapfile bs=1M count=2048 status=none
    chmod 600 /swapfile
    mkswap /swapfile
  fi
  swapon /swapfile
fi
grep -q '^/swapfile ' /etc/fstab 2>/dev/null || echo '/swapfile none swap sw 0 0' >> /etc/fstab
swapon --show

echo "=== 2. Watchdog cron (restart API/admin if down) ==="
cat > /etc/cron.d/service360-watchdog << CRON
* * * * * root /bin/bash ${APP_DIR}/deploy/ec2-watchdog.sh
CRON
chmod 644 /etc/cron.d/service360-watchdog
touch /var/log/service360-watchdog.log

echo "=== 3. Auto-deploy: git sync only — NO docker build on server ==="
cat > /etc/cron.d/service360-auto-deploy << CRON
*/5 * * * * root /bin/bash ${APP_DIR}/deploy/ec2-auto-deploy.sh
CRON
chmod 644 /etc/cron.d/service360-auto-deploy

echo "=== 4. Apply docker compose memory limits ==="
if [ -f "${APP_DIR}/deploy/docker-compose.aws-test.yml" ]; then
  cd "$APP_DIR"
  docker compose -f deploy/docker-compose.aws-test.yml up -d
fi

echo "=== Done ==="
echo "Deploy code via GitHub Actions (Fast deploy) — never build React on this server."
echo "Watchdog log: /var/log/service360-watchdog.log"
