DROP VIEW IF EXISTS mart_weekly_editorial_summary CASCADE;
DROP VIEW IF EXISTS mart_daily_editorial_summary CASCADE;
DROP VIEW IF EXISTS mart_modeled_abs_overturn_probability_fallbacks CASCADE;
DROP VIEW IF EXISTS mart_modeled_abs_overturn_inputs CASCADE;
DROP VIEW IF EXISTS mart_historical_abs_overturn_probability_fallbacks CASCADE;
DROP VIEW IF EXISTS mart_historical_abs_overturn_probability CASCADE;
DROP VIEW IF EXISTS mart_historical_abs_team_summary CASCADE;
DROP VIEW IF EXISTS mart_historical_abs_overturn_inputs CASCADE;
DROP VIEW IF EXISTS mart_game_abs_team_impact_metrics CASCADE;
DROP VIEW IF EXISTS mart_game_abs_impact_metrics CASCADE;
DROP VIEW IF EXISTS mart_game_abs_challenge_values CASCADE;
DROP VIEW IF EXISTS mart_team_challenge_decision_value CASCADE;
DROP VIEW IF EXISTS mart_team_challenge_win_value CASCADE;
DROP VIEW IF EXISTS mart_team_challenge_run_value CASCADE;
DROP VIEW IF EXISTS mart_abs_pitch_challenges CASCADE;
DROP VIEW IF EXISTS mart_abs_challenge_classification CASCADE;
DROP VIEW IF EXISTS mart_win_expectancy_fallbacks_train CASCADE;
DROP VIEW IF EXISTS mart_win_expectancy_fallbacks CASCADE;
DROP VIEW IF EXISTS mart_win_expectancy_by_count_state CASCADE;
DROP VIEW IF EXISTS mart_run_expectancy_fallbacks_train CASCADE;
DROP VIEW IF EXISTS mart_run_expectancy_fallbacks CASCADE;
DROP VIEW IF EXISTS mart_run_expectancy_by_count_state CASCADE;
DROP VIEW IF EXISTS mart_count_state_outcome_baselines_train_validation CASCADE;
DROP VIEW IF EXISTS mart_count_state_outcome_baselines_train CASCADE;
DROP VIEW IF EXISTS mart_count_state_outcome_baselines_split CASCADE;
DROP VIEW IF EXISTS mart_historical_pitch_states_split CASCADE;
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

CREATE OR REPLACE VIEW mart_abs_challenge_classification AS
WITH base AS (
  SELECT
    c.*,
    g.home_team_id,
    g.away_team_id,
    COALESCE(c.pitch_number, c.inferred_pitch_number) AS effective_pitch_number,
    p.pitch_number AS resolved_pitch_number,
    p.called_code AS pitch_called_code,
    p.called_description AS pitch_called_description,
    p.is_in_play AS pitch_is_in_play,
    p.balls_before,
    p.strikes_before,
    p.balls_after,
    p.strikes_after,
    sae.row_id AS savant_row_id,
    sae.play_id AS savant_play_id,
    sae.edge_distance AS savant_edge_distance,
    sae.edge_distance_calc AS savant_edge_distance_calc,
    COALESCE(sae.px, sae.plate_x, c.px, c.inferred_px) AS resolved_px,
    COALESCE(sae.pz, sae.plate_z, c.pz, c.inferred_pz) AS resolved_pz,
    COALESCE(sae.strike_zone_top, c.strike_zone_top, c.inferred_strike_zone_top) AS resolved_strike_zone_top,
    COALESCE(sae.strike_zone_bottom, c.strike_zone_bottom, c.inferred_strike_zone_bottom) AS resolved_strike_zone_bottom,
    CASE
      WHEN sae.game_pk IS NOT NULL THEN 'baseball_savant_gamefeed'
      WHEN c.location_source IS NOT NULL THEN c.location_source
      WHEN c.px IS NOT NULL AND c.pz IS NOT NULL THEN 'mlb_statsapi_pitchdata'
      WHEN c.inferred_px IS NOT NULL AND c.inferred_pz IS NOT NULL THEN 'inferred_pitchdata'
      ELSE 'unresolved'
    END AS resolved_location_source,
    CASE
      WHEN LOWER(c.half_inning) = 'top' THEN g.away_team_id
      WHEN LOWER(c.half_inning) = 'bottom' THEN g.home_team_id
      ELSE NULL
    END AS batting_team_id,
    CASE
      WHEN LOWER(c.half_inning) = 'top' THEN g.home_team_id
      WHEN LOWER(c.half_inning) = 'bottom' THEN g.away_team_id
      ELSE NULL
    END AS fielding_team_id,
    CASE
      WHEN COALESCE(sae.px, sae.plate_x, c.px, c.inferred_px) IS NULL
        OR COALESCE(sae.pz, sae.plate_z, c.pz, c.inferred_pz) IS NULL
        OR COALESCE(sae.strike_zone_top, c.strike_zone_top, c.inferred_strike_zone_top) IS NULL
        OR COALESCE(sae.strike_zone_bottom, c.strike_zone_bottom, c.inferred_strike_zone_bottom) IS NULL
        OR COALESCE(sae.strike_zone_top, c.strike_zone_top, c.inferred_strike_zone_top) <= COALESCE(sae.strike_zone_bottom, c.strike_zone_bottom, c.inferred_strike_zone_bottom)
      THEN NULL
      ELSE LEAST(
        0.7083333333 - ABS(COALESCE(sae.px, sae.plate_x, c.px, c.inferred_px)),
        COALESCE(sae.pz, sae.plate_z, c.pz, c.inferred_pz) - COALESCE(sae.strike_zone_bottom, c.strike_zone_bottom, c.inferred_strike_zone_bottom),
        COALESCE(sae.strike_zone_top, c.strike_zone_top, c.inferred_strike_zone_top) - COALESCE(sae.pz, sae.plate_z, c.pz, c.inferred_pz)
      )
    END AS center_only_margin,
    CASE
      WHEN COALESCE(sae.px, sae.plate_x, c.px, c.inferred_px) IS NULL
        OR COALESCE(sae.pz, sae.plate_z, c.pz, c.inferred_pz) IS NULL
        OR COALESCE(sae.strike_zone_top, c.strike_zone_top, c.inferred_strike_zone_top) IS NULL
        OR COALESCE(sae.strike_zone_bottom, c.strike_zone_bottom, c.inferred_strike_zone_bottom) IS NULL
        OR COALESCE(sae.strike_zone_top, c.strike_zone_top, c.inferred_strike_zone_top) <= COALESCE(sae.strike_zone_bottom, c.strike_zone_bottom, c.inferred_strike_zone_bottom)
      THEN NULL
      ELSE LEAST(
        0.8291666667 - ABS(COALESCE(sae.px, sae.plate_x, c.px, c.inferred_px)),
        COALESCE(sae.pz, sae.plate_z, c.pz, c.inferred_pz) - (COALESCE(sae.strike_zone_bottom, c.strike_zone_bottom, c.inferred_strike_zone_bottom) - 0.1208333333),
        (COALESCE(sae.strike_zone_top, c.strike_zone_top, c.inferred_strike_zone_top) + 0.1208333333) - COALESCE(sae.pz, sae.plate_z, c.pz, c.inferred_pz)
      )
    END AS radius_adjusted_margin,
    COALESCE(
      sae.edge_distance_calc,
      CASE
        WHEN COALESCE(sae.px, sae.plate_x, c.px, c.inferred_px) IS NULL
          OR COALESCE(sae.pz, sae.plate_z, c.pz, c.inferred_pz) IS NULL
          OR COALESCE(sae.strike_zone_top, c.strike_zone_top, c.inferred_strike_zone_top) IS NULL
          OR COALESCE(sae.strike_zone_bottom, c.strike_zone_bottom, c.inferred_strike_zone_bottom) IS NULL
          OR COALESCE(sae.strike_zone_top, c.strike_zone_top, c.inferred_strike_zone_top) <= COALESCE(sae.strike_zone_bottom, c.strike_zone_bottom, c.inferred_strike_zone_bottom)
        THEN NULL
        ELSE LEAST(
          0.8291666667 - ABS(COALESCE(sae.px, sae.plate_x, c.px, c.inferred_px)),
          COALESCE(sae.pz, sae.plate_z, c.pz, c.inferred_pz) - (COALESCE(sae.strike_zone_bottom, c.strike_zone_bottom, c.inferred_strike_zone_bottom) - 0.1208333333),
          (COALESCE(sae.strike_zone_top, c.strike_zone_top, c.inferred_strike_zone_top) + 0.1208333333) - COALESCE(sae.pz, sae.plate_z, c.pz, c.inferred_pz)
        )
      END
    ) AS canonical_abs_margin,
    COALESCE(
      sae.edge_distance_calc,
      CASE
        WHEN COALESCE(sae.px, sae.plate_x, c.px, c.inferred_px) IS NULL
          OR COALESCE(sae.pz, sae.plate_z, c.pz, c.inferred_pz) IS NULL
          OR COALESCE(sae.strike_zone_top, c.strike_zone_top, c.inferred_strike_zone_top) IS NULL
          OR COALESCE(sae.strike_zone_bottom, c.strike_zone_bottom, c.inferred_strike_zone_bottom) IS NULL
          OR COALESCE(sae.strike_zone_top, c.strike_zone_top, c.inferred_strike_zone_top) <= COALESCE(sae.strike_zone_bottom, c.strike_zone_bottom, c.inferred_strike_zone_bottom)
        THEN NULL
        ELSE LEAST(
          0.8291666667 - ABS(COALESCE(sae.px, sae.plate_x, c.px, c.inferred_px)),
          COALESCE(sae.pz, sae.plate_z, c.pz, c.inferred_pz) - (COALESCE(sae.strike_zone_bottom, c.strike_zone_bottom, c.inferred_strike_zone_bottom) - 0.1208333333),
          (COALESCE(sae.strike_zone_top, c.strike_zone_top, c.inferred_strike_zone_top) + 0.1208333333) - COALESCE(sae.pz, sae.plate_z, c.pz, c.inferred_pz)
        )
      END
    ) AS min_edge_distance_center_only
  FROM abs_challenges c
  JOIN games g ON g.game_pk = c.game_pk
  LEFT JOIN pitches p
    ON p.game_pk = c.game_pk
   AND p.at_bat_index = c.at_bat_index
   AND p.pitch_number = COALESCE(c.pitch_number, c.inferred_pitch_number)
  LEFT JOIN LATERAL (
    SELECT e.*
    FROM raw.savant_abs_events e
    WHERE e.game_pk = c.game_pk
      AND e.at_bat_number = c.at_bat_index + 1
      AND e.pitch_number = COALESCE(c.pitch_number, c.inferred_pitch_number)
      AND (
        c.challenge_team_id IS NULL
        OR e.challenge_team_id IS NULL
        OR e.challenge_team_id = c.challenge_team_id
      )
    ORDER BY e.imported_at DESC NULLS LAST, e.row_id DESC NULLS LAST
    LIMIT 1
  ) sae ON TRUE
),
normalized AS (
  SELECT
    b.*,
    CASE
      WHEN b.challenge_team_id IS NOT NULL AND b.challenge_team_id = b.batting_team_id THEN 'batting'
      WHEN b.challenge_team_id IS NOT NULL AND b.challenge_team_id = b.fielding_team_id THEN 'fielding'
      ELSE NULL
    END AS challenge_side_role,
    CASE
      WHEN b.challenge_player_id IS NOT NULL AND b.challenge_player_id = b.batter_id THEN 'batter'
      WHEN b.challenge_player_id IS NOT NULL AND b.challenge_player_id = b.pitcher_id THEN 'pitcher'
      ELSE 'unknown'
    END AS challenge_actor_role,
    CASE
      WHEN b.challenge_team_id IS NOT NULL AND b.challenge_team_id = b.batting_team_id THEN 'strike_to_ball'
      WHEN b.challenge_team_id IS NOT NULL AND b.challenge_team_id = b.fielding_team_id THEN 'ball_to_strike'
      ELSE NULL
    END AS side_challenge_direction,
    CASE
      WHEN b.strikes_after IS NOT NULL
        AND b.strikes_before IS NOT NULL
        AND b.strikes_after > b.strikes_before THEN 'ball_to_strike'
      WHEN b.balls_after IS NOT NULL
        AND b.balls_before IS NOT NULL
        AND b.balls_after > b.balls_before THEN 'strike_to_ball'
      ELSE NULL
    END AS count_challenge_direction,
    CASE
      WHEN UPPER(COALESCE(b.pitch_called_code, b.called_code, '')) IN ('C', 'S')
        OR UPPER(COALESCE(b.pitch_called_description, b.called_description, '')) LIKE 'CALLED STRIKE%'
        THEN 'called_strike'
      WHEN UPPER(COALESCE(b.pitch_called_code, b.called_code, '')) IN ('B', '*B')
        OR UPPER(COALESCE(b.pitch_called_description, b.called_description, '')) LIKE 'BALL%'
        THEN 'ball'
      ELSE NULL
    END AS feed_corrected_call
  FROM base b
),
calls AS (
  SELECT
    n.*,
    CASE
      WHEN n.is_overturned = TRUE AND n.count_challenge_direction = 'ball_to_strike' THEN 'ball'
      WHEN n.is_overturned = TRUE AND n.count_challenge_direction = 'strike_to_ball' THEN 'called_strike'
      WHEN n.challenge_side_role = 'batting' THEN 'called_strike'
      WHEN n.challenge_side_role = 'fielding' THEN 'ball'
      ELSE n.feed_corrected_call
    END AS original_call,
    CASE
      WHEN n.is_overturned = TRUE AND n.count_challenge_direction = 'ball_to_strike' THEN 'called_strike'
      WHEN n.is_overturned = TRUE AND n.count_challenge_direction = 'strike_to_ball' THEN 'ball'
      ELSE n.feed_corrected_call
    END AS corrected_call,
    COALESCE(
      CASE WHEN n.is_overturned = TRUE THEN n.count_challenge_direction ELSE NULL END,
      n.side_challenge_direction,
      CASE
        WHEN n.feed_corrected_call = 'called_strike' THEN 'strike_to_ball'
        WHEN n.feed_corrected_call = 'ball' THEN 'ball_to_strike'
        ELSE NULL
      END
    ) AS challenge_direction
  FROM normalized n
),
classified AS (
  SELECT
    calls.*,
    CASE
      WHEN calls.effective_pitch_number IS NULL THEN 'non_pitch_review'
      WHEN calls.pitch_number IS NOT NULL AND calls.feed_corrected_call IN ('called_strike', 'ball') THEN 'pitch_call'
      WHEN calls.inferred_pitch_number IS NOT NULL
        AND calls.inference_method = 'at_bat_final_pitch_called_take'
        AND calls.feed_corrected_call IN ('called_strike', 'ball')
        THEN 'terminal_called_take'
      ELSE 'non_abs_pitch_review'
    END AS review_domain,
    CASE
      WHEN COALESCE(calls.review_type, '') <> 'MJ' THEN 'non_abs_review_type'
      WHEN calls.effective_pitch_number IS NULL THEN 'missing_effective_pitch'
      WHEN calls.challenge_team_id IS NULL THEN 'missing_challenge_team'
      WHEN calls.challenge_side_role IS NULL THEN 'challenge_team_not_batting_or_fielding'
      WHEN calls.feed_corrected_call NOT IN ('called_strike', 'ball') THEN 'not_called_ball_or_strike'
      WHEN COALESCE(calls.pitch_is_in_play, FALSE) THEN 'in_play_pitch_review'
      WHEN calls.is_overturned = TRUE
        AND calls.count_challenge_direction IS NULL
        THEN 'missing_overturned_count_direction'
      WHEN calls.is_overturned = TRUE
        AND calls.count_challenge_direction IS NOT NULL
        AND calls.side_challenge_direction IS NOT NULL
        AND calls.count_challenge_direction IS DISTINCT FROM calls.side_challenge_direction
        THEN 'challenge_side_count_direction_mismatch'
      WHEN calls.is_overturned = FALSE
        AND calls.challenge_side_role = 'batting'
        AND calls.feed_corrected_call IS DISTINCT FROM 'called_strike'
        THEN 'confirmed_batting_side_call_mismatch'
      WHEN calls.is_overturned = FALSE
        AND calls.challenge_side_role = 'fielding'
        AND calls.feed_corrected_call IS DISTINCT FROM 'ball'
        THEN 'confirmed_fielding_side_call_mismatch'
      WHEN calls.challenge_direction NOT IN ('strike_to_ball', 'ball_to_strike') THEN 'unknown_challenge_direction'
      ELSE NULL
    END AS canonical_exclusion_reason
  FROM calls
)
SELECT
  classified.*,
  (
    classified.review_domain IN ('pitch_call', 'terminal_called_take')
    AND classified.canonical_exclusion_reason IS NULL
  ) AS is_abs_pitch_challenge,
  COALESCE(classified.inference_method, 'reviewed_pitch') AS challenge_source_system,
  CASE
    WHEN classified.challenge_direction = 'ball_to_strike' THEN classified.min_edge_distance_center_only
    WHEN classified.challenge_direction = 'strike_to_ball' THEN -classified.min_edge_distance_center_only
    ELSE NULL
  END AS challenge_aligned_margin,
  CASE
    WHEN classified.challenge_direction = 'ball_to_strike' THEN classified.center_only_margin
    WHEN classified.challenge_direction = 'strike_to_ball' THEN -classified.center_only_margin
    ELSE NULL
  END AS challenge_aligned_margin_center_only,
  CASE
    WHEN classified.canonical_abs_margin IS NULL OR classified.challenge_direction IS NULL THEN NULL
    WHEN (
      CASE
        WHEN classified.challenge_direction = 'ball_to_strike' THEN classified.canonical_abs_margin
        WHEN classified.challenge_direction = 'strike_to_ball' THEN -classified.canonical_abs_margin
        ELSE NULL
      END
    ) <= -0.15 THEN 'strong_confirm'
    WHEN (
      CASE
        WHEN classified.challenge_direction = 'ball_to_strike' THEN classified.canonical_abs_margin
        WHEN classified.challenge_direction = 'strike_to_ball' THEN -classified.canonical_abs_margin
        ELSE NULL
      END
    ) <= -0.03 THEN 'lean_confirm'
    WHEN (
      CASE
        WHEN classified.challenge_direction = 'ball_to_strike' THEN classified.canonical_abs_margin
        WHEN classified.challenge_direction = 'strike_to_ball' THEN -classified.canonical_abs_margin
        ELSE NULL
      END
    ) < 0.03 THEN 'borderline'
    WHEN (
      CASE
        WHEN classified.challenge_direction = 'ball_to_strike' THEN classified.canonical_abs_margin
        WHEN classified.challenge_direction = 'strike_to_ball' THEN -classified.canonical_abs_margin
        ELSE NULL
      END
    ) < 0.15 THEN 'lean_overturn'
    ELSE 'strong_overturn'
  END AS edge_bucket
