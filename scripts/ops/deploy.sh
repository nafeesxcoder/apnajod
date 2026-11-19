#!/usr/bin/env bash
# One-command deploy:  bash scripts/ops/deploy.sh [--migrate] [--backend-only] [--frontend-only] [--skip-tests]
#
# Order: pull -> install -> checks -> migrate -> restart backend -> build and
# swap the website. If a check fails, the code goes back to what was running
# before and nothing live is touched. --skip-tests is for emergencies only.
set -euo pipefail

# Everything runs inside main, which bash reads in full before starting: the
# git pull below may replace this very file while it runs.
main() {
  REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
  WEB_ROOT="${WEB_ROOT:-/var/www/milaan}"
  PM2_NAME="${PM2_NAME:-apnajod-backend}"
  API_URL="${API_URL:-http://127.0.0.1:4000}"
  MIGRATE=0; DO_BACKEND=1; DO_FRONTEND=1; CHECKS=1
  for arg in "$@"; do
    case "$arg" in
      --migrate) MIGRATE=1 ;;
      --backend-only) DO_FRONTEND=0 ;;
      --frontend-only) DO_BACKEND=0 ;;
      --skip-tests) CHECKS=0 ;;
      *) echo "Unknown option: $arg" >&2; exit 1 ;;
    esac
  done

  cd "$REPO_DIR"
  PREV="$(git rev-parse HEAD)"
  echo "== Pulling latest code =="
  git pull --ff-only
  NEW="$(git rev-parse HEAD)"

  install_all() {
    if [ "$DO_BACKEND" = 1 ]; then (cd "$REPO_DIR/backend" && pnpm install --no-frozen-lockfile); fi
    if [ "$DO_FRONTEND" = 1 ]; then (cd "$REPO_DIR/frontend" && pnpm install --no-frozen-lockfile); fi
  }

  # A failed check puts the code back as it was, so a later restart (pm2
  # restarts on a crash too) never picks up the code that failed.
  roll_back() {
    echo "!! $1 failed. Going back to $(git rev-parse --short "$PREV"); nothing live was changed." >&2
    git reset --hard "$PREV" >/dev/null
    install_all >/dev/null 2>&1 || true
    exit 1
  }

  echo "== Installing =="
  install_all

  if [ "$CHECKS" = 1 ]; then
    if [ "$DO_BACKEND" = 1 ]; then
      echo "== Checking backend (tests) =="
      (cd "$REPO_DIR/backend" && pnpm test) || roll_back "Backend tests"
    fi
    if [ "$DO_FRONTEND" = 1 ]; then
      echo "== Checking frontend (types and tests) =="
      (cd "$REPO_DIR/frontend" && npx tsc --noEmit && npx vitest run) || roll_back "Frontend checks"
    fi
  else
    echo "== Skipping checks (--skip-tests) =="
  fi

  if [ "$DO_FRONTEND" = 1 ]; then
    echo "== Building frontend =="
    # Built before anything is restarted, so a broken build changes nothing.
    (cd "$REPO_DIR/frontend" && rm -rf dist && npx expo export --platform web) || roll_back "Frontend build"
  fi

  if [ "$DO_BACKEND" = 1 ]; then
    echo "== Backend =="
    if [ "$MIGRATE" = 1 ]; then (cd "$REPO_DIR/backend" && pnpm run migrate); fi
    pm2 restart "$PM2_NAME" --update-env
    # Up to 20 seconds for the server and its database to answer.
    ok=0
    for _ in $(seq 1 10); do
      sleep 2
      if [ "$(curl -s -o /dev/null -w '%{http_code}' "$API_URL/health" || true)" = "200" ]; then ok=1; break; fi
    done
    if [ "$ok" = 1 ]; then
      echo "API check: healthy"
    else
      echo "!! API is not healthy after the restart. Recent logs:" >&2
      pm2 logs "$PM2_NAME" --lines 30 --nostream || true
      echo "!! To go back: git reset --hard $PREV && (cd backend && pnpm install) && pm2 restart $PM2_NAME" >&2
      exit 1
    fi
  fi

  if [ "$DO_FRONTEND" = 1 ]; then
    echo "== Publishing frontend =="
    if command -v rsync >/dev/null; then
      sudo rsync -a --delete "$REPO_DIR/frontend/dist/" "$WEB_ROOT"/
    else
      sudo rm -rf "$WEB_ROOT"/* && sudo cp -r "$REPO_DIR/frontend/dist/"* "$WEB_ROOT"/
    fi
    rm -rf "$REPO_DIR/frontend/dist"
    echo "Frontend live in $WEB_ROOT"
  fi

  echo "== Done: $(git rev-parse --short "$PREV") -> $(git rev-parse --short "$NEW") =="
}

main "$@"
exit $?
