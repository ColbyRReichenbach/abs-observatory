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

: "${DATABASE_URL:?DATABASE_URL is required. Copy .env.example to .env.local and set DATABASE_URL.}"

required_relations=(
  "public.teams"
  "public.games"
  "public.at_bats"
  "public.play_events"
  "public.pitches"
  "public.abs_challenges"
  "public.mart_game_pitch_timeline"
  "public.mart_game_play_events"
  "public.mart_count_state_baselines"
  "public.mart_count_state_delta_baselines"
  "public.mart_zone_outcome_baselines"
  "public.mart_pitch_type_count_baselines"
  "product.users"
  "community.comments"
  "editorial.articles"
  "ai.conversations"
  "ops.audit_log"
  "public.mart_abs_events_enriched"
)

for relation in "${required_relations[@]}"; do
  exists="$(psql "$DATABASE_URL" -Atqc "SELECT to_regclass('$relation') IS NOT NULL")"
  if [[ "$exists" != "t" ]]; then
    echo "Missing required relation: $relation" >&2
    exit 1
  fi
done

fixture_output="$(psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -At <<'SQL'
BEGIN;

INSERT INTO games (
  game_pk, game_date, game_type, season, status_abstract, status_detailed,
  home_team_id, away_team_id, home_score, away_score, venue_name
)
VALUES (
  999001, NOW(), 'R', EXTRACT(YEAR FROM NOW())::INT, 'Final', 'Final',
  147, 111, 3, 2, 'Fixture Park'
)
ON CONFLICT (game_pk) DO UPDATE SET updated_at = NOW();

INSERT INTO at_bats (
  game_pk, at_bat_index, inning, half_inning, batter_id, batter_name, pitcher_id, pitcher_name,
  event_type, event_description, balls, strikes, outs, is_complete, is_scoring_play,
  bases_state_start, bases_state_end, home_score_start, away_score_start, home_score_end, away_score_end
)
VALUES (
  999001, 1, 9, 'bottom', 1001, 'Fixture Batter', 2001, 'Fixture Pitcher',
  'strikeout', 'Fixture strikeout', 0, 3, 2, TRUE, FALSE,
  '000', '000', 2, 2, 3, 2
)
ON CONFLICT (game_pk, at_bat_index) DO NOTHING;

INSERT INTO pitches (
  game_pk, at_bat_index, pitch_number, play_event_index, inning, half_inning,
  batter_id, batter_name, pitcher_id, pitcher_name, called_code, called_description, play_description,
  is_ball, is_strike, pitch_type_code, pitch_type_description, start_speed, end_speed, spin_rate,
  px, pz, strike_zone_top, strike_zone_bottom, zone, has_review, is_in_play, ended_plate_appearance,
  balls_before, strikes_before, outs_before, balls_after, strikes_after, outs_after,
  bases_state_before, bases_state_after, home_score_before, away_score_before, home_score_after, away_score_after
)
VALUES (
  999001, 1, 3, 3, 9, 'bottom',
  1001, 'Fixture Batter', 2001, 'Fixture Pitcher', 'C', 'Called Strike', 'Called strike three',
  FALSE, TRUE, 'SL', 'Slider', 89.7, 81.2, 2550,
  -0.71, 1.42, 3.4, 1.4, 11, TRUE, FALSE, TRUE,
  0, 2, 1, 0, 3, 2,
  '000', '000', 2, 2, 3, 2
)
ON CONFLICT (game_pk, at_bat_index, pitch_number) DO NOTHING;

INSERT INTO abs_challenges (
  dedupe_key, game_pk, at_bat_index, pitch_number, challenge_level, challenge_team_id, challenge_team_side,
  challenge_player_id, challenge_player_name, is_overturned, review_type, in_progress,
  called_code, called_description, inning, half_inning, balls, strikes, outs,
  batter_id, batter_name, pitcher_id, pitcher_name, home_score, away_score, bases_state,
  px, pz, strike_zone_top, strike_zone_bottom, challenged_at
)
VALUES (
  'fixture-direct-ending-impact', 999001, 1, 3, 'pitch', 147, 'home',
  3001, 'Fixture Catcher', TRUE, 'ABS challenge', FALSE,
  'C', 'Called Strike', 9, 'bottom', 0, 2, 1,
  1001, 'Fixture Batter', 2001, 'Fixture Pitcher', 3, 2, '000',
  -0.71, 1.42, 3.4, 1.4, NOW()
)
ON CONFLICT (dedupe_key) DO NOTHING;

INSERT INTO team_abs_game_summary (
  game_pk,
  team_id,
  team_side,
  used_successful,
  used_failed,
  remaining
)
VALUES
  (999001, 147, 'home', 1, 0, 1),
  (999001, 111, 'away', 0, 1, 1)
ON CONFLICT (game_pk, team_id) DO NOTHING;

SELECT
  (SELECT impact_type FROM mart_game_pitch_timeline WHERE game_pk = 999001 AND pitch_number = 3 LIMIT 1),
  (SELECT plate_appearances FROM mart_count_state_baselines WHERE balls_before = 0 AND strikes_before = 2 LIMIT 1),
  (SELECT challenged_pitch_count FROM mart_count_state_delta_baselines WHERE balls_before = 0 AND strikes_before = 2 AND balls_after = 0 AND strikes_after = 3 LIMIT 1),
  (SELECT challenges_total FROM mart_daily_editorial_summary WHERE summary_date = CURRENT_DATE LIMIT 1),
  (SELECT challenges_total FROM mart_weekly_editorial_summary WHERE week_start = DATE_TRUNC('week', CURRENT_TIMESTAMP AT TIME ZONE 'UTC')::date LIMIT 1);

ROLLBACK;
SQL
)"

fixture_result="$(printf '%s\n' "$fixture_output" | grep '|' | tail -n 1)"

IFS='|' read -r impact_type plate_appearances challenged_pitch_count daily_challenges weekly_challenges <<< "$fixture_result"

if [[ "$impact_type" != "direct_ending_impact" ]]; then
  echo "Unexpected impact classification from mart_game_pitch_timeline: $impact_type" >&2
  exit 1
fi

if [[ -z "$plate_appearances" || "$plate_appearances" -lt 1 ]]; then
  echo "mart_count_state_baselines did not return expected fixture aggregate" >&2
  exit 1
fi

if [[ -z "$challenged_pitch_count" || "$challenged_pitch_count" -lt 1 ]]; then
  echo "mart_count_state_delta_baselines did not return expected challenged fixture aggregate" >&2
  exit 1
fi

if [[ -z "$daily_challenges" || "$daily_challenges" -lt 1 ]]; then
  echo "mart_daily_editorial_summary did not return expected challenge aggregate" >&2
  exit 1
fi

if [[ -z "$weekly_challenges" || "$weekly_challenges" -lt 1 ]]; then
  echo "mart_weekly_editorial_summary did not return expected weekly aggregate" >&2
  exit 1
fi

echo "Database smoke check passed."
