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

: "${SOURCE_DATABASE_URL:=${WAREHOUSE_DATABASE_URL:-}}"
: "${TARGET_DATABASE_URL:=${SERVING_DATABASE_URL:-${DATABASE_URL:-}}}"
: "${SOURCE_DATABASE_URL:?SOURCE_DATABASE_URL or WAREHOUSE_DATABASE_URL is required. Refusing to publish from an implicit local database.}"
: "${TARGET_DATABASE_URL:?TARGET_DATABASE_URL, SERVING_DATABASE_URL, or DATABASE_URL is required. Set it to the hosted serving database URL.}"

is_local_database_url() {
  python3 - "$1" <<'PY'
import sys
from urllib.parse import urlparse

parsed = urlparse(sys.argv[1])
host = parsed.hostname
path = parsed.path.lstrip("/")
is_local = host in (None, "", "localhost", "127.0.0.1", "::1") or (
    host is None and path == "abs_observatory"
)
print("true" if is_local else "false")
PY
}

if [[ "${ALLOW_LOCAL_SOURCE_DATABASE:-0}" != "1" && "$(is_local_database_url "$SOURCE_DATABASE_URL")" == "true" ]]; then
  echo "[publish-serving-db] Refusing to publish from local SOURCE_DATABASE_URL. Set SOURCE_DATABASE_URL to the hosted warehouse or ALLOW_LOCAL_SOURCE_DATABASE=1 for an intentional local dry run." >&2
  exit 1
fi

DUMP_PATH="${SERVING_DUMP_PATH:-$ROOT_DIR/.runtime/serving-db.dump}"
DUMP_DIR="$(dirname "$DUMP_PATH")"
MANIFEST_DIR="${PUBLISH_MANIFEST_DIR:-$ROOT_DIR/.runtime/publish-manifests}"
mkdir -p "$DUMP_DIR"
mkdir -p "$MANIFEST_DIR"
TEAM_CSV="$(mktemp)"
PLAYER_CSV="$(mktemp)"
GAME_CSV="$(mktemp)"
OFFICIAL_CSV="$(mktemp)"
AT_BAT_CSV="$(mktemp)"
PLAY_EVENT_CSV="$(mktemp)"
PITCH_CSV="$(mktemp)"
CHALLENGE_CSV="$(mktemp)"
SNAPSHOT_CSV="$(mktemp)"
TEAM_SUMMARY_CSV="$(mktemp)"
UMPIRE_SUMMARY_CSV="$(mktemp)"
GAME_REPORT_CSV="$(mktemp)"
LINESCORE_CSV="$(mktemp)"
SAVANT_GAMEFEED_CSV="$(mktemp)"
SAVANT_ABS_EVENTS_CSV="$(mktemp)"
RUN_FALLBACK_CSV="$(mktemp)"
WIN_FALLBACK_CSV="$(mktemp)"
COUNT_BASELINE_CSV="$(mktemp)"
OVERTURN_FALLBACK_CSV="$(mktemp)"

