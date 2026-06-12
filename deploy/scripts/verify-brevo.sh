#!/bin/bash
set -e
KEY="${BREVO_API_KEY:-$MAIL_PASSWORD}"
if [ -z "$KEY" ]; then
  echo "brevo_ok=false reason=missing_api_key"
  exit 1
fi
node <<'NODE'
const axios = require('axios');
const key = process.env.BREVO_API_KEY || process.env.MAIL_PASSWORD;
axios
  .get('https://api.brevo.com/v3/account', {
    headers: { 'api-key': key, accept: 'application/json' },
    timeout: 20000,
  })
  .then((res) => {
    const email = res.data && res.data.email;
    console.log('brevo_ok=true account=' + (email || 'unknown'));
  })
  .catch((e) => {
    console.error('brevo_ok=false');
    console.error(e.response && e.response.data ? JSON.stringify(e.response.data) : e.message);
    process.exit(1);
  });
NODE
