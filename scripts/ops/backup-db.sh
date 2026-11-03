#!/usr/bin/env bash
# Daily MySQL backup for Milaan. Keeps the last 14 days, gzip-compressed.
# Reads DB_HOST / DB_PORT / DB_USER / DB_PASSWORD / DB_NAME from backend/.env.
#
# Run once by hand to test:   bash scripts/ops/backup-db.sh
# Schedule daily at 03:00:    see scripts/ops/README.md
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ENV_FILE="$REPO_DIR/backend/.env"
BACKUP_DIR="${BACKUP_DIR:-$HOME/backups/milaan}"
KEEP_DAYS="${KEEP_DAYS:-14}"

[ -f "$ENV_FILE" ] || { echo "Missing $ENV_FILE" >&2; exit 1; }
get() { grep -E "^$1=" "$ENV_FILE" | head -1 | cut -d= -f2- | sed -e 's/^["'\'']//' -e 's/["'\'']$//' -e 's/\r$//'; }

DB_HOST="$(get DB_HOST)"; DB_HOST="${DB_HOST:-127.0.0.1}"
DB_PORT="$(get DB_PORT)"; DB_PORT="${DB_PORT:-3306}"
DB_USER="$(get DB_USER)"
DB_NAME="$(get DB_NAME)"
export MYSQL_PWD="$(get DB_PASSWORD)"   # keeps the password out of `ps`

mkdir -p "$BACKUP_DIR"
OUT="$BACKUP_DIR/${DB_NAME}-$(date +%Y%m%d-%H%M%S).sql.gz"

mysqldump --single-transaction --quick --routines --no-tablespaces \
  -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" "$DB_NAME" | gzip -9 > "$OUT"

# A tiny file means the dump failed silently.
if [ "$(stat -c %s "$OUT")" -lt 1024 ]; then
  echo "Backup looks empty, removing $OUT" >&2
  rm -f "$OUT"
  exit 1
fi

find "$BACKUP_DIR" -name "${DB_NAME}-*.sql.gz" -mtime +"$KEEP_DAYS" -delete
echo "Backup saved: $OUT ($(du -h "$OUT" | cut -f1))"
