# Serving DB Policy

AiBS should run with two database roles:

1. A warehouse/training database for raw ingest, historical calibration, and large backfills.
2. A serving database for the hosted web product.

The serving database is the real production database. It is intentionally lean and should only contain the tables needed to power pages, APIs, editorial, auth, and compact model outputs.

## Keep In Serving DB

These relations are small enough, page-facing, or operationally necessary for the hosted app:

- `public.games`
- `public.teams`
- `public.players`
- `public.officials`
- `public.abs_challenges`
- `public.team_abs_game_summary`
- `public.umpire_abs_game_summary`
- `public.game_reports`
- `public.at_bats`
- `public.game_state_snapshots`
- `ops.game_linescores`
- `public.pitches`
- `public.play_events`
- `raw.savant_abs_events`
- `editorial.*`
- `product.*`
- `community.*`
- `ai.*`
- `ops.job_runs`
- `ops.audit_log`
- `ops.model_audit_alerts`
- lightweight marts and views created from `db/views.sql`

## Keep Recent-Only In Serving DB

If production storage becomes tight, the first tables to prune should be the event-detail and recent-only operational tables:

- `public.pitches`
- `public.play_events`
- `public.at_bats`
- `public.game_state_snapshots`
- `ops.source_snapshots` by source-specific retention policy

Recommended policy once the regular season expands:

- keep full-detail rows for the most recent `30-45` days
- keep season-long summary tables indefinitely
- regenerate older deep detail from the warehouse when needed
- keep `mlb_statsapi.feed_live` snapshots in serving only as recent operational retention, not as indefinite hosted archive
- prune raw standings and raw Savant snapshots from the serving database

## Keep Offline Only

These relations belong in the warehouse/training database, not the hosted serving database:

- `raw.statcast_pitches`
- `raw.statcast_games`
- `raw.savant_gamefeed_games`
- `public.historical_pitch_states`

For `ops.source_snapshots`, the policy is now source-specific:

- raw `mlb_statsapi.standings`
  - warehouse/archive only
- raw `baseball_savant.gamefeed`
  - warehouse/archive only
- raw `mlb_statsapi.feed_live`
  - recent-only in serving when needed operationally

These are the primary storage drivers and are not required for the hosted product to render pages.

## Publish Workflow

The hosted serving database should be refreshed from the warehouse database through a deliberate publish step:

1. Ingest and recompute locally or in a worker environment.
2. Publish the lean serving subset into the hosted database.
3. Run route and database smoke checks against the hosted environment.

Use:

```bash
SOURCE_DATABASE_URL=postgresql://colbyreichenbach@localhost:5432/abs_observatory \
TARGET_DATABASE_URL="$DATABASE_URL" \
npm run db:publish:serving
```

The publish script intentionally excludes data for the large warehouse-only tables above while preserving the page-facing schemas, tables, and views used by the app.

## Model Policy

Historical data is still useful for:

- calibration
- backtesting
- baselines
- audits
- feature engineering

That does not mean historical raw tables belong in production. The hosted serving database should store:

- compact baselines
- coefficients
- lookup tables
- precomputed summary tables
- page-facing outputs

The product should consume model outputs, not full training datasets.
