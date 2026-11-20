#!/usr/bin/env bash
# Off-site backup: the database AND the uploaded files (photos, chat media,
# stories, music) copied to cloud storage through rclone, so a lost or broken
# server disk loses nothing.
#
# Works with any rclone remote - Backblaze B2, Google Drive, S3. Set it up
# once with `rclone config` (see scripts/ops/README.md), then:
#
#   BACKUP_REMOTE=b2:apnajoda-backups bash scripts/ops/backup-offsite.sh
#
# What it keeps on the remote:
#   db/                  the daily database dumps, 30 days
#   uploads/current/     a mirror of backend/uploads
#   uploads/deleted/DAY/ files deleted or replaced on the server that day,
#                        kept 30 days - so a mistaken delete can be undone
#
# Optional: BACKUP_PING_URL (a healthchecks.io-style URL) is called when the
# backup worked, so a missed backup can raise an alert.
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
REMOTE="${BACKUP_REMOTE:-}"
KEEP_REMOTE_DAYS="${KEEP_REMOTE_DAYS:-30}"
BACKUP_DIR="${BACKUP_DIR:-$HOME/backups/milaan}"
UPLOADS_DIR="$REPO_DIR/backend/uploads"
DAY="$(date +%Y-%m-%d)"

if [ -z "$REMOTE" ]; then
  echo "Set BACKUP_REMOTE, e.g. BACKUP_REMOTE=b2:apnajoda-backups (see scripts/ops/README.md)" >&2
  exit 1
fi
command -v rclone >/dev/null || { echo "rclone is not installed: curl https://rclone.org/install.sh | sudo bash" >&2; exit 1; }

echo "== $(date '+%F %T') Database dump =="
BACKUP_DIR="$BACKUP_DIR" bash "$REPO_DIR/scripts/ops/backup-db.sh"

echo "== Database dumps -> $REMOTE/db =="
rclone copy "$BACKUP_DIR" "$REMOTE/db" --include "*.sql.gz" --transfers 2
rclone delete "$REMOTE/db" --min-age "${KEEP_REMOTE_DAYS}d" --include "*.sql.gz"

echo "== Uploads -> $REMOTE/uploads/current =="
# sync makes the remote match the server; anything it would delete or
# overwrite goes to deleted/DAY instead of being lost.
rclone sync "$UPLOADS_DIR" "$REMOTE/uploads/current" \
  --backup-dir "$REMOTE/uploads/deleted/$DAY" --transfers 4 --fast-list
rclone delete "$REMOTE/uploads/deleted" --min-age "${KEEP_REMOTE_DAYS}d" || true
rclone rmdirs "$REMOTE/uploads/deleted" --leave-root || true

echo "== Check =="
latest="$(rclone lsf "$REMOTE/db" --include "*.sql.gz" | sort | tail -1)"
[ -n "$latest" ] || { echo "No database dump on the remote!" >&2; exit 1; }
echo "Latest dump on the remote: $latest"
rclone size "$REMOTE/uploads/current" | sed 's/^/Uploads on the remote: /'

if [ -n "${BACKUP_PING_URL:-}" ]; then
  curl -fsS -m 10 --retry 3 "$BACKUP_PING_URL" >/dev/null || echo "(could not ping $BACKUP_PING_URL)" >&2
fi
echo "== $(date '+%F %T') Backup done =="