FROM classified;

CREATE OR REPLACE VIEW mart_abs_pitch_challenges AS
SELECT *
FROM mart_abs_challenge_classification
WHERE is_abs_pitch_challenge = TRUE;

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
  c.resolved_px AS effective_px,
  c.resolved_pz AS effective_pz,
  c.strike_zone_top,
  c.strike_zone_bottom,
  c.resolved_strike_zone_top AS effective_strike_zone_top,
  c.resolved_strike_zone_bottom AS effective_strike_zone_bottom,
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
FROM mart_abs_pitch_challenges c
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
    WHEN e.is_batter_challenge = TRUE
      OR (e.challenge_team_id IS NOT NULL AND e.challenge_team_id = e.team_batting_id)
      THEN CONCAT(e.pre_balls, '-', LEAST(COALESCE(e.pre_strikes, 0) + 1, 3))
    WHEN e.challenge_team_id IS NOT NULL AND e.challenge_team_id = e.team_fielding_id
      THEN CONCAT(LEAST(COALESCE(e.pre_balls, 0) + 1, 4), '-', e.pre_strikes)
    WHEN UPPER(COALESCE(e.description, '')) LIKE 'CALLED STRIKE%' OR UPPER(COALESCE(e.call_name, '')) = 'CALLED_STRIKE'
      THEN CONCAT(e.pre_balls, '-', LEAST(COALESCE(e.pre_strikes, 0) + 1, 3))
    WHEN UPPER(COALESCE(e.description, '')) LIKE 'BALL%' OR UPPER(COALESCE(e.call_name, '')) = 'BALL'
      THEN CONCAT(LEAST(COALESCE(e.pre_balls, 0) + 1, 4), '-', e.pre_strikes)
    ELSE NULL
  END AS held_count_key,
  CASE
    WHEN e.is_overturned = TRUE
         AND (
           e.is_batter_challenge = TRUE
           OR (e.challenge_team_id IS NOT NULL AND e.challenge_team_id = e.team_batting_id)
         )
      THEN CONCAT(LEAST(COALESCE(e.pre_balls, 0) + 1, 4), '-', e.pre_strikes)
    WHEN e.is_overturned = TRUE
         AND e.challenge_team_id IS NOT NULL
         AND e.challenge_team_id = e.team_fielding_id
      THEN CONCAT(e.pre_balls, '-', LEAST(COALESCE(e.pre_strikes, 0) + 1, 3))
    WHEN e.is_overturned = TRUE
         AND (UPPER(COALESCE(e.description, '')) LIKE 'CALLED STRIKE%' OR UPPER(COALESCE(e.call_name, '')) = 'CALLED_STRIKE')
      THEN CONCAT(LEAST(COALESCE(e.pre_balls, 0) + 1, 4), '-', e.pre_strikes)
    WHEN e.is_overturned = TRUE
         AND (UPPER(COALESCE(e.description, '')) LIKE 'BALL%' OR UPPER(COALESCE(e.call_name, '')) = 'BALL')
      THEN CONCAT(e.pre_balls, '-', LEAST(COALESCE(e.pre_strikes, 0) + 1, 3))
    WHEN e.is_batter_challenge = TRUE
      OR (e.challenge_team_id IS NOT NULL AND e.challenge_team_id = e.team_batting_id)
      THEN CONCAT(e.pre_balls, '-', LEAST(COALESCE(e.pre_strikes, 0) + 1, 3))
    WHEN e.challenge_team_id IS NOT NULL AND e.challenge_team_id = e.team_fielding_id
      THEN CONCAT(LEAST(COALESCE(e.pre_balls, 0) + 1, 4), '-', e.pre_strikes)
    WHEN UPPER(COALESCE(e.description, '')) LIKE 'CALLED STRIKE%' OR UPPER(COALESCE(e.call_name, '')) = 'CALLED_STRIKE'
      THEN CONCAT(e.pre_balls, '-', LEAST(COALESCE(e.pre_strikes, 0) + 1, 3))
    WHEN UPPER(COALESCE(e.description, '')) LIKE 'BALL%' OR UPPER(COALESCE(e.call_name, '')) = 'BALL'
      THEN CONCAT(LEAST(COALESCE(e.pre_balls, 0) + 1, 4), '-', e.pre_strikes)
    ELSE NULL
  END AS corrected_count_key,
  CASE
    WHEN e.is_batter_challenge = TRUE
      OR (e.challenge_team_id IS NOT NULL AND e.challenge_team_id = e.team_batting_id)
      THEN 'strike_to_ball'
    WHEN e.challenge_team_id IS NOT NULL AND e.challenge_team_id = e.team_fielding_id
      THEN 'ball_to_strike'
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
    WHEN e.edge_distance <= -0.15 THEN 'strong_confirm'
    WHEN e.edge_distance <= -0.03 THEN 'lean_confirm'
    WHEN e.edge_distance < 0.03 THEN 'borderline'
    WHEN e.edge_distance < 0.15 THEN 'lean_overturn'
    ELSE 'strong_overturn'
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

CREATE OR REPLACE VIEW mart_modeled_abs_overturn_inputs AS
WITH challenged AS (
  SELECT
    c.game_pk,
    c.game_date,
    c.season,
    c.game_type,
    c.competition_phase,
    c.split_set,
    c.split_policy_version,
    c.observed_call,
    CASE
      WHEN c.actual_challenge_team_id IS NOT NULL AND c.actual_challenge_team_id = c.batting_team_id THEN 'strike_to_ball'
      WHEN c.actual_challenge_team_id IS NOT NULL AND c.actual_challenge_team_id = c.fielding_team_id THEN 'ball_to_strike'
      WHEN c.observed_call = 'strike' THEN 'strike_to_ball'
      WHEN c.observed_call = 'ball' THEN 'ball_to_strike'
      ELSE NULL
    END AS challenge_direction,
    c.challenge_outcome,
    c.is_overturned,
    c.abs_zone_outcome_center_only,
    c.abs_zone_outcome_radius_adjusted,
    c.min_edge_distance_center_only,
    c.min_edge_distance_radius_adjusted
  FROM modeling.called_pitch_decisions c
  WHERE c.was_challenged = TRUE
    AND c.challenge_outcome IN ('overturned', 'confirmed')
    AND c.observed_call IN ('strike', 'ball')
),
geometry_rows AS (
  SELECT
    challenged.game_pk,
    challenged.game_date,
    challenged.season,
    challenged.game_type,
    challenged.competition_phase,
    challenged.split_set,
    challenged.split_policy_version,
    challenged.observed_call,
    challenged.challenge_direction,
    challenged.challenge_outcome,
    challenged.is_overturned,
    'center_only'::TEXT AS geometry_variant,
    challenged.abs_zone_outcome_center_only AS modeled_abs_outcome,
    challenged.min_edge_distance_center_only AS raw_margin,
    CASE
      WHEN challenged.challenge_direction = 'ball_to_strike' THEN challenged.min_edge_distance_center_only
      WHEN challenged.challenge_direction = 'strike_to_ball' THEN -challenged.min_edge_distance_center_only
      ELSE NULL
    END AS challenge_aligned_margin
  FROM challenged
  WHERE challenged.abs_zone_outcome_center_only IS NOT NULL

  UNION ALL

  SELECT
    challenged.game_pk,
    challenged.game_date,
    challenged.season,
    challenged.game_type,
    challenged.competition_phase,
    challenged.split_set,
    challenged.split_policy_version,
    challenged.observed_call,
    challenged.challenge_direction,
    challenged.challenge_outcome,
    challenged.is_overturned,
    'radius_adjusted'::TEXT AS geometry_variant,
    challenged.abs_zone_outcome_radius_adjusted AS modeled_abs_outcome,
    challenged.min_edge_distance_radius_adjusted AS raw_margin,
    CASE
      WHEN challenged.challenge_direction = 'ball_to_strike' THEN challenged.min_edge_distance_radius_adjusted
      WHEN challenged.challenge_direction = 'strike_to_ball' THEN -challenged.min_edge_distance_radius_adjusted
      ELSE NULL
    END AS challenge_aligned_margin
  FROM challenged
  WHERE challenged.abs_zone_outcome_radius_adjusted IS NOT NULL
)
SELECT
  g.*,
  CASE
    WHEN g.challenge_aligned_margin IS NULL THEN 'unknown'
    WHEN g.challenge_aligned_margin <= -0.15 THEN 'strong_confirm'
    WHEN g.challenge_aligned_margin <= -0.03 THEN 'lean_confirm'
    WHEN g.challenge_aligned_margin < 0.03 THEN 'borderline'
    WHEN g.challenge_aligned_margin < 0.15 THEN 'lean_overturn'
    ELSE 'strong_overturn'
  END AS edge_bucket
FROM geometry_rows g;

CREATE OR REPLACE VIEW mart_modeled_abs_overturn_probability_fallbacks AS
WITH train_inputs AS (
  SELECT *
  FROM mart_modeled_abs_overturn_inputs
  WHERE split_set = 'train'
),
global_rows AS (
  SELECT
    split_policy_version,
    geometry_variant,
    COUNT(*) AS sample_size,
    COUNT(*) FILTER (WHERE is_overturned) AS overturns_total
  FROM train_inputs
  GROUP BY 1, 2
),
direction_rows AS (
  SELECT
    split_policy_version,
    geometry_variant,
    challenge_direction,
    COUNT(*) AS sample_size,
    COUNT(*) FILTER (WHERE is_overturned) AS overturns_total
  FROM train_inputs
  GROUP BY 1, 2, 3
),
exact_rows AS (
  SELECT
    split_policy_version,
    geometry_variant,
    challenge_direction,
    edge_bucket,
    COUNT(*) AS sample_size,
    COUNT(*) FILTER (WHERE is_overturned) AS overturns_total
  FROM train_inputs
  GROUP BY 1, 2, 3, 4
)
SELECT
  'exact'::TEXT AS fallback_tier,
  e.split_policy_version,
  e.geometry_variant,
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
      THEN (e.overturns_total::NUMERIC + (((d.overturns_total::NUMERIC / d.sample_size)) * 20)) / (e.sample_size + 20)
    WHEN e.sample_size > 0 THEN e.overturns_total::NUMERIC / e.sample_size
    ELSE NULL
  END AS overturn_probability,
  CASE
    WHEN e.sample_size >= 150 THEN 'high'
    WHEN e.sample_size >= 40 THEN 'medium'
    ELSE 'low'
  END AS confidence_band
FROM exact_rows e
JOIN direction_rows d
  ON d.split_policy_version = e.split_policy_version
 AND d.geometry_variant = e.geometry_variant
 AND d.challenge_direction = e.challenge_direction

UNION ALL

SELECT
  'direction_only'::TEXT AS fallback_tier,
  d.split_policy_version,
  d.geometry_variant,
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
      THEN (d.overturns_total::NUMERIC + (((g.overturns_total::NUMERIC / g.sample_size)) * 40)) / (d.sample_size + 40)
    WHEN d.sample_size > 0 THEN d.overturns_total::NUMERIC / d.sample_size
    ELSE NULL
  END AS overturn_probability,
  CASE
    WHEN d.sample_size >= 300 THEN 'high'
    WHEN d.sample_size >= 100 THEN 'medium'
    ELSE 'low'
  END AS confidence_band
