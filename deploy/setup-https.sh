#!/bin/bash
# Run on EC2 as root/sudo after DNS points to this server.
# Usage: sudo bash deploy/setup-https.sh
set -e

API_DOMAIN="${API_DOMAIN:-api.service360.com.au}"
ADMIN_DOMAIN="${ADMIN_DOMAIN:-admin.service360.com.au}"
EMAIL="${SSL_EMAIL:-admin@service360.com.au}"
APP_DIR="${APP_DIR:-/opt/app}"

echo "=== Service360 HTTPS setup ==="
echo "API domain:   $API_DOMAIN"
echo "Admin domain: $ADMIN_DOMAIN"
echo ""

# Admin docker must not bind host port 80 (host nginx needs 80/443).
cd "$APP_DIR"
if grep -q '"80:80"' deploy/docker-compose.aws-test.yml; then
  echo "Moving admin container from port 80 -> 8080..."
  sed -i 's/"80:80"/"8080:80"/' deploy/docker-compose.aws-test.yml
  docker compose -f deploy/docker-compose.aws-test.yml up -d admin
fi

apt-get update -qq
apt-get install -y nginx certbot python3-certbot-nginx

mkdir -p /var/www/certbot

# Temporary HTTP-only configs for certbot (before SSL lines exist).
cat > /etc/nginx/sites-available/service360-api <<EOF
server {
    listen 80;
    server_name ${API_DOMAIN};
    location /.well-known/acme-challenge/ { root /var/www/certbot; }
    location / {
        proxy_pass http://127.0.0.1:5301;
        proxy_set_header Host \$host;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

cat > /etc/nginx/sites-available/service360-admin <<EOF
server {
    listen 80;
    server_name ${ADMIN_DOMAIN};
    location /.well-known/acme-challenge/ { root /var/www/certbot; }
    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host \$host;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

ln -sf /etc/nginx/sites-available/service360-api /etc/nginx/sites-enabled/
ln -sf /etc/nginx/sites-available/service360-admin /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

echo "Requesting SSL certificates..."
certbot --nginx -d "$API_DOMAIN" -d "$ADMIN_DOMAIN" \
  --non-interactive --agree-tos -m "$EMAIL" --redirect

# Install full configs with SSL paths (certbot may have already updated them).
cp "$APP_DIR/deploy/nginx-host-api.conf" /etc/nginx/sites-available/service360-api
cp "$APP_DIR/deploy/nginx-host-admin.conf" /etc/nginx/sites-available/service360-admin
nginx -t && systemctl reload nginx

# Update API env
ENV_FILE="$APP_DIR/service_link_api-main/.env.prod"
sed -i "s|^BASE_UPLOAD_URL=.*|BASE_UPLOAD_URL=https://${API_DOMAIN}/|" "$ENV_FILE"
docker compose -f deploy/docker-compose.aws-test.yml up -d api

echo ""
echo "=== Done ==="
echo "API:   https://${API_DOMAIN}/"
echo "Admin: https://${ADMIN_DOMAIN}/"
echo ""
echo "Next: rebuild admin with REACT_APP_ORDER_API_URL=https://${API_DOMAIN}/"
echo "  cd $APP_DIR"
echo "  export REACT_APP_ORDER_API_URL=https://${API_DOMAIN}/"
echo "  docker compose -f deploy/docker-compose.aws-test.yml build admin --no-cache"
echo "  docker compose -f deploy/docker-compose.aws-test.yml up -d --force-recreate admin"
