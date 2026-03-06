CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS teams (
  team_id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  abbreviation TEXT NOT NULL,
  primary_color TEXT NOT NULL,
  secondary_color TEXT NOT NULL,
  logo_svg_url TEXT NOT NULL,
  league_name TEXT,
  division_name TEXT
);

CREATE TABLE IF NOT EXISTS games (
  game_pk BIGINT PRIMARY KEY,
  game_date TIMESTAMPTZ NOT NULL,
  game_type TEXT NOT NULL,
  season INTEGER NOT NULL,
  status_abstract TEXT NOT NULL,
  status_detailed TEXT,
  home_team_id INTEGER NOT NULL,
  away_team_id INTEGER NOT NULL,
  home_score INTEGER,
  away_score INTEGER,
  venue_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS officials (
  game_pk BIGINT NOT NULL REFERENCES games(game_pk) ON DELETE CASCADE,
  official_id BIGINT NOT NULL,
  official_name TEXT NOT NULL,
  official_type TEXT NOT NULL,
  PRIMARY KEY (game_pk, official_id, official_type)
);

CREATE TABLE IF NOT EXISTS at_bats (
  game_pk BIGINT NOT NULL REFERENCES games(game_pk) ON DELETE CASCADE,
  at_bat_index INTEGER NOT NULL,
  inning INTEGER NOT NULL,
  half_inning TEXT NOT NULL,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  batter_id BIGINT,
  batter_name TEXT,
  pitcher_id BIGINT,
  pitcher_name TEXT,
  event_type TEXT,
  event_description TEXT,
  balls INTEGER,
  strikes INTEGER,
  outs INTEGER,
  is_complete BOOLEAN DEFAULT FALSE,
  is_scoring_play BOOLEAN DEFAULT FALSE,
  PRIMARY KEY (game_pk, at_bat_index)
);

CREATE TABLE IF NOT EXISTS pitches (
  game_pk BIGINT NOT NULL REFERENCES games(game_pk) ON DELETE CASCADE,
  at_bat_index INTEGER NOT NULL,
  pitch_number INTEGER NOT NULL,
  called_code TEXT,
  called_description TEXT,
  is_ball BOOLEAN,
  is_strike BOOLEAN,
  pitch_type_code TEXT,
  pitch_type_description TEXT,
  start_speed NUMERIC,
  end_speed NUMERIC,
  spin_rate NUMERIC,
  px NUMERIC,
  pz NUMERIC,
  strike_zone_top NUMERIC,
  strike_zone_bottom NUMERIC,
  zone INTEGER,
  has_review BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (game_pk, at_bat_index, pitch_number),
  FOREIGN KEY (game_pk, at_bat_index) REFERENCES at_bats(game_pk, at_bat_index) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS abs_challenges (
  challenge_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dedupe_key TEXT UNIQUE NOT NULL,
  game_pk BIGINT NOT NULL REFERENCES games(game_pk) ON DELETE CASCADE,
  at_bat_index INTEGER NOT NULL,
  pitch_number INTEGER,
  challenge_level TEXT NOT NULL,
  challenge_team_id INTEGER,
  challenge_team_side TEXT,
  challenge_player_id BIGINT,
  challenge_player_name TEXT,
  is_overturned BOOLEAN NOT NULL,
  review_type TEXT,
  in_progress BOOLEAN DEFAULT FALSE,
  called_code TEXT,
  called_description TEXT,
  inning INTEGER,
  half_inning TEXT,
  balls INTEGER,
  strikes INTEGER,
  outs INTEGER,
  batter_id BIGINT,
  batter_name TEXT,
  pitcher_id BIGINT,
  pitcher_name TEXT,
  home_score INTEGER,
  away_score INTEGER,
  bases_state TEXT,
  px NUMERIC,
  pz NUMERIC,
  strike_zone_top NUMERIC,
  strike_zone_bottom NUMERIC,
  challenged_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (game_pk, at_bat_index) REFERENCES at_bats(game_pk, at_bat_index) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS game_state_snapshots (
  game_pk BIGINT NOT NULL REFERENCES games(game_pk) ON DELETE CASCADE,
  snapshot_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  inning INTEGER,
  half_inning TEXT,
  balls INTEGER,
  strikes INTEGER,
  outs INTEGER,
  home_score INTEGER,
  away_score INTEGER,
  abs_away_used_successful INTEGER,
  abs_away_used_failed INTEGER,
  abs_away_remaining INTEGER,
  abs_home_used_successful INTEGER,
  abs_home_used_failed INTEGER,
  abs_home_remaining INTEGER,
  PRIMARY KEY (game_pk, snapshot_time)
);

CREATE TABLE IF NOT EXISTS team_abs_game_summary (
  game_pk BIGINT NOT NULL REFERENCES games(game_pk) ON DELETE CASCADE,
  team_id INTEGER NOT NULL,
  team_side TEXT NOT NULL,
  used_successful INTEGER NOT NULL DEFAULT 0,
  used_failed INTEGER NOT NULL DEFAULT 0,
  remaining INTEGER NOT NULL DEFAULT 0,
  challenges_total INTEGER GENERATED ALWAYS AS (used_successful + used_failed) STORED,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (game_pk, team_id)
);

CREATE TABLE IF NOT EXISTS umpire_abs_game_summary (
  game_pk BIGINT NOT NULL REFERENCES games(game_pk) ON DELETE CASCADE,
  umpire_id BIGINT NOT NULL,
  umpire_name TEXT NOT NULL,
  challenged_calls INTEGER NOT NULL DEFAULT 0,
  overturned_calls INTEGER NOT NULL DEFAULT 0,
  confirmed_calls INTEGER NOT NULL DEFAULT 0,
  overturn_rate NUMERIC GENERATED ALWAYS AS (
    CASE WHEN challenged_calls > 0 THEN overturned_calls::NUMERIC / challenged_calls ELSE 0 END
  ) STORED,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (game_pk, umpire_id)
);

CREATE TABLE IF NOT EXISTS game_reports (
  game_pk BIGINT PRIMARY KEY REFERENCES games(game_pk) ON DELETE CASCADE,
  model_name TEXT,
  narrative_md TEXT NOT NULL,
  chart_spec JSONB,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source_window_start TIMESTAMPTZ,
  source_window_end TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS etl_runs (
  run_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_type TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'running',
  details JSONB,
  rows_written INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS ingest_errors (
  error_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID REFERENCES etl_runs(run_id) ON DELETE SET NULL,
  game_pk BIGINT,
  stage TEXT NOT NULL,
  error_message TEXT NOT NULL,
  payload JSONB,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_games_date ON games (game_date DESC);
CREATE INDEX IF NOT EXISTS idx_games_status ON games (status_abstract);
CREATE INDEX IF NOT EXISTS idx_abs_challenges_game ON abs_challenges (game_pk, challenged_at DESC);
CREATE INDEX IF NOT EXISTS idx_abs_challenges_team ON abs_challenges (challenge_team_id, challenged_at DESC);
CREATE INDEX IF NOT EXISTS idx_abs_challenges_umpire_context ON abs_challenges (inning, half_inning);
CREATE INDEX IF NOT EXISTS idx_pitches_game_atbat ON pitches (game_pk, at_bat_index);
CREATE INDEX IF NOT EXISTS idx_team_summary_team ON team_abs_game_summary (team_id, game_pk);
CREATE INDEX IF NOT EXISTS idx_umpire_summary_umpire ON umpire_abs_game_summary (umpire_id, game_pk);

CREATE OR REPLACE FUNCTION touch_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_games_touch ON games;
CREATE TRIGGER trg_games_touch BEFORE UPDATE ON games FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS trg_team_summary_touch ON team_abs_game_summary;
CREATE TRIGGER trg_team_summary_touch BEFORE UPDATE ON team_abs_game_summary FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS trg_umpire_summary_touch ON umpire_abs_game_summary;
CREATE TRIGGER trg_umpire_summary_touch BEFORE UPDATE ON umpire_abs_game_summary FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
