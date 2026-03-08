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

ALTER TABLE at_bats
  ADD COLUMN IF NOT EXISTS bases_state_start TEXT,
  ADD COLUMN IF NOT EXISTS bases_state_end TEXT,
  ADD COLUMN IF NOT EXISTS home_score_start INTEGER,
  ADD COLUMN IF NOT EXISTS away_score_start INTEGER,
  ADD COLUMN IF NOT EXISTS home_score_end INTEGER,
  ADD COLUMN IF NOT EXISTS away_score_end INTEGER;

CREATE TABLE IF NOT EXISTS play_events (
  game_pk BIGINT NOT NULL REFERENCES games(game_pk) ON DELETE CASCADE,
  at_bat_index INTEGER NOT NULL,
  play_event_index INTEGER NOT NULL,
  pitch_number INTEGER,
  inning INTEGER NOT NULL,
  half_inning TEXT NOT NULL,
  batter_id BIGINT,
  batter_name TEXT,
  pitcher_id BIGINT,
  pitcher_name TEXT,
  event_type TEXT,
  event_code TEXT,
  description TEXT,
  is_pitch BOOLEAN NOT NULL DEFAULT FALSE,
  is_in_play BOOLEAN NOT NULL DEFAULT FALSE,
  has_review BOOLEAN NOT NULL DEFAULT FALSE,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  balls_before INTEGER,
  strikes_before INTEGER,
  outs_before INTEGER,
  balls_after INTEGER,
  strikes_after INTEGER,
  outs_after INTEGER,
  bases_state_before TEXT,
  bases_state_after TEXT,
  home_score_before INTEGER,
  away_score_before INTEGER,
  home_score_after INTEGER,
  away_score_after INTEGER,
  raw_payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (game_pk, at_bat_index, play_event_index),
  FOREIGN KEY (game_pk, at_bat_index) REFERENCES at_bats(game_pk, at_bat_index) ON DELETE CASCADE
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

ALTER TABLE pitches
  ADD COLUMN IF NOT EXISTS play_event_index INTEGER,
  ADD COLUMN IF NOT EXISTS inning INTEGER,
  ADD COLUMN IF NOT EXISTS half_inning TEXT,
  ADD COLUMN IF NOT EXISTS batter_id BIGINT,
  ADD COLUMN IF NOT EXISTS batter_name TEXT,
  ADD COLUMN IF NOT EXISTS pitcher_id BIGINT,
  ADD COLUMN IF NOT EXISTS pitcher_name TEXT,
  ADD COLUMN IF NOT EXISTS play_description TEXT,
  ADD COLUMN IF NOT EXISTS is_in_play BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS ended_plate_appearance BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS balls_before INTEGER,
  ADD COLUMN IF NOT EXISTS strikes_before INTEGER,
  ADD COLUMN IF NOT EXISTS outs_before INTEGER,
  ADD COLUMN IF NOT EXISTS balls_after INTEGER,
  ADD COLUMN IF NOT EXISTS strikes_after INTEGER,
  ADD COLUMN IF NOT EXISTS outs_after INTEGER,
  ADD COLUMN IF NOT EXISTS bases_state_before TEXT,
  ADD COLUMN IF NOT EXISTS bases_state_after TEXT,
  ADD COLUMN IF NOT EXISTS home_score_before INTEGER,
  ADD COLUMN IF NOT EXISTS away_score_before INTEGER,
  ADD COLUMN IF NOT EXISTS home_score_after INTEGER,
  ADD COLUMN IF NOT EXISTS away_score_after INTEGER,
  ADD COLUMN IF NOT EXISTS gameday_x NUMERIC,
  ADD COLUMN IF NOT EXISTS gameday_y NUMERIC;

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

ALTER TABLE abs_challenges
  ADD COLUMN IF NOT EXISTS gameday_x NUMERIC,
  ADD COLUMN IF NOT EXISTS gameday_y NUMERIC,
  ADD COLUMN IF NOT EXISTS inferred_pitch_number INTEGER,
  ADD COLUMN IF NOT EXISTS inferred_play_event_index INTEGER,
  ADD COLUMN IF NOT EXISTS inferred_px NUMERIC,
  ADD COLUMN IF NOT EXISTS inferred_pz NUMERIC,
  ADD COLUMN IF NOT EXISTS inferred_strike_zone_top NUMERIC,
  ADD COLUMN IF NOT EXISTS inferred_strike_zone_bottom NUMERIC,
  ADD COLUMN IF NOT EXISTS inferred_zone INTEGER,
  ADD COLUMN IF NOT EXISTS inferred_gameday_x NUMERIC,
  ADD COLUMN IF NOT EXISTS inferred_gameday_y NUMERIC,
  ADD COLUMN IF NOT EXISTS inference_method TEXT,
  ADD COLUMN IF NOT EXISTS inference_confidence TEXT,
  ADD COLUMN IF NOT EXISTS location_source TEXT;

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
CREATE INDEX IF NOT EXISTS idx_pitches_game_context ON pitches (game_pk, inning, half_inning, at_bat_index, pitch_number);
CREATE INDEX IF NOT EXISTS idx_pitches_game_matchup ON pitches (game_pk, batter_id, pitcher_id);
CREATE INDEX IF NOT EXISTS idx_play_events_game_atbat ON play_events (game_pk, at_bat_index, play_event_index);
CREATE INDEX IF NOT EXISTS idx_play_events_game_pitch ON play_events (game_pk, pitch_number);
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

CREATE SCHEMA IF NOT EXISTS product;
CREATE SCHEMA IF NOT EXISTS community;
CREATE SCHEMA IF NOT EXISTS editorial;
CREATE SCHEMA IF NOT EXISTS ai;
CREATE SCHEMA IF NOT EXISTS ops;

CREATE TABLE IF NOT EXISTS product.users (
  user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_auth_provider TEXT NOT NULL DEFAULT 'clerk',
  external_auth_id TEXT NOT NULL,
  primary_email TEXT,
  display_name TEXT,
  avatar_url TEXT,
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  verified_at TIMESTAMPTZ,
  last_seen_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (external_auth_provider, external_auth_id)
);

CREATE TABLE IF NOT EXISTS product.user_profiles (
  user_id UUID PRIMARY KEY REFERENCES product.users(user_id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  bio TEXT,
  avatar_preset TEXT,
  favorite_team_id INTEGER REFERENCES teams(team_id) ON DELETE SET NULL,
  favorite_umpire_id BIGINT,
  is_public BOOLEAN NOT NULL DEFAULT TRUE,
  posting_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  ai_history_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  ai_strike_count INTEGER NOT NULL DEFAULT 0,
  ai_suspended_until TIMESTAMPTZ,
  ai_banned_at TIMESTAMPTZ,
  last_ai_misuse_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT username_format CHECK (username IS NULL OR username ~ '^[a-z0-9_]{3,32}$')
);

ALTER TABLE product.users ADD COLUMN IF NOT EXISTS is_verified BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE product.users ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;
ALTER TABLE product.user_profiles ADD COLUMN IF NOT EXISTS avatar_preset TEXT;
ALTER TABLE product.user_profiles ADD COLUMN IF NOT EXISTS ai_strike_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE product.user_profiles ADD COLUMN IF NOT EXISTS ai_suspended_until TIMESTAMPTZ;
ALTER TABLE product.user_profiles ADD COLUMN IF NOT EXISTS ai_banned_at TIMESTAMPTZ;
ALTER TABLE product.user_profiles ADD COLUMN IF NOT EXISTS last_ai_misuse_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS product.user_roles (
  user_id UUID NOT NULL REFERENCES product.users(user_id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, role),
  CONSTRAINT product_user_roles_role_check CHECK (role IN ('user', 'moderator', 'admin'))
);

CREATE TABLE IF NOT EXISTS product.organizations (
  organization_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_org_id TEXT UNIQUE,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT product_organizations_status_check CHECK (status IN ('active', 'disabled'))
);

CREATE TABLE IF NOT EXISTS product.organization_memberships (
  organization_id UUID NOT NULL REFERENCES product.organizations(organization_id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES product.users(user_id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (organization_id, user_id),
  CONSTRAINT organization_memberships_role_check CHECK (role IN ('member', 'admin'))
);

CREATE TABLE IF NOT EXISTS editorial.articles (
  article_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  article_type TEXT NOT NULL DEFAULT 'game_daily',
  status TEXT NOT NULL DEFAULT 'draft',
  game_pk BIGINT REFERENCES games(game_pk) ON DELETE SET NULL,
  source_date DATE,
  title TEXT NOT NULL,
  author_name TEXT,
  dek TEXT,
  body_md TEXT NOT NULL,
  published_at TIMESTAMPTZ,
  scheduled_publish_at TIMESTAMPTZ,
  generation_model TEXT,
  generation_payload JSONB,
  evidence_payload JSONB,
  facts_payload JSONB,
  derived_metrics_payload JSONB,
  hypothesis_payload JSONB,
  validation_state TEXT NOT NULL DEFAULT 'pending',
  created_by_user_id UUID REFERENCES product.users(user_id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT editorial_articles_type_check CHECK (article_type IN ('game_daily', 'feature', 'analysis', 'daily_auto', 'weekly_editorial')),
  CONSTRAINT editorial_articles_status_check CHECK (status IN ('draft', 'generated', 'published', 'suppressed', 'failed')),
  CONSTRAINT editorial_articles_validation_state_check CHECK (validation_state IN ('pending', 'passed', 'failed'))
);

ALTER TABLE editorial.articles
  ADD COLUMN IF NOT EXISTS source_date DATE,
  ADD COLUMN IF NOT EXISTS author_name TEXT,
  ADD COLUMN IF NOT EXISTS scheduled_publish_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS facts_payload JSONB,
  ADD COLUMN IF NOT EXISTS derived_metrics_payload JSONB,
  ADD COLUMN IF NOT EXISTS hypothesis_payload JSONB,
  ADD COLUMN IF NOT EXISTS validation_state TEXT NOT NULL DEFAULT 'pending';

ALTER TABLE editorial.articles DROP CONSTRAINT IF EXISTS editorial_articles_type_check;
ALTER TABLE editorial.articles
  ADD CONSTRAINT editorial_articles_type_check
  CHECK (article_type IN ('game_daily', 'feature', 'analysis', 'daily_auto', 'weekly_editorial'));

ALTER TABLE editorial.articles DROP CONSTRAINT IF EXISTS editorial_articles_status_check;
ALTER TABLE editorial.articles
  ADD CONSTRAINT editorial_articles_status_check
  CHECK (status IN ('draft', 'generated', 'published', 'suppressed', 'failed'));

ALTER TABLE editorial.articles DROP CONSTRAINT IF EXISTS editorial_articles_validation_state_check;
ALTER TABLE editorial.articles
  ADD CONSTRAINT editorial_articles_validation_state_check
  CHECK (validation_state IN ('pending', 'passed', 'failed'));

CREATE TABLE IF NOT EXISTS editorial.article_sections (
  section_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID NOT NULL REFERENCES editorial.articles(article_id) ON DELETE CASCADE,
  section_key TEXT NOT NULL,
  section_kind TEXT NOT NULL DEFAULT 'fact',
  heading TEXT NOT NULL,
  body_md TEXT NOT NULL,
  section_order INTEGER NOT NULL DEFAULT 0,
  evidence_payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (article_id, section_key),
  CONSTRAINT editorial_article_sections_kind_check CHECK (section_kind IN ('fact', 'derived_metric', 'hypothesis'))
);

ALTER TABLE editorial.article_sections
  ADD COLUMN IF NOT EXISTS section_kind TEXT NOT NULL DEFAULT 'fact';

ALTER TABLE editorial.article_sections DROP CONSTRAINT IF EXISTS editorial_article_sections_kind_check;
ALTER TABLE editorial.article_sections
  ADD CONSTRAINT editorial_article_sections_kind_check
  CHECK (section_kind IN ('fact', 'derived_metric', 'hypothesis'));

CREATE TABLE IF NOT EXISTS editorial.article_revisions (
  revision_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID NOT NULL REFERENCES editorial.articles(article_id) ON DELETE CASCADE,
  revision_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  dek TEXT,
  body_md TEXT NOT NULL,
  facts_payload JSONB,
  derived_metrics_payload JSONB,
  hypothesis_payload JSONB,
  revision_note TEXT,
  created_by_user_id UUID REFERENCES product.users(user_id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (article_id, revision_number)
);

CREATE TABLE IF NOT EXISTS editorial.article_evidence_blobs (
  evidence_blob_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID NOT NULL REFERENCES editorial.articles(article_id) ON DELETE CASCADE,
  section_id UUID REFERENCES editorial.article_sections(section_id) ON DELETE CASCADE,
  evidence_kind TEXT NOT NULL,
  label TEXT NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT editorial_article_evidence_kind_check CHECK (evidence_kind IN ('fact', 'derived_metric', 'hypothesis', 'snapshot'))
);

CREATE TABLE IF NOT EXISTS editorial.generation_runs (
  generation_run_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_run_id UUID,
  article_id UUID REFERENCES editorial.articles(article_id) ON DELETE SET NULL,
  article_type TEXT NOT NULL,
  source_date DATE,
  status TEXT NOT NULL DEFAULT 'queued',
  selected_author TEXT,
  story_theme TEXT,
  validation_state TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  context_payload JSONB,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT editorial_generation_runs_status_check CHECK (status IN ('queued', 'running', 'failed', 'validated', 'persisted')),
  CONSTRAINT editorial_generation_runs_validation_state_check CHECK (validation_state IN ('pending', 'passed', 'failed'))
);

CREATE TABLE IF NOT EXISTS editorial.generation_steps (
  generation_step_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  generation_run_id UUID NOT NULL REFERENCES editorial.generation_runs(generation_run_id) ON DELETE CASCADE,
  step_key TEXT NOT NULL,
  agent_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued',
  model_name TEXT,
  conversation_id UUID,
  input_payload JSONB,
  output_payload JSONB,
  error_message TEXT,
  tool_call_count INTEGER NOT NULL DEFAULT 0,
  prompt_tokens INTEGER,
  completion_tokens INTEGER,
  cost_usd NUMERIC,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT editorial_generation_steps_key_check CHECK (
    step_key IN ('scout_brief', 'telemetry_research', 'author_draft', 'editor_validation', 'persist_article')
  ),
  CONSTRAINT editorial_generation_steps_status_check CHECK (status IN ('queued', 'running', 'success', 'failed', 'skipped')),
  UNIQUE (generation_run_id, step_key)
);

CREATE TABLE IF NOT EXISTS editorial.article_contributors (
  article_contributor_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID NOT NULL REFERENCES editorial.articles(article_id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL,
  contributor_type TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 1,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT editorial_article_contributors_type_check CHECK (contributor_type IN ('author', 'analyst', 'source'))
);

CREATE TABLE IF NOT EXISTS editorial.standings_snapshots (
  snapshot_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_date DATE NOT NULL,
  league_id INTEGER NOT NULL,
  division_id INTEGER,
  team_id INTEGER NOT NULL REFERENCES teams(team_id) ON DELETE CASCADE,
  wins INTEGER NOT NULL DEFAULT 0,
  losses INTEGER NOT NULL DEFAULT 0,
  pct NUMERIC,
  games_back TEXT,
  wild_card_rank INTEGER,
  division_rank INTEGER,
  raw_payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (snapshot_date, league_id, team_id)
);

CREATE TABLE IF NOT EXISTS community.threads (
  thread_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  article_id UUID REFERENCES editorial.articles(article_id) ON DELETE CASCADE,
  challenge_id UUID REFERENCES abs_challenges(challenge_id) ON DELETE CASCADE,
  game_pk BIGINT REFERENCES games(game_pk) ON DELETE CASCADE,
  at_bat_index INTEGER,
  pitch_number INTEGER,
  title TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT community_threads_type_check CHECK (thread_type IN ('article', 'challenge')),
  CONSTRAINT community_threads_status_check CHECK (status IN ('open', 'locked', 'hidden')),
  CONSTRAINT community_threads_anchor_check CHECK (
    (thread_type = 'article' AND article_id IS NOT NULL AND challenge_id IS NULL) OR
    (thread_type = 'challenge' AND challenge_id IS NOT NULL AND article_id IS NULL)
  )
);

CREATE TABLE IF NOT EXISTS community.comments (
  comment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES community.threads(thread_id) ON DELETE CASCADE,
  user_id UUID REFERENCES product.users(user_id) ON DELETE SET NULL,
  parent_comment_id UUID REFERENCES community.comments(comment_id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  structured_reaction TEXT,
  moderation_status TEXT NOT NULL DEFAULT 'published',
  toxicity_score NUMERIC,
  edited_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT community_comments_status_check CHECK (moderation_status IN ('published', 'pending_review', 'hidden', 'deleted'))
);

ALTER TABLE community.comments ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE community.comments DROP CONSTRAINT IF EXISTS comments_user_id_fkey;
ALTER TABLE community.comments
  ADD CONSTRAINT comments_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES product.users(user_id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS community.comment_reports (
  report_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES community.comments(comment_id) ON DELETE CASCADE,
  reported_by_user_id UUID REFERENCES product.users(user_id) ON DELETE SET NULL,
  reason TEXT NOT NULL,
  details TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT community_comment_reports_status_check CHECK (status IN ('open', 'reviewed', 'dismissed', 'actioned'))
);

CREATE TABLE IF NOT EXISTS community.moderation_actions (
  action_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id UUID REFERENCES product.users(user_id) ON DELETE SET NULL,
  comment_id UUID REFERENCES community.comments(comment_id) ON DELETE SET NULL,
  target_user_id UUID REFERENCES product.users(user_id) ON DELETE SET NULL,
  action_type TEXT NOT NULL,
  reason TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT moderation_actions_type_check CHECK (
    action_type IN ('hide_comment', 'restore_comment', 'lock_thread', 'unlock_thread', 'warn_user', 'suspend_user')
  )
);

CREATE TABLE IF NOT EXISTS ai.conversations (
  conversation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES product.users(user_id) ON DELETE SET NULL,
  route_scope TEXT NOT NULL DEFAULT 'global',
  route_entity_id TEXT,
  title TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ai_conversations_scope_check CHECK (route_scope IN ('global', 'game', 'team', 'umpire', 'article')),
  CONSTRAINT ai_conversations_status_check CHECK (status IN ('active', 'archived'))
);

CREATE TABLE IF NOT EXISTS ai.messages (
  message_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES ai.conversations(conversation_id) ON DELETE CASCADE,
  user_id UUID REFERENCES product.users(user_id) ON DELETE SET NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ai_messages_role_check CHECK (role IN ('user', 'assistant', 'system'))
);

CREATE TABLE IF NOT EXISTS ai.tool_calls (
  tool_call_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES ai.conversations(conversation_id) ON DELETE CASCADE,
  message_id UUID REFERENCES ai.messages(message_id) ON DELETE SET NULL,
  tool_name TEXT NOT NULL,
  arguments_json JSONB,
  result_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai.safety_events (
  safety_event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES ai.conversations(conversation_id) ON DELETE SET NULL,
  message_id UUID REFERENCES ai.messages(message_id) ON DELETE SET NULL,
  disposition TEXT NOT NULL,
  reason TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ai_safety_events_disposition_check CHECK (disposition IN ('allowed', 'blocked', 'review'))
);

CREATE TABLE IF NOT EXISTS ai.cost_events (
  cost_event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES ai.conversations(conversation_id) ON DELETE SET NULL,
  message_id UUID REFERENCES ai.messages(message_id) ON DELETE SET NULL,
  model_name TEXT NOT NULL,
  input_tokens INTEGER,
  output_tokens INTEGER,
  estimated_cost_usd NUMERIC,
  latency_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai.user_entitlements (
  user_id UUID PRIMARY KEY REFERENCES product.users(user_id) ON DELETE CASCADE,
  plan_code TEXT NOT NULL DEFAULT 'free',
  ai_requests_per_day INTEGER NOT NULL DEFAULT 8,
  ai_tokens_per_month INTEGER NOT NULL DEFAULT 25000,
  ai_cost_usd_per_month NUMERIC NOT NULL DEFAULT 5,
  feature_flags JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ai_user_entitlements_plan_check CHECK (plan_code IN ('free', 'tier1', 'tier2', 'tier3'))
);

CREATE TABLE IF NOT EXISTS ai.usage_ledger (
  usage_ledger_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES product.users(user_id) ON DELETE SET NULL,
  conversation_id UUID REFERENCES ai.conversations(conversation_id) ON DELETE SET NULL,
  message_id UUID REFERENCES ai.messages(message_id) ON DELETE SET NULL,
  plan_code TEXT NOT NULL,
  feature_key TEXT NOT NULL,
  model_name TEXT NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 1,
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  total_tokens INTEGER NOT NULL DEFAULT 0,
  estimated_cost_usd NUMERIC NOT NULL DEFAULT 0,
  usage_day DATE NOT NULL DEFAULT CURRENT_DATE,
  usage_month DATE NOT NULL DEFAULT DATE_TRUNC('month', CURRENT_TIMESTAMP AT TIME ZONE 'UTC')::date,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ai_usage_ledger_plan_check CHECK (plan_code IN ('free', 'tier1', 'tier2', 'tier3'))
);

CREATE TABLE IF NOT EXISTS ops.audit_log (
  audit_log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id UUID REFERENCES product.users(user_id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ops.rate_limit_events (
  event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_key TEXT NOT NULL,
  subject_type TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  window_seconds INTEGER NOT NULL,
  request_count INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ops.webhook_deliveries (
  webhook_delivery_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL,
  delivery_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload_hash TEXT,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB,
  CONSTRAINT ops_webhook_deliveries_provider_delivery_unique UNIQUE (provider, delivery_id)
);

CREATE TABLE IF NOT EXISTS ops.job_runs (
  job_run_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name TEXT NOT NULL,
  queue_class TEXT NOT NULL DEFAULT 'backfill',
  job_type TEXT NOT NULL DEFAULT 'backfill',
  owner_user_id UUID REFERENCES product.users(user_id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'queued',
  payload JSONB,
  result JSONB,
  metadata JSONB,
  error_message TEXT,
  idempotency_key TEXT,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  run_after TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  locked_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  CONSTRAINT ops_job_runs_status_check CHECK (status IN ('queued', 'running', 'success', 'failed')),
  CONSTRAINT ops_job_runs_queue_class_check CHECK (
    queue_class IN ('live_read', 'comment_write', 'ai_interactive', 'article_generation', 'enrichment', 'backfill')
  )
);

ALTER TABLE ops.job_runs ADD COLUMN IF NOT EXISTS queue_class TEXT NOT NULL DEFAULT 'backfill';
ALTER TABLE ops.job_runs ADD COLUMN IF NOT EXISTS job_type TEXT NOT NULL DEFAULT 'backfill';
ALTER TABLE ops.job_runs ADD COLUMN IF NOT EXISTS owner_user_id UUID REFERENCES product.users(user_id) ON DELETE SET NULL;
ALTER TABLE ops.job_runs ADD COLUMN IF NOT EXISTS payload JSONB;
ALTER TABLE ops.job_runs ADD COLUMN IF NOT EXISTS result JSONB;
ALTER TABLE ops.job_runs ADD COLUMN IF NOT EXISTS error_message TEXT;
ALTER TABLE ops.job_runs ADD COLUMN IF NOT EXISTS idempotency_key TEXT;
ALTER TABLE ops.job_runs ADD COLUMN IF NOT EXISTS attempt_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE ops.job_runs ADD COLUMN IF NOT EXISTS run_after TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE ops.job_runs ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ;
ALTER TABLE ops.job_runs ALTER COLUMN status SET DEFAULT 'queued';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ops_job_runs_status_check'
      AND conrelid = 'ops.job_runs'::regclass
  ) THEN
    ALTER TABLE ops.job_runs DROP CONSTRAINT ops_job_runs_status_check;
  END IF;
END $$;

ALTER TABLE ops.job_runs
  ADD CONSTRAINT ops_job_runs_status_check CHECK (status IN ('queued', 'running', 'success', 'failed'));

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ops_job_runs_queue_class_check'
      AND conrelid = 'ops.job_runs'::regclass
  ) THEN
    ALTER TABLE ops.job_runs DROP CONSTRAINT ops_job_runs_queue_class_check;
  END IF;
END $$;

ALTER TABLE ops.job_runs
  ADD CONSTRAINT ops_job_runs_queue_class_check CHECK (
    queue_class IN ('live_read', 'comment_write', 'ai_interactive', 'article_generation', 'enrichment', 'backfill')
  );

ALTER TABLE editorial.generation_runs DROP CONSTRAINT IF EXISTS editorial_generation_runs_job_run_fkey;
ALTER TABLE editorial.generation_runs
  ADD CONSTRAINT editorial_generation_runs_job_run_fkey
  FOREIGN KEY (job_run_id) REFERENCES ops.job_runs(job_run_id) ON DELETE CASCADE;

ALTER TABLE editorial.generation_steps DROP CONSTRAINT IF EXISTS editorial_generation_steps_conversation_fkey;
ALTER TABLE editorial.generation_steps
  ADD CONSTRAINT editorial_generation_steps_conversation_fkey
  FOREIGN KEY (conversation_id) REFERENCES ai.conversations(conversation_id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS ops.source_snapshots (
  snapshot_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_name TEXT NOT NULL,
  entity_key TEXT NOT NULL,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  payload_hash TEXT NOT NULL,
  payload JSONB NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_product_users_external_auth ON product.users (external_auth_provider, external_auth_id);
CREATE INDEX IF NOT EXISTS idx_product_profiles_favorite_team ON product.user_profiles (favorite_team_id);
CREATE INDEX IF NOT EXISTS idx_editorial_articles_status_published ON editorial.articles (status, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_editorial_articles_game_pk ON editorial.articles (game_pk);
CREATE INDEX IF NOT EXISTS idx_editorial_articles_source_date ON editorial.articles (source_date, article_type);
CREATE INDEX IF NOT EXISTS idx_editorial_article_revisions_article ON editorial.article_revisions (article_id, revision_number DESC);
CREATE INDEX IF NOT EXISTS idx_editorial_article_evidence_article ON editorial.article_evidence_blobs (article_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_editorial_generation_runs_status ON editorial.generation_runs (status, source_date DESC, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_editorial_generation_runs_job_run ON editorial.generation_runs (job_run_id) WHERE job_run_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_editorial_generation_steps_run ON editorial.generation_steps (generation_run_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_editorial_article_contributors_article ON editorial.article_contributors (article_id, sort_order ASC);
CREATE INDEX IF NOT EXISTS idx_editorial_standings_snapshots_date ON editorial.standings_snapshots (snapshot_date DESC, league_id, team_id);
CREATE INDEX IF NOT EXISTS idx_community_threads_article ON community.threads (article_id);
CREATE INDEX IF NOT EXISTS idx_community_threads_challenge ON community.threads (challenge_id);
CREATE INDEX IF NOT EXISTS idx_community_comments_thread_created ON community.comments (thread_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_community_comments_user ON community.comments (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_user ON ai.conversations (user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_messages_conversation_created ON ai.messages (conversation_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_ai_tool_calls_conversation ON ai.tool_calls (conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_user_entitlements_plan ON ai.user_entitlements (plan_code);
CREATE INDEX IF NOT EXISTS idx_ai_usage_ledger_user_day ON ai.usage_ledger (user_id, usage_day DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_ledger_user_month ON ai.usage_ledger (user_id, usage_month DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_ledger_month_model ON ai.usage_ledger (usage_month, model_name);
CREATE INDEX IF NOT EXISTS idx_ops_job_runs_status_ready ON ops.job_runs (status, queue_class, run_after, started_at);
CREATE UNIQUE INDEX IF NOT EXISTS idx_ops_job_runs_idempotency ON ops.job_runs (idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ops_webhook_deliveries_provider_processed ON ops.webhook_deliveries (provider, processed_at DESC);
CREATE INDEX IF NOT EXISTS idx_ops_audit_log_action_created ON ops.audit_log (action, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ops_source_snapshots_source_entity ON ops.source_snapshots (source_name, entity_key, fetched_at DESC);

DROP TRIGGER IF EXISTS trg_product_users_touch ON product.users;
CREATE TRIGGER trg_product_users_touch BEFORE UPDATE ON product.users FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS trg_product_user_profiles_touch ON product.user_profiles;
CREATE TRIGGER trg_product_user_profiles_touch BEFORE UPDATE ON product.user_profiles FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS trg_product_organizations_touch ON product.organizations;
CREATE TRIGGER trg_product_organizations_touch BEFORE UPDATE ON product.organizations FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS trg_editorial_articles_touch ON editorial.articles;
CREATE TRIGGER trg_editorial_articles_touch BEFORE UPDATE ON editorial.articles FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS trg_editorial_generation_runs_touch ON editorial.generation_runs;
CREATE TRIGGER trg_editorial_generation_runs_touch BEFORE UPDATE ON editorial.generation_runs FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS trg_community_threads_touch ON community.threads;
CREATE TRIGGER trg_community_threads_touch BEFORE UPDATE ON community.threads FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS trg_community_comments_touch ON community.comments;
CREATE TRIGGER trg_community_comments_touch BEFORE UPDATE ON community.comments FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS trg_community_comment_reports_touch ON community.comment_reports;
CREATE TRIGGER trg_community_comment_reports_touch BEFORE UPDATE ON community.comment_reports FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS trg_ai_conversations_touch ON ai.conversations;
CREATE TRIGGER trg_ai_conversations_touch BEFORE UPDATE ON ai.conversations FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS trg_ai_user_entitlements_touch ON ai.user_entitlements;
CREATE TRIGGER trg_ai_user_entitlements_touch BEFORE UPDATE ON ai.user_entitlements FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
