#!/bin/bash
# Run ONCE on EC2 (with sudo). After this, every git push to main auto-deploys within ~2 min.
#   cd /opt/app && sudo git pull
#   sudo bash deploy/ec2-install-auto-deploy.sh
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/app}"
API_URL="${API_URL:-http://13.55.122.55:5301/}"
LOG="/var/log/service360-deploy.log"

cat > /usr/local/bin/service360-auto-deploy << EOF
#!/bin/bash
set -e
cd ${APP_DIR}
git fetch origin main 2>/dev/null || exit 0
LOCAL=\$(git rev-parse HEAD 2>/dev/null || echo none)
REMOTE=\$(git rev-parse origin/main 2>/dev/null || echo other)
if [ "\$LOCAL" = "\$REMOTE" ]; then exit 0; fi

echo "\$(date -Is) deploying \$REMOTE" >> ${LOG}
git reset --hard origin/main

ENV_PROD="${APP_DIR}/service_link_api-main/.env.prod"
if [ -f "\$ENV_PROD" ]; then
  sed -i "s|^BASE_UPLOAD_URL=.*|BASE_UPLOAD_URL=${API_URL}|" "\$ENV_PROD"
  sed -i 's|^REDIS_IP=.*|REDIS_IP=redis|' "\$ENV_PROD" 2>/dev/null || true
fi

export REACT_APP_ORDER_API_URL="${API_URL}"
cd ${APP_DIR}
docker compose -f deploy/docker-compose.aws-test.yml build api admin
docker compose -f deploy/docker-compose.aws-test.yml up -d --force-recreate
echo "\$(date -Is) done" >> ${LOG}
EOF

chmod +x /usr/local/bin/service360-auto-deploy

cat > /etc/cron.d/service360-auto-deploy << 'CRON'
# Auto-deploy Service360 when GitHub main changes
*/2 * * * * root /usr/local/bin/service360-auto-deploy
CRON

chmod 644 /etc/cron.d/service360-auto-deploy
touch "$LOG"

echo "Running first deploy now..."
/usr/local/bin/service360-auto-deploy || bash "${APP_DIR}/deploy/ec2-deploy.sh"

echo "Installed. Pushes to main deploy within ~2 minutes."
echo "Log: tail -f ${LOG}"
