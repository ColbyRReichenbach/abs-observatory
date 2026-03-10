DROP VIEW IF EXISTS mart_weekly_editorial_summary CASCADE;
DROP VIEW IF EXISTS mart_daily_editorial_summary CASCADE;
DROP VIEW IF EXISTS mart_historical_abs_overturn_probability_fallbacks CASCADE;
DROP VIEW IF EXISTS mart_historical_abs_overturn_probability CASCADE;
DROP VIEW IF EXISTS mart_historical_abs_team_summary CASCADE;
DROP VIEW IF EXISTS mart_historical_abs_overturn_inputs CASCADE;
DROP VIEW IF EXISTS mart_team_challenge_win_value CASCADE;
DROP VIEW IF EXISTS mart_team_challenge_run_value CASCADE;
DROP VIEW IF EXISTS mart_win_expectancy_fallbacks CASCADE;
DROP VIEW IF EXISTS mart_win_expectancy_by_count_state CASCADE;
DROP VIEW IF EXISTS mart_run_expectancy_fallbacks CASCADE;
DROP VIEW IF EXISTS mart_run_expectancy_by_count_state CASCADE;
DROP VIEW IF EXISTS mart_state_coverage CASCADE;
DROP VIEW IF EXISTS mart_count_state_baselines_v2 CASCADE;
DROP VIEW IF EXISTS mart_pitch_state_baselines CASCADE;
DROP VIEW IF EXISTS mart_pitch_type_count_baselines CASCADE;
DROP VIEW IF EXISTS mart_zone_outcome_baselines CASCADE;
DROP VIEW IF EXISTS mart_count_state_delta_baselines CASCADE;
DROP VIEW IF EXISTS mart_count_state_baselines CASCADE;
DROP VIEW IF EXISTS mart_game_play_events CASCADE;
DROP VIEW IF EXISTS mart_game_pitch_timeline CASCADE;
DROP VIEW IF EXISTS mart_game_abs_timeline CASCADE;
DROP VIEW IF EXISTS mart_umpire_abs_daily CASCADE;
DROP VIEW IF EXISTS mart_team_abs_daily CASCADE;
DROP VIEW IF EXISTS mart_abs_events_enriched CASCADE;

CREATE OR REPLACE VIEW mart_abs_events_enriched AS
SELECT
  c.challenge_id,
  c.game_pk,
  g.game_date,
  g.season,
  g.game_type,
  g.home_team_id,
  home.name AS home_team_name,
  g.away_team_id,
  away.name AS away_team_name,
  c.challenge_team_id,
  t.name AS challenge_team_name,
  c.challenge_team_side,
  c.challenge_player_id,
  c.challenge_player_name,
  c.is_overturned,
  c.review_type,
  c.challenge_level,
  c.called_code,
  c.called_description,
  c.inning,
  c.half_inning,
  c.balls,
  c.strikes,
  c.outs,
  c.bases_state,
  c.home_score,
  c.away_score,
  c.batter_id,
  c.batter_name,
  c.pitcher_id,
  c.pitcher_name,
  c.pitch_number,
  c.inferred_pitch_number,
  COALESCE(c.pitch_number, c.inferred_pitch_number) AS effective_pitch_number,
  c.px,
  c.pz,
  COALESCE(c.px, c.inferred_px) AS effective_px,
  COALESCE(c.pz, c.inferred_pz) AS effective_pz,
  c.strike_zone_top,
  c.strike_zone_bottom,
  COALESCE(c.strike_zone_top, c.inferred_strike_zone_top) AS effective_strike_zone_top,
  COALESCE(c.strike_zone_bottom, c.inferred_strike_zone_bottom) AS effective_strike_zone_bottom,
  c.gameday_x,
  c.gameday_y,
  COALESCE(c.gameday_x, c.inferred_gameday_x) AS effective_gameday_x,
  COALESCE(c.gameday_y, c.inferred_gameday_y) AS effective_gameday_y,
  c.inference_method,
  c.inference_confidence,
  c.location_source,
  c.challenged_at,
  hp.official_id AS home_plate_umpire_id,
  hp.official_name AS home_plate_umpire_name
FROM abs_challenges c
JOIN games g ON g.game_pk = c.game_pk
LEFT JOIN teams t ON t.team_id = c.challenge_team_id
LEFT JOIN teams home ON home.team_id = g.home_team_id
LEFT JOIN teams away ON away.team_id = g.away_team_id
LEFT JOIN officials hp ON hp.game_pk = g.game_pk AND hp.official_type = 'Home Plate';

CREATE OR REPLACE VIEW mart_historical_abs_overturn_inputs AS
SELECT
  e.game_pk,
  e.sport_id,
  e.game_date,
  e.season,
  e.team_side AS challenge_team_side,
  e.challenge_team_id,
  e.team_batting,
  e.team_batting_id,
  e.team_fielding,
  e.team_fielding_id,
  e.at_bat_number,
  e.pitch_number,
  e.play_id,
  e.row_id,
  e.inning,
  e.outs,
  e.pre_balls,
  e.pre_strikes,
  CONCAT(e.pre_balls, '-', e.pre_strikes) AS count_key_before,
  CASE
    WHEN UPPER(COALESCE(e.description, '')) LIKE 'CALLED STRIKE%' OR UPPER(COALESCE(e.call_name, '')) = 'CALLED_STRIKE'
      THEN CONCAT(e.pre_balls, '-', LEAST(COALESCE(e.pre_strikes, 0) + 1, 3))
    WHEN UPPER(COALESCE(e.description, '')) LIKE 'BALL%' OR UPPER(COALESCE(e.call_name, '')) = 'BALL'
      THEN CONCAT(LEAST(COALESCE(e.pre_balls, 0) + 1, 4), '-', e.pre_strikes)
    ELSE NULL
  END AS held_count_key,
  CASE
    WHEN e.is_overturned = TRUE
         AND (UPPER(COALESCE(e.description, '')) LIKE 'CALLED STRIKE%' OR UPPER(COALESCE(e.call_name, '')) = 'CALLED_STRIKE')
      THEN CONCAT(e.pre_balls, '-', e.pre_strikes)
    WHEN e.is_overturned = TRUE
         AND (UPPER(COALESCE(e.description, '')) LIKE 'BALL%' OR UPPER(COALESCE(e.call_name, '')) = 'BALL')
      THEN CONCAT(e.pre_balls, '-', LEAST(COALESCE(e.pre_strikes, 0) + 1, 3))
    WHEN UPPER(COALESCE(e.description, '')) LIKE 'CALLED STRIKE%' OR UPPER(COALESCE(e.call_name, '')) = 'CALLED_STRIKE'
      THEN CONCAT(e.pre_balls, '-', LEAST(COALESCE(e.pre_strikes, 0) + 1, 3))
    WHEN UPPER(COALESCE(e.description, '')) LIKE 'BALL%' OR UPPER(COALESCE(e.call_name, '')) = 'BALL'
      THEN CONCAT(LEAST(COALESCE(e.pre_balls, 0) + 1, 4), '-', e.pre_strikes)
    ELSE NULL
  END AS corrected_count_key,
  CASE
    WHEN UPPER(COALESCE(e.description, '')) LIKE 'CALLED STRIKE%' OR UPPER(COALESCE(e.call_name, '')) = 'CALLED_STRIKE'
      THEN 'strike_to_ball'
    WHEN UPPER(COALESCE(e.description, '')) LIKE 'BALL%' OR UPPER(COALESCE(e.call_name, '')) = 'BALL'
      THEN 'ball_to_strike'
    ELSE 'unknown'
  END AS challenge_direction,
  e.is_overturned,
  e.is_batter_challenge,
  e.is_in_progress,
  e.edge_distance,
  e.edge_distance_calc,
  e.pitch_type,
  e.pitch_name,
  e.description,
  e.call_name,
  e.pitch_call,
  e.result,
  e.events,
  e.batter_id,
  e.batter_name,
  e.pitcher_id,
  e.pitcher_name,
  e.catcher_id,
  e.catcher_name,
  e.stand,
  e.p_throws,
  e.px,
  e.pz,
  e.plate_x,
  e.plate_z,
  e.strike_zone_top,
  e.strike_zone_bottom,
  e.zone,
  e.start_speed,
  e.end_speed,
  e.spin_rate,
  CASE
    WHEN e.edge_distance IS NULL THEN NULL
    WHEN e.edge_distance <= 0.25 THEN 'edge'
    WHEN e.edge_distance <= 0.75 THEN 'near_edge'
    ELSE 'clear_miss'
  END AS edge_bucket,
  e.context_metrics,
  e.source,
  e.imported_at
