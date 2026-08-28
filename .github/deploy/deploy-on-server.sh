#!/usr/bin/env sh
set -eu

APP_DIR="${HOME}/vocaboom"
WEB_ROOT="/root/frontend/dist/vocaboom"
NGINX_CONFIG="/etc/nginx/sites-available/vocaboom.conf"
NGINX_ENABLED="/etc/nginx/sites-enabled/vocaboom.conf"

cd "$APP_DIR"
docker compose -f .github/deploy/compose.prod.yml up -d --build --remove-orphans

install -d "$WEB_ROOT"
rsync -a --delete --exclude desktop-updates/ apps/web/dist/ "$WEB_ROOT/"

install -m 644 .github/deploy/nginx-vocaboom.conf "$NGINX_CONFIG"
ln -sfn "$NGINX_CONFIG" "$NGINX_ENABLED"
nginx -t
systemctl reload nginx
docker image prune -f