read -r -d '' TEAM_SUMMARY_EXPORT_SQL <<'SQL' || true
WITH latest_snapshot AS (
  SELECT DISTINCT ON (game_pk)
    game_pk,
    abs_home_remaining,
    abs_away_remaining
  FROM public.game_state_snapshots
  ORDER BY game_pk, snapshot_time DESC
),
team_challenges AS (
  SELECT
    game_pk,
    challenge_team_id AS team_id,
    COUNT(*) FILTER (WHERE is_overturned = TRUE) AS used_successful,
    COUNT(*) FILTER (WHERE is_overturned = FALSE) AS used_failed
  FROM public.mart_abs_pitch_challenges
  WHERE challenge_team_id IS NOT NULL
  GROUP BY game_pk, challenge_team_id
),
all_team_games AS (
  SELECT
    g.game_pk,
    g.home_team_id AS team_id,
    'home'::TEXT AS team_side,
    COALESCE(tc.used_successful, 0) AS used_successful,
    COALESCE(tc.used_failed, 0) AS used_failed,
    COALESCE(ls.abs_home_remaining, GREATEST(0, 2 - COALESCE(tc.used_failed, 0))) AS remaining
  FROM public.games g
  LEFT JOIN latest_snapshot ls ON ls.game_pk = g.game_pk
  LEFT JOIN team_challenges tc ON tc.game_pk = g.game_pk AND tc.team_id = g.home_team_id
  WHERE g.home_team_id IS NOT NULL

  UNION ALL

  SELECT
    g.game_pk,
    g.away_team_id AS team_id,
    'away'::TEXT AS team_side,
    COALESCE(tc.used_successful, 0) AS used_successful,
    COALESCE(tc.used_failed, 0) AS used_failed,
    COALESCE(ls.abs_away_remaining, GREATEST(0, 2 - COALESCE(tc.used_failed, 0))) AS remaining
  FROM public.games g
  LEFT JOIN latest_snapshot ls ON ls.game_pk = g.game_pk
  LEFT JOIN team_challenges tc ON tc.game_pk = g.game_pk AND tc.team_id = g.away_team_id
  WHERE g.away_team_id IS NOT NULL
)
SELECT
  game_pk,
  team_id,
  team_side,
  used_successful,
  used_failed,
  remaining,
  NOW() AS created_at,
  NOW() AS updated_at
FROM all_team_games
ORDER BY game_pk, team_id
SQL

read -r -d '' UMPIRE_SUMMARY_EXPORT_SQL <<'SQL' || true
WITH home_plate_officials AS (
  SELECT DISTINCT ON (o.game_pk)
    o.game_pk,
    o.official_id AS umpire_id,
    o.official_name AS umpire_name
  FROM public.officials o
  WHERE o.official_type = 'Home Plate'
  ORDER BY o.game_pk, o.official_id
),
umpire_challenges AS (
  SELECT
    game_pk,
    COUNT(*) AS challenged_calls,
    COUNT(*) FILTER (WHERE is_overturned = TRUE) AS overturned_calls,
    COUNT(*) FILTER (WHERE is_overturned = FALSE) AS confirmed_calls
  FROM public.mart_abs_pitch_challenges
  GROUP BY game_pk
)
SELECT
  o.game_pk,
  o.umpire_id,
  o.umpire_name,
  COALESCE(c.challenged_calls, 0) AS challenged_calls,
  COALESCE(c.overturned_calls, 0) AS overturned_calls,
  COALESCE(c.confirmed_calls, 0) AS confirmed_calls,
  NOW() AS created_at,
  NOW() AS updated_at
FROM home_plate_officials o
LEFT JOIN umpire_challenges c ON c.game_pk = o.game_pk
ORDER BY o.game_pk, o.umpire_id
SQL

cleanup() {
  rm -f \
    "$TEAM_CSV" \
    "$PLAYER_CSV" \
    "$GAME_CSV" \
    "$OFFICIAL_CSV" \
    "$AT_BAT_CSV" \
    "$PLAY_EVENT_CSV" \
    "$PITCH_CSV" \
    "$CHALLENGE_CSV" \
    "$SNAPSHOT_CSV" \
    "$TEAM_SUMMARY_CSV" \
    "$UMPIRE_SUMMARY_CSV" \
    "$GAME_REPORT_CSV" \
    "$LINESCORE_CSV" \
    "$SAVANT_GAMEFEED_CSV" \
    "$SAVANT_ABS_EVENTS_CSV" \
    "$RUN_FALLBACK_CSV" \
    "$WIN_FALLBACK_CSV" \
    "$COUNT_BASELINE_CSV" \
    "$OVERTURN_FALLBACK_CSV"
}
trap cleanup EXIT

sanitize_database_url() {
  python3 - "$1" <<'PY'
import sys
from urllib.parse import urlparse

url = sys.argv[1]
parsed = urlparse(url)
host = parsed.hostname or "unknown-host"
db = parsed.path.lstrip("/") or "unknown-db"
print(f"{host}/{db}")
PY
}

