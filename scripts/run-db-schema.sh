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

sanitize_database_url() {
  python3 - "$1" <<'PY'
import sys
from urllib.parse import urlparse

raw = sys.argv[1]
parsed = urlparse(raw)
host = parsed.hostname or "local_socket"
database = parsed.path.lstrip("/") or "postgres"
print(f"{parsed.scheme or 'postgresql'}://[redacted]@{host}/{database}")
PY
}

SCHEMA_DATABASE_URL="${SCHEMA_DATABASE_URL:-${DATABASE_URL:-${SERVING_DATABASE_URL:-${WAREHOUSE_DATABASE_URL:-}}}}"
: "${SCHEMA_DATABASE_URL:?SCHEMA_DATABASE_URL, WAREHOUSE_DATABASE_URL, or DATABASE_URL is required.}"

echo "[run-db-schema] target=$(sanitize_database_url "$SCHEMA_DATABASE_URL")"

psql "$SCHEMA_DATABASE_URL" -v ON_ERROR_STOP=1 -f "$ROOT_DIR/db/schema.sql"
psql "$SCHEMA_DATABASE_URL" -v ON_ERROR_STOP=1 -f "$ROOT_DIR/db/seed_teams.sql"
psql "$SCHEMA_DATABASE_URL" -v ON_ERROR_STOP=1 -f "$ROOT_DIR/db/views.sql"

if [[ "${REFRESH_MODEL_SERVING_LOOKUPS_ON_SCHEMA:-true}" == "true" ]]; then
  psql "$SCHEMA_DATABASE_URL" -v ON_ERROR_STOP=1 <<'SQL'
DO $$
BEGIN
  IF to_regclass('public.mart_run_expectancy_fallbacks') IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM mart_historical_pitch_states_split
      WHERE split_set IN ('train', 'validation')
      LIMIT 1
    )
  THEN
    TRUNCATE TABLE serving_run_expectancy_fallbacks;
    INSERT INTO serving_run_expectancy_fallbacks (
      fallback_tier,
      inning_bucket,
      outs,
      bases_state,
      count_key,
      sample_size,
      expected_runs_to_end_inning,
      confidence_band
    )
    SELECT
      fallback_tier,
      inning_bucket,
      outs,
      bases_state,
      count_key,
      sample_size,
      expected_runs_to_end_inning,
      confidence_band
    FROM mart_run_expectancy_fallbacks;
  END IF;

  IF to_regclass('public.mart_win_expectancy_fallbacks') IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM mart_historical_pitch_states_split
      WHERE split_set IN ('train', 'validation')
        AND batting_team_won IS NOT NULL
      LIMIT 1
    )
  THEN
    TRUNCATE TABLE serving_win_expectancy_fallbacks;
    INSERT INTO serving_win_expectancy_fallbacks (
      fallback_tier,
      inning,
      inning_bucket,
      half_inning,
      score_diff_bucket,
      outs,
      bases_state,
      count_key,
      sample_size,
      batting_team_win_probability,
      confidence_band
    )
    SELECT
      fallback_tier,
      inning,
      inning_bucket,
      half_inning,
      score_diff_bucket,
      outs,
      bases_state,
      count_key,
      sample_size,
      batting_team_win_probability,
      confidence_band
    FROM mart_win_expectancy_fallbacks;
  END IF;

  IF to_regclass('public.mart_modeled_abs_overturn_probability_fallbacks') IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM modeling.called_pitch_decisions
      WHERE split_set IN ('train', 'validation')
      LIMIT 1
    )
  THEN
    TRUNCATE TABLE serving_abs_overturn_probability_fallbacks;
    INSERT INTO serving_abs_overturn_probability_fallbacks (
      fallback_tier,
      split_policy_version,
      geometry_variant,
      challenge_direction,
      edge_bucket,
      sample_size,
      overturns_total,
      raw_overturn_rate,
      overturn_probability,
      confidence_band
    )
    SELECT
      fallback_tier,
      split_policy_version,
      geometry_variant,
      challenge_direction,
      edge_bucket,
      sample_size,
      overturns_total,
      raw_overturn_rate,
      overturn_probability,
      confidence_band
    FROM mart_modeled_abs_overturn_probability_fallbacks;
  END IF;
END $$;
SQL
fi
