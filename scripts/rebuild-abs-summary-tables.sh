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

: "${TARGET_DATABASE_URL:=${WAREHOUSE_DATABASE_URL:-${DATABASE_URL:-}}}"
: "${TARGET_DATABASE_URL:?TARGET_DATABASE_URL, WAREHOUSE_DATABASE_URL, or DATABASE_URL is required.}"

echo "Rebuilding ABS summary tables"

psql "$TARGET_DATABASE_URL" -v ON_ERROR_STOP=1 <<'SQL'
BEGIN;

TRUNCATE TABLE team_abs_game_summary;

WITH latest_snapshot AS (
  SELECT DISTINCT ON (game_pk)
    game_pk,
    abs_home_remaining,
    abs_away_remaining
  FROM game_state_snapshots
  ORDER BY game_pk, snapshot_time DESC
),
team_challenges AS (
  SELECT
    c.game_pk,
    c.challenge_team_id AS team_id,
    COUNT(*) FILTER (WHERE c.is_overturned = TRUE) AS used_successful,
    COUNT(*) FILTER (WHERE c.is_overturned = FALSE) AS used_failed
  FROM abs_challenges c
  WHERE c.challenge_team_id IS NOT NULL
  GROUP BY c.game_pk, c.challenge_team_id
),
all_team_games AS (
  SELECT
    g.game_pk,
    g.home_team_id AS team_id,
    'home'::text AS team_side,
    COALESCE(tc.used_successful, 0) AS used_successful,
    COALESCE(tc.used_failed, 0) AS used_failed,
    COALESCE(ls.abs_home_remaining, GREATEST(0, 2 - COALESCE(tc.used_failed, 0))) AS remaining
  FROM games g
  LEFT JOIN latest_snapshot ls ON ls.game_pk = g.game_pk
  LEFT JOIN team_challenges tc
    ON tc.game_pk = g.game_pk
   AND tc.team_id = g.home_team_id
  WHERE g.home_team_id IS NOT NULL

  UNION ALL

  SELECT
    g.game_pk,
    g.away_team_id AS team_id,
    'away'::text AS team_side,
    COALESCE(tc.used_successful, 0) AS used_successful,
    COALESCE(tc.used_failed, 0) AS used_failed,
    COALESCE(ls.abs_away_remaining, GREATEST(0, 2 - COALESCE(tc.used_failed, 0))) AS remaining
  FROM games g
  LEFT JOIN latest_snapshot ls ON ls.game_pk = g.game_pk
  LEFT JOIN team_challenges tc
    ON tc.game_pk = g.game_pk
   AND tc.team_id = g.away_team_id
  WHERE g.away_team_id IS NOT NULL
)
INSERT INTO team_abs_game_summary (
  game_pk,
  team_id,
  team_side,
  used_successful,
  used_failed,
  remaining
)
SELECT
  game_pk,
  team_id,
  team_side,
  used_successful,
  used_failed,
  remaining
FROM all_team_games;

TRUNCATE TABLE umpire_abs_game_summary;

WITH home_plate_officials AS (
  SELECT DISTINCT ON (o.game_pk)
    o.game_pk,
    o.official_id AS umpire_id,
    o.official_name AS umpire_name
  FROM officials o
  WHERE o.official_type = 'Home Plate'
  ORDER BY o.game_pk, o.official_id
),
umpire_challenges AS (
  SELECT
    c.game_pk,
    COUNT(*) AS challenged_calls,
    COUNT(*) FILTER (WHERE c.is_overturned = TRUE) AS overturned_calls,
    COUNT(*) FILTER (WHERE c.is_overturned = FALSE) AS confirmed_calls
  FROM abs_challenges c
  GROUP BY c.game_pk
)
INSERT INTO umpire_abs_game_summary (
  game_pk,
  umpire_id,
  umpire_name,
  challenged_calls,
  overturned_calls,
  confirmed_calls
)
SELECT
  o.game_pk,
  o.umpire_id,
  o.umpire_name,
  COALESCE(c.challenged_calls, 0) AS challenged_calls,
  COALESCE(c.overturned_calls, 0) AS overturned_calls,
  COALESCE(c.confirmed_calls, 0) AS confirmed_calls
FROM home_plate_officials o
LEFT JOIN umpire_challenges c ON c.game_pk = o.game_pk;

COMMIT;
SQL

echo "ABS summary tables rebuilt."
