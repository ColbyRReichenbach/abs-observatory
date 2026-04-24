#!/usr/bin/env python3
from __future__ import annotations

import argparse

import psycopg2
from dotenv import load_dotenv

from db_target import log_database_target, resolve_database_target


BUILD_SQL = """
WITH statcast_taken AS (
  SELECT
    p.game_pk,
    p.game_date,
    p.season,
    g.game_type,
    CASE
      WHEN g.game_type = 'S' THEN 'spring_training'
      WHEN g.game_type = 'R' THEN 'regular_season'
      WHEN g.game_type IN ('F', 'D', 'L', 'W') THEN 'postseason'
      ELSE 'other'
    END AS competition_phase,
    (g.game_type = 'S') AS is_spring_training,
    (g.game_type = 'R') AS is_regular_season,
    (g.game_type IN ('F', 'D', 'L', 'W')) AS is_postseason,
    COALESCE(sg.has_abs, FALSE) AS is_abs_enabled_game,
    p.inning,
    p.half_inning,
    p.at_bat_number,
    p.pitch_number,
    p.balls,
    p.strikes,
    p.outs,
    COALESCE(
      p.bases_state,
      CONCAT(
        CASE WHEN p.on_1b IS NULL THEN '0' ELSE '1' END,
        CASE WHEN p.on_2b IS NULL THEN '0' ELSE '1' END,
        CASE WHEN p.on_3b IS NULL THEN '0' ELSE '1' END
      )
    ) AS bases_state,
    p.home_score,
    p.away_score,
    p.score_diff_batting,
    p.batting_team_id,
    p.fielding_team_id,
    sae.challenge_team_id AS actual_challenge_team_id,
    p.batter_id,
    p.pitcher_id,
    sae.catcher_id,
    p.stand,
    p.p_throws,
    p.pitch_type,
    p.pitch_name,
    sae.start_speed,
    sae.end_speed,
    sae.spin_rate,
    p.plate_x,
    p.plate_z,
    p.plate_x AS px,
    p.plate_z AS pz,
    bp.abs_strike_zone_top AS strike_zone_top,
    bp.abs_strike_zone_bottom AS strike_zone_bottom,
    NULL::INTEGER AS zone,
    p.description AS called_code,
    p.description AS called_description,
    CASE
      WHEN sae.game_pk IS NOT NULL
        AND (
          sae.is_batter_challenge = TRUE
          OR sae.challenge_team_id = p.batting_team_id
        ) THEN 'strike'
      WHEN sae.game_pk IS NOT NULL
        AND sae.challenge_team_id = p.fielding_team_id THEN 'ball'
      WHEN p.description IN ('called_strike', 'automatic_strike') THEN 'strike'
      WHEN p.description IN ('ball', 'blocked_ball', 'automatic_ball') THEN 'ball'
      ELSE NULL
    END AS observed_call,
    (
      CASE
        WHEN sae.game_pk IS NOT NULL
          AND (
            sae.is_batter_challenge = TRUE
            OR sae.challenge_team_id = p.batting_team_id
          ) THEN 'strike'
        WHEN sae.game_pk IS NOT NULL
          AND sae.challenge_team_id = p.fielding_team_id THEN 'ball'
        WHEN p.description IN ('called_strike', 'automatic_strike') THEN 'strike'
        WHEN p.description IN ('ball', 'blocked_ball', 'automatic_ball') THEN 'ball'
        ELSE NULL
      END
    ) = 'ball' AS is_called_ball,
    (
      CASE
        WHEN sae.game_pk IS NOT NULL
          AND (
            sae.is_batter_challenge = TRUE
            OR sae.challenge_team_id = p.batting_team_id
          ) THEN 'strike'
        WHEN sae.game_pk IS NOT NULL
          AND sae.challenge_team_id = p.fielding_team_id THEN 'ball'
        WHEN p.description IN ('called_strike', 'automatic_strike') THEN 'strike'
        WHEN p.description IN ('ball', 'blocked_ball', 'automatic_ball') THEN 'ball'
        ELSE NULL
      END
    ) = 'strike' AS is_called_strike,
    CASE WHEN sae.game_pk IS NOT NULL THEN TRUE ELSE FALSE END AS was_challenged,
    CASE WHEN sae.game_pk IS NOT NULL THEN 'raw.savant_abs_events' ELSE NULL END AS challenge_source,
    CASE
      WHEN sae.game_pk IS NOT NULL THEN CONCAT('savant:', sae.game_pk, ':', sae.play_id, ':', COALESCE(sae.pitch_number::TEXT, 'na'))
      ELSE NULL
    END AS challenge_dedupe_key,
    CASE
      WHEN sae.game_pk IS NULL THEN NULL
      WHEN sae.is_overturned THEN 'overturned'
      ELSE 'confirmed'
    END AS challenge_outcome,
    sae.is_overturned,
    CASE WHEN sae.game_pk IS NOT NULL THEN TRUE ELSE FALSE END AS challenge_result_confirmed_source,
    'raw.statcast_pitches' AS source_system,
    md5(CONCAT_WS(':', 'statcast', p.game_pk::TEXT, p.at_bat_number::TEXT, p.pitch_number::TEXT, COALESCE(p.description, 'na'))) AS source_row_hash
  FROM raw.statcast_pitches p
  INNER JOIN raw.statcast_games g
    ON g.game_pk = p.game_pk
  LEFT JOIN players bp
    ON bp.player_id = p.batter_id
  LEFT JOIN raw.savant_gamefeed_games sg
    ON sg.game_pk = p.game_pk
  LEFT JOIN raw.savant_abs_events sae
    ON sae.game_pk = p.game_pk
   AND sae.at_bat_number = p.at_bat_number
   AND sae.pitch_number = p.pitch_number
  WHERE p.description IN ('ball', 'blocked_ball', 'called_strike', 'automatic_ball', 'automatic_strike')
    AND (%(season)s IS NULL OR p.season = %(season)s)
    AND (%(start_date)s IS NULL OR p.game_date >= %(start_date)s::date)
    AND (%(end_date)s IS NULL OR p.game_date <= %(end_date)s::date)
),
savant_challenge_only AS (
  SELECT
    sae.game_pk,
    sae.game_date,
    sae.season,
    COALESCE(sg.game_type, CASE WHEN sae.game_date < DATE '2026-03-26' THEN 'S' ELSE 'R' END) AS game_type,
    CASE
      WHEN COALESCE(sg.game_type, CASE WHEN sae.game_date < DATE '2026-03-26' THEN 'S' ELSE 'R' END) = 'S' THEN 'spring_training'
      WHEN COALESCE(sg.game_type, CASE WHEN sae.game_date < DATE '2026-03-26' THEN 'S' ELSE 'R' END) = 'R' THEN 'regular_season'
      WHEN COALESCE(sg.game_type, '') IN ('F', 'D', 'L', 'W') THEN 'postseason'
      ELSE 'other'
    END AS competition_phase,
    (COALESCE(sg.game_type, CASE WHEN sae.game_date < DATE '2026-03-26' THEN 'S' ELSE 'R' END) = 'S') AS is_spring_training,
    (COALESCE(sg.game_type, CASE WHEN sae.game_date < DATE '2026-03-26' THEN 'S' ELSE 'R' END) = 'R') AS is_regular_season,
    (COALESCE(sg.game_type, '') IN ('F', 'D', 'L', 'W')) AS is_postseason,
    TRUE AS is_abs_enabled_game,
    COALESCE(lp.inning, sae.inning, lac.inning, 0) AS inning,
    COALESCE(lp.half_inning, lac.half_inning, CASE WHEN sae.team_side = 'home' THEN 'top' ELSE 'bottom' END) AS half_inning,
    sae.at_bat_number,
    COALESCE(sae.pitch_number, 0) AS pitch_number,
    COALESCE(lp.balls_before, lac.balls, sae.pre_balls, sae.balls) AS balls,
    COALESCE(lp.strikes_before, lac.strikes, sae.pre_strikes, sae.strikes) AS strikes,
    COALESCE(lp.outs_before, lac.outs, sae.outs) AS outs,
    COALESCE(
      lp.bases_state_before,
      lac.bases_state,
      CASE
      WHEN sae.source_payload ? 'runnerOn1B'
        OR sae.source_payload ? 'runnerOn2B'
        OR sae.source_payload ? 'runnerOn3B'
      THEN CONCAT(
        CASE WHEN COALESCE((sae.source_payload ->> 'runnerOn1B')::BOOLEAN, FALSE) THEN '1' ELSE '0' END,
        CASE WHEN COALESCE((sae.source_payload ->> 'runnerOn2B')::BOOLEAN, FALSE) THEN '1' ELSE '0' END,
        CASE WHEN COALESCE((sae.source_payload ->> 'runnerOn3B')::BOOLEAN, FALSE) THEN '1' ELSE '0' END
      )
      ELSE NULL
      END
    ) AS bases_state,
    COALESCE(lp.home_score_before, lac.home_score) AS home_score,
    COALESCE(lp.away_score_before, lac.away_score) AS away_score,
    CASE
      WHEN COALESCE(lp.home_score_before, lac.home_score) IS NULL OR COALESCE(lp.away_score_before, lac.away_score) IS NULL THEN NULL
      WHEN COALESCE(lp.half_inning, lac.half_inning, CASE WHEN sae.team_side = 'home' THEN 'top' ELSE 'bottom' END) = 'top'
        THEN COALESCE(lp.away_score_before, lac.away_score) - COALESCE(lp.home_score_before, lac.home_score)
      ELSE COALESCE(lp.home_score_before, lac.home_score) - COALESCE(lp.away_score_before, lac.away_score)
    END AS score_diff_batting,
    sae.team_batting_id AS batting_team_id,
    sae.team_fielding_id AS fielding_team_id,
    COALESCE(lac.challenge_team_id, sae.challenge_team_id) AS actual_challenge_team_id,
    COALESCE(lp.batter_id, lac.batter_id, sae.batter_id) AS batter_id,
    COALESCE(lp.pitcher_id, lac.pitcher_id, sae.pitcher_id) AS pitcher_id,
    COALESCE(lac.challenge_player_id, sae.catcher_id) AS catcher_id,
    sae.stand AS stand,
    sae.p_throws AS p_throws,
    COALESCE(sae.pitch_type, lp.pitch_type_code) AS pitch_type,
    COALESCE(sae.pitch_name, lp.pitch_type_description) AS pitch_name,
    COALESCE(sae.start_speed, lp.start_speed) AS start_speed,
    COALESCE(sae.end_speed, lp.end_speed) AS end_speed,
    COALESCE(sae.spin_rate, lp.spin_rate) AS spin_rate,
    COALESCE(sae.plate_x, sae.px, lp.px) AS plate_x,
    COALESCE(sae.plate_z, sae.pz, lp.pz) AS plate_z,
    COALESCE(sae.px, lp.px) AS px,
    COALESCE(sae.pz, lp.pz) AS pz,
    COALESCE(sae.strike_zone_top, lp.strike_zone_top, lac.strike_zone_top, lac.inferred_strike_zone_top, bp.abs_strike_zone_top) AS strike_zone_top,
    COALESCE(sae.strike_zone_bottom, lp.strike_zone_bottom, lac.strike_zone_bottom, lac.inferred_strike_zone_bottom, bp.abs_strike_zone_bottom) AS strike_zone_bottom,
    COALESCE(sae.zone, lp.zone, lac.inferred_zone) AS zone,
    COALESCE(lp.called_code, lac.called_code, sae.pitch_call, sae.call_name, sae.description) AS called_code,
    COALESCE(lp.called_description, lac.called_description, sae.description) AS called_description,
    CASE
      WHEN COALESCE(lac.challenge_team_id, sae.challenge_team_id) IS NOT NULL
        AND COALESCE(lac.challenge_team_id, sae.challenge_team_id) = sae.team_batting_id THEN 'strike'
      WHEN COALESCE(lac.challenge_team_id, sae.challenge_team_id) IS NOT NULL
        AND COALESCE(lac.challenge_team_id, sae.challenge_team_id) = sae.team_fielding_id THEN 'ball'
      WHEN sae.is_batter_challenge = TRUE THEN 'strike'
      WHEN LOWER(COALESCE(lp.called_description, lac.called_description, sae.call_name, sae.pitch_call, sae.description, '')) LIKE '%%strike%%' THEN 'strike'
      WHEN LOWER(COALESCE(lp.called_description, lac.called_description, sae.call_name, sae.pitch_call, sae.description, '')) LIKE '%%ball%%' THEN 'ball'
      ELSE NULL
    END AS observed_call,
    (
      CASE
        WHEN COALESCE(lac.challenge_team_id, sae.challenge_team_id) IS NOT NULL
          AND COALESCE(lac.challenge_team_id, sae.challenge_team_id) = sae.team_batting_id THEN 'strike'
        WHEN COALESCE(lac.challenge_team_id, sae.challenge_team_id) IS NOT NULL
          AND COALESCE(lac.challenge_team_id, sae.challenge_team_id) = sae.team_fielding_id THEN 'ball'
        WHEN sae.is_batter_challenge = TRUE THEN 'strike'
        WHEN LOWER(COALESCE(lp.called_description, lac.called_description, sae.call_name, sae.pitch_call, sae.description, '')) LIKE '%%strike%%' THEN 'strike'
        WHEN LOWER(COALESCE(lp.called_description, lac.called_description, sae.call_name, sae.pitch_call, sae.description, '')) LIKE '%%ball%%' THEN 'ball'
        ELSE NULL
      END
    ) = 'ball' AS is_called_ball,
    (
      CASE
        WHEN COALESCE(lac.challenge_team_id, sae.challenge_team_id) IS NOT NULL
          AND COALESCE(lac.challenge_team_id, sae.challenge_team_id) = sae.team_batting_id THEN 'strike'
        WHEN COALESCE(lac.challenge_team_id, sae.challenge_team_id) IS NOT NULL
          AND COALESCE(lac.challenge_team_id, sae.challenge_team_id) = sae.team_fielding_id THEN 'ball'
        WHEN sae.is_batter_challenge = TRUE THEN 'strike'
        WHEN LOWER(COALESCE(lp.called_description, lac.called_description, sae.call_name, sae.pitch_call, sae.description, '')) LIKE '%%strike%%' THEN 'strike'
        WHEN LOWER(COALESCE(lp.called_description, lac.called_description, sae.call_name, sae.pitch_call, sae.description, '')) LIKE '%%ball%%' THEN 'ball'
        ELSE NULL
      END
    ) = 'strike' AS is_called_strike,
    TRUE AS was_challenged,
    COALESCE(CASE WHEN lac.dedupe_key IS NOT NULL THEN 'abs_challenges' END, 'raw.savant_abs_events') AS challenge_source,
    COALESCE(lac.dedupe_key, CONCAT('savant:', sae.game_pk, ':', sae.play_id, ':', COALESCE(sae.pitch_number::TEXT, 'na'))) AS challenge_dedupe_key,
    CASE WHEN COALESCE(lac.is_overturned, sae.is_overturned) THEN 'overturned' ELSE 'confirmed' END AS challenge_outcome,
    COALESCE(lac.is_overturned, sae.is_overturned) AS is_overturned,
    TRUE AS challenge_result_confirmed_source,
    'raw.savant_abs_events' AS source_system,
    md5(CONCAT_WS(':', 'savant', sae.game_pk::TEXT, COALESCE(sae.at_bat_number::TEXT, 'na'), COALESCE(sae.pitch_number::TEXT, 'na'), COALESCE(sae.play_id, 'na'))) AS source_row_hash
  FROM raw.savant_abs_events sae
  LEFT JOIN raw.savant_gamefeed_games sg
    ON sg.game_pk = sae.game_pk
  LEFT JOIN players bp
    ON bp.player_id = sae.batter_id
  LEFT JOIN pitches lp
    ON lp.game_pk = sae.game_pk
   AND lp.at_bat_index = sae.at_bat_number - 1
   AND lp.pitch_number = sae.pitch_number
  LEFT JOIN abs_challenges lac
    ON lac.game_pk = sae.game_pk
   AND lac.at_bat_index = sae.at_bat_number - 1
   AND lac.pitch_number = sae.pitch_number
  LEFT JOIN raw.statcast_pitches p
    ON p.game_pk = sae.game_pk
   AND p.at_bat_number = sae.at_bat_number
   AND p.pitch_number = sae.pitch_number
  WHERE p.game_pk IS NULL
    AND (%(season)s IS NULL OR sae.season = %(season)s)
    AND (%(start_date)s IS NULL OR sae.game_date >= %(start_date)s::date)
    AND (%(end_date)s IS NULL OR sae.game_date <= %(end_date)s::date)
),
combined AS (
  SELECT * FROM statcast_taken
  UNION ALL
  SELECT * FROM savant_challenge_only
),
derived AS (
  SELECT
    c.*,
    'dual_center_radius_v1'::TEXT AS geometry_version,
    'mlb_abs_2026_certified_height_v1'::TEXT AS zone_rule_version,
    'center_of_ball_assumed'::TEXT AS coordinate_interpretation,
    %(ball_radius_feet)s::NUMERIC AS ball_radius_feet,
    CASE
      WHEN c.observed_call = 'strike' THEN c.batting_team_id
      WHEN c.observed_call = 'ball' THEN c.fielding_team_id
      ELSE NULL
    END AS opportunity_team_id,
    CASE
      WHEN c.observed_call = 'strike' THEN 'batting'
      WHEN c.observed_call = 'ball' THEN 'fielding'
      ELSE NULL
    END AS opportunity_team_side,
    CASE
      WHEN c.plate_x IS NULL OR c.plate_z IS NULL OR c.strike_zone_top IS NULL OR c.strike_zone_bottom IS NULL OR c.strike_zone_top <= c.strike_zone_bottom THEN NULL
      WHEN c.plate_x BETWEEN -0.83 AND 0.83 AND c.plate_z BETWEEN c.strike_zone_bottom AND c.strike_zone_top THEN 'strike'
      ELSE 'ball'
    END AS abs_zone_outcome_center_only,
    CASE
      WHEN c.plate_x IS NULL OR c.plate_z IS NULL OR c.strike_zone_top IS NULL OR c.strike_zone_bottom IS NULL OR c.strike_zone_top <= c.strike_zone_bottom THEN NULL
      WHEN c.plate_x BETWEEN (-0.83 - %(ball_radius_feet)s::NUMERIC) AND (0.83 + %(ball_radius_feet)s::NUMERIC)
       AND c.plate_z BETWEEN (c.strike_zone_bottom - %(ball_radius_feet)s::NUMERIC) AND (c.strike_zone_top + %(ball_radius_feet)s::NUMERIC) THEN 'strike'
      ELSE 'ball'
    END AS abs_zone_outcome_radius_adjusted,
    CASE
      WHEN c.plate_x IS NULL OR c.plate_z IS NULL OR c.strike_zone_top IS NULL OR c.strike_zone_bottom IS NULL OR c.strike_zone_top <= c.strike_zone_bottom THEN NULL
      ELSE LEAST(c.plate_x - (-0.83), 0.83 - c.plate_x)
    END AS horizontal_edge_distance_center_only,
    CASE
      WHEN c.plate_x IS NULL OR c.plate_z IS NULL OR c.strike_zone_top IS NULL OR c.strike_zone_bottom IS NULL OR c.strike_zone_top <= c.strike_zone_bottom THEN NULL
      ELSE LEAST(c.plate_z - c.strike_zone_bottom, c.strike_zone_top - c.plate_z)
    END AS vertical_edge_distance_center_only,
    CASE
      WHEN c.plate_x IS NULL OR c.plate_z IS NULL OR c.strike_zone_top IS NULL OR c.strike_zone_bottom IS NULL OR c.strike_zone_top <= c.strike_zone_bottom THEN NULL
      ELSE LEAST(
        c.plate_x - (-0.83 - %(ball_radius_feet)s::NUMERIC),
        (0.83 + %(ball_radius_feet)s::NUMERIC) - c.plate_x
      )
    END AS horizontal_edge_distance_radius_adjusted,
    CASE
      WHEN c.plate_x IS NULL OR c.plate_z IS NULL OR c.strike_zone_top IS NULL OR c.strike_zone_bottom IS NULL OR c.strike_zone_top <= c.strike_zone_bottom THEN NULL
      ELSE LEAST(
        c.plate_z - (c.strike_zone_bottom - %(ball_radius_feet)s::NUMERIC),
        (c.strike_zone_top + %(ball_radius_feet)s::NUMERIC) - c.plate_z
      )
    END AS vertical_edge_distance_radius_adjusted,
    CASE
      WHEN c.plate_x IS NULL OR c.plate_z IS NULL OR c.strike_zone_top IS NULL OR c.strike_zone_bottom IS NULL OR c.strike_zone_top <= c.strike_zone_bottom THEN NULL
      ELSE SQRT(
        POWER(c.plate_x, 2) +
        POWER(c.plate_z - ((c.strike_zone_top + c.strike_zone_bottom) / 2.0), 2)
      )
    END AS absolute_center_distance
  FROM combined c
),
finalized AS (
  SELECT
    d.*,
    (d.abs_zone_outcome_center_only = 'strike') AS is_model_strike_center_only,
    (d.abs_zone_outcome_radius_adjusted = 'strike') AS is_model_strike_radius_adjusted,
    LEAST(d.horizontal_edge_distance_center_only, d.vertical_edge_distance_center_only) AS min_edge_distance_center_only,
    LEAST(d.horizontal_edge_distance_radius_adjusted, d.vertical_edge_distance_radius_adjusted) AS min_edge_distance_radius_adjusted,
    CASE
      WHEN LEAST(d.horizontal_edge_distance_radius_adjusted, d.vertical_edge_distance_radius_adjusted) IS NULL THEN NULL
      WHEN ABS(LEAST(d.horizontal_edge_distance_radius_adjusted, d.vertical_edge_distance_radius_adjusted)) <= %(ball_radius_feet)s::NUMERIC THEN TRUE
      ELSE FALSE
    END AS inside_shadow_band
  FROM derived d
)
INSERT INTO modeling.called_pitch_decisions (
  game_pk, game_date, season, game_type, competition_phase, is_spring_training, is_regular_season, is_postseason,
  is_abs_enabled_game, inning, half_inning, at_bat_number, pitch_number, balls, strikes, outs, bases_state,
  home_score, away_score, score_diff_batting, batting_team_id, fielding_team_id, opportunity_team_id,
  opportunity_team_side, batter_id, pitcher_id, catcher_id, stand, p_throws, pitch_type,
  pitch_name, start_speed, end_speed, spin_rate, plate_x, plate_z, px, pz, strike_zone_top, strike_zone_bottom,
  zone, called_code, called_description, observed_call, is_called_ball, is_called_strike, geometry_version,
  zone_rule_version, coordinate_interpretation, ball_radius_feet, abs_zone_outcome_center_only,
  abs_zone_outcome_radius_adjusted, is_model_strike_center_only, is_model_strike_radius_adjusted,
  horizontal_edge_distance_center_only, vertical_edge_distance_center_only, min_edge_distance_center_only,
  horizontal_edge_distance_radius_adjusted, vertical_edge_distance_radius_adjusted, min_edge_distance_radius_adjusted,
  inside_shadow_band, absolute_center_distance, is_challenge_eligible, was_challenged, challenge_source,
  challenge_dedupe_key, actual_challenge_team_id, challenge_outcome, is_overturned, challenge_result_confirmed_source, source_system,
  source_row_hash, data_snapshot_id, split_set, split_policy_version, feature_freeze_ts
)
SELECT
  game_pk, game_date, season, game_type, competition_phase, is_spring_training, is_regular_season, is_postseason,
  is_abs_enabled_game, inning, half_inning, at_bat_number, pitch_number, balls, strikes, outs, bases_state,
  home_score, away_score, score_diff_batting, batting_team_id, fielding_team_id, opportunity_team_id,
  opportunity_team_side, batter_id, pitcher_id, catcher_id, stand, p_throws, pitch_type,
  pitch_name, start_speed, end_speed, spin_rate, plate_x, plate_z, px, pz, strike_zone_top, strike_zone_bottom,
  zone, called_code, called_description, observed_call, is_called_ball, is_called_strike, geometry_version,
  zone_rule_version, coordinate_interpretation, ball_radius_feet, abs_zone_outcome_center_only,
  abs_zone_outcome_radius_adjusted, is_model_strike_center_only, is_model_strike_radius_adjusted,
  horizontal_edge_distance_center_only, vertical_edge_distance_center_only, min_edge_distance_center_only,
  horizontal_edge_distance_radius_adjusted, vertical_edge_distance_radius_adjusted, min_edge_distance_radius_adjusted,
  inside_shadow_band, absolute_center_distance, (observed_call IN ('ball', 'strike')) AS is_challenge_eligible,
  was_challenged, challenge_source, challenge_dedupe_key, actual_challenge_team_id, challenge_outcome, is_overturned,
  challenge_result_confirmed_source, source_system, source_row_hash, %(data_snapshot_id)s,
  CASE
    WHEN %(split_set)s IS NOT NULL THEN %(split_set)s
    WHEN game_date <= %(train_end_date)s::date THEN 'train'
    WHEN game_date <= %(validation_end_date)s::date THEN 'validation'
    ELSE 'test'
  END,
  %(split_policy_version)s, %(feature_freeze_ts)s::timestamptz
FROM finalized
WHERE observed_call IN ('ball', 'strike')
ON CONFLICT (game_pk, at_bat_number, pitch_number) DO UPDATE SET
  game_date = EXCLUDED.game_date,
  season = EXCLUDED.season,
  game_type = EXCLUDED.game_type,
  competition_phase = EXCLUDED.competition_phase,
  is_spring_training = EXCLUDED.is_spring_training,
  is_regular_season = EXCLUDED.is_regular_season,
  is_postseason = EXCLUDED.is_postseason,
  is_abs_enabled_game = EXCLUDED.is_abs_enabled_game,
  inning = EXCLUDED.inning,
  half_inning = EXCLUDED.half_inning,
  balls = EXCLUDED.balls,
  strikes = EXCLUDED.strikes,
  outs = EXCLUDED.outs,
  bases_state = EXCLUDED.bases_state,
  home_score = EXCLUDED.home_score,
  away_score = EXCLUDED.away_score,
  score_diff_batting = EXCLUDED.score_diff_batting,
  batting_team_id = EXCLUDED.batting_team_id,
  fielding_team_id = EXCLUDED.fielding_team_id,
  opportunity_team_id = EXCLUDED.opportunity_team_id,
  opportunity_team_side = EXCLUDED.opportunity_team_side,
  batter_id = EXCLUDED.batter_id,
  pitcher_id = EXCLUDED.pitcher_id,
  catcher_id = EXCLUDED.catcher_id,
  stand = EXCLUDED.stand,
  p_throws = EXCLUDED.p_throws,
  pitch_type = EXCLUDED.pitch_type,
  pitch_name = EXCLUDED.pitch_name,
  start_speed = EXCLUDED.start_speed,
  end_speed = EXCLUDED.end_speed,
  spin_rate = EXCLUDED.spin_rate,
  plate_x = EXCLUDED.plate_x,
  plate_z = EXCLUDED.plate_z,
  px = EXCLUDED.px,
  pz = EXCLUDED.pz,
  strike_zone_top = EXCLUDED.strike_zone_top,
  strike_zone_bottom = EXCLUDED.strike_zone_bottom,
  zone = EXCLUDED.zone,
  called_code = EXCLUDED.called_code,
  called_description = EXCLUDED.called_description,
  observed_call = EXCLUDED.observed_call,
  is_called_ball = EXCLUDED.is_called_ball,
  is_called_strike = EXCLUDED.is_called_strike,
  geometry_version = EXCLUDED.geometry_version,
  zone_rule_version = EXCLUDED.zone_rule_version,
  coordinate_interpretation = EXCLUDED.coordinate_interpretation,
  ball_radius_feet = EXCLUDED.ball_radius_feet,
  abs_zone_outcome_center_only = EXCLUDED.abs_zone_outcome_center_only,
  abs_zone_outcome_radius_adjusted = EXCLUDED.abs_zone_outcome_radius_adjusted,
  is_model_strike_center_only = EXCLUDED.is_model_strike_center_only,
  is_model_strike_radius_adjusted = EXCLUDED.is_model_strike_radius_adjusted,
  horizontal_edge_distance_center_only = EXCLUDED.horizontal_edge_distance_center_only,
  vertical_edge_distance_center_only = EXCLUDED.vertical_edge_distance_center_only,
  min_edge_distance_center_only = EXCLUDED.min_edge_distance_center_only,
  horizontal_edge_distance_radius_adjusted = EXCLUDED.horizontal_edge_distance_radius_adjusted,
  vertical_edge_distance_radius_adjusted = EXCLUDED.vertical_edge_distance_radius_adjusted,
  min_edge_distance_radius_adjusted = EXCLUDED.min_edge_distance_radius_adjusted,
  inside_shadow_band = EXCLUDED.inside_shadow_band,
  absolute_center_distance = EXCLUDED.absolute_center_distance,
  is_challenge_eligible = EXCLUDED.is_challenge_eligible,
  was_challenged = EXCLUDED.was_challenged,
  challenge_source = EXCLUDED.challenge_source,
  challenge_dedupe_key = EXCLUDED.challenge_dedupe_key,
  actual_challenge_team_id = EXCLUDED.actual_challenge_team_id,
  challenge_outcome = EXCLUDED.challenge_outcome,
  is_overturned = EXCLUDED.is_overturned,
  challenge_result_confirmed_source = EXCLUDED.challenge_result_confirmed_source,
  source_system = EXCLUDED.source_system,
  source_row_hash = EXCLUDED.source_row_hash,
  data_snapshot_id = EXCLUDED.data_snapshot_id,
  split_set = EXCLUDED.split_set,
  split_policy_version = EXCLUDED.split_policy_version,
  feature_freeze_ts = EXCLUDED.feature_freeze_ts,
  updated_at = NOW()
"""