export_query_to_csv() {
  local query="$1"
  local destination="$2"
  psql "$SOURCE_DATABASE_URL" -v ON_ERROR_STOP=1 -c "\copy ($query) TO '$destination' CSV"
}

SOURCE_LABEL="$(sanitize_database_url "$SOURCE_DATABASE_URL")"
TARGET_LABEL="$(sanitize_database_url "$TARGET_DATABASE_URL")"
MLB_GAME_TIME_ZONE="America/New_York"

SOURCE_MAX_GAME_DATE="$(psql "$SOURCE_DATABASE_URL" -Atqc "SELECT COALESCE(MAX((game_date AT TIME ZONE '$MLB_GAME_TIME_ZONE')::date)::text, '') FROM public.games")"
: "${SOURCE_MAX_GAME_DATE:?Source database has no games rows to publish.}"

SYNC_END_DATE="${SERVING_SYNC_END_DATE:-$SOURCE_MAX_GAME_DATE}"
if [[ -n "${SERVING_SYNC_START_DATE:-}" ]]; then
  SYNC_START_DATE="$SERVING_SYNC_START_DATE"
else
  SYNC_DAYS="${SERVING_SYNC_DAYS:-2}"
  SYNC_START_DATE="$(
    python3 - "$SYNC_END_DATE" "$SYNC_DAYS" <<'PY'
from datetime import date, timedelta
import sys

end_date = date.fromisoformat(sys.argv[1])
days = max(int(sys.argv[2]), 1)
start_date = end_date - timedelta(days=days - 1)
print(start_date.isoformat())
PY
  )"
fi

GAME_WINDOW_FILTER="game_date >= ((DATE '$SYNC_START_DATE')::timestamp AT TIME ZONE '$MLB_GAME_TIME_ZONE') AND game_date < ((DATE '$SYNC_END_DATE' + INTERVAL '1 day')::timestamp AT TIME ZONE '$MLB_GAME_TIME_ZONE')"
SAVANT_DATE_WINDOW_FILTER="game_date BETWEEN DATE '$SYNC_START_DATE' AND DATE '$SYNC_END_DATE'"
GAME_PK_WINDOW="SELECT game_pk FROM public.games WHERE $GAME_WINDOW_FILTER"

echo "Publishing Warehouse -> Serving"
echo "  source=$SOURCE_LABEL"
echo "  target=$TARGET_LABEL"
echo "  window=$SYNC_START_DATE..$SYNC_END_DATE"

echo "Exporting serving contract tables from source"
export_query_to_csv "SELECT * FROM public.teams ORDER BY team_id" "$TEAM_CSV"
export_query_to_csv "SELECT * FROM public.players ORDER BY player_id" "$PLAYER_CSV"
export_query_to_csv "SELECT * FROM public.games WHERE $GAME_WINDOW_FILTER ORDER BY game_date, game_pk" "$GAME_CSV"
export_query_to_csv "SELECT * FROM public.officials WHERE game_pk IN ($GAME_PK_WINDOW) ORDER BY game_pk, official_id, official_type" "$OFFICIAL_CSV"
export_query_to_csv "SELECT * FROM public.at_bats WHERE game_pk IN ($GAME_PK_WINDOW) ORDER BY game_pk, at_bat_index" "$AT_BAT_CSV"
export_query_to_csv "SELECT * FROM public.play_events WHERE game_pk IN ($GAME_PK_WINDOW) ORDER BY game_pk, at_bat_index, play_event_index" "$PLAY_EVENT_CSV"
export_query_to_csv "SELECT * FROM public.pitches WHERE game_pk IN ($GAME_PK_WINDOW) ORDER BY game_pk, at_bat_index, pitch_number" "$PITCH_CSV"
export_query_to_csv "SELECT * FROM public.abs_challenges WHERE game_pk IN ($GAME_PK_WINDOW) ORDER BY game_pk, at_bat_index, COALESCE(pitch_number, 0), challenged_at" "$CHALLENGE_CSV"
export_query_to_csv "SELECT * FROM public.game_state_snapshots WHERE game_pk IN ($GAME_PK_WINDOW) ORDER BY game_pk, snapshot_time" "$SNAPSHOT_CSV"
export_query_to_csv "$TEAM_SUMMARY_EXPORT_SQL" "$TEAM_SUMMARY_CSV"
export_query_to_csv "$UMPIRE_SUMMARY_EXPORT_SQL" "$UMPIRE_SUMMARY_CSV"
export_query_to_csv "SELECT * FROM public.game_reports WHERE game_pk IN ($GAME_PK_WINDOW) ORDER BY game_pk" "$GAME_REPORT_CSV"
export_query_to_csv "SELECT * FROM ops.game_linescores ORDER BY game_pk" "$LINESCORE_CSV"
export_query_to_csv "SELECT * FROM raw.savant_gamefeed_games WHERE $SAVANT_DATE_WINDOW_FILTER ORDER BY game_date, game_pk" "$SAVANT_GAMEFEED_CSV"
export_query_to_csv "SELECT * FROM raw.savant_abs_events WHERE $SAVANT_DATE_WINDOW_FILTER ORDER BY game_date, game_pk, at_bat_number, COALESCE(pitch_number, 0), play_id" "$SAVANT_ABS_EVENTS_CSV"

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