FROM raw.savant_abs_events e;

CREATE OR REPLACE VIEW mart_historical_abs_team_summary AS
SELECT
  sport_id,
  season,
  challenge_team_id AS team_id,
  MIN(game_date) AS first_game_date,
  MAX(game_date) AS last_game_date,
  COUNT(*) AS challenges_total,
  COUNT(*) FILTER (WHERE is_overturned) AS overturns_total,
  COUNT(*) FILTER (WHERE NOT is_overturned) AS confirmed_total,
  AVG(CASE WHEN is_overturned THEN 1 ELSE 0 END)::NUMERIC AS overturn_rate,
  AVG(edge_distance)::NUMERIC AS avg_edge_distance,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY edge_distance)::NUMERIC AS median_edge_distance,
  AVG(CASE WHEN is_batter_challenge THEN 1 ELSE 0 END)::NUMERIC AS batter_challenge_share,
  AVG(CASE WHEN challenge_direction = 'strike_to_ball' THEN 1 ELSE 0 END)::NUMERIC AS strike_to_ball_share,
  AVG(CASE WHEN challenge_direction = 'ball_to_strike' THEN 1 ELSE 0 END)::NUMERIC AS ball_to_strike_share
FROM mart_historical_abs_overturn_inputs
WHERE challenge_team_id IS NOT NULL
GROUP BY sport_id, season, challenge_team_id;

CREATE OR REPLACE VIEW mart_historical_abs_overturn_probability AS
WITH exact_rows AS (
  SELECT
    challenge_direction,
    edge_bucket,
    COUNT(*) AS sample_size,
    COUNT(*) FILTER (WHERE is_overturned) AS overturns_total
  FROM mart_historical_abs_overturn_inputs
  WHERE challenge_direction IN ('strike_to_ball', 'ball_to_strike')
  GROUP BY 1, 2
),
direction_rows AS (
  SELECT
    challenge_direction,
    COUNT(*) AS sample_size,
    COUNT(*) FILTER (WHERE is_overturned) AS overturns_total
  FROM mart_historical_abs_overturn_inputs
  WHERE challenge_direction IN ('strike_to_ball', 'ball_to_strike')
  GROUP BY 1
)
SELECT
  e.challenge_direction,
  e.edge_bucket,
  e.sample_size,
  e.overturns_total,
  CASE
    WHEN e.sample_size > 0 THEN e.overturns_total::NUMERIC / e.sample_size
    ELSE NULL
  END AS raw_overturn_rate,
  CASE
    WHEN e.sample_size > 0 AND d.sample_size > 0
      THEN (e.overturns_total::NUMERIC + ((d.overturns_total::NUMERIC / d.sample_size) * 20)) / (e.sample_size + 20)
    WHEN e.sample_size > 0 THEN e.overturns_total::NUMERIC / e.sample_size
    ELSE NULL
  END AS smoothed_overturn_rate,
  CASE
    WHEN e.sample_size >= 100 THEN 'high'
    WHEN e.sample_size >= 25 THEN 'medium'
    ELSE 'low'
  END AS confidence_band
FROM exact_rows e
JOIN direction_rows d ON d.challenge_direction = e.challenge_direction;

CREATE OR REPLACE VIEW mart_historical_abs_overturn_probability_fallbacks AS
WITH global_row AS (
  SELECT
    COUNT(*) AS sample_size,
    COUNT(*) FILTER (WHERE is_overturned) AS overturns_total
  FROM mart_historical_abs_overturn_inputs
  WHERE challenge_direction IN ('strike_to_ball', 'ball_to_strike')
),
direction_rows AS (
  SELECT
    challenge_direction,
    COUNT(*) AS sample_size,
    COUNT(*) FILTER (WHERE is_overturned) AS overturns_total
  FROM mart_historical_abs_overturn_inputs
  WHERE challenge_direction IN ('strike_to_ball', 'ball_to_strike')
  GROUP BY 1
)
SELECT
  'exact'::TEXT AS fallback_tier,
  p.challenge_direction,
  p.edge_bucket,
  p.sample_size,
  p.overturns_total,
  p.raw_overturn_rate,
  p.smoothed_overturn_rate AS overturn_probability,
  p.confidence_band
FROM mart_historical_abs_overturn_probability p

UNION ALL

SELECT
  'direction_only'::TEXT AS fallback_tier,
  d.challenge_direction,
  NULL::TEXT AS edge_bucket,
  d.sample_size,
  d.overturns_total,
  CASE
    WHEN d.sample_size > 0 THEN d.overturns_total::NUMERIC / d.sample_size
    ELSE NULL
  END AS raw_overturn_rate,
  CASE
    WHEN d.sample_size > 0 AND g.sample_size > 0
      THEN (d.overturns_total::NUMERIC + ((g.overturns_total::NUMERIC / g.sample_size) * 40)) / (d.sample_size + 40)
    WHEN d.sample_size > 0 THEN d.overturns_total::NUMERIC / d.sample_size
    ELSE NULL
  END AS overturn_probability,
  CASE
    WHEN d.sample_size >= 150 THEN 'high'
    WHEN d.sample_size >= 40 THEN 'medium'
    ELSE 'low'
  END AS confidence_band
FROM direction_rows d
CROSS JOIN global_row g

UNION ALL