FROM direction_rows d
JOIN global_rows g
  ON g.split_policy_version = d.split_policy_version
 AND g.geometry_variant = d.geometry_variant

UNION ALL

SELECT
  'global'::TEXT AS fallback_tier,
  g.split_policy_version,
  g.geometry_variant,
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
    WHEN g.sample_size >= 300 THEN 'high'
    WHEN g.sample_size >= 100 THEN 'medium'
    ELSE 'low'
  END AS confidence_band
FROM global_rows g;

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
  resolved_px AS effective_px,
  resolved_pz AS effective_pz,
  resolved_location_source AS location_source,
  inference_method,
  inference_confidence
FROM mart_abs_pitch_challenges
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
          (p.strikes_before = 2 AND c.original_call = 'called_strike')
          OR (p.balls_before = 3 AND c.original_call = 'ball')
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
          (p.strikes_before = 2 AND c.original_call = 'called_strike')
          OR (p.balls_before = 3 AND c.original_call = 'ball')
        )
        THEN 'The overturned call directly changed whether the plate appearance ended.'
      WHEN p.balls_before IS NOT NULL
        AND p.strikes_before IS NOT NULL
        AND (p.balls_before IS DISTINCT FROM p.balls_after OR p.strikes_before IS DISTINCT FROM p.strikes_after)
        THEN 'The overturned call changed the count before the plate appearance finished.'
      ELSE 'The overturned call preceded the later result, but the downstream impact is inferred rather than direct.'
    END AS impact_summary
  FROM mart_abs_pitch_challenges c
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
LEFT JOIN mart_abs_pitch_challenges c
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

CREATE OR REPLACE VIEW mart_historical_pitch_states_split AS
SELECT
  h.*,
  CASE
    WHEN h.game_date <= DATE '2024-12-31' THEN 'train'
    WHEN h.game_date BETWEEN DATE '2025-01-01' AND DATE '2025-12-31' THEN 'validation'
    WHEN h.game_date BETWEEN DATE '2026-03-26' AND DATE '2026-04-07' THEN 'test'
    ELSE 'exclude'
  END AS split_set,
  'historical_pitch_states_season_holdout_v1'::TEXT AS split_policy_version
FROM historical_pitch_states h;

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

CREATE OR REPLACE VIEW mart_count_state_outcome_baselines_split AS
SELECT
  split_set,
  split_policy_version,
  count_key,
  COUNT(*)::INTEGER AS sample_size,
  COUNT(*) FILTER (WHERE hit_event = TRUE)::INTEGER AS hit_count,
  COUNT(*) FILTER (WHERE walk_event = TRUE)::INTEGER AS walk_count,
  COUNT(*) FILTER (WHERE strikeout_event = TRUE)::INTEGER AS strikeout_count,
  COUNT(*) FILTER (WHERE positive_outcome = TRUE)::INTEGER AS positive_outcome_count,
  COUNT(*) FILTER (WHERE official_at_bat = TRUE)::INTEGER AS official_at_bat_count,
  AVG(CASE WHEN official_at_bat THEN CASE WHEN hit_event THEN 1.0 ELSE 0.0 END ELSE NULL END)::NUMERIC AS batting_average,
  AVG(CASE WHEN walk_event THEN 1.0 ELSE 0.0 END)::NUMERIC AS walk_rate,
  AVG(CASE WHEN strikeout_event THEN 1.0 ELSE 0.0 END)::NUMERIC AS strikeout_rate,
  AVG(CASE WHEN positive_outcome THEN 1.0 ELSE 0.0 END)::NUMERIC AS positive_outcome_rate
FROM mart_historical_pitch_states_split
WHERE split_set IN ('train', 'validation', 'test')
  AND is_last_pitch_of_pa = TRUE
  AND count_key IS NOT NULL
GROUP BY split_set, split_policy_version, count_key;

CREATE OR REPLACE VIEW mart_count_state_outcome_baselines_train AS
SELECT
  split_policy_version,
  count_key,
  sample_size,
  hit_count,
  walk_count,
  strikeout_count,
  positive_outcome_count,
  official_at_bat_count,
  batting_average,
  walk_rate,
  strikeout_rate,
  positive_outcome_rate
FROM mart_count_state_outcome_baselines_split
WHERE split_set = 'train';

CREATE OR REPLACE VIEW mart_count_state_outcome_baselines_train_validation AS
SELECT
  'train_validation'::TEXT AS fit_population,
  'historical_pitch_states_season_holdout_v1'::TEXT AS split_policy_version,
  count_key,
  COUNT(*)::INTEGER AS sample_size,
  COUNT(*) FILTER (WHERE hit_event = TRUE)::INTEGER AS hit_count,
  COUNT(*) FILTER (WHERE walk_event = TRUE)::INTEGER AS walk_count,
  COUNT(*) FILTER (WHERE strikeout_event = TRUE)::INTEGER AS strikeout_count,
  COUNT(*) FILTER (WHERE positive_outcome = TRUE)::INTEGER AS positive_outcome_count,
  COUNT(*) FILTER (WHERE official_at_bat = TRUE)::INTEGER AS official_at_bat_count,
  AVG(CASE WHEN official_at_bat THEN CASE WHEN hit_event THEN 1.0 ELSE 0.0 END ELSE NULL END)::NUMERIC AS batting_average,
  AVG(CASE WHEN walk_event THEN 1.0 ELSE 0.0 END)::NUMERIC AS walk_rate,
  AVG(CASE WHEN strikeout_event THEN 1.0 ELSE 0.0 END)::NUMERIC AS strikeout_rate,
  AVG(CASE WHEN positive_outcome THEN 1.0 ELSE 0.0 END)::NUMERIC AS positive_outcome_rate
FROM mart_historical_pitch_states_split
WHERE split_set IN ('train', 'validation')
  AND is_last_pitch_of_pa = TRUE
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
WITH source_available AS (
  SELECT EXISTS(
    SELECT 1
    FROM mart_historical_pitch_states_split
    WHERE split_set IN ('train', 'validation')
    LIMIT 1
  ) AS has_history
),
source_rows AS (
  SELECT *
  FROM mart_historical_pitch_states_split
  WHERE split_set IN ('train', 'validation')
),
exact_rows AS (
  SELECT
    inning_bucket,
    outs,
    bases_state,
    count_key,
    COUNT(*) AS sample_size,
    AVG(COALESCE(runs_to_inning_end, 0))::NUMERIC AS expected_runs_to_end_inning
  FROM source_rows
  GROUP BY inning_bucket, outs, bases_state, count_key
),
count_priors AS (
  SELECT
    outs,
    bases_state,
    count_key,
    COUNT(*) AS sample_size,
    AVG(COALESCE(runs_to_inning_end, 0))::NUMERIC AS expected_runs_to_end_inning
  FROM source_rows
  GROUP BY outs, bases_state, count_key
),
base_out_priors AS (
  SELECT
    outs,
    bases_state,
    COUNT(*) AS sample_size,
    AVG(COALESCE(runs_to_inning_end, 0))::NUMERIC AS expected_runs_to_end_inning
  FROM source_rows
  GROUP BY outs, bases_state
)
SELECT
  'exact'::TEXT AS fallback_tier,
  e.inning_bucket,
  e.outs,
  e.bases_state,
  e.count_key,
  e.sample_size,
  CASE
    WHEN e.sample_size < 25
      THEN ((e.expected_runs_to_end_inning * e.sample_size) + (cp.expected_runs_to_end_inning * 12))
        / NULLIF(e.sample_size + 12, 0)
    ELSE e.expected_runs_to_end_inning
  END AS expected_runs_to_end_inning,
  CASE
    WHEN e.sample_size >= 500 THEN 'high'
    WHEN e.sample_size >= 150 THEN 'medium'
    ELSE 'low'
  END AS confidence_band
FROM exact_rows e
JOIN count_priors cp
  ON cp.outs = e.outs
 AND cp.bases_state = e.bases_state
 AND cp.count_key = e.count_key
UNION ALL
SELECT
  'drop_inning_bucket'::TEXT AS fallback_tier,
  NULL::TEXT AS inning_bucket,
  cp.outs,
  cp.bases_state,
  cp.count_key,
  cp.sample_size,
  cp.expected_runs_to_end_inning,
  CASE
    WHEN cp.sample_size >= 500 THEN 'high'
    WHEN cp.sample_size >= 150 THEN 'medium'
    ELSE 'low'
  END AS confidence_band
FROM count_priors cp
UNION ALL
SELECT
  'drop_count_key'::TEXT AS fallback_tier,
  NULL::TEXT AS inning_bucket,
  bp.outs,
  bp.bases_state,
  NULL::TEXT AS count_key,
  bp.sample_size,
  bp.expected_runs_to_end_inning,
  CASE
    WHEN bp.sample_size >= 500 THEN 'high'
    WHEN bp.sample_size >= 150 THEN 'medium'
    ELSE 'low'
  END AS confidence_band
FROM base_out_priors bp
UNION ALL
SELECT
  fallback_tier,
  inning_bucket,
  outs,
  bases_state,
  count_key,
  sample_size,
  expected_runs_to_end_inning,
  confidence_band
FROM serving_run_expectancy_fallbacks, source_available
WHERE NOT source_available.has_history;

CREATE OR REPLACE VIEW mart_run_expectancy_fallbacks_train AS
WITH source_rows AS (
  SELECT *
  FROM mart_historical_pitch_states_split
  WHERE split_set = 'train'
),
exact_rows AS (
  SELECT
    inning_bucket,
    outs,
    bases_state,
    count_key,
    COUNT(*) AS sample_size,
    AVG(COALESCE(runs_to_inning_end, 0))::NUMERIC AS expected_runs_to_end_inning
  FROM source_rows
  GROUP BY inning_bucket, outs, bases_state, count_key
),
count_priors AS (
  SELECT
    outs,
    bases_state,
    count_key,
    COUNT(*) AS sample_size,
    AVG(COALESCE(runs_to_inning_end, 0))::NUMERIC AS expected_runs_to_end_inning
  FROM source_rows
  GROUP BY outs, bases_state, count_key
),
base_out_priors AS (
  SELECT
    outs,
    bases_state,
    COUNT(*) AS sample_size,
    AVG(COALESCE(runs_to_inning_end, 0))::NUMERIC AS expected_runs_to_end_inning
  FROM source_rows
  GROUP BY outs, bases_state
)
SELECT
  'exact'::TEXT AS fallback_tier,
  e.inning_bucket,
  e.outs,
  e.bases_state,
  e.count_key,
  e.sample_size,
  CASE
    WHEN e.sample_size < 25
      THEN ((e.expected_runs_to_end_inning * e.sample_size) + (cp.expected_runs_to_end_inning * 12))
        / NULLIF(e.sample_size + 12, 0)
    ELSE e.expected_runs_to_end_inning
  END AS expected_runs_to_end_inning,
  CASE
    WHEN e.sample_size >= 500 THEN 'high'
    WHEN e.sample_size >= 150 THEN 'medium'
    ELSE 'low'
  END AS confidence_band
FROM exact_rows e
JOIN count_priors cp
  ON cp.outs = e.outs
 AND cp.bases_state = e.bases_state
 AND cp.count_key = e.count_key
UNION ALL
SELECT
  'drop_inning_bucket'::TEXT AS fallback_tier,
  NULL::TEXT AS inning_bucket,
  cp.outs,
  cp.bases_state,
  cp.count_key,
  cp.sample_size,
  cp.expected_runs_to_end_inning,
  CASE
    WHEN cp.sample_size >= 500 THEN 'high'
    WHEN cp.sample_size >= 150 THEN 'medium'
    ELSE 'low'
  END AS confidence_band
FROM count_priors cp
UNION ALL
SELECT
  'drop_count_key'::TEXT AS fallback_tier,
  NULL::TEXT AS inning_bucket,
  bp.outs,
  bp.bases_state,
  NULL::TEXT AS count_key,
  bp.sample_size,
  bp.expected_runs_to_end_inning,
  CASE
    WHEN bp.sample_size >= 500 THEN 'high'
    WHEN bp.sample_size >= 150 THEN 'medium'
    ELSE 'low'
  END AS confidence_band
FROM base_out_priors bp;

