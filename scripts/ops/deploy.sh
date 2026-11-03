#!/usr/bin/env bash
# One-command deploy on EC2:  bash scripts/ops/deploy.sh [--migrate] [--backend-only] [--frontend-only]
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
WEB_ROOT="${WEB_ROOT:-/var/www/milaan}"
PM2_NAME="${PM2_NAME:-milaan-backend}"
API_URL="${API_URL:-http://127.0.0.1:4000}"
MIGRATE=0; DO_BACKEND=1; DO_FRONTEND=1
for arg in "$@"; do
  case "$arg" in
    --migrate) MIGRATE=1 ;;
    --backend-only) DO_FRONTEND=0 ;;
    --frontend-only) DO_BACKEND=0 ;;
    *) echo "Unknown option: $arg" >&2; exit 1 ;;
  esac
done

cd "$REPO_DIR"
echo "== Pulling latest code =="
git pull --ff-only

if [ "$DO_BACKEND" = 1 ]; then
  echo "== Backend =="
  cd "$REPO_DIR/backend"
  pnpm install --no-frozen-lockfile
  [ "$MIGRATE" = 1 ] && pnpm run migrate
  pm2 restart "$PM2_NAME" --update-env
  sleep 3
  curl -s -o /dev/null -w "API check: HTTP %{http_code} (404 is fine, the server is answering)\n" "$API_URL/" || echo "API check: no answer yet"
  pm2 logs "$PM2_NAME" --lines 8 --nostream
fi

if [ "$DO_FRONTEND" = 1 ]; then
  echo "== Frontend =="
  cd "$REPO_DIR/frontend"
  pnpm install --no-frozen-lockfile
  npx expo export --platform web
  # Only swap the live site once the build succeeded.
  if command -v rsync >/dev/null; then
    sudo rsync -a --delete dist/ "$WEB_ROOT"/
  else
    sudo rm -rf "$WEB_ROOT"/* && sudo cp -r dist/* "$WEB_ROOT"/
  fi
  rm -rf dist
  echo "Frontend live in $WEB_ROOT"
fi

echo "== Done =="
