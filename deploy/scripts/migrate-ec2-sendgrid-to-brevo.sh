#!/bin/bash
# Remove legacy SendGrid SMTP env lines from EC2 .env.prod (run once on server).
set -euo pipefail
ENV_FILE="${1:-/opt/app/service_link_api-main/.env.prod}"
for key in MAIL_HOST MAIL_PORT MAIL_USER MAIL_SECURE MAIL_PASSWORD; do
  sudo sed -i "/^${key}=/d" "$ENV_FILE" 2>/dev/null || true
done
grep -q '^MAIL_FROM_NAME=' "$ENV_FILE" || echo 'MAIL_FROM_NAME=Service360' | sudo tee -a "$ENV_FILE" >/dev/null
grep -q '^BREVO_API_KEY=' "$ENV_FILE" || echo 'BREVO_API_KEY=' | sudo tee -a "$ENV_FILE" >/dev/null
echo "Cleaned SendGrid vars in $ENV_FILE. Set BREVO_API_KEY then run sync-mail-env-ec2.ps1"