SELECT
  'global'::TEXT AS fallback_tier,
  NULL::TEXT AS challenge_direction,
  NULL::TEXT AS edge_bucket,
  g.sample_size,
  g.overturns_total,
  CASE
    WHEN g.sample_size > 0 THEN g.overturns_total::NUMERIC / g.sample_size
    ELSE NULL
  END AS raw_overturn_rate,
  CASE
    WHEN g.sample_size > 0 THEN g.overturns_total::NUMERIC / g.sample_size
    ELSE NULL
  END AS overturn_probability,
  CASE
    WHEN g.sample_size >= 250 THEN 'high'
    WHEN g.sample_size >= 75 THEN 'medium'
    ELSE 'low'
  END AS confidence_band
FROM global_row g;

CREATE OR REPLACE VIEW mart_team_abs_daily AS
SELECT
  g.game_date::date AS game_day,
  s.team_id,
  t.name AS team_name,
  SUM(s.used_successful) AS used_successful,
  SUM(s.used_failed) AS used_failed,
  SUM(s.challenges_total) AS challenges_total,
  SUM(s.remaining) AS remaining,
  CASE WHEN SUM(s.challenges_total) > 0
    THEN SUM(s.used_successful)::NUMERIC / SUM(s.challenges_total)
    ELSE 0
  END AS overturn_rate
FROM team_abs_game_summary s
JOIN games g ON g.game_pk = s.game_pk
LEFT JOIN teams t ON t.team_id = s.team_id
GROUP BY 1, 2, 3;

CREATE OR REPLACE VIEW mart_umpire_abs_daily AS
SELECT
  g.game_date::date AS game_day,
  u.umpire_id,
  u.umpire_name,
  SUM(u.challenged_calls) AS challenged_calls,
  SUM(u.overturned_calls) AS overturned_calls,
  SUM(u.confirmed_calls) AS confirmed_calls,
  CASE WHEN SUM(u.challenged_calls) > 0
    THEN SUM(u.overturned_calls)::NUMERIC / SUM(u.challenged_calls)
    ELSE 0
  END AS overturn_rate
FROM umpire_abs_game_summary u
JOIN games g ON g.game_pk = u.game_pk
GROUP BY 1, 2, 3;

CREATE OR REPLACE VIEW mart_game_abs_timeline AS
SELECT
  game_pk,
  challenge_id,
  challenged_at,
  inning,
  half_inning,
  challenge_team_id,
  challenge_player_name,
  is_overturned,
  called_code,
  called_description,
  home_score,
  away_score,
  balls,
  strikes,
  outs,
  COALESCE(pitch_number, inferred_pitch_number) AS effective_pitch_number,
  COALESCE(px, inferred_px) AS effective_px,
  COALESCE(pz, inferred_pz) AS effective_pz,
  location_source,
  inference_method,
  inference_confidence
FROM abs_challenges
ORDER BY game_pk, challenged_at;

CREATE OR REPLACE VIEW mart_game_pitch_timeline AS
WITH challenge_impacts AS (
  SELECT
    c.challenge_id,
    c.game_pk,
    c.at_bat_index,
    COALESCE(c.pitch_number, c.inferred_pitch_number) AS effective_pitch_number,
    c.is_overturned,
    CASE
      WHEN COALESCE(c.pitch_number, c.inferred_pitch_number) IS NULL THEN 'non_pitch_review'
      WHEN c.is_overturned = FALSE THEN 'confirmed'
      WHEN p.ended_plate_appearance = TRUE
        AND (
          (p.strikes_before = 2 AND LOWER(COALESCE(c.called_description, p.called_description, '')) LIKE '%strike%')
          OR (p.balls_before = 3 AND LOWER(COALESCE(c.called_description, p.called_description, '')) LIKE '%ball%')
        )
        THEN 'direct_ending_impact'
      WHEN p.balls_before IS NOT NULL
        AND p.strikes_before IS NOT NULL
        AND (p.balls_before IS DISTINCT FROM p.balls_after OR p.strikes_before IS DISTINCT FROM p.strikes_after)
        THEN 'direct_count_impact'
      ELSE 'downstream_inferred_impact'
    END AS impact_type,
    CASE
      WHEN c.pitch_number IS NULL THEN 'Review happened at the at-bat level without a tracked pitch event.'
      WHEN c.is_overturned = FALSE THEN 'Call was confirmed after review.'
      WHEN p.ended_plate_appearance = TRUE
        AND (
          (p.strikes_before = 2 AND LOWER(COALESCE(c.called_description, p.called_description, '')) LIKE '%strike%')
          OR (p.balls_before = 3 AND LOWER(COALESCE(c.called_description, p.called_description, '')) LIKE '%ball%')
        )
        THEN 'The overturned call directly changed whether the plate appearance ended.'
      WHEN p.balls_before IS NOT NULL
        AND p.strikes_before IS NOT NULL
        AND (p.balls_before IS DISTINCT FROM p.balls_after OR p.strikes_before IS DISTINCT FROM p.strikes_after)
        THEN 'The overturned call changed the count before the plate appearance finished.'
      ELSE 'The overturned call preceded the later result, but the downstream impact is inferred rather than direct.'
    END AS impact_summary
  FROM abs_challenges c
  LEFT JOIN pitches p
    ON p.game_pk = c.game_pk
   AND p.at_bat_index = c.at_bat_index
   AND p.pitch_number = COALESCE(c.pitch_number, c.inferred_pitch_number)
)
SELECT
  p.game_pk,
  p.at_bat_index,
  p.pitch_number,
  p.play_event_index,
  p.inning,
  p.half_inning,
  p.batter_id,
  p.batter_name,
  p.pitcher_id,
  p.pitcher_name,
  p.called_code,
  p.called_description,
  p.play_description,
  p.pitch_type_code,
  p.pitch_type_description,
  p.start_speed,
  p.end_speed,
  p.spin_rate,
  p.px,
  p.pz,
  p.strike_zone_top,
  p.strike_zone_bottom,
  p.zone,
  p.is_ball,
  p.is_strike,
  p.is_in_play,
  p.ended_plate_appearance,
  p.balls_before,
  p.strikes_before,
  p.outs_before,
  p.balls_after,
  p.strikes_after,
  p.outs_after,
  p.bases_state_before,
  p.bases_state_after,
  p.home_score_before,
  p.away_score_before,
  p.home_score_after,
  p.away_score_after,
  c.challenge_id,
  c.challenge_team_id,
  c.challenge_team_side,
  c.challenge_player_id,
  c.challenge_player_name,
  c.is_overturned,
  c.location_source,
  c.inference_method,
  c.inference_confidence,
  COALESCE(ci.impact_type, 'not_challenged') AS impact_type,
  COALESCE(ci.impact_summary, 'Pitch was not challenged.') AS impact_summary
FROM pitches p
LEFT JOIN abs_challenges c
  ON c.game_pk = p.game_pk
 AND c.at_bat_index = p.at_bat_index
 AND COALESCE(c.pitch_number, c.inferred_pitch_number) = p.pitch_number
LEFT JOIN challenge_impacts ci
  ON ci.challenge_id = c.challenge_id;

