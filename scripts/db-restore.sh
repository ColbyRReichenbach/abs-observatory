#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if [[ -f "$ROOT_DIR/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  . "$ROOT_DIR/.env"
  set +a
fi

if [[ -f "$ROOT_DIR/.env.local" ]]; then
  set -a
  # shellcheck disable=SC1091
  . "$ROOT_DIR/.env.local"
  set +a
fi

BACKUP_PATH="${1:-}"
TARGET_DATABASE_URL="${2:-${RESTORE_DATABASE_URL:-}}"

if [[ -z "$BACKUP_PATH" || "$BACKUP_PATH" == "--help" || "$BACKUP_PATH" == "-h" ]]; then
  echo "Usage: bash scripts/db-restore.sh <backup-file> <target-database-url>"
  echo "Or set RESTORE_DATABASE_URL and pass only <backup-file>."
  exit 0
fi

if [[ ! -f "$BACKUP_PATH" ]]; then
  echo "Backup file not found: $BACKUP_PATH" >&2
  exit 1
fi

: "${TARGET_DATABASE_URL:?Target database URL is required as arg 2 or RESTORE_DATABASE_URL.}"

pg_restore --dbname="$TARGET_DATABASE_URL" --clean --if-exists --no-owner --no-privileges "$BACKUP_PATH"

echo "Restore completed from $BACKUP_PATH"
