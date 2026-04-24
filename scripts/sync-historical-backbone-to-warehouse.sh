#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if [[ -f "$ROOT_DIR/.env" ]]; then
  set +u
  set -a
  # shellcheck disable=SC1091
  . "$ROOT_DIR/.env"
  set +a
  set -u
fi

if [[ -f "$ROOT_DIR/.env.local" ]]; then
  set +u
  set -a
  # shellcheck disable=SC1091
  . "$ROOT_DIR/.env.local"
  set +a
  set -u
fi

START_DATE="${1:-2019-03-20}"
END_DATE="${2:-2025-09-28}"
SOURCE_DATABASE_URL="${SOURCE_DATABASE_URL:-${LOCAL_HISTORICAL_DATABASE_URL:-postgresql:///abs_observatory}}"
TARGET_DATABASE_URL="${TARGET_DATABASE_URL:-${WAREHOUSE_DATABASE_URL:-}}"

: "${TARGET_DATABASE_URL:?TARGET_DATABASE_URL or WAREHOUSE_DATABASE_URL is required.}"

if [[ ! "$START_DATE" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}$ ]]; then
  echo "Invalid START_DATE: $START_DATE" >&2
  exit 1
fi

if [[ ! "$END_DATE" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}$ ]]; then
  echo "Invalid END_DATE: $END_DATE" >&2
  exit 1
fi

STAMP="$(date +%Y%m%d-%H%M%S)"
RUNTIME_DIR="$ROOT_DIR/.runtime/historical-backbone-sync"
mkdir -p "$RUNTIME_DIR"
DUMP_PATH="$RUNTIME_DIR/historical-backbone-${START_DATE}-to-${END_DATE}-${STAMP}.dump"
MANIFEST_PATH="$RUNTIME_DIR/historical-backbone-${START_DATE}-to-${END_DATE}-${STAMP}.json"

echo "[historical-backbone-sync] source=local_or_source_env target=warehouse date_window=${START_DATE}..${END_DATE}"

source_historical_before="$(psql "$SOURCE_DATABASE_URL" -Atqc "SELECT COUNT(*) FROM public.historical_pitch_states WHERE game_date BETWEEN DATE '$START_DATE' AND DATE '$END_DATE'")"
source_pitches_before="$(psql "$SOURCE_DATABASE_URL" -Atqc "SELECT COUNT(*) FROM raw.statcast_pitches WHERE game_date BETWEEN DATE '$START_DATE' AND DATE '$END_DATE'")"
source_games_before="$(psql "$SOURCE_DATABASE_URL" -Atqc "SELECT COUNT(*) FROM raw.statcast_games WHERE game_date BETWEEN DATE '$START_DATE' AND DATE '$END_DATE'")"
source_historical_after_end="$(psql "$SOURCE_DATABASE_URL" -Atqc "SELECT COUNT(*) FROM public.historical_pitch_states WHERE game_date > DATE '$END_DATE'")"
source_pitches_after_end="$(psql "$SOURCE_DATABASE_URL" -Atqc "SELECT COUNT(*) FROM raw.statcast_pitches WHERE game_date > DATE '$END_DATE'")"
source_games_after_end="$(psql "$SOURCE_DATABASE_URL" -Atqc "SELECT COUNT(*) FROM raw.statcast_games WHERE game_date > DATE '$END_DATE'")"

target_historical_before="$(psql "$TARGET_DATABASE_URL" -Atqc "SELECT COUNT(*) FROM public.historical_pitch_states WHERE game_date BETWEEN DATE '$START_DATE' AND DATE '$END_DATE'")"
target_pitches_before="$(psql "$TARGET_DATABASE_URL" -Atqc "SELECT COUNT(*) FROM raw.statcast_pitches WHERE game_date BETWEEN DATE '$START_DATE' AND DATE '$END_DATE'")"
target_games_before="$(psql "$TARGET_DATABASE_URL" -Atqc "SELECT COUNT(*) FROM raw.statcast_games WHERE game_date BETWEEN DATE '$START_DATE' AND DATE '$END_DATE'")"