CREATE OR REPLACE VIEW mart_game_play_events AS
SELECT
  e.game_pk,
  e.at_bat_index,
  e.play_event_index,
  e.pitch_number,
  e.inning,
  e.half_inning,
  e.batter_id,
  e.batter_name,
  e.pitcher_id,
  e.pitcher_name,
  e.event_type,
  e.event_code,
  e.description,
  e.is_pitch,
  e.is_in_play,
  e.has_review,
  e.balls_before,
  e.strikes_before,
  e.outs_before,
  e.balls_after,
  e.strikes_after,
  e.outs_after,
  e.bases_state_before,
  e.bases_state_after,
  e.home_score_before,
  e.away_score_before,
  e.home_score_after,
  e.away_score_after
FROM play_events e;

CREATE OR REPLACE VIEW mart_count_state_baselines AS
WITH terminal_pitches AS (
  SELECT DISTINCT ON (p.game_pk, p.at_bat_index)
    p.game_pk,
    p.at_bat_index,
    p.balls_before,
    p.strikes_before,
    a.event_type,
    a.event_description
  FROM pitches p
  JOIN at_bats a
    ON a.game_pk = p.game_pk
   AND a.at_bat_index = p.at_bat_index
  WHERE p.ended_plate_appearance = TRUE
  ORDER BY p.game_pk, p.at_bat_index, p.pitch_number DESC
)
SELECT
  balls_before,
  strikes_before,
  COUNT(*) AS plate_appearances,
  COUNT(*) FILTER (WHERE event_type IN ('single', 'double', 'triple', 'home_run')) AS hits,
  COUNT(*) FILTER (WHERE event_type IN ('walk', 'intent_walk')) AS walks,
  COUNT(*) FILTER (WHERE event_type = 'strikeout') AS strikeouts,
  COUNT(*) FILTER (WHERE event_type NOT IN ('walk', 'intent_walk', 'hit_by_pitch', 'sac_bunt', 'sac_fly', 'catcher_interf')) AS official_at_bats,
  CASE
    WHEN COUNT(*) FILTER (WHERE event_type NOT IN ('walk', 'intent_walk', 'hit_by_pitch', 'sac_bunt', 'sac_fly', 'catcher_interf')) > 0
      THEN COUNT(*) FILTER (WHERE event_type IN ('single', 'double', 'triple', 'home_run'))::NUMERIC
        / COUNT(*) FILTER (WHERE event_type NOT IN ('walk', 'intent_walk', 'hit_by_pitch', 'sac_bunt', 'sac_fly', 'catcher_interf'))
    ELSE 0
  END AS batting_average
FROM terminal_pitches
GROUP BY balls_before, strikes_before;

CREATE OR REPLACE VIEW mart_count_state_delta_baselines AS
SELECT
  balls_before,
  strikes_before,
  balls_after,
  strikes_after,
  COUNT(*) AS pitch_count,
  COUNT(*) FILTER (WHERE challenge_id IS NOT NULL) AS challenged_pitch_count,
  COUNT(*) FILTER (WHERE is_overturned = TRUE) AS overturned_pitch_count
FROM mart_game_pitch_timeline
GROUP BY balls_before, strikes_before, balls_after, strikes_after;

CREATE OR REPLACE VIEW mart_pitch_state_baselines AS
SELECT
  season,
  inning_bucket,
  outs,
  bases_state,
  count_key,
  COUNT(*) AS sample_size,
  AVG(COALESCE(runs_to_inning_end, 0))::NUMERIC AS expected_runs_to_end_inning,
  AVG(CASE WHEN batting_team_won IS TRUE THEN 1 ELSE 0 END)::NUMERIC AS batting_team_win_probability
FROM historical_pitch_states
GROUP BY season, inning_bucket, outs, bases_state, count_key;

CREATE OR REPLACE VIEW mart_count_state_baselines_v2 AS
SELECT
  count_key,
  COUNT(*) AS plate_appearances,
  COUNT(*) FILTER (WHERE hit_event = TRUE) AS hits,
  COUNT(*) FILTER (WHERE walk_event = TRUE) AS walks,
  COUNT(*) FILTER (WHERE strikeout_event = TRUE) AS strikeouts,
  COUNT(*) FILTER (WHERE official_at_bat = TRUE) AS official_at_bats,
  CASE
    WHEN COUNT(*) FILTER (WHERE official_at_bat = TRUE) > 0
      THEN COUNT(*) FILTER (WHERE hit_event = TRUE)::NUMERIC / COUNT(*) FILTER (WHERE official_at_bat = TRUE)
    ELSE 0
  END AS batting_average,
  CASE
    WHEN COUNT(*) > 0
      THEN COUNT(*) FILTER (WHERE positive_outcome = TRUE)::NUMERIC / COUNT(*)
    ELSE 0
  END AS positive_outcome_rate
FROM historical_pitch_states
WHERE is_last_pitch_of_pa = TRUE
  AND count_key IS NOT NULL
GROUP BY count_key;

CREATE OR REPLACE VIEW mart_state_coverage AS
SELECT
  season,
  inning_bucket,
  outs,
  bases_state,
  count_key,
  COUNT(*) AS sample_size,
  CASE
    WHEN COUNT(*) >= 500 THEN 'high'
    WHEN COUNT(*) >= 150 THEN 'medium'
    ELSE 'low'
  END AS confidence_band,
  CASE
    WHEN COUNT(*) >= 100 THEN 'exact'
    WHEN COUNT(*) >= 40 THEN 'drop_inning_bucket'
    ELSE 'drop_count_key'
  END AS fallback_tier_candidate
FROM historical_pitch_states
GROUP BY season, inning_bucket, outs, bases_state, count_key;

CREATE OR REPLACE VIEW mart_run_expectancy_by_count_state AS
SELECT
  CONCAT(MIN(season), '-', MAX(season)) AS season_window,
  inning_bucket,
  outs,
  bases_state,
  count_key,
  COUNT(*) AS sample_size,
  AVG(COALESCE(runs_to_inning_end, 0))::NUMERIC AS expected_runs_to_end_inning,
  CASE
    WHEN COUNT(*) >= 500 THEN 'high'
    WHEN COUNT(*) >= 150 THEN 'medium'
    ELSE 'low'
  END AS confidence_band
FROM historical_pitch_states
GROUP BY inning_bucket, outs, bases_state, count_key;

CREATE OR REPLACE VIEW mart_run_expectancy_fallbacks AS
SELECT
  'exact'::TEXT AS fallback_tier,
  inning_bucket,
  outs,
  bases_state,
  count_key,
  COUNT(*) AS sample_size,
  AVG(COALESCE(runs_to_inning_end, 0))::NUMERIC AS expected_runs_to_end_inning,
  CASE
    WHEN COUNT(*) >= 500 THEN 'high'
    WHEN COUNT(*) >= 150 THEN 'medium'
    ELSE 'low'
  END AS confidence_band
