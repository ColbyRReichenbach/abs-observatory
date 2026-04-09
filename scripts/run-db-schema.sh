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

SCHEMA_DATABASE_URL="${SCHEMA_DATABASE_URL:-${WAREHOUSE_DATABASE_URL:-${DATABASE_URL:-}}}"
: "${SCHEMA_DATABASE_URL:?SCHEMA_DATABASE_URL, WAREHOUSE_DATABASE_URL, or DATABASE_URL is required.}"

echo "[run-db-schema] target=${SCHEMA_DATABASE_URL}"

psql "$SCHEMA_DATABASE_URL" -v ON_ERROR_STOP=1 -f "$ROOT_DIR/db/schema.sql"
psql "$SCHEMA_DATABASE_URL" -v ON_ERROR_STOP=1 -f "$ROOT_DIR/db/seed_teams.sql"
psql "$SCHEMA_DATABASE_URL" -v ON_ERROR_STOP=1 -f "$ROOT_DIR/db/views.sql"
