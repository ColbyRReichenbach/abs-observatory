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

: "${SOURCE_DATABASE_URL:=postgresql://colbyreichenbach@localhost:5432/abs_observatory}"
: "${TARGET_DATABASE_URL:?TARGET_DATABASE_URL is required. Set it to the hosted serving database URL.}"

DUMP_PATH="${SERVING_DUMP_PATH:-$ROOT_DIR/.runtime/serving-db.dump}"
DUMP_DIR="$(dirname "$DUMP_PATH")"
mkdir -p "$DUMP_DIR"
RUN_FALLBACK_CSV="$(mktemp)"
WIN_FALLBACK_CSV="$(mktemp)"
COUNT_BASELINE_CSV="$(mktemp)"

cleanup() {
  rm -f "$RUN_FALLBACK_CSV" "$WIN_FALLBACK_CSV" "$COUNT_BASELINE_CSV"
}
trap cleanup EXIT

exclude_table_data=(
  "public.historical_pitch_states"
  "raw.savant_gamefeed_games"
  "raw.statcast_pitches"
  "raw.statcast_games"
  "ops.source_snapshots"
)

dump_args=(
  "$SOURCE_DATABASE_URL"
  "--format=custom"
  "--no-owner"
  "--no-privileges"
  "--file=$DUMP_PATH"
)

for table in "${exclude_table_data[@]}"; do
  dump_args+=("--exclude-table-data=$table")
done

echo "Creating serving dump at $DUMP_PATH"
pg_dump "${dump_args[@]}"

echo "Exporting serving-safe fallback lookup tables from source views"
psql "$SOURCE_DATABASE_URL" -v ON_ERROR_STOP=1 -c "\copy (SELECT * FROM mart_run_expectancy_fallbacks) TO '$RUN_FALLBACK_CSV' CSV"
psql "$SOURCE_DATABASE_URL" -v ON_ERROR_STOP=1 -c "\copy (SELECT * FROM mart_win_expectancy_fallbacks) TO '$WIN_FALLBACK_CSV' CSV"
psql "$SOURCE_DATABASE_URL" -v ON_ERROR_STOP=1 -c "\copy (
  SELECT
    count_key,
    COUNT(*)::INTEGER AS sample_size,
    AVG(CASE WHEN official_at_bat THEN CASE WHEN hit_event THEN 1.0 ELSE 0.0 END ELSE NULL END)::NUMERIC AS batting_average,
    AVG(CASE WHEN walk_event THEN 1.0 ELSE 0.0 END)::NUMERIC AS walk_rate,
    AVG(CASE WHEN strikeout_event THEN 1.0 ELSE 0.0 END)::NUMERIC AS strikeout_rate,
    AVG(CASE WHEN positive_outcome THEN 1.0 ELSE 0.0 END)::NUMERIC AS positive_outcome_rate
  FROM historical_pitch_states
  WHERE count_key IS NOT NULL
  GROUP BY count_key
) TO '$COUNT_BASELINE_CSV' CSV"

restore_log="$(mktemp)"

echo "Restoring serving dump into target database"
set +e
pg_restore \
  --dbname="$TARGET_DATABASE_URL" \
  --clean \
  --if-exists \
  --no-owner \
  --no-privileges \
  "$DUMP_PATH" \
  2>"$restore_log"
restore_status=$?
set -e

if [[ $restore_status -ne 0 ]]; then
  if grep -q "savant_abs_events_game_pk_fkey" "$restore_log" && grep -q "errors ignored on restore: 1" "$restore_log"; then
    echo "Continuing after expected restore warning: raw.savant_abs_events references excluded raw.savant_gamefeed_games rows." >&2
  else
    cat "$restore_log" >&2
    rm -f "$restore_log"
    exit $restore_status
  fi
fi

rm -f "$restore_log"

echo "Applying schema and views to target database"
psql "$TARGET_DATABASE_URL" -v ON_ERROR_STOP=1 <<SQL
SET search_path TO public;
DROP TABLE IF EXISTS serving_run_expectancy_fallbacks CASCADE;
DROP TABLE IF EXISTS serving_win_expectancy_fallbacks CASCADE;
DROP TABLE IF EXISTS serving_count_state_outcome_baselines CASCADE;
\i $ROOT_DIR/db/schema.sql
\i $ROOT_DIR/db/views.sql
SQL

echo "Loading serving fallback lookup rows into target database"
psql "$TARGET_DATABASE_URL" -v ON_ERROR_STOP=1 <<SQL
TRUNCATE TABLE serving_run_expectancy_fallbacks;
TRUNCATE TABLE serving_win_expectancy_fallbacks;
TRUNCATE TABLE serving_count_state_outcome_baselines;
\copy serving_run_expectancy_fallbacks FROM '$RUN_FALLBACK_CSV' CSV
\copy serving_win_expectancy_fallbacks FROM '$WIN_FALLBACK_CSV' CSV
\copy serving_count_state_outcome_baselines FROM '$COUNT_BASELINE_CSV' CSV
SQL

echo "Verifying serving relations"
psql "$TARGET_DATABASE_URL" -v ON_ERROR_STOP=1 -At <<'SQL'
SELECT
  'games=' || COUNT(*)
FROM public.games;

SELECT
  'abs_challenges=' || COUNT(*)
FROM public.abs_challenges;

SELECT
  'team_abs_game_summary=' || COUNT(*)
FROM public.team_abs_game_summary;

SELECT
  'umpire_abs_game_summary=' || COUNT(*)
FROM public.umpire_abs_game_summary;

SELECT
  'serving_run_expectancy_fallbacks=' || COUNT(*)
FROM public.serving_run_expectancy_fallbacks;

SELECT
  'serving_win_expectancy_fallbacks=' || COUNT(*)
FROM public.serving_win_expectancy_fallbacks;

SELECT
  'serving_count_state_outcome_baselines=' || COUNT(*)
FROM public.serving_count_state_outcome_baselines;
SQL

echo "Serving database publish completed."