BALL_RADIUS_FEET = 1.45 / 12.0
DEFAULT_TRAIN_END_DATE = "2026-03-31"
DEFAULT_VALIDATION_END_DATE = "2026-04-03"
DEFAULT_SPLIT_POLICY_VERSION = "called_pitch_decisions_phase_time_v1"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Build canonical called-pitch decisions dataset")
    parser.add_argument("--season", type=int)
    parser.add_argument("--start-date")
    parser.add_argument("--end-date")
    parser.add_argument("--data-snapshot-id")
    parser.add_argument("--split-set")
    parser.add_argument("--split-policy-version", default=DEFAULT_SPLIT_POLICY_VERSION)
    parser.add_argument("--train-end-date", default=DEFAULT_TRAIN_END_DATE)
    parser.add_argument("--validation-end-date", default=DEFAULT_VALIDATION_END_DATE)
    parser.add_argument("--feature-freeze-ts")
    parser.add_argument("--database-url", help="Postgres connection string; defaults to WAREHOUSE_DATABASE_URL")
    return parser.parse_args()


def main() -> None:
    load_dotenv()
    args = parse_args()
    target = resolve_database_target(cli_database_url=args.database_url, role="warehouse")
    log_database_target("[build_called_pitch_decisions]", target)
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
              "ball_radius_feet": BALL_RADIUS_FEET,
              "data_snapshot_id": args.data_snapshot_id,
              "split_set": args.split_set,
              "split_policy_version": args.split_policy_version,
              "train_end_date": args.train_end_date,
              "validation_end_date": args.validation_end_date,
              "feature_freeze_ts": args.feature_freeze_ts,
            },
          )
      print("modeling.called_pitch_decisions refreshed")
    finally:
      conn.close()


if __name__ == "__main__":
    main()
