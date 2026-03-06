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
  c.px,
  c.pz,
  c.strike_zone_top,
  c.strike_zone_bottom,
  c.challenged_at,
  hp.official_id AS home_plate_umpire_id,
  hp.official_name AS home_plate_umpire_name
FROM abs_challenges c
JOIN games g ON g.game_pk = c.game_pk
LEFT JOIN teams t ON t.team_id = c.challenge_team_id
LEFT JOIN teams home ON home.team_id = g.home_team_id
LEFT JOIN teams away ON away.team_id = g.away_team_id
LEFT JOIN officials hp ON hp.game_pk = g.game_pk AND hp.official_type = 'Home Plate';

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
  outs
FROM abs_challenges
ORDER BY game_pk, challenged_at;
