#!/bin/bash
set -e
echo "MAIL_FROM=${MAIL_FROM:-MISSING}"
echo "MAIL_FROM_NAME=${MAIL_FROM_NAME:-Service360}"
if [ -n "${BREVO_API_KEY}" ]; then
  echo "BREVO_API_KEY=SET len=${#BREVO_API_KEY}"
elif [ -n "${MAIL_PASSWORD}" ]; then
  echo "BREVO_API_KEY=MISSING (legacy MAIL_PASSWORD set len=${#MAIL_PASSWORD})"
else
  echo "BREVO_API_KEY=MISSING"
fi
echo "APP_URL=${APP_URL:-MISSING}"
node -e "
const key = (process.env.BREVO_API_KEY || process.env.MAIL_PASSWORD || '').trim();
const ok = process.env.MAIL_FROM && key.length >= 16;
console.log('mail_configured=' + ok);
if (!ok) process.exit(1);
"
