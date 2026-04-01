#!/usr/bin/env python3
from __future__ import annotations

import argparse
import os

import psycopg2
from dotenv import load_dotenv

from db_target import log_database_target, resolve_database_target


BUILD_SQL = """
WITH filtered AS (
  SELECT *
  FROM raw.statcast_pitches
  WHERE (%(season)s IS NULL OR season = %(season)s)
    AND (%(start_date)s IS NULL OR game_date >= %(start_date)s::date)
    AND (%(end_date)s IS NULL OR game_date <= %(end_date)s::date)
),
inning_terminal AS (
  SELECT
    game_pk,
    inning,
    half_inning,
    batting_team_id,
    MAX(COALESCE(post_bat_score, bat_score, 0)) AS inning_end_bat_score
  FROM filtered
  GROUP BY game_pk, inning, half_inning, batting_team_id
)
INSERT INTO historical_pitch_states (
  game_pk, game_date, season, inning, inning_bucket, half_inning, at_bat_number, pitch_number,
  balls, strikes, outs, count_key, bases_state, on_1b, on_2b, on_3b, home_score, away_score,
  bat_score, fld_score, post_bat_score, post_fld_score, batting_team_id, fielding_team_id, winning_team_id,
  score_diff_batting, batter_id, pitcher_id, stand, p_throws, pitch_type, pitch_name, description, events,
  plate_x, plate_z, is_in_play, is_last_pitch_of_pa, positive_outcome, official_at_bat, walk_event,
  strikeout_event, hit_event, batting_team_won, runs_to_inning_end, source
)
SELECT
  p.game_pk,
  p.game_date,
  p.season,
  p.inning,
  CASE
    WHEN p.inning >= 9 THEN '9+'
    WHEN p.inning >= 7 THEN '7-8'
    WHEN p.inning >= 4 THEN '4-6'
    ELSE '1-3'
  END AS inning_bucket,
  p.half_inning,
  p.at_bat_number,
  p.pitch_number,
  p.balls,
  p.strikes,
  p.outs,
  CASE
    WHEN p.balls IS NULL OR p.strikes IS NULL THEN NULL
    ELSE CONCAT(LEAST(GREATEST(p.balls, 0), 3), '-', LEAST(GREATEST(p.strikes, 0), 2))
  END AS count_key,
  COALESCE(p.bases_state, CONCAT(CASE WHEN p.on_1b IS NULL THEN '0' ELSE '1' END, CASE WHEN p.on_2b IS NULL THEN '0' ELSE '1' END, CASE WHEN p.on_3b IS NULL THEN '0' ELSE '1' END)) AS bases_state,
  (p.on_1b IS NOT NULL) AS on_1b,
  (p.on_2b IS NOT NULL) AS on_2b,
  (p.on_3b IS NOT NULL) AS on_3b,
  p.home_score,
  p.away_score,
  p.bat_score,
  p.fld_score,
  p.post_bat_score,
  p.post_fld_score,
  p.batting_team_id,
  p.fielding_team_id,
  p.winning_team_id,
  p.score_diff_batting,
  p.batter_id,
  p.pitcher_id,
  p.stand,
  p.p_throws,
  p.pitch_type,
  p.pitch_name,
  p.description,
  p.events,
  p.plate_x,
  p.plate_z,
  p.is_in_play,
  p.is_last_pitch_of_pa,
  COALESCE(p.events IN ('single', 'double', 'triple', 'home_run', 'walk', 'intent_walk'), FALSE) AS positive_outcome,
  COALESCE(p.events NOT IN ('walk', 'intent_walk', 'hit_by_pitch', 'sac_bunt', 'sac_fly', 'catcher_interf'), FALSE) AS official_at_bat,
  COALESCE(p.events IN ('walk', 'intent_walk'), FALSE) AS walk_event,
  COALESCE(p.events IN ('strikeout', 'strikeout_double_play'), FALSE) AS strikeout_event,
  COALESCE(p.events IN ('single', 'double', 'triple', 'home_run'), FALSE) AS hit_event,
  CASE
    WHEN p.winning_team_id IS NULL OR p.batting_team_id IS NULL THEN NULL
    ELSE p.winning_team_id = p.batting_team_id
  END AS batting_team_won,
  GREATEST(0, COALESCE(it.inning_end_bat_score, COALESCE(p.post_bat_score, p.bat_score, 0)) - COALESCE(p.bat_score, 0))::NUMERIC AS runs_to_inning_end,
  'statcast_backfill' AS source
FROM filtered p
LEFT JOIN inning_terminal it
  ON it.game_pk = p.game_pk
 AND it.inning = p.inning
 AND it.half_inning = p.half_inning
 AND it.batting_team_id = p.batting_team_id
ON CONFLICT (game_pk, at_bat_number, pitch_number) DO UPDATE SET
  game_date = EXCLUDED.game_date,
  season = EXCLUDED.season,
  inning = EXCLUDED.inning,
  inning_bucket = EXCLUDED.inning_bucket,
  half_inning = EXCLUDED.half_inning,
  balls = EXCLUDED.balls,
  strikes = EXCLUDED.strikes,
  outs = EXCLUDED.outs,
  count_key = EXCLUDED.count_key,
  bases_state = EXCLUDED.bases_state,
  on_1b = EXCLUDED.on_1b,
  on_2b = EXCLUDED.on_2b,
  on_3b = EXCLUDED.on_3b,
  home_score = EXCLUDED.home_score,
  away_score = EXCLUDED.away_score,
  bat_score = EXCLUDED.bat_score,
  fld_score = EXCLUDED.fld_score,
  post_bat_score = EXCLUDED.post_bat_score,
  post_fld_score = EXCLUDED.post_fld_score,
  batting_team_id = EXCLUDED.batting_team_id,
  fielding_team_id = EXCLUDED.fielding_team_id,
  winning_team_id = EXCLUDED.winning_team_id,
  score_diff_batting = EXCLUDED.score_diff_batting,
  batter_id = EXCLUDED.batter_id,
  pitcher_id = EXCLUDED.pitcher_id,
  stand = EXCLUDED.stand,
  p_throws = EXCLUDED.p_throws,
  pitch_type = EXCLUDED.pitch_type,
  pitch_name = EXCLUDED.pitch_name,
  description = EXCLUDED.description,
  events = EXCLUDED.events,
  plate_x = EXCLUDED.plate_x,
  plate_z = EXCLUDED.plate_z,
  is_in_play = EXCLUDED.is_in_play,
  is_last_pitch_of_pa = EXCLUDED.is_last_pitch_of_pa,
  positive_outcome = EXCLUDED.positive_outcome,
  official_at_bat = EXCLUDED.official_at_bat,
  walk_event = EXCLUDED.walk_event,
  strikeout_event = EXCLUDED.strikeout_event,
  hit_event = EXCLUDED.hit_event,
  batting_team_won = EXCLUDED.batting_team_won,
  runs_to_inning_end = EXCLUDED.runs_to_inning_end,
  source = EXCLUDED.source,
  updated_at = NOW()
"""


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Build canonical historical pitch states from raw Statcast rows")
    parser.add_argument("--season", type=int)
    parser.add_argument("--start-date")
    parser.add_argument("--end-date")
    parser.add_argument("--database-url", help="Postgres connection string; defaults to WAREHOUSE_DATABASE_URL")
    return parser.parse_args()


def main() -> None:
    load_dotenv()
    args = parse_args()
    target = resolve_database_target(cli_database_url=args.database_url, role="warehouse")
    log_database_target("[build_historical_pitch_states]", target)
    conn = psycopg2.connect(target.connection_string)
    try:
        with conn:
            with conn.cursor() as cur:
                cur.execute(
                    BUILD_SQL,
                    {
                        "season": args.season,
                        "start_date": args.start_date,
                        "end_date": args.end_date,
                    },
                )
        print("historical_pitch_states refreshed")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