CREATE OR REPLACE VIEW mart_win_expectancy_by_count_state AS
WITH win_states AS (
  SELECT
    h.season,
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
  FROM mart_historical_pitch_states_split h
  WHERE h.split_set IN ('train', 'validation')
    AND batting_team_won IS NOT NULL
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
WITH source_available AS (
  SELECT EXISTS(
    SELECT 1
    FROM mart_historical_pitch_states_split
    WHERE split_set IN ('train', 'validation')
    LIMIT 1
  ) AS has_history
),
win_states AS (
  SELECT
    h.season,
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
  FROM mart_historical_pitch_states_split h
  WHERE h.split_set IN ('train', 'validation')
    AND batting_team_won IS NOT NULL
    AND inning IS NOT NULL
    AND half_inning IS NOT NULL
    AND outs IS NOT NULL
    AND bases_state IS NOT NULL
    AND score_diff_batting IS NOT NULL
),
exact_rows AS (
  SELECT
    inning,
    inning_bucket,
    half_inning,
    score_diff_bucket,
    outs,
    bases_state,
    count_key,
    COUNT(*) AS sample_size,
    AVG(CASE WHEN batting_team_won THEN 1 ELSE 0 END)::NUMERIC AS batting_team_win_probability
  FROM win_states
  WHERE count_key IS NOT NULL
  GROUP BY inning, inning_bucket, half_inning, score_diff_bucket, outs, bases_state, count_key
),
bucket_count_rows AS (
  SELECT
    inning_bucket,
    half_inning,
    score_diff_bucket,
    outs,
    bases_state,
    count_key,
    COUNT(*) AS sample_size,
    AVG(CASE WHEN batting_team_won THEN 1 ELSE 0 END)::NUMERIC AS batting_team_win_probability
  FROM win_states
  WHERE count_key IS NOT NULL
  GROUP BY inning_bucket, half_inning, score_diff_bucket, outs, bases_state, count_key
),
drop_count_exact_rows AS (
  SELECT
    inning,
    half_inning,
    score_diff_bucket,
    outs,
    bases_state,
    COUNT(*) AS sample_size,
    AVG(CASE WHEN batting_team_won THEN 1 ELSE 0 END)::NUMERIC AS batting_team_win_probability
  FROM win_states
  GROUP BY inning, half_inning, score_diff_bucket, outs, bases_state
),
drop_count_bucket_rows AS (
  SELECT
    inning_bucket,
    half_inning,
    score_diff_bucket,
    outs,
    bases_state,
    COUNT(*) AS sample_size,
    AVG(CASE WHEN batting_team_won THEN 1 ELSE 0 END)::NUMERIC AS batting_team_win_probability
  FROM win_states
  GROUP BY inning_bucket, half_inning, score_diff_bucket, outs, bases_state
)
SELECT
  'exact'::TEXT AS fallback_tier,
  e.inning,
  NULL::TEXT AS inning_bucket,
  e.half_inning,
  e.score_diff_bucket,
  e.outs,
  e.bases_state,
  e.count_key,
  e.sample_size,
  CASE
    WHEN e.sample_size < 25
      THEN ((e.batting_team_win_probability * e.sample_size) + (dce.batting_team_win_probability * 8))
        / NULLIF(e.sample_size + 8, 0)
    ELSE e.batting_team_win_probability
  END AS batting_team_win_probability,
  CASE
    WHEN e.sample_size >= 2000 THEN 'high'
    WHEN e.sample_size >= 500 THEN 'medium'
    ELSE 'low'
  END AS confidence_band
FROM exact_rows e
JOIN drop_count_exact_rows dce
  ON dce.inning = e.inning
 AND dce.half_inning = e.half_inning
 AND dce.score_diff_bucket = e.score_diff_bucket
 AND dce.outs = e.outs
 AND dce.bases_state = e.bases_state
UNION ALL
SELECT
  'drop_inning_to_bucket'::TEXT AS fallback_tier,
  NULL::INTEGER AS inning,
  bc.inning_bucket,
  bc.half_inning,
  bc.score_diff_bucket,
  bc.outs,
  bc.bases_state,
  bc.count_key,
  bc.sample_size,
  bc.batting_team_win_probability,
  CASE
    WHEN bc.sample_size >= 2000 THEN 'high'
    WHEN bc.sample_size >= 500 THEN 'medium'
    ELSE 'low'
  END AS confidence_band
FROM bucket_count_rows bc
UNION ALL
SELECT
  'drop_count_key_exact_inning'::TEXT AS fallback_tier,
  dce.inning,
  NULL::TEXT AS inning_bucket,
  dce.half_inning,
  dce.score_diff_bucket,
  dce.outs,
  dce.bases_state,
  NULL::TEXT AS count_key,
  dce.sample_size,
  dce.batting_team_win_probability,
  CASE
    WHEN dce.sample_size >= 2000 THEN 'high'
    WHEN dce.sample_size >= 500 THEN 'medium'
    ELSE 'low'
  END AS confidence_band
FROM drop_count_exact_rows dce
UNION ALL
SELECT
  'drop_count_key_bucketed_inning'::TEXT AS fallback_tier,
  NULL::INTEGER AS inning,
  dcb.inning_bucket,
  dcb.half_inning,
  dcb.score_diff_bucket,
  dcb.outs,
  dcb.bases_state,
  NULL::TEXT AS count_key,
  dcb.sample_size,
  dcb.batting_team_win_probability,
  CASE
    WHEN dcb.sample_size >= 2000 THEN 'high'
    WHEN dcb.sample_size >= 500 THEN 'medium'
    ELSE 'low'
  END AS confidence_band
FROM drop_count_bucket_rows dcb
UNION ALL
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
FROM serving_win_expectancy_fallbacks, source_available
WHERE NOT source_available.has_history;

CREATE OR REPLACE VIEW mart_win_expectancy_fallbacks_train AS
WITH win_states AS (
  SELECT
    h.season,
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
  FROM mart_historical_pitch_states_split h
  WHERE h.split_set = 'train'
    AND batting_team_won IS NOT NULL
    AND inning IS NOT NULL
    AND half_inning IS NOT NULL
    AND outs IS NOT NULL
    AND bases_state IS NOT NULL
    AND score_diff_batting IS NOT NULL
),
exact_rows AS (
  SELECT
    inning,
    inning_bucket,
    half_inning,
    score_diff_bucket,
    outs,
    bases_state,
    count_key,
    COUNT(*) AS sample_size,
    AVG(CASE WHEN batting_team_won THEN 1 ELSE 0 END)::NUMERIC AS batting_team_win_probability
  FROM win_states
  WHERE count_key IS NOT NULL
  GROUP BY inning, inning_bucket, half_inning, score_diff_bucket, outs, bases_state, count_key
),
bucket_count_rows AS (
  SELECT
    inning_bucket,
    half_inning,
    score_diff_bucket,
    outs,
    bases_state,
    count_key,
    COUNT(*) AS sample_size,
    AVG(CASE WHEN batting_team_won THEN 1 ELSE 0 END)::NUMERIC AS batting_team_win_probability
  FROM win_states
  WHERE count_key IS NOT NULL
  GROUP BY inning_bucket, half_inning, score_diff_bucket, outs, bases_state, count_key
),
drop_count_exact_rows AS (
  SELECT
    inning,
    half_inning,
    score_diff_bucket,
    outs,
    bases_state,
    COUNT(*) AS sample_size,
    AVG(CASE WHEN batting_team_won THEN 1 ELSE 0 END)::NUMERIC AS batting_team_win_probability
  FROM win_states
  GROUP BY inning, half_inning, score_diff_bucket, outs, bases_state
),
drop_count_bucket_rows AS (
  SELECT
    inning_bucket,
    half_inning,
    score_diff_bucket,
    outs,
    bases_state,
    COUNT(*) AS sample_size,
    AVG(CASE WHEN batting_team_won THEN 1 ELSE 0 END)::NUMERIC AS batting_team_win_probability
  FROM win_states
  GROUP BY inning_bucket, half_inning, score_diff_bucket, outs, bases_state
)
SELECT
  'exact'::TEXT AS fallback_tier,
  e.inning,
  NULL::TEXT AS inning_bucket,
  e.half_inning,
  e.score_diff_bucket,
  e.outs,
  e.bases_state,
  e.count_key,
  e.sample_size,
  CASE
    WHEN e.sample_size < 25
      THEN ((e.batting_team_win_probability * e.sample_size) + (dce.batting_team_win_probability * 8))
        / NULLIF(e.sample_size + 8, 0)
    ELSE e.batting_team_win_probability
  END AS batting_team_win_probability,
  CASE
    WHEN e.sample_size >= 2000 THEN 'high'
    WHEN e.sample_size >= 500 THEN 'medium'
    ELSE 'low'
  END AS confidence_band
FROM exact_rows e
JOIN drop_count_exact_rows dce
  ON dce.inning = e.inning
 AND dce.half_inning = e.half_inning
 AND dce.score_diff_bucket = e.score_diff_bucket
 AND dce.outs = e.outs
 AND dce.bases_state = e.bases_state
UNION ALL
SELECT
  'drop_inning_to_bucket'::TEXT AS fallback_tier,
  NULL::INTEGER AS inning,
  bc.inning_bucket,
  bc.half_inning,
  bc.score_diff_bucket,
  bc.outs,
  bc.bases_state,
  bc.count_key,
  bc.sample_size,
  bc.batting_team_win_probability,
  CASE
    WHEN bc.sample_size >= 2000 THEN 'high'
    WHEN bc.sample_size >= 500 THEN 'medium'
    ELSE 'low'
  END AS confidence_band
FROM bucket_count_rows bc
UNION ALL
SELECT
  'drop_count_key_exact_inning'::TEXT AS fallback_tier,
  dce.inning,
  NULL::TEXT AS inning_bucket,
  dce.half_inning,
  dce.score_diff_bucket,
  dce.outs,
  dce.bases_state,
  NULL::TEXT AS count_key,
  dce.sample_size,
  dce.batting_team_win_probability,
  CASE
    WHEN dce.sample_size >= 2000 THEN 'high'
    WHEN dce.sample_size >= 500 THEN 'medium'
    ELSE 'low'
  END AS confidence_band
FROM drop_count_exact_rows dce
UNION ALL
SELECT
  'drop_count_key_bucketed_inning'::TEXT AS fallback_tier,
  NULL::INTEGER AS inning,
  dcb.inning_bucket,
  dcb.half_inning,
  dcb.score_diff_bucket,
  dcb.outs,
  dcb.bases_state,
  NULL::TEXT AS count_key,
  dcb.sample_size,
  dcb.batting_team_win_probability,
  CASE
    WHEN dcb.sample_size >= 2000 THEN 'high'
    WHEN dcb.sample_size >= 500 THEN 'medium'
    ELSE 'low'
  END AS confidence_band
FROM drop_count_bucket_rows dcb;

CREATE OR REPLACE VIEW mart_game_abs_challenge_values AS
WITH challenge_context AS (
  SELECT
    c.challenge_id,
    c.game_pk,
    c.challenge_team_id,
    t.name AS challenge_team_name,
    c.challenge_team_side,
    c.challenge_side_role,
    GREATEST(
      0,
      2 - COUNT(*) FILTER (WHERE c.is_overturned = FALSE) OVER (
        PARTITION BY c.game_pk, c.challenge_team_id
        ORDER BY c.challenged_at NULLS LAST, c.challenge_id
        ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING
      )
    ) AS estimated_challenges_remaining,
    c.challenged_at,
    c.is_overturned,
    c.inning,
    INITCAP(c.half_inning) AS half_inning,
    COALESCE(p.outs_before, c.outs) AS outs,
    COALESCE(p.bases_state_before, c.bases_state) AS bases_state,
    COALESCE(p.home_score_before, c.home_score) AS home_score,
    COALESCE(p.away_score_before, c.away_score) AS away_score,
    c.balls,
    c.strikes,
    p.balls_before,
    p.strikes_before,
    p.outs_before,
    p.balls_after,
    p.strikes_after,
    p.outs_after,
    p.bases_state_after,
    p.home_score_after,
    p.away_score_after,
    COALESCE(p.called_description, c.called_description, '') AS resolved_called_description,
    CASE
      WHEN c.bases_state IS NULL THEN 0
      WHEN LOWER(c.bases_state) = 'bases loaded' THEN 3
      WHEN c.bases_state ~ '^[01]{3}$' THEN LENGTH(REPLACE(c.bases_state, '0', ''))
      ELSE
        CASE WHEN LOWER(c.bases_state) LIKE '%1b%' OR LOWER(c.bases_state) LIKE '%first%' THEN 1 ELSE 0 END
        + CASE WHEN LOWER(c.bases_state) LIKE '%2b%' OR LOWER(c.bases_state) LIKE '%second%' THEN 1 ELSE 0 END
        + CASE WHEN LOWER(c.bases_state) LIKE '%3b%' OR LOWER(c.bases_state) LIKE '%third%' THEN 1 ELSE 0 END
    END AS runners_on_base,
    CASE
      WHEN COALESCE(c.pitch_number, c.inferred_pitch_number) IS NULL THEN 'non_pitch_review'
      WHEN c.is_overturned = FALSE THEN 'confirmed'
      WHEN p.ended_plate_appearance = TRUE
        AND (
          (COALESCE(p.strikes_before, c.strikes) = 2 AND c.original_call = 'called_strike')
          OR (COALESCE(p.balls_before, c.balls) = 3 AND c.original_call = 'ball')
        )
        THEN 'direct_ending_impact'
      WHEN p.balls_before IS NOT NULL
        AND p.strikes_before IS NOT NULL
        AND (p.balls_before IS DISTINCT FROM p.balls_after OR p.strikes_before IS DISTINCT FROM p.strikes_after)
        THEN 'direct_count_impact'
      ELSE 'downstream_inferred_impact'
    END AS impact_type,
    c.original_call AS called_pitch,
    CASE
      WHEN c.challenge_direction = 'strike_to_ball' THEN 'ball'
      WHEN c.challenge_direction = 'ball_to_strike' THEN 'called_strike'
      ELSE c.corrected_call
    END AS corrected_call,
    c.challenge_direction,
    c.edge_bucket,
    CASE
      WHEN INITCAP(c.half_inning) = 'Top' THEN
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
      WHEN INITCAP(c.half_inning) = 'Bottom' THEN
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
      WHEN c.inning >= 9 THEN '9+'
      WHEN c.inning >= 7 THEN '7-8'
      WHEN c.inning >= 4 THEN '4-6'
      ELSE '1-3'
    END AS inning_bucket,
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
    END AS corrected_count_key
  FROM mart_abs_pitch_challenges c
  LEFT JOIN teams t ON t.team_id = c.challenge_team_id
  LEFT JOIN pitches p
    ON p.game_pk = c.game_pk
   AND p.at_bat_index = c.at_bat_index
   AND p.pitch_number = COALESCE(c.pitch_number, c.inferred_pitch_number)
),
state_flags AS (
  SELECT
    cc.*,
    CASE
      WHEN cc.called_pitch = 'ball' AND COALESCE(cc.balls_before, cc.balls) >= 3 THEN 'walk'
      WHEN cc.called_pitch = 'called_strike' AND COALESCE(cc.strikes_before, cc.strikes) >= 2 THEN 'strikeout'
      ELSE NULL
    END AS held_terminal_type,
    CASE
      WHEN cc.corrected_call = 'ball' AND COALESCE(cc.balls_before, cc.balls) >= 3 THEN 'walk'
      WHEN cc.corrected_call = 'called_strike' AND COALESCE(cc.strikes_before, cc.strikes) >= 2 THEN 'strikeout'
      ELSE NULL
    END AS corrected_terminal_type
  FROM challenge_context cc
),
state_context AS (
  SELECT
    sf.*,
    CASE
      WHEN sf.held_terminal_type IS NOT NULL THEN NULL
      WHEN sf.called_pitch = 'called_strike' THEN CONCAT(COALESCE(sf.balls_before, sf.balls), '-', COALESCE(sf.strikes_before, sf.strikes) + 1)
      WHEN sf.called_pitch = 'ball' THEN CONCAT(COALESCE(sf.balls_before, sf.balls) + 1, '-', COALESCE(sf.strikes_before, sf.strikes))
      ELSE sf.held_count_key
    END AS held_state_count_key,
    CASE
      WHEN sf.corrected_terminal_type IS NOT NULL THEN NULL
      WHEN sf.corrected_call = 'ball' THEN CONCAT(COALESCE(sf.balls_before, sf.balls) + 1, '-', COALESCE(sf.strikes_before, sf.strikes))
      WHEN sf.corrected_call = 'called_strike' THEN CONCAT(COALESCE(sf.balls_before, sf.balls), '-', COALESCE(sf.strikes_before, sf.strikes) + 1)
      ELSE sf.corrected_count_key
    END AS corrected_state_count_key,
    CASE
      WHEN sf.held_terminal_type = 'strikeout' THEN COALESCE(sf.outs, 0) + 1
      ELSE sf.outs
    END AS held_state_outs,
    CASE
      WHEN sf.corrected_terminal_type IS NOT NULL AND sf.outs_after IS NOT NULL THEN sf.outs_after
      WHEN sf.corrected_terminal_type = 'strikeout' THEN COALESCE(sf.outs, 0) + 1
      ELSE sf.outs
    END AS corrected_state_outs,
    CASE
      WHEN sf.held_terminal_type = 'walk' THEN
        CASE COALESCE(sf.bases_state, '000')
          WHEN '000' THEN '100'
          WHEN '100' THEN '110'
          WHEN '010' THEN '110'
          WHEN '001' THEN '101'
          WHEN '110' THEN '111'
          WHEN '101' THEN '111'
          WHEN '011' THEN '111'
          WHEN '111' THEN '111'
          ELSE sf.bases_state
        END
      ELSE sf.bases_state
    END AS held_state_bases_state,
    CASE
      WHEN sf.corrected_terminal_type IS NOT NULL AND sf.bases_state_after IS NOT NULL THEN sf.bases_state_after
      WHEN sf.corrected_terminal_type = 'walk' THEN
        CASE COALESCE(sf.bases_state, '000')
          WHEN '000' THEN '100'
          WHEN '100' THEN '110'
          WHEN '010' THEN '110'
          WHEN '001' THEN '101'
          WHEN '110' THEN '111'
          WHEN '101' THEN '111'
          WHEN '011' THEN '111'
          WHEN '111' THEN '111'
          ELSE sf.bases_state
        END
      ELSE sf.bases_state
    END AS corrected_state_bases_state,
    CASE
      WHEN sf.held_terminal_type = 'walk' AND sf.half_inning = 'Bottom' AND COALESCE(sf.bases_state, '000') = '111' THEN COALESCE(sf.home_score, 0) + 1
      ELSE sf.home_score
    END AS held_state_home_score,
    CASE
      WHEN sf.held_terminal_type = 'walk' AND sf.half_inning = 'Top' AND COALESCE(sf.bases_state, '000') = '111' THEN COALESCE(sf.away_score, 0) + 1
      ELSE sf.away_score
    END AS held_state_away_score,
    CASE
      WHEN sf.corrected_terminal_type IS NOT NULL AND sf.home_score_after IS NOT NULL THEN sf.home_score_after
      WHEN sf.corrected_terminal_type = 'walk' AND sf.half_inning = 'Bottom' AND COALESCE(sf.bases_state, '000') = '111' THEN COALESCE(sf.home_score, 0) + 1
      ELSE sf.home_score
    END AS corrected_state_home_score,
    CASE
      WHEN sf.corrected_terminal_type IS NOT NULL AND sf.away_score_after IS NOT NULL THEN sf.away_score_after
      WHEN sf.corrected_terminal_type = 'walk' AND sf.half_inning = 'Top' AND COALESCE(sf.bases_state, '000') = '111' THEN COALESCE(sf.away_score, 0) + 1
      ELSE sf.away_score
    END AS corrected_state_away_score
  FROM state_flags sf
),
state_buckets AS (
  SELECT
    sc.*,
    CASE
      WHEN sc.half_inning = 'Top' THEN
        CASE
          WHEN sc.held_state_away_score IS NULL OR sc.held_state_home_score IS NULL THEN NULL
          WHEN sc.held_state_away_score - sc.held_state_home_score <= -4 THEN 'trail4plus'
          WHEN sc.held_state_away_score - sc.held_state_home_score = -3 THEN 'trail3'
          WHEN sc.held_state_away_score - sc.held_state_home_score = -2 THEN 'trail2'
          WHEN sc.held_state_away_score - sc.held_state_home_score = -1 THEN 'trail1'
          WHEN sc.held_state_away_score - sc.held_state_home_score = 0 THEN 'tied'
          WHEN sc.held_state_away_score - sc.held_state_home_score = 1 THEN 'lead1'
          WHEN sc.held_state_away_score - sc.held_state_home_score = 2 THEN 'lead2'
          WHEN sc.held_state_away_score - sc.held_state_home_score = 3 THEN 'lead3'
          ELSE 'lead4plus'
        END
      WHEN sc.half_inning = 'Bottom' THEN
        CASE
          WHEN sc.held_state_home_score IS NULL OR sc.held_state_away_score IS NULL THEN NULL
          WHEN sc.held_state_home_score - sc.held_state_away_score <= -4 THEN 'trail4plus'
          WHEN sc.held_state_home_score - sc.held_state_away_score = -3 THEN 'trail3'
          WHEN sc.held_state_home_score - sc.held_state_away_score = -2 THEN 'trail2'
          WHEN sc.held_state_home_score - sc.held_state_away_score = -1 THEN 'trail1'
          WHEN sc.held_state_home_score - sc.held_state_away_score = 0 THEN 'tied'
          WHEN sc.held_state_home_score - sc.held_state_away_score = 1 THEN 'lead1'
          WHEN sc.held_state_home_score - sc.held_state_away_score = 2 THEN 'lead2'
          WHEN sc.held_state_home_score - sc.held_state_away_score = 3 THEN 'lead3'
          ELSE 'lead4plus'
        END
      ELSE NULL
    END AS held_score_diff_bucket,
    CASE
      WHEN sc.half_inning = 'Top' THEN
        CASE
          WHEN sc.corrected_state_away_score IS NULL OR sc.corrected_state_home_score IS NULL THEN NULL
          WHEN sc.corrected_state_away_score - sc.corrected_state_home_score <= -4 THEN 'trail4plus'
          WHEN sc.corrected_state_away_score - sc.corrected_state_home_score = -3 THEN 'trail3'
          WHEN sc.corrected_state_away_score - sc.corrected_state_home_score = -2 THEN 'trail2'
          WHEN sc.corrected_state_away_score - sc.corrected_state_home_score = -1 THEN 'trail1'
          WHEN sc.corrected_state_away_score - sc.corrected_state_home_score = 0 THEN 'tied'
          WHEN sc.corrected_state_away_score - sc.corrected_state_home_score = 1 THEN 'lead1'
          WHEN sc.corrected_state_away_score - sc.corrected_state_home_score = 2 THEN 'lead2'
          WHEN sc.corrected_state_away_score - sc.corrected_state_home_score = 3 THEN 'lead3'
          ELSE 'lead4plus'
        END
      WHEN sc.half_inning = 'Bottom' THEN
        CASE
          WHEN sc.corrected_state_home_score IS NULL OR sc.corrected_state_away_score IS NULL THEN NULL
          WHEN sc.corrected_state_home_score - sc.corrected_state_away_score <= -4 THEN 'trail4plus'
          WHEN sc.corrected_state_home_score - sc.corrected_state_away_score = -3 THEN 'trail3'
          WHEN sc.corrected_state_home_score - sc.corrected_state_away_score = -2 THEN 'trail2'
          WHEN sc.corrected_state_home_score - sc.corrected_state_away_score = -1 THEN 'trail1'
          WHEN sc.corrected_state_home_score - sc.corrected_state_away_score = 0 THEN 'tied'
          WHEN sc.corrected_state_home_score - sc.corrected_state_away_score = 1 THEN 'lead1'
          WHEN sc.corrected_state_home_score - sc.corrected_state_away_score = 2 THEN 'lead2'
          WHEN sc.corrected_state_home_score - sc.corrected_state_away_score = 3 THEN 'lead3'
          ELSE 'lead4plus'
        END
      ELSE NULL
    END AS corrected_score_diff_bucket
  FROM state_context sc
),
run_lookup AS (
  SELECT
    cc.challenge_id,
    ROUND(COALESCE(run_pre_exact.expected_runs_to_end_inning, run_pre_no_inning.expected_runs_to_end_inning, run_pre_base_out.expected_runs_to_end_inning)::NUMERIC, 3) AS pre_run_expectancy,
    ROUND(COALESCE(run_post_exact.expected_runs_to_end_inning, run_post_no_inning.expected_runs_to_end_inning, run_post_base_out.expected_runs_to_end_inning)::NUMERIC, 3) AS post_run_expectancy,
    CASE
      WHEN COALESCE(run_pre_exact.expected_runs_to_end_inning, run_pre_no_inning.expected_runs_to_end_inning, run_pre_base_out.expected_runs_to_end_inning) IS NULL
        OR COALESCE(run_post_exact.expected_runs_to_end_inning, run_post_no_inning.expected_runs_to_end_inning, run_post_base_out.expected_runs_to_end_inning) IS NULL
      THEN NULL
      ELSE ROUND((
        COALESCE(run_post_exact.expected_runs_to_end_inning, run_post_no_inning.expected_runs_to_end_inning, run_post_base_out.expected_runs_to_end_inning)
        - COALESCE(run_pre_exact.expected_runs_to_end_inning, run_pre_no_inning.expected_runs_to_end_inning, run_pre_base_out.expected_runs_to_end_inning)
      )::NUMERIC, 3)
    END AS run_expectancy_delta,
    CASE
      WHEN COALESCE(run_pre_exact.confidence_band, run_pre_no_inning.confidence_band, run_pre_base_out.confidence_band, run_post_exact.confidence_band, run_post_no_inning.confidence_band, run_post_base_out.confidence_band) IS NULL THEN NULL
      WHEN COALESCE(run_pre_exact.confidence_band, '') = 'low'
        OR COALESCE(run_pre_no_inning.confidence_band, '') = 'low'
        OR COALESCE(run_pre_base_out.confidence_band, '') = 'low'
        OR COALESCE(run_post_exact.confidence_band, '') = 'low'
        OR COALESCE(run_post_no_inning.confidence_band, '') = 'low'
        OR COALESCE(run_post_base_out.confidence_band, '') = 'low'
        THEN 'low'
      WHEN COALESCE(run_pre_exact.confidence_band, '') = 'medium'
        OR COALESCE(run_pre_no_inning.confidence_band, '') = 'medium'
        OR COALESCE(run_pre_base_out.confidence_band, '') = 'medium'
        OR COALESCE(run_post_exact.confidence_band, '') = 'medium'
        OR COALESCE(run_post_no_inning.confidence_band, '') = 'medium'
        OR COALESCE(run_post_base_out.confidence_band, '') = 'medium'
        THEN 'medium'
      ELSE 'high'
    END AS run_expectancy_confidence
  FROM state_buckets cc
  LEFT JOIN serving_run_expectancy_fallbacks run_pre_exact
    ON run_pre_exact.fallback_tier = 'exact'
   AND run_pre_exact.inning_bucket = cc.inning_bucket
   AND run_pre_exact.outs = cc.held_state_outs
   AND run_pre_exact.bases_state = cc.held_state_bases_state
   AND run_pre_exact.count_key = cc.held_state_count_key
  LEFT JOIN serving_run_expectancy_fallbacks run_post_exact
    ON run_post_exact.fallback_tier = 'exact'
   AND run_post_exact.inning_bucket = cc.inning_bucket
   AND run_post_exact.outs = cc.corrected_state_outs
   AND run_post_exact.bases_state = cc.corrected_state_bases_state
   AND run_post_exact.count_key = cc.corrected_state_count_key
  LEFT JOIN serving_run_expectancy_fallbacks run_pre_no_inning
    ON run_pre_no_inning.fallback_tier = 'drop_inning_bucket'
   AND run_pre_no_inning.outs = cc.held_state_outs
   AND run_pre_no_inning.bases_state = cc.held_state_bases_state
   AND run_pre_no_inning.count_key = cc.held_state_count_key
  LEFT JOIN serving_run_expectancy_fallbacks run_post_no_inning
    ON run_post_no_inning.fallback_tier = 'drop_inning_bucket'
   AND run_post_no_inning.outs = cc.corrected_state_outs
   AND run_post_no_inning.bases_state = cc.corrected_state_bases_state
   AND run_post_no_inning.count_key = cc.corrected_state_count_key
  LEFT JOIN serving_run_expectancy_fallbacks run_pre_base_out
    ON run_pre_base_out.fallback_tier = 'drop_count_key'
   AND run_pre_base_out.outs = cc.held_state_outs
   AND run_pre_base_out.bases_state = cc.held_state_bases_state
  LEFT JOIN serving_run_expectancy_fallbacks run_post_base_out
    ON run_post_base_out.fallback_tier = 'drop_count_key'
   AND run_post_base_out.outs = cc.corrected_state_outs
   AND run_post_base_out.bases_state = cc.corrected_state_bases_state
),
win_lookup AS (
  SELECT
    cc.challenge_id,
    ROUND(COALESCE(win_pre_exact.batting_team_win_probability, win_pre_bucket.batting_team_win_probability, win_pre_drop_count.batting_team_win_probability, win_pre_drop_count_bucket.batting_team_win_probability)::NUMERIC, 4) AS pre_win_expectancy,
    ROUND(COALESCE(win_post_exact.batting_team_win_probability, win_post_bucket.batting_team_win_probability, win_post_drop_count.batting_team_win_probability, win_post_drop_count_bucket.batting_team_win_probability)::NUMERIC, 4) AS post_win_expectancy,
    CASE
      WHEN COALESCE(win_pre_exact.batting_team_win_probability, win_pre_bucket.batting_team_win_probability, win_pre_drop_count.batting_team_win_probability, win_pre_drop_count_bucket.batting_team_win_probability) IS NULL
        OR COALESCE(win_post_exact.batting_team_win_probability, win_post_bucket.batting_team_win_probability, win_post_drop_count.batting_team_win_probability, win_post_drop_count_bucket.batting_team_win_probability) IS NULL
      THEN NULL
      ELSE ROUND((
        COALESCE(win_post_exact.batting_team_win_probability, win_post_bucket.batting_team_win_probability, win_post_drop_count.batting_team_win_probability, win_post_drop_count_bucket.batting_team_win_probability)
        - COALESCE(win_pre_exact.batting_team_win_probability, win_pre_bucket.batting_team_win_probability, win_pre_drop_count.batting_team_win_probability, win_pre_drop_count_bucket.batting_team_win_probability)
      )::NUMERIC, 4)
    END AS win_expectancy_delta,
    CASE
      WHEN COALESCE(win_pre_exact.confidence_band, win_pre_bucket.confidence_band, win_pre_drop_count.confidence_band, win_pre_drop_count_bucket.confidence_band, win_post_exact.confidence_band, win_post_bucket.confidence_band, win_post_drop_count.confidence_band, win_post_drop_count_bucket.confidence_band) IS NULL THEN NULL
      WHEN COALESCE(win_pre_exact.confidence_band, '') = 'low'
        OR COALESCE(win_pre_bucket.confidence_band, '') = 'low'
        OR COALESCE(win_pre_drop_count.confidence_band, '') = 'low'
        OR COALESCE(win_pre_drop_count_bucket.confidence_band, '') = 'low'
        OR COALESCE(win_post_exact.confidence_band, '') = 'low'
        OR COALESCE(win_post_bucket.confidence_band, '') = 'low'
        OR COALESCE(win_post_drop_count.confidence_band, '') = 'low'
        OR COALESCE(win_post_drop_count_bucket.confidence_band, '') = 'low'
        THEN 'low'
      WHEN COALESCE(win_pre_exact.confidence_band, '') = 'medium'
        OR COALESCE(win_pre_bucket.confidence_band, '') = 'medium'
        OR COALESCE(win_pre_drop_count.confidence_band, '') = 'medium'
        OR COALESCE(win_pre_drop_count_bucket.confidence_band, '') = 'medium'
        OR COALESCE(win_post_exact.confidence_band, '') = 'medium'
        OR COALESCE(win_post_bucket.confidence_band, '') = 'medium'
        OR COALESCE(win_post_drop_count.confidence_band, '') = 'medium'
        OR COALESCE(win_post_drop_count_bucket.confidence_band, '') = 'medium'
        THEN 'medium'
      ELSE 'high'
    END AS win_expectancy_confidence
  FROM state_buckets cc
  LEFT JOIN serving_win_expectancy_fallbacks win_pre_exact
    ON win_pre_exact.fallback_tier = 'exact'
   AND win_pre_exact.inning = cc.inning
   AND win_pre_exact.half_inning = cc.half_inning
   AND win_pre_exact.score_diff_bucket = cc.held_score_diff_bucket
   AND win_pre_exact.outs = cc.held_state_outs
   AND win_pre_exact.bases_state = cc.held_state_bases_state
   AND win_pre_exact.count_key = cc.held_state_count_key
   AND COALESCE(win_pre_exact.confidence_band, 'low') <> 'low'
  LEFT JOIN serving_win_expectancy_fallbacks win_post_exact
    ON win_post_exact.fallback_tier = 'exact'
   AND win_post_exact.inning = cc.inning
   AND win_post_exact.half_inning = cc.half_inning
   AND win_post_exact.score_diff_bucket = cc.corrected_score_diff_bucket
   AND win_post_exact.outs = cc.corrected_state_outs
   AND win_post_exact.bases_state = cc.corrected_state_bases_state
   AND win_post_exact.count_key = cc.corrected_state_count_key
   AND COALESCE(win_post_exact.confidence_band, 'low') <> 'low'
  LEFT JOIN serving_win_expectancy_fallbacks win_pre_bucket
    ON win_pre_bucket.fallback_tier = 'drop_inning_to_bucket'
   AND win_pre_bucket.inning_bucket = cc.inning_bucket
   AND win_pre_bucket.half_inning = cc.half_inning
   AND win_pre_bucket.score_diff_bucket = cc.held_score_diff_bucket
   AND win_pre_bucket.outs = cc.held_state_outs
   AND win_pre_bucket.bases_state = cc.held_state_bases_state
   AND win_pre_bucket.count_key = cc.held_state_count_key
   AND COALESCE(win_pre_bucket.confidence_band, 'low') <> 'low'
  LEFT JOIN serving_win_expectancy_fallbacks win_post_bucket
    ON win_post_bucket.fallback_tier = 'drop_inning_to_bucket'
   AND win_post_bucket.inning_bucket = cc.inning_bucket
   AND win_post_bucket.half_inning = cc.half_inning
   AND win_post_bucket.score_diff_bucket = cc.corrected_score_diff_bucket
   AND win_post_bucket.outs = cc.corrected_state_outs
   AND win_post_bucket.bases_state = cc.corrected_state_bases_state
   AND win_post_bucket.count_key = cc.corrected_state_count_key
   AND COALESCE(win_post_bucket.confidence_band, 'low') <> 'low'
  LEFT JOIN serving_win_expectancy_fallbacks win_pre_drop_count
    ON win_pre_drop_count.fallback_tier = 'drop_count_key_exact_inning'
   AND win_pre_drop_count.inning = cc.inning
   AND win_pre_drop_count.half_inning = cc.half_inning
   AND win_pre_drop_count.score_diff_bucket = cc.held_score_diff_bucket
   AND win_pre_drop_count.outs = cc.held_state_outs
   AND win_pre_drop_count.bases_state = cc.held_state_bases_state
  LEFT JOIN serving_win_expectancy_fallbacks win_post_drop_count
    ON win_post_drop_count.fallback_tier = 'drop_count_key_exact_inning'
   AND win_post_drop_count.inning = cc.inning
   AND win_post_drop_count.half_inning = cc.half_inning
   AND win_post_drop_count.score_diff_bucket = cc.corrected_score_diff_bucket
   AND win_post_drop_count.outs = cc.corrected_state_outs
   AND win_post_drop_count.bases_state = cc.corrected_state_bases_state
  LEFT JOIN serving_win_expectancy_fallbacks win_pre_drop_count_bucket
    ON win_pre_drop_count_bucket.fallback_tier = 'drop_count_key_bucketed_inning'
   AND win_pre_drop_count_bucket.inning_bucket = cc.inning_bucket
   AND win_pre_drop_count_bucket.half_inning = cc.half_inning
   AND win_pre_drop_count_bucket.score_diff_bucket = cc.held_score_diff_bucket
   AND win_pre_drop_count_bucket.outs = cc.held_state_outs
   AND win_pre_drop_count_bucket.bases_state = cc.held_state_bases_state
  LEFT JOIN serving_win_expectancy_fallbacks win_post_drop_count_bucket
    ON win_post_drop_count_bucket.fallback_tier = 'drop_count_key_bucketed_inning'
   AND win_post_drop_count_bucket.inning_bucket = cc.inning_bucket
   AND win_post_drop_count_bucket.half_inning = cc.half_inning
   AND win_post_drop_count_bucket.score_diff_bucket = cc.corrected_score_diff_bucket
   AND win_post_drop_count_bucket.outs = cc.corrected_state_outs
   AND win_post_drop_count_bucket.bases_state = cc.corrected_state_bases_state
),
overturn_probability_lookup AS (
  SELECT
    fallback_tier,
    challenge_direction,
    edge_bucket,
    overturn_probability,
    confidence_band
  FROM (
    SELECT
      fallback_tier,
      challenge_direction,
      edge_bucket,
      overturn_probability,
      confidence_band,
      ROW_NUMBER() OVER (
        PARTITION BY fallback_tier, challenge_direction, edge_bucket
        ORDER BY
          CASE
            WHEN geometry_variant = 'radius_adjusted' THEN 0
            WHEN geometry_variant = 'center_only' THEN 1
            ELSE 2
          END,
          sample_size DESC,
          split_policy_version DESC NULLS LAST
      ) AS row_rank
    FROM serving_abs_overturn_probability_fallbacks
  ) ranked_probability
  WHERE row_rank = 1
),
decision_lookup AS (
  SELECT
    cc.challenge_id,
    COALESCE(prob_exact.overturn_probability, prob_direction.overturn_probability, prob_global.overturn_probability, 0.5) AS estimated_overturn_probability,
    COALESCE(prob_exact.confidence_band, prob_direction.confidence_band, prob_global.confidence_band, 'low') AS overturn_probability_confidence
  FROM challenge_context cc
  LEFT JOIN overturn_probability_lookup prob_exact
    ON prob_exact.fallback_tier = 'exact'
   AND prob_exact.challenge_direction = cc.challenge_direction
   AND prob_exact.edge_bucket = cc.edge_bucket
  LEFT JOIN overturn_probability_lookup prob_direction
    ON prob_direction.fallback_tier = 'direction_only'
   AND prob_direction.challenge_direction = cc.challenge_direction
   AND prob_direction.edge_bucket IS NULL
  LEFT JOIN overturn_probability_lookup prob_global
    ON prob_global.fallback_tier = 'global'
   AND prob_global.challenge_direction IS NULL
   AND prob_global.edge_bucket IS NULL
),
metrics AS (
  SELECT
    cc.*,
    run_lookup.pre_run_expectancy,
    run_lookup.post_run_expectancy,
    run_lookup.run_expectancy_delta AS batting_team_run_expectancy_delta,
    CASE
      WHEN cc.challenge_side_role = 'fielding' THEN -run_lookup.run_expectancy_delta
      ELSE run_lookup.run_expectancy_delta
    END AS challenge_team_run_expectancy_delta,
    run_lookup.run_expectancy_confidence,
    win_lookup.pre_win_expectancy,
    win_lookup.post_win_expectancy,
    win_lookup.win_expectancy_delta AS batting_team_win_expectancy_delta,
    CASE
      WHEN cc.challenge_side_role = 'fielding' THEN -win_lookup.win_expectancy_delta
      ELSE win_lookup.win_expectancy_delta
    END AS challenge_team_win_expectancy_delta,
    win_lookup.win_expectancy_confidence,
    decision_lookup.estimated_overturn_probability,
    decision_lookup.overturn_probability_confidence,
    GREATEST(
      0,
      LEAST(
        100,
        (
          CASE WHEN COALESCE(cc.inning, 1) >= 9 THEN 28 WHEN COALESCE(cc.inning, 1) >= 7 THEN 22 WHEN COALESCE(cc.inning, 1) >= 5 THEN 14 ELSE 8 END
          + CASE
              WHEN ABS(COALESCE(cc.home_score, 0) - COALESCE(cc.away_score, 0)) = 0 THEN 28
              WHEN ABS(COALESCE(cc.home_score, 0) - COALESCE(cc.away_score, 0)) = 1 THEN 24
              WHEN ABS(COALESCE(cc.home_score, 0) - COALESCE(cc.away_score, 0)) = 2 THEN 18
              WHEN ABS(COALESCE(cc.home_score, 0) - COALESCE(cc.away_score, 0)) = 3 THEN 12
              ELSE 6
            END
          + CASE WHEN COALESCE(cc.outs, 0) >= 2 THEN 14 WHEN COALESCE(cc.outs, 0) = 1 THEN 9 ELSE 5 END
          + CASE WHEN cc.runners_on_base >= 3 THEN 14 WHEN cc.runners_on_base = 2 THEN 11 WHEN cc.runners_on_base = 1 THEN 8 ELSE 0 END
          + CASE
              WHEN COALESCE(cc.balls, 0) = 3 AND COALESCE(cc.strikes, 0) = 2 THEN 16
              WHEN COALESCE(cc.strikes, 0) >= 2 THEN 12
              WHEN COALESCE(cc.balls, 0) >= 3 THEN 10
              ELSE 5
            END
        )
      )
    )::NUMERIC AS estimated_leverage_index,
    GREATEST(
      0.2,
      LEAST(
        3.0,
        GREATEST(0.1, LEAST(COALESCE(cc.inning, 1)::NUMERIC / 9.0, 1.7))
        * GREATEST(0.3, LEAST(1.5 - ABS(COALESCE(cc.home_score, 0) - COALESCE(cc.away_score, 0)) * 0.15, 1.5))
        * CASE
            WHEN COALESCE(cc.balls_before, cc.balls, 0) = 3 AND COALESCE(cc.strikes_before, cc.strikes, 0) = 2 THEN 1.2
            WHEN COALESCE(cc.strikes_before, cc.strikes, 0) = 2 THEN 1.1
            ELSE 1.0
          END
        * CASE
            WHEN cc.runners_on_base > 0 THEN 1 + (cc.runners_on_base * 0.12)
            ELSE 0.95
          END
      )
    )::NUMERIC AS leverage_index_approx
  FROM state_buckets cc
  LEFT JOIN run_lookup ON run_lookup.challenge_id = cc.challenge_id
  LEFT JOIN win_lookup ON win_lookup.challenge_id = cc.challenge_id
  LEFT JOIN decision_lookup ON decision_lookup.challenge_id = cc.challenge_id
),
decision_metrics AS (
  SELECT
    metrics.*,
    CASE
      WHEN metrics.called_pitch IS NULL THEN NULL
      WHEN metrics.held_terminal_type IS NOT NULL OR metrics.corrected_terminal_type IS NOT NULL THEN 'heuristic'
      WHEN metrics.challenge_team_win_expectancy_delta IS NOT NULL THEN 'win_expectancy'
      ELSE 'heuristic'
    END AS decision_value_mode_resolved,
    COALESCE(
      CASE
        WHEN metrics.held_terminal_type IS NOT NULL OR metrics.corrected_terminal_type IS NOT NULL THEN NULL
        ELSE metrics.challenge_team_win_expectancy_delta
      END,
      ROUND((0.012 * metrics.leverage_index_approx)::NUMERIC, 4)
    ) AS wp_delta_if_success,
    ROUND((-0.0025 * metrics.leverage_index_approx)::NUMERIC, 4) AS raw_wp_delta_if_fail,
    ROUND(LEAST(
      CASE WHEN COALESCE(metrics.estimated_challenges_remaining, 1) >= 2 THEN 0.0075 ELSE 0.015 END,
      CASE
        WHEN COALESCE(metrics.estimated_challenges_remaining, 1) >= 2
          THEN CASE
            WHEN metrics.inning_bucket = '1-3' AND ABS(COALESCE(metrics.home_score, 0) - COALESCE(metrics.away_score, 0)) <= 1 THEN 0.21517434325744247 * 0.04
            WHEN metrics.inning_bucket = '1-3' THEN 0.17001245874587342 * 0.04
            WHEN metrics.inning_bucket = '4-6' AND ABS(COALESCE(metrics.home_score, 0) - COALESCE(metrics.away_score, 0)) <= 1 THEN 0.17933073951434852 * 0.04
            WHEN metrics.inning_bucket = '4-6' THEN 0.1295591587516967 * 0.04
            WHEN metrics.inning_bucket = '7-8' AND ABS(COALESCE(metrics.home_score, 0) - COALESCE(metrics.away_score, 0)) <= 1 THEN 0.134208543263965 * 0.04
            WHEN metrics.inning_bucket = '7-8' THEN 0.06035564184559155 * 0.04
            WHEN metrics.inning_bucket = '9+' AND ABS(COALESCE(metrics.home_score, 0) - COALESCE(metrics.away_score, 0)) <= 1 THEN 0.06170121359223295 * 0.04
            ELSE 0.007338901098901094 * 0.04
          END
        ELSE CASE
          WHEN metrics.inning_bucket = '1-3' AND ABS(COALESCE(metrics.home_score, 0) - COALESCE(metrics.away_score, 0)) <= 1 THEN 0.28954352014010387 * 0.04
          WHEN metrics.inning_bucket = '1-3' THEN 0.23589356435643613 * 0.04
          WHEN metrics.inning_bucket = '4-6' AND ABS(COALESCE(metrics.home_score, 0) - COALESCE(metrics.away_score, 0)) <= 1 THEN 0.24681330022075038 * 0.04
          WHEN metrics.inning_bucket = '4-6' THEN 0.19392706919945835 * 0.04
          WHEN metrics.inning_bucket = '7-8' AND ABS(COALESCE(metrics.home_score, 0) - COALESCE(metrics.away_score, 0)) <= 1 THEN 0.21035421686746955 * 0.04
          WHEN metrics.inning_bucket = '7-8' THEN 0.10613727729556854 * 0.04
          WHEN metrics.inning_bucket = '9+' AND ABS(COALESCE(metrics.home_score, 0) - COALESCE(metrics.away_score, 0)) <= 1 THEN 0.11896820388349548 * 0.04
          ELSE 0.01721450549450547 * 0.04
        END
      END
    )::NUMERIC, 4) AS inventory_cost_if_fail
  FROM metrics
)
SELECT
  metrics.game_pk,
  metrics.challenge_id,
  metrics.challenge_team_id,
  metrics.challenge_team_name,
  metrics.challenge_team_side,
  metrics.challenged_at,
  metrics.is_overturned,
  metrics.inning,
  metrics.half_inning,
  metrics.outs,
  metrics.bases_state,
  metrics.home_score,
  metrics.away_score,
  metrics.impact_type,
  CASE
    WHEN metrics.inning >= 7 AND metrics.home_score IS NOT NULL AND metrics.away_score IS NOT NULL AND ABS(metrics.home_score - metrics.away_score) <= 2 THEN TRUE
    ELSE FALSE
  END AS is_late_close,
  metrics.estimated_leverage_index,
  CASE
    WHEN metrics.is_overturned = FALSE THEN ROUND((metrics.estimated_leverage_index * -0.35)::NUMERIC, 0)
    WHEN metrics.impact_type = 'direct_ending_impact' THEN ROUND(metrics.estimated_leverage_index::NUMERIC, 0)
    WHEN metrics.impact_type = 'direct_count_impact' THEN ROUND((metrics.estimated_leverage_index * 0.72)::NUMERIC, 0)
    ELSE ROUND((metrics.estimated_leverage_index * 0.45)::NUMERIC, 0)
  END AS estimated_challenge_swing,
  metrics.pre_run_expectancy,
  metrics.post_run_expectancy,
  metrics.challenge_team_run_expectancy_delta AS run_expectancy_delta,
  metrics.run_expectancy_confidence,
  metrics.pre_win_expectancy,
  metrics.post_win_expectancy,
  metrics.challenge_team_win_expectancy_delta AS win_expectancy_delta,
  metrics.win_expectancy_confidence,
  metrics.estimated_overturn_probability,
  metrics.overturn_probability_confidence,
  metrics.decision_value_mode_resolved AS decision_value_mode,
  CASE
    WHEN metrics.called_pitch IS NULL THEN NULL
    ELSE ROUND((
      metrics.estimated_overturn_probability
      * metrics.wp_delta_if_success
      + (1 - metrics.estimated_overturn_probability) * (metrics.raw_wp_delta_if_fail - metrics.inventory_cost_if_fail)
    )::NUMERIC, 4)
  END AS expected_challenge_value,
  metrics.batting_team_run_expectancy_delta,
  metrics.challenge_team_run_expectancy_delta,
  metrics.batting_team_win_expectancy_delta,
  metrics.challenge_team_win_expectancy_delta,
  metrics.wp_delta_if_success,
  ROUND((metrics.raw_wp_delta_if_fail - metrics.inventory_cost_if_fail)::NUMERIC, 4) AS wp_delta_if_fail,
  metrics.inventory_cost_if_fail AS inventory_cost,
  'inventory_future_opportunity_failure_weighted_v2'::TEXT AS inventory_cost_version,
  metrics.estimated_challenges_remaining,
  metrics.held_terminal_type,
  metrics.corrected_terminal_type
FROM decision_metrics metrics;

CREATE OR REPLACE VIEW mart_game_abs_impact_metrics AS
SELECT
  game_pk,
  COUNT(*) AS total_challenges,
  COUNT(*) FILTER (WHERE is_overturned) AS overturned_challenges,
  COUNT(*) FILTER (WHERE NOT is_overturned) AS confirmed_challenges,
  COUNT(*) FILTER (WHERE is_late_close) AS late_close_challenges,
  COUNT(*) FILTER (
    WHERE decision_value_mode = 'win_expectancy'
      AND expected_challenge_value IS NOT NULL
      AND expected_challenge_value > 0.0005
  ) AS positive_expected_challenge_count,
  COUNT(*) FILTER (
    WHERE decision_value_mode = 'win_expectancy'
      AND expected_challenge_value IS NOT NULL
      AND expected_challenge_value <= 0.0005
  ) AS low_value_challenge_count,
  ROUND(SUM(CASE WHEN win_expectancy_confidence IN ('high', 'medium') THEN win_expectancy_delta ELSE NULL END)::NUMERIC, 4) AS total_win_value,
  ROUND(SUM(CASE WHEN run_expectancy_confidence IN ('high', 'medium') THEN run_expectancy_delta ELSE NULL END)::NUMERIC, 4) AS total_run_value,
  ROUND(SUM(estimated_challenge_swing)::NUMERIC, 2) AS total_estimated_swing,
  ROUND(SUM(
    CASE
      WHEN decision_value_mode = 'win_expectancy' AND win_expectancy_confidence IN ('high', 'medium')
      THEN expected_challenge_value
      ELSE NULL
    END
  )::NUMERIC, 4) AS expected_value_sum
FROM mart_game_abs_challenge_values
GROUP BY game_pk;

CREATE OR REPLACE VIEW mart_game_abs_team_impact_metrics AS
SELECT
  game_pk,
  challenge_team_id AS team_id,
  challenge_team_name AS team_name,
  challenge_team_side AS team_side,
  COUNT(*) AS total_challenges,
  COUNT(*) FILTER (WHERE is_overturned) AS overturned_challenges,
  CASE
    WHEN COUNT(*) > 0 THEN ROUND((COUNT(*) FILTER (WHERE is_overturned)::NUMERIC / COUNT(*))::NUMERIC, 4)
    ELSE NULL
  END AS overturn_rate,
  ROUND(AVG(estimated_leverage_index)::NUMERIC, 4) AS average_leverage,
  CASE
    WHEN COUNT(*) > 0 THEN ROUND(AVG(CASE WHEN is_late_close THEN 1 ELSE 0 END)::NUMERIC, 4)
    ELSE NULL
  END AS late_close_share,
  ROUND(SUM(CASE WHEN win_expectancy_confidence IN ('high', 'medium') THEN win_expectancy_delta ELSE NULL END)::NUMERIC, 4) AS total_win_value,
  ROUND(SUM(CASE WHEN run_expectancy_confidence IN ('high', 'medium') THEN run_expectancy_delta ELSE NULL END)::NUMERIC, 4) AS total_run_value,
  ROUND(SUM(estimated_challenge_swing)::NUMERIC, 2) AS total_estimated_swing,
  ROUND(SUM(
    CASE
      WHEN decision_value_mode = 'win_expectancy' AND win_expectancy_confidence IN ('high', 'medium')
      THEN expected_challenge_value
      ELSE NULL
    END
  )::NUMERIC, 4) AS expected_value_sum
FROM mart_game_abs_challenge_values
WHERE challenge_team_id IS NOT NULL
GROUP BY game_pk, challenge_team_id, challenge_team_name, challenge_team_side;

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
  FROM mart_abs_pitch_challenges c
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
    INITCAP(c.half_inning) AS half_inning,
    c.outs,
    c.bases_state,
    c.home_score,
    c.away_score,
    CASE
      WHEN INITCAP(c.half_inning) = 'Top' THEN
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
      WHEN INITCAP(c.half_inning) = 'Bottom' THEN
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
  FROM mart_abs_pitch_challenges c
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

CREATE OR REPLACE VIEW mart_team_challenge_decision_value AS
WITH decision_inputs AS (
  SELECT
    c.challenge_id,
    c.challenge_team_id AS team_id,
    c.game_pk,
    c.inning,
    INITCAP(c.half_inning) AS half_inning,
    c.outs,
    c.bases_state,
    c.home_score,
    c.away_score,
    c.is_overturned,
    COALESCE(p.balls_before, c.balls, 0) AS balls_before,
    COALESCE(p.strikes_before, c.strikes, 0) AS strikes_before,
    c.original_call AS called_pitch,
    c.challenge_direction,
    c.edge_bucket,
    CASE
      WHEN INITCAP(c.half_inning) = 'Top' THEN
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
      WHEN INITCAP(c.half_inning) = 'Bottom' THEN
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
      WHEN c.inning >= 9 THEN '9+'
      WHEN c.inning >= 7 THEN '7-8'
      WHEN c.inning >= 4 THEN '4-6'
      ELSE '1-3'
    END AS inning_bucket,
    CASE
      WHEN c.original_call = 'called_strike' THEN
        CASE WHEN COALESCE(p.strikes_before, c.strikes, 0) >= 2 THEN NULL ELSE CONCAT(COALESCE(p.balls_before, c.balls, 0), '-', COALESCE(p.strikes_before, c.strikes, 0) + 1) END
      WHEN c.original_call = 'ball' THEN
        CASE WHEN COALESCE(p.balls_before, c.balls, 0) >= 3 THEN NULL ELSE CONCAT(COALESCE(p.balls_before, c.balls, 0) + 1, '-', COALESCE(p.strikes_before, c.strikes, 0)) END
      ELSE NULL
    END AS held_count_key,
    CASE
      WHEN c.corrected_call = 'called_strike' THEN
        CASE WHEN COALESCE(p.strikes_before, c.strikes, 0) >= 2 THEN NULL ELSE CONCAT(COALESCE(p.balls_before, c.balls, 0), '-', COALESCE(p.strikes_before, c.strikes, 0) + 1) END
      WHEN c.corrected_call = 'ball' THEN
        CASE WHEN COALESCE(p.balls_before, c.balls, 0) >= 3 THEN NULL ELSE CONCAT(COALESCE(p.balls_before, c.balls, 0) + 1, '-', COALESCE(p.strikes_before, c.strikes, 0)) END
      ELSE NULL
    END AS corrected_count_key,
    CONCAT(
      CASE
        WHEN c.bases_state = '111' THEN 'Bases Loaded'
        WHEN (c.bases_state IN ('011', '101', '110')) AND COALESCE(c.outs, 0) < 2 THEN 'RISP, <2 Outs'
        WHEN (c.bases_state IN ('011', '101', '110')) THEN 'RISP, 2 Outs'
        WHEN c.bases_state = '000' THEN 'Bases Empty'
        ELSE 'Runner On'
      END,
      ' • ',
      CASE
        WHEN COALESCE(p.balls_before, c.balls, 0) = 3 AND COALESCE(p.strikes_before, c.strikes, 0) = 2 THEN 'Full Count'
        WHEN COALESCE(p.balls_before, c.balls, 0) > COALESCE(p.strikes_before, c.strikes, 0) THEN 'Hitter Ahead'
        WHEN COALESCE(p.balls_before, c.balls, 0) < COALESCE(p.strikes_before, c.strikes, 0) THEN 'Pitcher Ahead'
        ELSE 'Even Count'
      END
    ) AS decision_window_label
  FROM mart_abs_pitch_challenges c
  LEFT JOIN pitches p
    ON p.game_pk = c.game_pk
   AND p.at_bat_index = c.at_bat_index
   AND p.pitch_number = COALESCE(c.pitch_number, c.inferred_pitch_number)
  WHERE c.challenge_team_id IS NOT NULL
),
decision_lookup AS (
  SELECT
    di.*,
    prob.overturn_probability,
    prob.confidence_band AS overturn_probability_confidence,
    held_exact.batting_team_win_probability AS held_exact_we,
    corrected_exact.batting_team_win_probability AS corrected_exact_we,
    held_bucket.batting_team_win_probability AS held_bucket_we,
    corrected_bucket.batting_team_win_probability AS corrected_bucket_we,
    held_drop_count.batting_team_win_probability AS held_drop_count_we,
    corrected_drop_count.batting_team_win_probability AS corrected_drop_count_we,
    held_drop_count_bucket.batting_team_win_probability AS held_drop_count_bucket_we,
    corrected_drop_count_bucket.batting_team_win_probability AS corrected_drop_count_bucket_we
  FROM decision_inputs di
  LEFT JOIN LATERAL (
    SELECT
      prob.overturn_probability,
      prob.confidence_band
    FROM mart_historical_abs_overturn_probability_fallbacks prob
    WHERE (
        prob.fallback_tier = 'exact'
        AND prob.challenge_direction = di.challenge_direction
        AND prob.edge_bucket = di.edge_bucket
      )
      OR (
        prob.fallback_tier = 'direction_only'
        AND prob.challenge_direction = di.challenge_direction
        AND prob.edge_bucket IS NULL
      )
      OR (
        prob.fallback_tier = 'global'
        AND prob.challenge_direction IS NULL
        AND prob.edge_bucket IS NULL
      )
    ORDER BY
      CASE
        WHEN prob.fallback_tier = 'exact' THEN 0
        WHEN prob.fallback_tier = 'direction_only' THEN 1
        ELSE 2
      END
    LIMIT 1
  ) prob ON TRUE
  LEFT JOIN mart_win_expectancy_fallbacks held_exact
    ON held_exact.fallback_tier = 'exact'
   AND held_exact.inning = di.inning
   AND held_exact.half_inning = di.half_inning
   AND held_exact.score_diff_bucket = di.score_diff_bucket
   AND held_exact.outs = di.outs
   AND held_exact.bases_state = di.bases_state
   AND held_exact.count_key = di.held_count_key
  LEFT JOIN mart_win_expectancy_fallbacks corrected_exact
    ON corrected_exact.fallback_tier = 'exact'
   AND corrected_exact.inning = di.inning
   AND corrected_exact.half_inning = di.half_inning
   AND corrected_exact.score_diff_bucket = di.score_diff_bucket
   AND corrected_exact.outs = di.outs
   AND corrected_exact.bases_state = di.bases_state
   AND corrected_exact.count_key = di.corrected_count_key
  LEFT JOIN mart_win_expectancy_fallbacks held_bucket
    ON held_bucket.fallback_tier = 'drop_inning_to_bucket'
   AND held_bucket.inning_bucket = di.inning_bucket
   AND held_bucket.half_inning = di.half_inning
   AND held_bucket.score_diff_bucket = di.score_diff_bucket
   AND held_bucket.outs = di.outs
   AND held_bucket.bases_state = di.bases_state
   AND held_bucket.count_key = di.held_count_key
  LEFT JOIN mart_win_expectancy_fallbacks corrected_bucket
    ON corrected_bucket.fallback_tier = 'drop_inning_to_bucket'
   AND corrected_bucket.inning_bucket = di.inning_bucket
   AND corrected_bucket.half_inning = di.half_inning
   AND corrected_bucket.score_diff_bucket = di.score_diff_bucket
   AND corrected_bucket.outs = di.outs
   AND corrected_bucket.bases_state = di.bases_state
   AND corrected_bucket.count_key = di.corrected_count_key
  LEFT JOIN mart_win_expectancy_fallbacks held_drop_count
    ON held_drop_count.fallback_tier = 'drop_count_key_exact_inning'
   AND held_drop_count.inning = di.inning
   AND held_drop_count.half_inning = di.half_inning
   AND held_drop_count.score_diff_bucket = di.score_diff_bucket
   AND held_drop_count.outs = di.outs
   AND held_drop_count.bases_state = di.bases_state
  LEFT JOIN mart_win_expectancy_fallbacks corrected_drop_count
    ON corrected_drop_count.fallback_tier = 'drop_count_key_exact_inning'
   AND corrected_drop_count.inning = di.inning
   AND corrected_drop_count.half_inning = di.half_inning
   AND corrected_drop_count.score_diff_bucket = di.score_diff_bucket
   AND corrected_drop_count.outs = di.outs
   AND corrected_drop_count.bases_state = di.bases_state
  LEFT JOIN mart_win_expectancy_fallbacks held_drop_count_bucket
    ON held_drop_count_bucket.fallback_tier = 'drop_count_key_bucketed_inning'
   AND held_drop_count_bucket.inning_bucket = di.inning_bucket
   AND held_drop_count_bucket.half_inning = di.half_inning
   AND held_drop_count_bucket.score_diff_bucket = di.score_diff_bucket
   AND held_drop_count_bucket.outs = di.outs
   AND held_drop_count_bucket.bases_state = di.bases_state
  LEFT JOIN mart_win_expectancy_fallbacks corrected_drop_count_bucket
    ON corrected_drop_count_bucket.fallback_tier = 'drop_count_key_bucketed_inning'
   AND corrected_drop_count_bucket.inning_bucket = di.inning_bucket
   AND corrected_drop_count_bucket.half_inning = di.half_inning
   AND corrected_drop_count_bucket.score_diff_bucket = di.score_diff_bucket
   AND corrected_drop_count_bucket.outs = di.outs
   AND corrected_drop_count_bucket.bases_state = di.bases_state
  WHERE di.called_pitch IS NOT NULL
),
decision_rows AS (
  SELECT DISTINCT ON (challenge_id)
    dl.*,
    GREATEST(
      0.2,
      LEAST(
        3.0,
        GREATEST(0.1, LEAST(COALESCE(dl.inning, 1)::NUMERIC / 9.0, 1.7))
        * GREATEST(0.3, LEAST(1.5 - ABS(COALESCE(dl.home_score, 0) - COALESCE(dl.away_score, 0)) * 0.15, 1.5))
        * CASE
            WHEN dl.balls_before = 3 AND dl.strikes_before = 2 THEN 1.2
            WHEN dl.strikes_before = 2 THEN 1.1
            ELSE 1.0
          END
        * CASE
            WHEN LENGTH(REPLACE(COALESCE(dl.bases_state, '000'), '0', '')) > 0
              THEN 1 + (LENGTH(REPLACE(dl.bases_state, '0', '')) * 0.12)
            ELSE 0.95
          END
      )
    ) AS leverage_index_approx,
    COALESCE(dl.corrected_exact_we, dl.corrected_bucket_we, dl.corrected_drop_count_we, dl.corrected_drop_count_bucket_we)
      - COALESCE(dl.held_exact_we, dl.held_bucket_we, dl.held_drop_count_we, dl.held_drop_count_bucket_we) AS success_we_delta
  FROM decision_lookup dl
  ORDER BY challenge_id,
    CASE dl.overturn_probability_confidence WHEN 'high' THEN 3 WHEN 'medium' THEN 2 ELSE 1 END DESC,
    CASE
      WHEN dl.corrected_exact_we IS NOT NULL AND dl.held_exact_we IS NOT NULL THEN 4
      WHEN dl.corrected_bucket_we IS NOT NULL AND dl.held_bucket_we IS NOT NULL THEN 3
      WHEN dl.corrected_drop_count_we IS NOT NULL AND dl.held_drop_count_we IS NOT NULL THEN 2
      WHEN dl.corrected_drop_count_bucket_we IS NOT NULL AND dl.held_drop_count_bucket_we IS NOT NULL THEN 1
      ELSE 0
    END DESC
),
decision_value AS (
  SELECT
    dr.*,
    CASE
      WHEN dr.success_we_delta IS NOT NULL THEN dr.success_we_delta
      ELSE ROUND((0.012 * dr.leverage_index_approx)::NUMERIC, 4)
    END AS wp_delta_if_success,
    ROUND((-0.0025 * dr.leverage_index_approx)::NUMERIC, 4) AS wp_delta_if_fail
  FROM decision_rows dr
)
SELECT
  team_id,
  CONCAT(MIN(g.season), '-', MAX(g.season)) AS season_window,
  COUNT(*) AS challenges_total,
  AVG((COALESCE(overturn_probability, 0.5) * wp_delta_if_success) + ((1 - COALESCE(overturn_probability, 0.5)) * wp_delta_if_fail))::NUMERIC AS avg_expected_wp_delta,
  AVG(CASE WHEN is_overturned THEN wp_delta_if_success ELSE wp_delta_if_fail END)::NUMERIC AS avg_realized_wp_delta,
  (
    AVG(CASE WHEN is_overturned THEN wp_delta_if_success ELSE wp_delta_if_fail END)
    - AVG((COALESCE(overturn_probability, 0.5) * wp_delta_if_success) + ((1 - COALESCE(overturn_probability, 0.5)) * wp_delta_if_fail))
  )::NUMERIC AS decision_surplus,
  AVG(
    CASE
      WHEN ((COALESCE(overturn_probability, 0.5) * wp_delta_if_success) + ((1 - COALESCE(overturn_probability, 0.5)) * wp_delta_if_fail))
           > CASE WHEN 1 = 1 THEN 0.0005 ELSE 0 END
      THEN 1 ELSE 0
    END
  )::NUMERIC AS challenge_recommendation_rate,
  AVG(
    CASE
      WHEN ((COALESCE(overturn_probability, 0.5) * wp_delta_if_success) + ((1 - COALESCE(overturn_probability, 0.5)) * wp_delta_if_fail))
           <= CASE WHEN 1 = 1 THEN 0.0005 ELSE 0 END
      THEN 1 ELSE 0
    END
  )::NUMERIC AS hold_recommendation_rate,
  AVG(
    CASE
      WHEN (CASE WHEN is_overturned THEN wp_delta_if_success ELSE wp_delta_if_fail END)
           >= ((COALESCE(overturn_probability, 0.5) * wp_delta_if_success) + ((1 - COALESCE(overturn_probability, 0.5)) * wp_delta_if_fail))
      THEN 1 ELSE 0
    END
  )::NUMERIC AS captured_value_share,
  AVG(
    CASE
      WHEN ((COALESCE(overturn_probability, 0.5) * wp_delta_if_success) + ((1 - COALESCE(overturn_probability, 0.5)) * wp_delta_if_fail)) <= 0
      THEN 1 ELSE 0
    END
  )::NUMERIC AS wasted_value_share,
  AVG(
    CASE
      WHEN dv.inning >= 7 OR ABS(COALESCE(dv.home_score, 0) - COALESCE(dv.away_score, 0)) <= 2 THEN
        ((COALESCE(overturn_probability, 0.5) * wp_delta_if_success) + ((1 - COALESCE(overturn_probability, 0.5)) * wp_delta_if_fail))
      ELSE NULL
    END
  )::NUMERIC AS high_pressure_expected_value,
  AVG(
    CASE
      WHEN dv.inning >= 7 AND ABS(COALESCE(dv.home_score, 0) - COALESCE(dv.away_score, 0)) <= 2 THEN
        ((COALESCE(overturn_probability, 0.5) * wp_delta_if_success) + ((1 - COALESCE(overturn_probability, 0.5)) * wp_delta_if_fail))
      ELSE NULL
    END
  )::NUMERIC AS late_close_expected_value,
  (
    ARRAY_AGG(decision_window_label ORDER BY ((COALESCE(overturn_probability, 0.5) * wp_delta_if_success) + ((1 - COALESCE(overturn_probability, 0.5)) * wp_delta_if_fail)) DESC, decision_window_label ASC)
    FILTER (WHERE decision_window_label IS NOT NULL)
  )[1] AS best_decision_window_label,
  MAX(((COALESCE(overturn_probability, 0.5) * wp_delta_if_success) + ((1 - COALESCE(overturn_probability, 0.5)) * wp_delta_if_fail)))::NUMERIC AS best_decision_window_expected_value,
  CASE
    WHEN COUNT(*) >= 80
         AND AVG(CASE WHEN success_we_delta IS NOT NULL THEN 1 ELSE 0 END) >= 0.6 THEN 'high'
    WHEN COUNT(*) >= 30
         AND AVG(CASE WHEN success_we_delta IS NOT NULL THEN 1 ELSE 0 END) >= 0.35 THEN 'medium'
    ELSE 'low'
  END AS confidence_band
FROM decision_value dv
JOIN games g ON g.game_pk = dv.game_pk
GROUP BY team_id;

CREATE OR REPLACE VIEW mart_team_challenge_run_value AS
SELECT
  c.challenge_team_id AS team_id,
  CONCAT(MIN(g.season), '-', MAX(g.season)) AS season_window,
  COUNT(*) AS challenges_total,
  AVG(c.challenge_team_run_expectancy_delta)::NUMERIC AS avg_re_delta,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY c.challenge_team_run_expectancy_delta)::NUMERIC AS median_re_delta,
  AVG(CASE WHEN c.challenge_team_run_expectancy_delta > 0 THEN 1 ELSE 0 END)::NUMERIC AS high_re_share,
  AVG(CASE WHEN c.challenge_team_run_expectancy_delta <= 0 THEN 1 ELSE 0 END)::NUMERIC AS low_re_burn_share,
  AVG(CASE WHEN c.inning >= 7 AND ABS(COALESCE(c.home_score, 0) - COALESCE(c.away_score, 0)) <= 2 THEN 1 ELSE 0 END)::NUMERIC AS late_close_re_share,
  CASE
    WHEN COUNT(*) >= 80 THEN 'high'
    WHEN COUNT(*) >= 25 THEN 'medium'
    ELSE 'low'
  END AS confidence_band