FROM historical_pitch_states
GROUP BY inning_bucket, outs, bases_state, count_key
UNION ALL
SELECT
  'drop_inning_bucket'::TEXT AS fallback_tier,
  NULL::TEXT AS inning_bucket,
  outs,
  bases_state,
  count_key,
  COUNT(*) AS sample_size,
  AVG(COALESCE(runs_to_inning_end, 0))::NUMERIC AS expected_runs_to_end_inning,
  CASE
    WHEN COUNT(*) >= 500 THEN 'high'
    WHEN COUNT(*) >= 150 THEN 'medium'
    ELSE 'low'
  END AS confidence_band
FROM historical_pitch_states
GROUP BY outs, bases_state, count_key
UNION ALL
SELECT
  'drop_count_key'::TEXT AS fallback_tier,
  NULL::TEXT AS inning_bucket,
  outs,
  bases_state,
  NULL::TEXT AS count_key,
  COUNT(*) AS sample_size,
  AVG(COALESCE(runs_to_inning_end, 0))::NUMERIC AS expected_runs_to_end_inning,
  CASE
    WHEN COUNT(*) >= 500 THEN 'high'
    WHEN COUNT(*) >= 150 THEN 'medium'
    ELSE 'low'
  END AS confidence_band
FROM historical_pitch_states
GROUP BY outs, bases_state;

CREATE OR REPLACE VIEW mart_win_expectancy_by_count_state AS
WITH win_states AS (
  SELECT
    season,
    inning,
    inning_bucket,
    half_inning,
    CASE
      WHEN score_diff_batting <= -4 THEN 'trail4plus'
      WHEN score_diff_batting = -3 THEN 'trail3'
      WHEN score_diff_batting = -2 THEN 'trail2'
      WHEN score_diff_batting = -1 THEN 'trail1'
      WHEN score_diff_batting = 0 THEN 'tied'
      WHEN score_diff_batting = 1 THEN 'lead1'
      WHEN score_diff_batting = 2 THEN 'lead2'
      WHEN score_diff_batting = 3 THEN 'lead3'
      ELSE 'lead4plus'
    END AS score_diff_bucket,
    outs,
    bases_state,
    count_key,
    batting_team_won
  FROM historical_pitch_states
  WHERE batting_team_won IS NOT NULL
    AND inning IS NOT NULL
    AND half_inning IS NOT NULL
    AND outs IS NOT NULL
    AND bases_state IS NOT NULL
    AND count_key IS NOT NULL
    AND score_diff_batting IS NOT NULL
)
SELECT
  CONCAT(MIN(season), '-', MAX(season)) AS season_window,
  inning,
  inning_bucket,
  half_inning,
  score_diff_bucket,
  outs,
  bases_state,
  count_key,
  COUNT(*) AS sample_size,
  AVG(CASE WHEN batting_team_won THEN 1 ELSE 0 END)::NUMERIC AS batting_team_win_probability,
  CASE
    WHEN COUNT(*) >= 2000 THEN 'high'
    WHEN COUNT(*) >= 500 THEN 'medium'
    ELSE 'low'
  END AS confidence_band
FROM win_states
GROUP BY inning, inning_bucket, half_inning, score_diff_bucket, outs, bases_state, count_key;

CREATE OR REPLACE VIEW mart_win_expectancy_fallbacks AS
WITH win_states AS (
  SELECT
    season,
    inning,
    inning_bucket,
    half_inning,
    CASE
      WHEN score_diff_batting <= -4 THEN 'trail4plus'
      WHEN score_diff_batting = -3 THEN 'trail3'
      WHEN score_diff_batting = -2 THEN 'trail2'
      WHEN score_diff_batting = -1 THEN 'trail1'
      WHEN score_diff_batting = 0 THEN 'tied'
      WHEN score_diff_batting = 1 THEN 'lead1'
      WHEN score_diff_batting = 2 THEN 'lead2'
      WHEN score_diff_batting = 3 THEN 'lead3'
      ELSE 'lead4plus'
    END AS score_diff_bucket,
    outs,
    bases_state,
    count_key,
    batting_team_won
  FROM historical_pitch_states
  WHERE batting_team_won IS NOT NULL
    AND inning IS NOT NULL
    AND half_inning IS NOT NULL
    AND outs IS NOT NULL
    AND bases_state IS NOT NULL
    AND score_diff_batting IS NOT NULL
)
SELECT
  'exact'::TEXT AS fallback_tier,
  inning,
  NULL::TEXT AS inning_bucket,
  half_inning,
  score_diff_bucket,
  outs,
  bases_state,
  count_key,
  COUNT(*) AS sample_size,
  AVG(CASE WHEN batting_team_won THEN 1 ELSE 0 END)::NUMERIC AS batting_team_win_probability,
  CASE
    WHEN COUNT(*) >= 2000 THEN 'high'
    WHEN COUNT(*) >= 500 THEN 'medium'
    ELSE 'low'
  END AS confidence_band
FROM win_states
WHERE count_key IS NOT NULL
GROUP BY inning, half_inning, score_diff_bucket, outs, bases_state, count_key
UNION ALL
SELECT
  'drop_inning_to_bucket'::TEXT AS fallback_tier,
  NULL::INTEGER AS inning,
  inning_bucket,
  half_inning,
  score_diff_bucket,
  outs,
  bases_state,
  count_key,
  COUNT(*) AS sample_size,
  AVG(CASE WHEN batting_team_won THEN 1 ELSE 0 END)::NUMERIC AS batting_team_win_probability,
  CASE
    WHEN COUNT(*) >= 2000 THEN 'high'
    WHEN COUNT(*) >= 500 THEN 'medium'
    ELSE 'low'
  END AS confidence_band
FROM win_states
WHERE count_key IS NOT NULL
GROUP BY inning_bucket, half_inning, score_diff_bucket, outs, bases_state, count_key
UNION ALL
SELECT
  'drop_count_key_exact_inning'::TEXT AS fallback_tier,
  inning,
  NULL::TEXT AS inning_bucket,
  half_inning,
  score_diff_bucket,
  outs,
  bases_state,
  NULL::TEXT AS count_key,
  COUNT(*) AS sample_size,
  AVG(CASE WHEN batting_team_won THEN 1 ELSE 0 END)::NUMERIC AS batting_team_win_probability,
  CASE
    WHEN COUNT(*) >= 2000 THEN 'high'
    WHEN COUNT(*) >= 500 THEN 'medium'
    ELSE 'low'
  END AS confidence_band
FROM win_states
GROUP BY inning, half_inning, score_diff_bucket, outs, bases_state
UNION ALL
SELECT
  'drop_count_key_bucketed_inning'::TEXT AS fallback_tier,
  NULL::INTEGER AS inning,
  inning_bucket,
  half_inning,
  score_diff_bucket,
  outs,
  bases_state,
  NULL::TEXT AS count_key,
  COUNT(*) AS sample_size,
  AVG(CASE WHEN batting_team_won THEN 1 ELSE 0 END)::NUMERIC AS batting_team_win_probability,
  CASE
    WHEN COUNT(*) >= 2000 THEN 'high'
    WHEN COUNT(*) >= 500 THEN 'medium'
    ELSE 'low'
  END AS confidence_band
FROM win_states
GROUP BY inning_bucket, half_inning, score_diff_bucket, outs, bases_state;

