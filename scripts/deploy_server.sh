#!/usr/bin/env bash
set -euo pipefail

BRANCH="${1:-main}"
APP_ROOT="${APP_ROOT:-/var/www/quadrailearn/app}"
SITE_ROOT="${SITE_ROOT:-/var/www/quadrailearn/site}"
SERVICE_NAME="${SERVICE_NAME:-quadrailearn.service}"
BACKUP_ROOT="${BACKUP_ROOT:-/var/www/quadrailearn/backups}"

cd "$APP_ROOT"

git config --global --add safe.directory "$APP_ROOT"

stamp="$(date +%Y%m%d_%H%M%S)"
backup_dir="$BACKUP_ROOT/deploy_$stamp"
mkdir -p "$backup_dir"

if [[ -f .env ]]; then
  cp -a .env "$backup_dir/.env"
fi

git status --short > "$backup_dir/git-status-before.txt" || true
git fetch origin "$BRANCH"
git reset --hard "origin/$BRANCH"
git clean -fd -e .env -e .venv -e staticfiles

"$APP_ROOT/.venv/bin/pip" install -r requirements.txt
"$APP_ROOT/.venv/bin/python" manage.py migrate --noinput
"$APP_ROOT/.venv/bin/python" manage.py collectstatic --noinput

(
  cd frontend
  npm ci
  npm run build
)

rsync -a --delete "$APP_ROOT/frontend/dist/" "$SITE_ROOT/"

sudo systemctl restart "$SERVICE_NAME"
sudo systemctl is-active "$SERVICE_NAME"

echo "Deployed $(git rev-parse --short HEAD) to $SERVICE_NAME"
