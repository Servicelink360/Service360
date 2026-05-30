#!/bin/bash
# Run on EC2 as root/sudo AFTER DNS A records point to this server's Elastic IP.
# Usage: sudo bash deploy/setup-https.sh
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/app}"
HTTPS_ENV="${APP_DIR}/deploy/https.env"
if [ -f "$HTTPS_ENV" ]; then
  # shellcheck disable=SC1090
  source "$HTTPS_ENV"
fi

API_DOMAIN="${API_DOMAIN:-api.service360.com.au}"
ADMIN_DOMAIN="${ADMIN_DOMAIN:-admin.service360.com.au}"
EMAIL="${SSL_EMAIL:-admin@service360.com.au}"
API_URL="${API_URL:-https://${API_DOMAIN}/}"
COMPOSE_FILE="${APP_DIR}/deploy/docker-compose.aws-test.yml"
ENV_FILE="${APP_DIR}/service_link_api-main/.env.prod"

echo "=== Service360 HTTPS setup ==="
echo "API domain:   $API_DOMAIN"
echo "Admin domain: $ADMIN_DOMAIN"
echo ""

PUBLIC_IP="$(curl -s --max-time 5 http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || true)"
if [ -n "$PUBLIC_IP" ]; then
  echo "This server Elastic/public IP: $PUBLIC_IP"
  echo "DNS must point both domains to this IP before certbot can succeed."
  echo ""
fi

cd "$APP_DIR"

# Admin docker must not bind host port 80 (host nginx needs 80/443).
if grep -q '"80:80"' "$COMPOSE_FILE"; then
  echo "Moving admin container from port 80 -> 8080..."
  sed -i 's/"80:80"/"8080:80"/' "$COMPOSE_FILE"
  docker compose -f "$COMPOSE_FILE" up -d admin
fi

apt-get update -qq
apt-get install -y nginx certbot python3-certbot-nginx

mkdir -p /var/www/certbot

install_http_site() {
  local name="$1" domain="$2" upstream="$3"
  cat > "/etc/nginx/sites-available/${name}" <<EOF
server {
    listen 80;
    server_name ${domain};
    location /.well-known/acme-challenge/ { root /var/www/certbot; }
    location / {
        proxy_pass http://127.0.0.1:${upstream};
        proxy_set_header Host \$host;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF
}

install_http_site service360-api "$API_DOMAIN" 5301
install_http_site service360-admin "$ADMIN_DOMAIN" 8080

ln -sf /etc/nginx/sites-available/service360-api /etc/nginx/sites-enabled/
ln -sf /etc/nginx/sites-available/service360-admin /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl enable nginx && systemctl reload nginx

echo "Requesting SSL certificates (one cert, both hostnames)..."
certbot --nginx -d "$API_DOMAIN" -d "$ADMIN_DOMAIN" \
  --non-interactive --agree-tos -m "$EMAIL" --redirect

CERT_DIR="/etc/letsencrypt/live/${API_DOMAIN}"
if [ ! -f "${CERT_DIR}/fullchain.pem" ]; then
  # certbot may use first alphabetically or existing lineage name
  CERT_DIR="$(dirname "$(readlink -f /etc/letsencrypt/live/${API_DOMAIN}/fullchain.pem 2>/dev/null || true)" 2>/dev/null || true)"
  CERT_DIR="$(dirname "$CERT_DIR")"
fi
if [ ! -f "${CERT_DIR}/fullchain.pem" ]; then
  CERT_DIR="/etc/letsencrypt/live/${API_DOMAIN}"
fi

install_ssl_site() {
  local name="$1" domain="$2" upstream="$3" extra="${4:-}"
  cat > "/etc/nginx/sites-available/${name}" <<EOF
server {
    listen 80;
    server_name ${domain};
    location /.well-known/acme-challenge/ { root /var/www/certbot; }
    location / { return 301 https://\$host\$request_uri; }
}

server {
    listen 443 ssl http2;
    server_name ${domain};

    ssl_certificate     ${CERT_DIR}/fullchain.pem;
    ssl_certificate_key ${CERT_DIR}/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
    ${extra}

    location / {
        proxy_pass http://127.0.0.1:${upstream};
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF
}

install_ssl_site service360-api "$API_DOMAIN" 5301 "client_max_body_size 100M;
        proxy_read_timeout 300s;"
install_ssl_site service360-admin "$ADMIN_DOMAIN" 8080 ""

nginx -t && systemctl reload nginx

if [ -f "$ENV_FILE" ]; then
  sed -i "s|^BASE_UPLOAD_URL=.*|BASE_UPLOAD_URL=${API_URL}|" "$ENV_FILE"
fi

export REACT_APP_ORDER_API_URL="${API_URL}"
echo "Rebuilding admin with API URL ${API_URL} ..."
docker compose -f "$COMPOSE_FILE" build admin
docker compose -f "$COMPOSE_FILE" up -d --force-recreate api admin

# Persist HTTPS settings for auto-deploy
cat > "$HTTPS_ENV" <<EOF
API_DOMAIN=${API_DOMAIN}
ADMIN_DOMAIN=${ADMIN_DOMAIN}
SSL_EMAIL=${EMAIL}
API_URL=${API_URL}
EOF

echo ""
echo "=== Done ==="
echo "Admin: https://${ADMIN_DOMAIN}/"
echo "API:   https://${API_DOMAIN}/"
echo ""
echo "Open EC2 security group: allow inbound TCP 443 (HTTPS) from your users."
echo "Optional: remove public port 5301 after confirming API works on HTTPS."