CREATE OR REPLACE VIEW mart_zone_outcome_baselines AS
SELECT
  zone,
  pitch_type_code,
  pitch_type_description,
  COUNT(*) AS pitch_count,
  COUNT(*) FILTER (WHERE is_strike = TRUE) AS strike_count,
  COUNT(*) FILTER (WHERE is_ball = TRUE) AS ball_count,
  COUNT(*) FILTER (WHERE challenge_id IS NOT NULL) AS challenged_pitch_count,
  COUNT(*) FILTER (WHERE is_overturned = TRUE) AS overturned_pitch_count
FROM mart_game_pitch_timeline
GROUP BY zone, pitch_type_code, pitch_type_description;

CREATE OR REPLACE VIEW mart_pitch_type_count_baselines AS
SELECT
  pitch_type_code,
  pitch_type_description,
  balls_before,
  strikes_before,
  COUNT(*) AS pitch_count,
  AVG(start_speed)::NUMERIC AS avg_start_speed,
  AVG(spin_rate)::NUMERIC AS avg_spin_rate,
  COUNT(*) FILTER (WHERE challenge_id IS NOT NULL) AS challenged_pitch_count
FROM mart_game_pitch_timeline
GROUP BY pitch_type_code, pitch_type_description, balls_before, strikes_before;

CREATE OR REPLACE VIEW mart_team_challenge_run_value AS
WITH challenge_re AS (
  SELECT
    c.challenge_id,
    c.challenge_team_id AS team_id,
    c.game_pk,
    c.inning,
    c.half_inning,
    c.outs,
    c.bases_state,
    c.home_score,
    c.away_score,
    CASE
      WHEN COALESCE(c.pitch_number, c.inferred_pitch_number) IS NULL THEN NULL
      WHEN p.balls_before IS NULL OR p.strikes_before IS NULL THEN NULL
      WHEN c.is_overturned = FALSE THEN
        CASE WHEN p.balls_after IS NULL OR p.strikes_after IS NULL THEN NULL ELSE CONCAT(p.balls_after, '-', p.strikes_after) END
      WHEN p.balls_after IS NOT NULL AND p.balls_before IS NOT NULL AND p.balls_after > p.balls_before THEN CONCAT(p.balls_before, '-', p.strikes_before + 1)
      WHEN p.strikes_after IS NOT NULL AND p.strikes_before IS NOT NULL AND p.strikes_after > p.strikes_before THEN CONCAT(p.balls_before + 1, '-', p.strikes_before)
      ELSE CASE WHEN p.balls_after IS NULL OR p.strikes_after IS NULL THEN NULL ELSE CONCAT(p.balls_after, '-', p.strikes_after) END
    END AS held_count_key,
    CASE
      WHEN p.balls_after IS NULL OR p.strikes_after IS NULL THEN NULL
      ELSE CONCAT(p.balls_after, '-', p.strikes_after)
    END AS corrected_count_key,
    CASE
      WHEN c.inning >= 9 THEN '9+'
      WHEN c.inning >= 7 THEN '7-8'
      WHEN c.inning >= 4 THEN '4-6'
      ELSE '1-3'
    END AS inning_bucket
  FROM abs_challenges c
  LEFT JOIN pitches p
    ON p.game_pk = c.game_pk
   AND p.at_bat_index = c.at_bat_index
   AND p.pitch_number = COALESCE(c.pitch_number, c.inferred_pitch_number)
  WHERE c.challenge_team_id IS NOT NULL
),
lookup AS (
  SELECT
    cr.*,
    held_exact.expected_runs_to_end_inning AS held_exact_re,
    corrected_exact.expected_runs_to_end_inning AS corrected_exact_re,
    held_no_inning.expected_runs_to_end_inning AS held_no_inning_re,
    corrected_no_inning.expected_runs_to_end_inning AS corrected_no_inning_re,
    held_base_out.expected_runs_to_end_inning AS held_base_out_re,
    corrected_base_out.expected_runs_to_end_inning AS corrected_base_out_re
  FROM challenge_re cr
  LEFT JOIN mart_run_expectancy_fallbacks held_exact
    ON held_exact.fallback_tier = 'exact'
   AND held_exact.inning_bucket = cr.inning_bucket
   AND held_exact.outs = cr.outs
   AND held_exact.bases_state = cr.bases_state
   AND held_exact.count_key = cr.held_count_key
  LEFT JOIN mart_run_expectancy_fallbacks corrected_exact
    ON corrected_exact.fallback_tier = 'exact'
   AND corrected_exact.inning_bucket = cr.inning_bucket
   AND corrected_exact.outs = cr.outs
   AND corrected_exact.bases_state = cr.bases_state
   AND corrected_exact.count_key = cr.corrected_count_key
  LEFT JOIN mart_run_expectancy_fallbacks held_no_inning
    ON held_no_inning.fallback_tier = 'drop_inning_bucket'
   AND held_no_inning.outs = cr.outs
   AND held_no_inning.bases_state = cr.bases_state
   AND held_no_inning.count_key = cr.held_count_key
  LEFT JOIN mart_run_expectancy_fallbacks corrected_no_inning
    ON corrected_no_inning.fallback_tier = 'drop_inning_bucket'
   AND corrected_no_inning.outs = cr.outs
   AND corrected_no_inning.bases_state = cr.bases_state
   AND corrected_no_inning.count_key = cr.corrected_count_key
  LEFT JOIN mart_run_expectancy_fallbacks held_base_out
    ON held_base_out.fallback_tier = 'drop_count_key'
   AND held_base_out.outs = cr.outs
   AND held_base_out.bases_state = cr.bases_state
  LEFT JOIN mart_run_expectancy_fallbacks corrected_base_out
    ON corrected_base_out.fallback_tier = 'drop_count_key'
   AND corrected_base_out.outs = cr.outs
   AND corrected_base_out.bases_state = cr.bases_state
)
SELECT
  team_id,
  CONCAT(MIN(g.season), '-', MAX(g.season)) AS season_window,
  COUNT(*) AS challenges_total,
  AVG(
    COALESCE(corrected_exact_re, corrected_no_inning_re, corrected_base_out_re)
    - COALESCE(held_exact_re, held_no_inning_re, held_base_out_re)
  )::NUMERIC AS avg_re_delta,
  PERCENTILE_CONT(0.5) WITHIN GROUP (
    ORDER BY COALESCE(corrected_exact_re, corrected_no_inning_re, corrected_base_out_re)
      - COALESCE(held_exact_re, held_no_inning_re, held_base_out_re)
  )::NUMERIC AS median_re_delta,
  AVG(
    CASE
      WHEN COALESCE(corrected_exact_re, corrected_no_inning_re, corrected_base_out_re)
        - COALESCE(held_exact_re, held_no_inning_re, held_base_out_re) > 0
      THEN 1 ELSE 0
    END
  )::NUMERIC AS high_re_share,
  AVG(
    CASE
      WHEN COALESCE(corrected_exact_re, corrected_no_inning_re, corrected_base_out_re)
        - COALESCE(held_exact_re, held_no_inning_re, held_base_out_re) <= 0
      THEN 1 ELSE 0
    END
  )::NUMERIC AS low_re_burn_share,
  AVG(
    CASE WHEN l.inning >= 7 AND ABS(COALESCE(l.home_score, 0) - COALESCE(l.away_score, 0)) <= 2 THEN 1 ELSE 0 END
  )::NUMERIC AS late_close_re_share,
  CASE
    WHEN COUNT(*) >= 80 THEN 'high'
    WHEN COUNT(*) >= 25 THEN 'medium'
    ELSE 'low'
  END AS confidence_band
