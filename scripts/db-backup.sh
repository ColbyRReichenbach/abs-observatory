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

: "${DATABASE_URL:?DATABASE_URL is required.}"

OUTPUT_PATH="${1:-$ROOT_DIR/.runtime/backups/abs-observatory-$(date +%Y%m%d-%H%M%S).dump}"
mkdir -p "$(dirname "$OUTPUT_PATH")"

pg_dump "$DATABASE_URL" --format=custom --file="$OUTPUT_PATH" --no-owner --no-privileges

echo "Backup written to $OUTPUT_PATH"