if [[ "${RUN_SCHEMA_ON_SERVING_PUBLISH:-false}" == "true" ]]; then
  echo "Applying schema and views to target database"
  psql "$TARGET_DATABASE_URL" -v ON_ERROR_STOP=1 <<SQL
SET lock_timeout = '${SERVING_SCHEMA_LOCK_TIMEOUT:-5s}';
SET search_path TO public;
\i $ROOT_DIR/db/schema.sql
\i $ROOT_DIR/db/views.sql
SQL
else
  echo "Skipping target schema/view application; run scripts/run-db-schema.sh separately for serving DDL changes"
fi

echo "Loading serving contract rows into target database"
psql "$TARGET_DATABASE_URL" -v ON_ERROR_STOP=1 <<SQL
BEGIN;
CREATE TEMP TABLE staging_teams (LIKE public.teams INCLUDING DEFAULTS) ON COMMIT DROP;
CREATE TEMP TABLE staging_players (LIKE public.players INCLUDING DEFAULTS) ON COMMIT DROP;
CREATE TEMP TABLE staging_games (LIKE public.games INCLUDING DEFAULTS) ON COMMIT DROP;
CREATE TEMP TABLE staging_officials (LIKE public.officials INCLUDING DEFAULTS) ON COMMIT DROP;
CREATE TEMP TABLE staging_at_bats (LIKE public.at_bats INCLUDING DEFAULTS) ON COMMIT DROP;
CREATE TEMP TABLE staging_play_events (LIKE public.play_events INCLUDING DEFAULTS) ON COMMIT DROP;
CREATE TEMP TABLE staging_pitches (LIKE public.pitches INCLUDING DEFAULTS) ON COMMIT DROP;
CREATE TEMP TABLE staging_abs_challenges (LIKE public.abs_challenges INCLUDING DEFAULTS) ON COMMIT DROP;
CREATE TEMP TABLE staging_game_state_snapshots (LIKE public.game_state_snapshots INCLUDING DEFAULTS) ON COMMIT DROP;
CREATE TEMP TABLE staging_team_abs_game_summary (LIKE public.team_abs_game_summary INCLUDING DEFAULTS) ON COMMIT DROP;
CREATE TEMP TABLE staging_umpire_abs_game_summary (LIKE public.umpire_abs_game_summary INCLUDING DEFAULTS) ON COMMIT DROP;
CREATE TEMP TABLE staging_game_reports (LIKE public.game_reports INCLUDING DEFAULTS) ON COMMIT DROP;
CREATE TEMP TABLE staging_game_linescores (LIKE ops.game_linescores INCLUDING DEFAULTS) ON COMMIT DROP;
CREATE TEMP TABLE staging_savant_gamefeed_games (LIKE raw.savant_gamefeed_games INCLUDING DEFAULTS) ON COMMIT DROP;
CREATE TEMP TABLE staging_savant_abs_events (LIKE raw.savant_abs_events INCLUDING DEFAULTS) ON COMMIT DROP;
\copy staging_teams FROM '$TEAM_CSV' CSV
\copy staging_players FROM '$PLAYER_CSV' CSV
\copy staging_games FROM '$GAME_CSV' CSV
\copy staging_officials FROM '$OFFICIAL_CSV' CSV
\copy staging_at_bats FROM '$AT_BAT_CSV' CSV
\copy staging_play_events FROM '$PLAY_EVENT_CSV' CSV
\copy staging_pitches FROM '$PITCH_CSV' CSV
\copy staging_abs_challenges FROM '$CHALLENGE_CSV' CSV
\copy staging_game_state_snapshots FROM '$SNAPSHOT_CSV' CSV
\copy staging_team_abs_game_summary(game_pk, team_id, team_side, used_successful, used_failed, remaining, created_at, updated_at) FROM '$TEAM_SUMMARY_CSV' CSV
\copy staging_umpire_abs_game_summary(game_pk, umpire_id, umpire_name, challenged_calls, overturned_calls, confirmed_calls, created_at, updated_at) FROM '$UMPIRE_SUMMARY_CSV' CSV
\copy staging_game_reports FROM '$GAME_REPORT_CSV' CSV
\copy staging_game_linescores FROM '$LINESCORE_CSV' CSV
\copy staging_savant_gamefeed_games FROM '$SAVANT_GAMEFEED_CSV' CSV
\copy staging_savant_abs_events FROM '$SAVANT_ABS_EVENTS_CSV' CSV
INSERT INTO public.teams AS target (
  team_id,
  name,
  abbreviation,
  primary_color,
  secondary_color,
  logo_svg_url,
  league_name,
  division_name
)
SELECT
  team_id,
  name,
  abbreviation,
  primary_color,
  secondary_color,
  logo_svg_url,
  league_name,
  division_name