FROM lookup l
JOIN games g ON g.game_pk = l.game_pk
GROUP BY team_id;

CREATE OR REPLACE VIEW mart_team_challenge_win_value AS
WITH challenge_we AS (
  SELECT
    c.challenge_id,
    c.challenge_team_id AS team_id,
    c.game_pk,
    c.inning,
    c.half_inning,
    c.outs,
    c.bases_state,
    c.home_score,
    c.away_score,
    CASE
      WHEN c.half_inning = 'Top' THEN
        CASE
          WHEN c.away_score IS NULL OR c.home_score IS NULL THEN NULL
          WHEN c.away_score - c.home_score <= -4 THEN 'trail4plus'
          WHEN c.away_score - c.home_score = -3 THEN 'trail3'
          WHEN c.away_score - c.home_score = -2 THEN 'trail2'
          WHEN c.away_score - c.home_score = -1 THEN 'trail1'
          WHEN c.away_score - c.home_score = 0 THEN 'tied'
          WHEN c.away_score - c.home_score = 1 THEN 'lead1'
          WHEN c.away_score - c.home_score = 2 THEN 'lead2'
          WHEN c.away_score - c.home_score = 3 THEN 'lead3'
          ELSE 'lead4plus'
        END
      WHEN c.half_inning = 'Bottom' THEN
        CASE
          WHEN c.home_score IS NULL OR c.away_score IS NULL THEN NULL
          WHEN c.home_score - c.away_score <= -4 THEN 'trail4plus'
          WHEN c.home_score - c.away_score = -3 THEN 'trail3'
          WHEN c.home_score - c.away_score = -2 THEN 'trail2'
          WHEN c.home_score - c.away_score = -1 THEN 'trail1'
          WHEN c.home_score - c.away_score = 0 THEN 'tied'
          WHEN c.home_score - c.away_score = 1 THEN 'lead1'
          WHEN c.home_score - c.away_score = 2 THEN 'lead2'
          WHEN c.home_score - c.away_score = 3 THEN 'lead3'
          ELSE 'lead4plus'
        END
      ELSE NULL
    END AS score_diff_bucket,
    CASE
      WHEN COALESCE(c.pitch_number, c.inferred_pitch_number) IS NULL THEN NULL
      WHEN p.balls_before IS NULL OR p.strikes_before IS NULL THEN NULL
      WHEN c.is_overturned = FALSE THEN
        CASE WHEN p.balls_after IS NULL OR p.strikes_after IS NULL THEN NULL ELSE CONCAT(p.balls_after, '-', p.strikes_after) END
      WHEN p.balls_after IS NOT NULL AND p.balls_before IS NOT NULL AND p.balls_after > p.balls_before THEN CONCAT(p.balls_before, '-', p.strikes_before + 1)
      WHEN p.strikes_after IS NOT NULL AND p.strikes_before IS NOT NULL AND p.strikes_after > p.strikes_before THEN CONCAT(p.balls_before + 1, '-', p.strikes_before)
      ELSE CASE WHEN p.balls_after IS NULL OR p.strikes_after IS NULL THEN NULL ELSE CONCAT(p.balls_after, '-', p.strikes_after) END
    END AS held_count_key,
    CASE
      WHEN p.balls_after IS NULL OR p.strikes_after IS NULL THEN NULL
      ELSE CONCAT(p.balls_after, '-', p.strikes_after)
    END AS corrected_count_key,
    CASE
      WHEN c.inning >= 9 THEN '9+'
      WHEN c.inning >= 7 THEN '7-8'
      WHEN c.inning >= 4 THEN '4-6'
      ELSE '1-3'
    END AS inning_bucket
  FROM abs_challenges c
  LEFT JOIN pitches p
    ON p.game_pk = c.game_pk
   AND p.at_bat_index = c.at_bat_index
   AND p.pitch_number = COALESCE(c.pitch_number, c.inferred_pitch_number)
  WHERE c.challenge_team_id IS NOT NULL
),
lookup AS (
  SELECT
    cw.*,
    held_exact.batting_team_win_probability AS held_exact_we,
    corrected_exact.batting_team_win_probability AS corrected_exact_we,
    held_bucket.batting_team_win_probability AS held_bucket_we,
    corrected_bucket.batting_team_win_probability AS corrected_bucket_we,
    held_drop_count.batting_team_win_probability AS held_drop_count_we,
    corrected_drop_count.batting_team_win_probability AS corrected_drop_count_we,
    held_drop_count_bucket.batting_team_win_probability AS held_drop_count_bucket_we,
    corrected_drop_count_bucket.batting_team_win_probability AS corrected_drop_count_bucket_we
  FROM challenge_we cw
  LEFT JOIN mart_win_expectancy_fallbacks held_exact
    ON held_exact.fallback_tier = 'exact'
   AND held_exact.inning = cw.inning
   AND held_exact.half_inning = cw.half_inning
   AND held_exact.score_diff_bucket = cw.score_diff_bucket
   AND held_exact.outs = cw.outs
   AND held_exact.bases_state = cw.bases_state
   AND held_exact.count_key = cw.held_count_key
  LEFT JOIN mart_win_expectancy_fallbacks corrected_exact
    ON corrected_exact.fallback_tier = 'exact'
   AND corrected_exact.inning = cw.inning
   AND corrected_exact.half_inning = cw.half_inning
   AND corrected_exact.score_diff_bucket = cw.score_diff_bucket
   AND corrected_exact.outs = cw.outs
   AND corrected_exact.bases_state = cw.bases_state
   AND corrected_exact.count_key = cw.corrected_count_key
  LEFT JOIN mart_win_expectancy_fallbacks held_bucket
    ON held_bucket.fallback_tier = 'drop_inning_to_bucket'
   AND held_bucket.inning_bucket = cw.inning_bucket
   AND held_bucket.half_inning = cw.half_inning
   AND held_bucket.score_diff_bucket = cw.score_diff_bucket
   AND held_bucket.outs = cw.outs
   AND held_bucket.bases_state = cw.bases_state
   AND held_bucket.count_key = cw.held_count_key
  LEFT JOIN mart_win_expectancy_fallbacks corrected_bucket
    ON corrected_bucket.fallback_tier = 'drop_inning_to_bucket'
   AND corrected_bucket.inning_bucket = cw.inning_bucket
   AND corrected_bucket.half_inning = cw.half_inning
   AND corrected_bucket.score_diff_bucket = cw.score_diff_bucket
   AND corrected_bucket.outs = cw.outs
   AND corrected_bucket.bases_state = cw.bases_state
   AND corrected_bucket.count_key = cw.corrected_count_key
  LEFT JOIN mart_win_expectancy_fallbacks held_drop_count
    ON held_drop_count.fallback_tier = 'drop_count_key_exact_inning'
   AND held_drop_count.inning = cw.inning
   AND held_drop_count.half_inning = cw.half_inning
   AND held_drop_count.score_diff_bucket = cw.score_diff_bucket
   AND held_drop_count.outs = cw.outs
   AND held_drop_count.bases_state = cw.bases_state
  LEFT JOIN mart_win_expectancy_fallbacks corrected_drop_count
    ON corrected_drop_count.fallback_tier = 'drop_count_key_exact_inning'
   AND corrected_drop_count.inning = cw.inning
   AND corrected_drop_count.half_inning = cw.half_inning
   AND corrected_drop_count.score_diff_bucket = cw.score_diff_bucket
   AND corrected_drop_count.outs = cw.outs
   AND corrected_drop_count.bases_state = cw.bases_state
  LEFT JOIN mart_win_expectancy_fallbacks held_drop_count_bucket
    ON held_drop_count_bucket.fallback_tier = 'drop_count_key_bucketed_inning'
   AND held_drop_count_bucket.inning_bucket = cw.inning_bucket
   AND held_drop_count_bucket.half_inning = cw.half_inning
   AND held_drop_count_bucket.score_diff_bucket = cw.score_diff_bucket
   AND held_drop_count_bucket.outs = cw.outs
   AND held_drop_count_bucket.bases_state = cw.bases_state
  LEFT JOIN mart_win_expectancy_fallbacks corrected_drop_count_bucket
    ON corrected_drop_count_bucket.fallback_tier = 'drop_count_key_bucketed_inning'
   AND corrected_drop_count_bucket.inning_bucket = cw.inning_bucket
   AND corrected_drop_count_bucket.half_inning = cw.half_inning
   AND corrected_drop_count_bucket.score_diff_bucket = cw.score_diff_bucket
   AND corrected_drop_count_bucket.outs = cw.outs
   AND corrected_drop_count_bucket.bases_state = cw.bases_state
)
SELECT
  team_id,
  CONCAT(MIN(g.season), '-', MAX(g.season)) AS season_window,
  COUNT(*) AS challenges_total,
  AVG(
    COALESCE(corrected_exact_we, corrected_bucket_we, corrected_drop_count_we, corrected_drop_count_bucket_we)
    - COALESCE(held_exact_we, held_bucket_we, held_drop_count_we, held_drop_count_bucket_we)
  )::NUMERIC AS avg_we_delta,
  PERCENTILE_CONT(0.5) WITHIN GROUP (
    ORDER BY COALESCE(corrected_exact_we, corrected_bucket_we, corrected_drop_count_we, corrected_drop_count_bucket_we)
      - COALESCE(held_exact_we, held_bucket_we, held_drop_count_we, held_drop_count_bucket_we)
  )::NUMERIC AS median_we_delta,
  AVG(
    CASE
      WHEN COALESCE(corrected_exact_we, corrected_bucket_we, corrected_drop_count_we, corrected_drop_count_bucket_we)
        - COALESCE(held_exact_we, held_bucket_we, held_drop_count_we, held_drop_count_bucket_we) > 0
      THEN 1 ELSE 0
    END
  )::NUMERIC AS high_we_share,
  AVG(
    CASE
      WHEN COALESCE(corrected_exact_we, corrected_bucket_we, corrected_drop_count_we, corrected_drop_count_bucket_we)
        - COALESCE(held_exact_we, held_bucket_we, held_drop_count_we, held_drop_count_bucket_we) <= 0
      THEN 1 ELSE 0
    END
  )::NUMERIC AS low_we_burn_share,
  AVG(
    CASE WHEN l.inning >= 7 AND ABS(COALESCE(l.home_score, 0) - COALESCE(l.away_score, 0)) <= 2 THEN 1 ELSE 0 END
  )::NUMERIC AS late_close_we_share,
  CASE
    WHEN COUNT(*) >= 120 THEN 'high'
    WHEN COUNT(*) >= 40 THEN 'medium'
    ELSE 'low'
  END AS confidence_band
