#!/usr/bin/env sh
set -eu

APP_DIR="${HOME}/vocaboom"
CADDY_CONFIG="/root/Caddyfile"
CADDY_BACKUP="/root/Caddyfile.vocaboom-backup"
CADDY_CONTAINER="caddy-gateway"
WEB_ROOT="/root/frontend/dist/vocaboom"

cd "$APP_DIR"
docker compose -f deploy/compose.prod.yml up -d --build --remove-orphans

install -d "$WEB_ROOT"
rsync -a --delete apps/web/dist/ "$WEB_ROOT/"

cp "$CADDY_CONFIG" "$CADDY_BACKUP"
awk '
  $0 == "# BEGIN VOCABOOM" { skipping = 1; next }
  $0 == "# END VOCABOOM" { skipping = 0; next }
  !skipping { print }
' "$CADDY_CONFIG" > "${CADDY_CONFIG}.tmp"

{
  printf '\n# BEGIN VOCABOOM\n'
  cat deploy/Caddyfile
  printf '# END VOCABOOM\n'
} >> "${CADDY_CONFIG}.tmp"
mv "${CADDY_CONFIG}.tmp" "$CADDY_CONFIG"

if ! docker exec "$CADDY_CONTAINER" caddy validate --config /etc/caddy/Caddyfile; then
  mv "$CADDY_BACKUP" "$CADDY_CONFIG"
  exit 1
fi

docker exec "$CADDY_CONTAINER" caddy reload --config /etc/caddy/Caddyfile
rm -f "$CADDY_BACKUP"
docker image prune -f