FROM mart_game_abs_challenge_values c
JOIN games g ON g.game_pk = c.game_pk
WHERE c.challenge_team_id IS NOT NULL
GROUP BY c.challenge_team_id;

CREATE OR REPLACE VIEW mart_team_challenge_win_value AS
SELECT
  c.challenge_team_id AS team_id,
  CONCAT(MIN(g.season), '-', MAX(g.season)) AS season_window,
  COUNT(*) AS challenges_total,
  AVG(c.challenge_team_win_expectancy_delta)::NUMERIC AS avg_we_delta,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY c.challenge_team_win_expectancy_delta)::NUMERIC AS median_we_delta,
  AVG(CASE WHEN c.challenge_team_win_expectancy_delta > 0 THEN 1 ELSE 0 END)::NUMERIC AS high_we_share,
  AVG(CASE WHEN c.challenge_team_win_expectancy_delta <= 0 THEN 1 ELSE 0 END)::NUMERIC AS low_we_burn_share,
  AVG(CASE WHEN c.inning >= 7 AND ABS(COALESCE(c.home_score, 0) - COALESCE(c.away_score, 0)) <= 2 THEN 1 ELSE 0 END)::NUMERIC AS late_close_we_share,
  CASE
    WHEN COUNT(*) >= 80
         AND AVG(CASE WHEN c.challenge_team_win_expectancy_delta IS NOT NULL THEN 1 ELSE 0 END) >= 0.6 THEN 'high'
    WHEN COUNT(*) >= 30
         AND AVG(CASE WHEN c.challenge_team_win_expectancy_delta IS NOT NULL THEN 1 ELSE 0 END) >= 0.35 THEN 'medium'
    ELSE 'low'
  END AS confidence_band