FROM lookup l
JOIN games g ON g.game_pk = l.game_pk
GROUP BY team_id;

CREATE OR REPLACE VIEW mart_daily_editorial_summary AS
SELECT
  g.game_date::date AS summary_date,
  COUNT(DISTINCT g.game_pk) AS games_tracked,
  COUNT(c.challenge_id) AS challenges_total,
  COUNT(*) FILTER (WHERE c.is_overturned = TRUE) AS overturns_total,
  CASE
    WHEN COUNT(c.challenge_id) > 0
      THEN COUNT(*) FILTER (WHERE c.is_overturned = TRUE)::NUMERIC / COUNT(c.challenge_id)
    ELSE 0
  END AS overturn_rate,
  COUNT(DISTINCT c.challenge_team_id) FILTER (WHERE c.challenge_id IS NOT NULL) AS teams_challenging,
  AVG(team_summary.challenges_total)::NUMERIC AS avg_team_challenges,
  COALESCE(JSONB_AGG(
    DISTINCT JSONB_BUILD_OBJECT(
      'teamId', team_summary.team_id,
      'teamSide', team_summary.team_side,
      'usedSuccessful', team_summary.used_successful,
      'usedFailed', team_summary.used_failed,
      'remaining', team_summary.remaining
    )
  ) FILTER (WHERE team_summary.team_id IS NOT NULL), '[]'::jsonb) AS team_summaries
FROM games g
LEFT JOIN abs_challenges c ON c.game_pk = g.game_pk
LEFT JOIN team_abs_game_summary team_summary ON team_summary.game_pk = g.game_pk
GROUP BY g.game_date::date;

CREATE OR REPLACE VIEW mart_weekly_editorial_summary AS
SELECT
  DATE_TRUNC('week', g.game_date AT TIME ZONE 'UTC')::date AS week_start,
  COUNT(DISTINCT g.game_pk) AS games_tracked,
  COUNT(c.challenge_id) AS challenges_total,
  COUNT(*) FILTER (WHERE c.is_overturned = TRUE) AS overturns_total,
  CASE
    WHEN COUNT(c.challenge_id) > 0
      THEN COUNT(*) FILTER (WHERE c.is_overturned = TRUE)::NUMERIC / COUNT(c.challenge_id)
    ELSE 0
  END AS overturn_rate,
  AVG(daily.challenges_total)::NUMERIC AS avg_daily_challenges,
  AVG(daily.overturn_rate)::NUMERIC AS avg_daily_overturn_rate
FROM games g
LEFT JOIN abs_challenges c ON c.game_pk = g.game_pk
LEFT JOIN mart_daily_editorial_summary daily ON daily.summary_date = g.game_date::date
GROUP BY DATE_TRUNC('week', g.game_date AT TIME ZONE 'UTC')::date;