FROM staging_teams
ON CONFLICT (team_id) DO UPDATE SET
  name = EXCLUDED.name,
  abbreviation = EXCLUDED.abbreviation,
  primary_color = EXCLUDED.primary_color,
  secondary_color = EXCLUDED.secondary_color,
  logo_svg_url = EXCLUDED.logo_svg_url,
  league_name = EXCLUDED.league_name,
  division_name = EXCLUDED.division_name;
INSERT INTO public.players AS target (
  player_id,
  full_name,
  height_text,
  height_inches,
  abs_strike_zone_top,
  abs_strike_zone_bottom,
  active,
  source_payload,
  source_updated_at,
  created_at,
  updated_at
)
SELECT
  player_id,
  full_name,
  height_text,
  height_inches,
  abs_strike_zone_top,
  abs_strike_zone_bottom,
  active,
  source_payload,
  source_updated_at,
  created_at,
  updated_at
FROM staging_players
ON CONFLICT (player_id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  height_text = EXCLUDED.height_text,
  height_inches = EXCLUDED.height_inches,
  abs_strike_zone_top = EXCLUDED.abs_strike_zone_top,
  abs_strike_zone_bottom = EXCLUDED.abs_strike_zone_bottom,
  active = EXCLUDED.active,
  source_payload = EXCLUDED.source_payload,
  source_updated_at = EXCLUDED.source_updated_at,
  updated_at = EXCLUDED.updated_at;
DELETE FROM public.games
WHERE $GAME_WINDOW_FILTER;
INSERT INTO public.games SELECT * FROM staging_games;
INSERT INTO public.officials SELECT * FROM staging_officials;
INSERT INTO public.at_bats SELECT * FROM staging_at_bats;
INSERT INTO public.play_events SELECT * FROM staging_play_events;
INSERT INTO public.pitches SELECT * FROM staging_pitches;
INSERT INTO public.abs_challenges SELECT * FROM staging_abs_challenges;
INSERT INTO public.game_state_snapshots SELECT * FROM staging_game_state_snapshots;
TRUNCATE TABLE public.team_abs_game_summary;
INSERT INTO public.team_abs_game_summary (
  game_pk,
  team_id,
  team_side,
  used_successful,
  used_failed,
  remaining,
  created_at,
  updated_at
)
SELECT
  game_pk,
  team_id,
  team_side,
  used_successful,
  used_failed,
  remaining,
  created_at,
  updated_at
FROM staging_team_abs_game_summary;
TRUNCATE TABLE public.umpire_abs_game_summary;
INSERT INTO public.umpire_abs_game_summary (
  game_pk,
  umpire_id,
  umpire_name,
  challenged_calls,
  overturned_calls,
  confirmed_calls,
  created_at,
  updated_at
)
SELECT
  game_pk,
  umpire_id,
  umpire_name,
  challenged_calls,
  overturned_calls,
  confirmed_calls,
  created_at,
  updated_at
FROM staging_umpire_abs_game_summary;
INSERT INTO public.game_reports SELECT * FROM staging_game_reports;
TRUNCATE TABLE ops.game_linescores;
INSERT INTO ops.game_linescores SELECT * FROM staging_game_linescores;
DELETE FROM raw.savant_abs_events
WHERE $SAVANT_DATE_WINDOW_FILTER
   OR game_pk IN (SELECT game_pk FROM staging_savant_gamefeed_games);
DELETE FROM raw.savant_gamefeed_games
WHERE $SAVANT_DATE_WINDOW_FILTER
   OR game_pk IN (SELECT game_pk FROM staging_savant_gamefeed_games);
INSERT INTO raw.savant_gamefeed_games SELECT * FROM staging_savant_gamefeed_games;
INSERT INTO raw.savant_abs_events SELECT * FROM staging_savant_abs_events;
TRUNCATE TABLE serving_run_expectancy_fallbacks;
TRUNCATE TABLE serving_win_expectancy_fallbacks;
TRUNCATE TABLE serving_count_state_outcome_baselines;
TRUNCATE TABLE serving_abs_overturn_probability_fallbacks;
\copy serving_run_expectancy_fallbacks FROM '$RUN_FALLBACK_CSV' CSV
\copy serving_win_expectancy_fallbacks FROM '$WIN_FALLBACK_CSV' CSV
\copy serving_count_state_outcome_baselines FROM '$COUNT_BASELINE_CSV' CSV
\copy serving_abs_overturn_probability_fallbacks FROM '$OVERTURN_FALLBACK_CSV' CSV
COMMIT;
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
  'ops.game_linescores=' || COUNT(*)
FROM ops.game_linescores;

SELECT
  'raw.savant_abs_events=' || COUNT(*)
FROM raw.savant_abs_events;

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

DO $$
BEGIN
  IF EXISTS (
    WITH duplicate_lookup AS (
      SELECT 'run_expectancy' AS source
      FROM public.serving_run_expectancy_fallbacks
      GROUP BY fallback_tier, inning_bucket, outs, bases_state, count_key
      HAVING COUNT(*) > 1
      UNION ALL
      SELECT 'win_expectancy' AS source
      FROM public.serving_win_expectancy_fallbacks
      GROUP BY fallback_tier, inning, inning_bucket, half_inning, score_diff_bucket, outs, bases_state, count_key
      HAVING COUNT(*) > 1
      UNION ALL
      SELECT 'overturn_probability' AS source
      FROM public.serving_abs_overturn_probability_fallbacks
      GROUP BY fallback_tier, geometry_variant, challenge_direction, edge_bucket
      HAVING COUNT(*) > 1
    )
    SELECT 1 FROM duplicate_lookup
  ) THEN
    RAISE EXCEPTION 'serving fallback lookup tables contain duplicate mart join keys';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.mart_abs_pitch_challenges
    WHERE effective_pitch_number IS NULL
  ) THEN
    RAISE EXCEPTION 'canonical ABS pitch challenges include rows without effective_pitch_number';
  END IF;

  IF EXISTS (
    WITH fact AS (
      SELECT
        game_pk,
        challenge_team_id AS team_id,
        COUNT(*) FILTER (WHERE is_overturned = TRUE) AS used_successful,
        COUNT(*) FILTER (WHERE is_overturned = FALSE) AS used_failed
      FROM public.mart_abs_pitch_challenges
      WHERE challenge_team_id IS NOT NULL
      GROUP BY game_pk, challenge_team_id
    )
    SELECT 1
    FROM public.team_abs_game_summary s
    FULL OUTER JOIN fact f ON f.game_pk = s.game_pk AND f.team_id = s.team_id
    WHERE COALESCE(s.used_successful, 0) <> COALESCE(f.used_successful, 0)
       OR COALESCE(s.used_failed, 0) <> COALESCE(f.used_failed, 0)
  ) THEN
    RAISE EXCEPTION 'team_abs_game_summary does not reconcile to canonical ABS pitch challenges';
  END IF;