FROM mart_game_abs_challenge_values c
JOIN games g ON g.game_pk = c.game_pk
WHERE c.challenge_team_id IS NOT NULL
GROUP BY c.challenge_team_id;

CREATE OR REPLACE VIEW mart_team_challenge_decision_value AS
WITH challenge_rows AS (
  SELECT
    c.*,
    CASE
      WHEN c.bases_state = '111' THEN 'Bases Loaded'
      WHEN (c.bases_state IN ('011', '101', '110')) AND COALESCE(c.outs, 0) < 2 THEN 'RISP, <2 Outs'
      WHEN (c.bases_state IN ('011', '101', '110')) THEN 'RISP, 2 Outs'
      WHEN c.bases_state = '000' THEN 'Bases Empty'
      ELSE 'Runner On'
    END || ' • ' ||
    CASE
      WHEN c.held_terminal_type IS NOT NULL OR c.corrected_terminal_type IS NOT NULL THEN 'Terminal Count'
      WHEN c.impact_type = 'direct_count_impact' THEN 'Count Swing'
      WHEN c.impact_type = 'direct_ending_impact' THEN 'PA Ending'
      ELSE 'Challenge Window'
    END AS decision_window_label
  FROM mart_game_abs_challenge_values c
  WHERE c.challenge_team_id IS NOT NULL
)
SELECT
  cr.challenge_team_id AS team_id,
  CONCAT(MIN(g.season), '-', MAX(g.season)) AS season_window,
  COUNT(*) AS challenges_total,
  AVG(cr.expected_challenge_value)::NUMERIC AS avg_expected_wp_delta,
  AVG(CASE WHEN cr.is_overturned THEN cr.wp_delta_if_success ELSE cr.wp_delta_if_fail END)::NUMERIC AS avg_realized_wp_delta,
  (
    AVG(CASE WHEN cr.is_overturned THEN cr.wp_delta_if_success ELSE cr.wp_delta_if_fail END)
    - AVG(cr.expected_challenge_value)
  )::NUMERIC AS decision_surplus,
  AVG(CASE WHEN cr.expected_challenge_value > 0.0005 THEN 1 ELSE 0 END)::NUMERIC AS challenge_recommendation_rate,
  AVG(CASE WHEN cr.expected_challenge_value <= 0.0005 THEN 1 ELSE 0 END)::NUMERIC AS hold_recommendation_rate,
  AVG(CASE WHEN (CASE WHEN cr.is_overturned THEN cr.wp_delta_if_success ELSE cr.wp_delta_if_fail END) >= cr.expected_challenge_value THEN 1 ELSE 0 END)::NUMERIC AS captured_value_share,
  AVG(CASE WHEN cr.expected_challenge_value <= 0 THEN 1 ELSE 0 END)::NUMERIC AS wasted_value_share,
  AVG(CASE WHEN cr.inning >= 7 OR ABS(COALESCE(cr.home_score, 0) - COALESCE(cr.away_score, 0)) <= 2 THEN cr.expected_challenge_value ELSE NULL END)::NUMERIC AS high_pressure_expected_value,
  AVG(CASE WHEN cr.inning >= 7 AND ABS(COALESCE(cr.home_score, 0) - COALESCE(cr.away_score, 0)) <= 2 THEN cr.expected_challenge_value ELSE NULL END)::NUMERIC AS late_close_expected_value,
  (
    ARRAY_AGG(cr.decision_window_label ORDER BY cr.expected_challenge_value DESC NULLS LAST, cr.decision_window_label ASC)
    FILTER (WHERE cr.decision_window_label IS NOT NULL)
  )[1] AS best_decision_window_label,
  MAX(cr.expected_challenge_value)::NUMERIC AS best_decision_window_expected_value,
  CASE
    WHEN COUNT(*) >= 80
         AND AVG(CASE WHEN cr.decision_value_mode = 'win_expectancy' THEN 1 ELSE 0 END) >= 0.6 THEN 'high'
    WHEN COUNT(*) >= 30
         AND AVG(CASE WHEN cr.decision_value_mode = 'win_expectancy' THEN 1 ELSE 0 END) >= 0.35 THEN 'medium'
    ELSE 'low'
  END AS confidence_band
FROM challenge_rows cr
JOIN games g ON g.game_pk = cr.game_pk
GROUP BY cr.challenge_team_id;

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
LEFT JOIN mart_abs_pitch_challenges c ON c.game_pk = g.game_pk
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
LEFT JOIN mart_abs_pitch_challenges c ON c.game_pk = g.game_pk
LEFT JOIN mart_daily_editorial_summary daily ON daily.summary_date = g.game_date::date
GROUP BY DATE_TRUNC('week', g.game_date AT TIME ZONE 'UTC')::date;
