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

: "${SOURCE_DATABASE_URL:=${WAREHOUSE_DATABASE_URL:-postgresql://colbyreichenbach@localhost:5432/abs_observatory}}"
: "${TARGET_DATABASE_URL:=${SERVING_DATABASE_URL:-}}"
: "${TARGET_DATABASE_URL:?TARGET_DATABASE_URL or SERVING_DATABASE_URL is required. Set it to the hosted serving database URL.}"

DUMP_PATH="${SERVING_DUMP_PATH:-$ROOT_DIR/.runtime/serving-db.dump}"
DUMP_DIR="$(dirname "$DUMP_PATH")"
MANIFEST_DIR="${PUBLISH_MANIFEST_DIR:-$ROOT_DIR/.runtime/publish-manifests}"
mkdir -p "$DUMP_DIR"
mkdir -p "$MANIFEST_DIR"
RUN_FALLBACK_CSV="$(mktemp)"
WIN_FALLBACK_CSV="$(mktemp)"
COUNT_BASELINE_CSV="$(mktemp)"
OVERTURN_FALLBACK_CSV="$(mktemp)"

cleanup() {
  rm -f "$RUN_FALLBACK_CSV" "$WIN_FALLBACK_CSV" "$COUNT_BASELINE_CSV" "$OVERTURN_FALLBACK_CSV"
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
echo "Publishing Warehouse -> Serving"
echo "  source=$SOURCE_DATABASE_URL"
echo "  target=$TARGET_DATABASE_URL"
pg_dump "${dump_args[@]}"

echo "Exporting serving-safe fallback lookup tables from source views"
psql "$SOURCE_DATABASE_URL" -v ON_ERROR_STOP=1 -c "\copy (SELECT * FROM mart_run_expectancy_fallbacks) TO '$RUN_FALLBACK_CSV' CSV"
psql "$SOURCE_DATABASE_URL" -v ON_ERROR_STOP=1 -c "\copy (SELECT * FROM mart_win_expectancy_fallbacks) TO '$WIN_FALLBACK_CSV' CSV"
psql "$SOURCE_DATABASE_URL" -v ON_ERROR_STOP=1 -c "\copy (
  SELECT
    count_key,
    sample_size,
    batting_average,
    walk_rate,
    strikeout_rate,
    positive_outcome_rate
  FROM mart_count_state_outcome_baselines_train_validation
) TO '$COUNT_BASELINE_CSV' CSV"
psql "$SOURCE_DATABASE_URL" -v ON_ERROR_STOP=1 -c "\copy (SELECT * FROM mart_modeled_abs_overturn_probability_fallbacks) TO '$OVERTURN_FALLBACK_CSV' CSV"

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
DROP TABLE IF EXISTS serving_abs_overturn_probability_fallbacks CASCADE;
\i $ROOT_DIR/db/schema.sql
\i $ROOT_DIR/db/views.sql
SQL

echo "Loading serving fallback lookup rows into target database"
psql "$TARGET_DATABASE_URL" -v ON_ERROR_STOP=1 <<SQL
TRUNCATE TABLE serving_run_expectancy_fallbacks;
TRUNCATE TABLE serving_win_expectancy_fallbacks;
TRUNCATE TABLE serving_count_state_outcome_baselines;
TRUNCATE TABLE serving_abs_overturn_probability_fallbacks;
\copy serving_run_expectancy_fallbacks FROM '$RUN_FALLBACK_CSV' CSV
\copy serving_win_expectancy_fallbacks FROM '$WIN_FALLBACK_CSV' CSV
\copy serving_count_state_outcome_baselines FROM '$COUNT_BASELINE_CSV' CSV
\copy serving_abs_overturn_probability_fallbacks FROM '$OVERTURN_FALLBACK_CSV' CSV
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

SELECT
  'serving_abs_overturn_probability_fallbacks=' || COUNT(*)
FROM public.serving_abs_overturn_probability_fallbacks;
SQL

publish_timestamp="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
manifest_path="$MANIFEST_DIR/publish-${publish_timestamp//:/-}.json"
git_sha="$(git -C "$ROOT_DIR" rev-parse --short HEAD 2>/dev/null || echo unknown)"
source_games_count="$(psql "$SOURCE_DATABASE_URL" -Atqc "SELECT COUNT(*) FROM public.games")"
source_abs_count="$(psql "$SOURCE_DATABASE_URL" -Atqc "SELECT COUNT(*) FROM public.abs_challenges")"
source_games_max_date="$(psql "$SOURCE_DATABASE_URL" -Atqc "SELECT COALESCE(MAX(game_date)::text, '') FROM public.games")"
source_abs_max_ts="$(psql "$SOURCE_DATABASE_URL" -Atqc "SELECT COALESCE(MAX(challenged_at)::text, '') FROM public.abs_challenges")"
target_games_count="$(psql "$TARGET_DATABASE_URL" -Atqc "SELECT COUNT(*) FROM public.games")"
target_abs_count="$(psql "$TARGET_DATABASE_URL" -Atqc "SELECT COUNT(*) FROM public.abs_challenges")"
target_run_fallbacks="$(psql "$TARGET_DATABASE_URL" -Atqc "SELECT COUNT(*) FROM public.serving_run_expectancy_fallbacks")"
target_win_fallbacks="$(psql "$TARGET_DATABASE_URL" -Atqc "SELECT COUNT(*) FROM public.serving_win_expectancy_fallbacks")"
target_count_baselines="$(psql "$TARGET_DATABASE_URL" -Atqc "SELECT COUNT(*) FROM public.serving_count_state_outcome_baselines")"
target_overturn_fallbacks="$(psql "$TARGET_DATABASE_URL" -Atqc "SELECT COUNT(*) FROM public.serving_abs_overturn_probability_fallbacks")"

cat > "$manifest_path" <<JSON
{
  "publishedAt": "$publish_timestamp",
  "gitSha": "$git_sha",
  "sourceDatabaseUrl": "$SOURCE_DATABASE_URL",
  "targetDatabaseUrl": "$TARGET_DATABASE_URL",
  "sourceCutoffs": {
    "gamesMaxDate": "$source_games_max_date",
    "absChallengesMaxTimestamp": "$source_abs_max_ts"
  },
  "rowCounts": {
    "source": {
      "games": $source_games_count,
      "absChallenges": $source_abs_count
    },
    "target": {
      "games": $target_games_count,
      "absChallenges": $target_abs_count,
      "servingRunExpectancyFallbacks": $target_run_fallbacks,
      "servingWinExpectancyFallbacks": $target_win_fallbacks,
      "servingCountStateOutcomeBaselines": $target_count_baselines,
      "servingAbsOverturnProbabilityFallbacks": $target_overturn_fallbacks
    }
  }
}
JSON

echo "Publish manifest written to $manifest_path"

echo "Serving database publish completed."