END $$;
SQL

publish_timestamp="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
manifest_path="$MANIFEST_DIR/publish-${publish_timestamp//:/-}.json"
git_sha="$(git -C "$ROOT_DIR" rev-parse --short HEAD 2>/dev/null || echo unknown)"
source_games_count="$(psql "$SOURCE_DATABASE_URL" -Atqc "SELECT COUNT(*) FROM public.games")"
source_abs_count="$(psql "$SOURCE_DATABASE_URL" -Atqc "SELECT COUNT(*) FROM public.abs_challenges")"
source_savant_abs_count="$(psql "$SOURCE_DATABASE_URL" -Atqc "SELECT COUNT(*) FROM raw.savant_abs_events")"
source_games_max_date="$(psql "$SOURCE_DATABASE_URL" -Atqc "SELECT COALESCE(MAX(game_date)::text, '') FROM public.games")"
source_abs_max_ts="$(psql "$SOURCE_DATABASE_URL" -Atqc "SELECT COALESCE(MAX(challenged_at)::text, '') FROM public.abs_challenges")"
target_games_count="$(psql "$TARGET_DATABASE_URL" -Atqc "SELECT COUNT(*) FROM public.games")"
target_abs_count="$(psql "$TARGET_DATABASE_URL" -Atqc "SELECT COUNT(*) FROM public.abs_challenges")"
target_savant_abs_count="$(psql "$TARGET_DATABASE_URL" -Atqc "SELECT COUNT(*) FROM raw.savant_abs_events")"
target_run_fallbacks="$(psql "$TARGET_DATABASE_URL" -Atqc "SELECT COUNT(*) FROM public.serving_run_expectancy_fallbacks")"
target_win_fallbacks="$(psql "$TARGET_DATABASE_URL" -Atqc "SELECT COUNT(*) FROM public.serving_win_expectancy_fallbacks")"
target_count_baselines="$(psql "$TARGET_DATABASE_URL" -Atqc "SELECT COUNT(*) FROM public.serving_count_state_outcome_baselines")"
target_overturn_fallbacks="$(psql "$TARGET_DATABASE_URL" -Atqc "SELECT COUNT(*) FROM public.serving_abs_overturn_probability_fallbacks")"

cat > "$manifest_path" <<JSON
{
  "publishedAt": "$publish_timestamp",
  "gitSha": "$git_sha",
  "sourceDatabase": "$SOURCE_LABEL",
  "targetDatabase": "$TARGET_LABEL",
  "window": {
    "startDate": "$SYNC_START_DATE",
    "endDate": "$SYNC_END_DATE"
  },
  "sourceCutoffs": {
    "gamesMaxDate": "$source_games_max_date",
    "absChallengesMaxTimestamp": "$source_abs_max_ts"
  },
  "rowCounts": {
    "source": {
      "games": $source_games_count,
      "absChallenges": $source_abs_count,
      "rawSavantAbsEvents": $source_savant_abs_count
    },
    "target": {
      "games": $target_games_count,
      "absChallenges": $target_abs_count,
      "rawSavantAbsEvents": $target_savant_abs_count,
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