echo "[historical-backbone-sync] source_counts games=$source_games_before pitches=$source_pitches_before historical=$source_historical_before"
echo "[historical-backbone-sync] target_before games=$target_games_before pitches=$target_pitches_before historical=$target_historical_before"

if [[ "$source_games_after_end" != "0" || "$source_pitches_after_end" != "0" || "$source_historical_after_end" != "0" ]]; then
  echo "[historical-backbone-sync] source contains rows after END_DATE; aborting to avoid restoring unexpected seasons." >&2
  exit 1
fi

pg_dump \
  "$SOURCE_DATABASE_URL" \
  --format=custom \
  --file="$DUMP_PATH" \
  --data-only \
  --no-owner \
  --no-privileges \
  --table=raw.statcast_games \
  --table=raw.statcast_pitches \
  --table=public.historical_pitch_states

psql "$TARGET_DATABASE_URL" -v ON_ERROR_STOP=1 <<SQL
DELETE FROM public.historical_pitch_states
WHERE game_date BETWEEN DATE '$START_DATE' AND DATE '$END_DATE';

DELETE FROM raw.statcast_pitches
WHERE game_date BETWEEN DATE '$START_DATE' AND DATE '$END_DATE';

DELETE FROM raw.statcast_games
WHERE game_date BETWEEN DATE '$START_DATE' AND DATE '$END_DATE';
SQL

pg_restore \
  --dbname="$TARGET_DATABASE_URL" \
  --data-only \
  --no-owner \
  --no-privileges \
  "$DUMP_PATH"

target_historical_after="$(psql "$TARGET_DATABASE_URL" -Atqc "SELECT COUNT(*) FROM public.historical_pitch_states WHERE game_date BETWEEN DATE '$START_DATE' AND DATE '$END_DATE'")"
target_pitches_after="$(psql "$TARGET_DATABASE_URL" -Atqc "SELECT COUNT(*) FROM raw.statcast_pitches WHERE game_date BETWEEN DATE '$START_DATE' AND DATE '$END_DATE'")"
target_games_after="$(psql "$TARGET_DATABASE_URL" -Atqc "SELECT COUNT(*) FROM raw.statcast_games WHERE game_date BETWEEN DATE '$START_DATE' AND DATE '$END_DATE'")"
target_historical_minmax="$(psql "$TARGET_DATABASE_URL" -Atqc "SELECT COALESCE(MIN(game_date)::text,''), COALESCE(MAX(game_date)::text,'') FROM public.historical_pitch_states WHERE game_date BETWEEN DATE '$START_DATE' AND DATE '$END_DATE'")"

historical_min_date="${target_historical_minmax%%|*}"
historical_max_date="${target_historical_minmax##*|}"

cat > "$MANIFEST_PATH" <<JSON
{
  "syncedAt": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "startDate": "$START_DATE",
  "endDate": "$END_DATE",
  "sourceCounts": {
    "rawStatcastGames": $source_games_before,
    "rawStatcastPitches": $source_pitches_before,
    "historicalPitchStates": $source_historical_before
  },
  "targetCountsBefore": {
    "rawStatcastGames": $target_games_before,
    "rawStatcastPitches": $target_pitches_before,
    "historicalPitchStates": $target_historical_before
  },
  "targetCountsAfter": {
    "rawStatcastGames": $target_games_after,
    "rawStatcastPitches": $target_pitches_after,
    "historicalPitchStates": $target_historical_after
  },
  "targetHistoricalMinDate": "$historical_min_date",
  "targetHistoricalMaxDate": "$historical_max_date",
  "dumpPath": "$DUMP_PATH"
}
JSON

if [[ "$target_games_after" != "$source_games_before" || "$target_pitches_after" != "$source_pitches_before" || "$target_historical_after" != "$source_historical_before" ]]; then
  echo "[historical-backbone-sync] count mismatch after restore; see $MANIFEST_PATH" >&2
  exit 1
fi

echo "[historical-backbone-sync] completed successfully"
echo "[historical-backbone-sync] manifest=$MANIFEST_PATH"
