# Data Foundation Spec

Last verified: `2026-04-08`

This document is the source of truth for:

- what data exists today
- where it lives (`Warehouse Neon` vs `Serving Neon`, plus any local legacy source snapshots)
- the current data cutoffs
- which gaps require `backfill` vs `publish`
- the canonical data contracts for current and planned model tables

It is intentionally operational and evidence-based. Every factual claim in this doc should be traceable to a direct query.

Update after the April 8 warehouse migration pass:

- `Warehouse Neon` is now the canonical modeling database
- local Postgres still exists as a legacy historical source snapshot, but it is no longer the intended long-term modeling authority
- the `2019-2025` historical Statcast backbone has been synced into `Warehouse Neon`

## 1. Verified Environment Topology

### 1.1 Local legacy historical source

Current repo env resolves local development to:

- `DATABASE_URL=postgresql:///abs_observatory`
- effective local Postgres URL used for direct checks:
  - `postgresql://colbyreichenbach@localhost:5432/abs_observatory`

This local database is still available for direct checks and legacy backfills, but it is no longer the intended canonical warehouse.

### 1.2 Warehouse Neon / canonical modeling database

The current workspace env now includes a dedicated pooled Neon warehouse target via `WAREHOUSE_DATABASE_URL`.

Verified operational state after historical sync:

- `raw.statcast_games`: `15,480` historical rows through `2025-09-28`, plus current `2026` rows
- `raw.statcast_pitches`: `4,566,992` historical rows through `2025-09-28`, plus current `2026` rows
- `historical_pitch_states`: `4,566,992` historical rows through `2025-09-28`, plus current `2026` rows

### 1.3 Neon serving / production database

The live pooled Neon connection is not configured in the current workspace `.env.local`, but it is present in the polling / deployment env files used by adjacent recovery worktrees and Vercel deployment material. The verified production target is the pooled Neon `neondb` connection used by the app/polling layer.

Operational conclusion:

- `Warehouse Neon` is the warehouse / modeling database
- `Serving Neon` is the serving / production database
- local Postgres is now a legacy source snapshot and development convenience, not the canonical warehouse
- the warehouse and serving databases are materially different by design
- any plan that treats `DATABASE_URL` in this workspace as “prod” is incorrect

## 2. Verified Current Data Inventory

The key model- and product-relevant tables currently present are:

- `public.games`
- `public.pitches`
- `public.abs_challenges`
- `public.historical_pitch_states`
- `public.serving_run_expectancy_fallbacks`
- `public.serving_win_expectancy_fallbacks`
- `public.serving_count_state_outcome_baselines`
- `raw.statcast_games`
- `raw.statcast_pitches`
- `raw.savant_gamefeed_games`
- `raw.savant_abs_events`

Schema parity check:

- local and Neon have identical column signatures for the core checked tables:
  - `public.games`
  - `public.pitches`
  - `public.abs_challenges`
  - `public.historical_pitch_states`
  - `raw.statcast_pitches`
  - `raw.savant_abs_events`

Interpretation:

- the structural schema is aligned
- the content is not aligned

## 3. Verified Row Counts And Cutoffs

### 3.1 Local warehouse

Verified counts:

- `public.games`: `546`
- `public.pitches`: `160,944`
- `public.abs_challenges`: `2,307`
- `public.historical_pitch_states`: `4,566,992`
- `public.serving_run_expectancy_fallbacks`: `0`
- `public.serving_win_expectancy_fallbacks`: `0`
- `public.serving_count_state_outcome_baselines`: `0`
- `raw.statcast_games`: `15,480`
- `raw.statcast_pitches`: `4,566,992`
- `raw.savant_gamefeed_games`: `617`
- `raw.savant_abs_events`: `2,565`

Verified date cutoffs:

- `public.games`: `2026-02-20` through `2026-04-03`
- `public.abs_challenges`: `2026-02-20` through `2026-04-02`
- `public.historical_pitch_states`: `2019-03-20` through `2025-09-28`
- `raw.statcast_games`: `2019-03-20` through `2025-09-28`
- `raw.statcast_pitches`: `2019-03-20` through `2025-09-28`
- `raw.savant_gamefeed_games`: `2026-02-20` through `2026-04-07`
- `raw.savant_abs_events`: `2026-02-20` through `2026-04-07`

Verified season coverage:

- `raw.statcast_pitches`
  - `2019`: `735,090`
  - `2020`: `264,262`
  - `2021`: `712,320`
  - `2022`: `710,210`
  - `2023`: `720,684`
  - `2024`: `711,898`
  - `2025`: `712,528`
- `public.historical_pitch_states`
  - `2019`: `735,090`
  - `2020`: `264,262`
  - `2021`: `712,320`
  - `2022`: `710,210`
  - `2023`: `720,684`
  - `2024`: `711,898`
  - `2025`: `712,528`
- `raw.savant_abs_events`
  - `2026`: `2,565`

Freshness notes:

- `public.games.updated_at` max: `2026-04-02 20:41:36`
- `public.abs_challenges.created_at` max: `2026-04-02 18:47:59`
- `raw.savant_abs_events.imported_at` max: `2026-04-08 03:55:18`

Interpretation:

- the warehouse has strong historical pitch-state coverage for `2019-2025`
- the warehouse has current ABS raw event ingest through `2026-04-07`
- the warehouse serving-style `games / pitches / abs_challenges` layer is stale relative to Neon
- the warehouse does not currently contain `2026` Statcast pitch history

### 3.2 Neon serving / production

Verified counts:

- `public.games`: `618`
- `public.pitches`: `183,610`
- `public.abs_challenges`: `2,654`
- `public.historical_pitch_states`: `0`
- `public.serving_run_expectancy_fallbacks`: `1,464`
- `public.serving_win_expectancy_fallbacks`: `76,565`
- `public.serving_count_state_outcome_baselines`: `12`
- `raw.statcast_games`: `0`
- `raw.statcast_pitches`: `0`
- `raw.savant_gamefeed_games`: `617`
- `raw.savant_abs_events`: `2,565`

Verified date cutoffs:

- `public.games`: `2026-02-20` through `2026-04-08`
- `public.abs_challenges`: `2026-02-20` through `2026-04-08`
- `public.historical_pitch_states`: empty
- `raw.statcast_games`: empty
- `raw.statcast_pitches`: empty
- `raw.savant_gamefeed_games`: `2026-02-20` through `2026-04-07`
- `raw.savant_abs_events`: `2026-02-20` through `2026-04-07`

Freshness notes:

- `public.games.updated_at` max: `2026-04-08 05:05:02`
- `public.pitches.created_at` max: `2026-04-08 05:05:02`
- `public.abs_challenges.created_at` max: `2026-04-08 05:05:02`

Interpretation:

- Neon is behaving like a serving database
- Neon correctly does not carry warehouse-scale `historical_pitch_states` or `raw.statcast_*`
- Neon does already contain the compact serving lookup tables
- Neon has fresher 2026 app-facing game/pitch/challenge records than local warehouse

## 4. Verified Sync Gap Between Local And Neon

The databases are not synchronized.

### 4.1 Games

Verified by `game_pk`:

- `games_only_in_prod`: `72`
- `games_only_in_local`: `0`

Interpretation:

- local warehouse is missing `72` 2026 games currently present in Neon
- this is not a schema issue
- this is an ingest/sync freshness issue

### 4.2 Challenges

`challenge_id` is not a reliable cross-environment comparison key because it is UUID-based and can be regenerated. Comparison was re-done using `dedupe_key`.

Verified by `dedupe_key`:

- `matching_dedupe_keys`: `2,298`
- `dedupe_only_in_prod`: `356`
- `dedupe_only_in_local`: `9`

Interpretation:

- Neon has `356` challenge rows not present in local warehouse
- local has `9` challenge rows not present in Neon
- the local and Neon challenge surfaces are not perfect subsets of each other
- this needs reconciliation before any “truth” claims are made about 2026 challenge coverage

## 5. What We Have Now By Modeling Need

### 5.1 Count-state / RE / WE foundation

Current status:

- enough historical pitch-state data exists locally to build serious `count-state`, `RE`, and `WE` models using `2019-2025`
- the historical data is large enough for empirical baselines and hierarchical fallback construction

Current blockers:

- no hard-enforced train/validation/test materialization yet
- no `2026` Statcast history in warehouse for forward holdout or regime-shift validation
- compact serving fallbacks are absent locally, which makes it easy to confuse “warehouse built” with “serving published”

Required action:

- keep local warehouse as the build source
- add split-aware materialization
- decide whether to backfill `2026` Statcast pitch history for holdout testing

### 5.2 Overturn probability

Current status:

- we do have real ABS review-event data through `2026-04-07`
- the raw Savant event table already includes rich pitch geometry and pitch-trait features

Available in `raw.savant_abs_events` now:

- game/date/season
- count state
- batter/pitcher/catcher IDs
- handedness
- pitch type / pitch name
- call fields
- overturn outcome
- `px`, `pz`, `plate_x`, `plate_z`
- strike-zone top / bottom
- `zone`
- start speed / end speed / spin rate
- `context_metrics`
- raw payload retention

Current blockers:

- 2026 ABS sample is useful but still relatively small
- current overturn evaluation is still methodologically flawed if it remains in-sample
- local / Neon challenge records need reconciliation for publication claims

### 5.3 Challenge-now / decision policy

Current status:

- we do not yet have the canonical modeling table we actually need
- current product tables contain only challenged-pitch slices or app-facing event rows, not the full decision-opportunity universe

This means:

- current data is enough to design the dataset
- current data is not enough, in its present shape, for a publication-grade challenge-now policy model

## 6. Backfill vs Publish vs Reconcile

This distinction is critical.

### 6.1 Needs `publish`, not `backfill`

- `serving_run_expectancy_fallbacks`
- `serving_win_expectancy_fallbacks`
- `serving_count_state_outcome_baselines`

Why:

- local warehouse already has the historical raw inputs
- Neon already has the serving lookup tables
- local currently has zero rows in these serving tables because they are publish artifacts, not raw-ingest failures

Operational rule:

- build in local warehouse
- publish compact lookup tables to Neon
- do not treat empty local serving tables as data absence

### 6.2 Needs `reconcile`, not just publish`

- `public.games`
- `public.pitches`
- `public.abs_challenges`

Why:

- Neon is fresher on app-serving records
- local has a small number of challenge rows not in Neon
- the environments appear to be fed by partially different ingestion/update timing

Required action:

- define canonical authority per table
- add row-level reconciliation checks by natural key
- stop assuming local is always the “superset”

### 6.3 Needs real `backfill`

- `raw.statcast_games` for `2026`
- `raw.statcast_pitches` for `2026`
- `historical_pitch_states` for `2026` if we want 2026 holdout/testing and called-pitch engineering on current-season pitch history

Why:

- local warehouse currently stops at `2025-09-28`
- RE/WE can still be rebuilt on `2019-2025`
- but challenge-now and forward evaluation will be materially stronger if 2026 Statcast is present

Recommendation:

- backfill `2026` Statcast pitch history through the latest stable date
- then rebuild `historical_pitch_states` with explicit split labeling

## 7. Canonical Warehouse vs Serving Contract

### 7.1 Warehouse-only tables

These belong in local warehouse and should not be relied on in Neon:

- `raw.statcast_games`
- `raw.statcast_pitches`
- `public.historical_pitch_states`
- future full-row model development tables such as `modeling.called_pitch_decisions`

### 7.2 Serving-only / serving-safe tables

These are the tables Neon should expose for app and light analytical use:

- `public.games`
- `public.pitches`
- `public.abs_challenges`
- `public.serving_run_expectancy_fallbacks`
- `public.serving_win_expectancy_fallbacks`
- `public.serving_count_state_outcome_baselines`
- future compact recommendation outputs or audited decision-value lookup tables

### 7.3 Shared raw ABS tables

These currently exist in both places:

- `raw.savant_gamefeed_games`
- `raw.savant_abs_events`

Short-term recommendation:

- acceptable to retain in both if needed for ingest and light inspection

Long-term recommendation:

- choose one of:
  - keep only in warehouse and push compact derivatives to Neon
  - or formally declare them as shared ingestion tables with sync checks

## 8. Current Data Contracts We Should Treat As Canonical

### 8.1 `public.historical_pitch_states`

Canonical purpose:

- foundation table for `count-state`, `RE`, and `WE`

Required contract:

- one row per pitch state
- must include exact pre-pitch state
- must carry `game_date` and `season`
- must carry full `bases_state`
- must retain final outcome fields needed for inning-end runs and game win labels

Current status:

- structurally good
- not split-governed yet

### 8.2 `raw.savant_abs_events`

Canonical purpose:

- raw ABS challenge-event source of truth

Required contract:

- one row per ABS review event
- retain source payload
- retain call, overturn, geometry, and pitch-trait fields
- never overwrite raw source without snapshot traceability

Current status:

- strong enough to be the overturn modeling source
- not sufficient by itself for challenge-now because it only covers challenge events, not all taken pitches

## 9. New Canonical Dataset Contract: `modeling.called_pitch_decisions`

This is the new engineered dataset required for challenge-now, pitch-trait vulnerability, and geometry-based decision modeling.

Current implemented state in Warehouse as of April 8, 2026:

- table exists and is populated
- current window built: `2026-02-20` through `2026-04-07`
- current rows: `28,557`
- current composition:
  - `26,646` regular-season rows
  - `1,911` spring-training rows
  - `2,564` challenged rows reconciled to `raw.savant_abs_events`
- current recovered context coverage:
  - `28,557` rows with non-null `bases_state`
  - `1,912` Savant-only rows with non-null `bases_state`
  - `28,557` rows with non-null score context
  - `1,912` Savant-only rows with non-null score context
- current split materialization under `called_pitch_decisions_phase_time_v1`:
  - `13,822` train rows
  - `4,967` validation rows
  - `9,768` test rows
- current validation artifact:
  - [called-pitch-status-20260408T140553.json](/Users/colbyreichenbach/Desktop/mlb/abs-observatory/.runtime/called-pitch-status/called-pitch-status-20260408T140553.json)
- current geometry validation artifact:
  - [called-pitch-geometry-validation-20260408T140829.json](/Users/colbyreichenbach/Desktop/mlb/abs-observatory/.runtime/called-pitch-geometry/called-pitch-geometry-validation-20260408T140829.json)
  - current challenged-sample result favors `center_only` over `radius_adjusted`
- current limitation:
  - the current split policy is provisional and early-window only; it should be revisited as the 2026 sample grows
  - geometry selection should remain provisional until rerun on a larger sample and segmented by challenge direction

### 9.1 Purpose

One row per `taken pitch` that could be evaluated as a strike/ball decision opportunity.

This is not a challenge-event table.
It is a full decision-opportunity table.

### 9.2 Grain

- one row per called pitch
- unique key should be a stable natural key such as:
  - `game_pk`
  - `at_bat_number` or canonical at-bat index
  - `pitch_number`

### 9.3 Required source inputs

- `raw.statcast_pitches`
- `public.games` or canonical game metadata table
- `raw.savant_abs_events`
- `public.abs_challenges` only for reconciliation and serving compatibility, not as the primary event source

### 9.4 Required fields

Identity and time:

- `game_pk`
- `game_date`
- `season`
- `game_type`
- `competition_phase`
- `is_spring_training`
- `is_regular_season`
- `is_postseason`
- `is_abs_enabled_game`
- `inning`
- `half_inning`
- `at_bat_number`
- `pitch_number`

Game state:

- `balls`
- `strikes`
- `outs`
- full `bases_state`
- `home_score`
- `away_score`
- `score_diff_batting`

Players and handedness:

- `batter_id`
- `pitcher_id`
- `catcher_id` when available
- `stand`
- `p_throws`

Pitch traits:

- `pitch_type`
- `pitch_name`
- `start_speed`
- `end_speed`
- `spin_rate`
- movement / extension fields if available from source expansion

Location and zone:

- `plate_x`
- `plate_z`
- `px`
- `pz`
- `strike_zone_top`
- `strike_zone_bottom`
- `zone`

Observed call:

- `called_code`
- `called_description`
- `is_called_ball`
- `is_called_strike`

Derived outcome layers:

- `observed_call`
- `abs_zone_outcome_center_only`
- `abs_zone_outcome_radius_adjusted`
- `challenge_outcome`

Important:

- `observed_call` is the umpire call on the field
- `abs_zone_outcome_*` is the modeled ABS result from reconstructed geometry
- `challenge_outcome` only exists for actually challenged pitches
- these must never be collapsed into one field

Derived geometry:

- `geometry_version`
- `zone_rule_version`
- `ball_radius_feet`
- `coordinate_interpretation`
- `is_model_strike`
- `is_model_strike_center_only`
- `is_model_strike_radius_adjusted`
- `horizontal_edge_distance`
- `vertical_edge_distance`
- `min_edge_distance`
- `horizontal_edge_distance_center_only`
- `vertical_edge_distance_center_only`
- `min_edge_distance_center_only`
- `horizontal_edge_distance_radius_adjusted`
- `vertical_edge_distance_radius_adjusted`
- `min_edge_distance_radius_adjusted`
- `inside_shadow_band`
- `absolute_center_distance`

Challenge linkage:

- `is_challenge_eligible`
- `was_challenged`
- `challenge_source`
- `challenge_dedupe_key`
- `is_overturned` if challenged
- `challenge_result_confirmed_source`

Provenance:

- `source_system`
- `source_row_hash`
- `built_at`
- `data_snapshot_id`
- `train_split`
- `eval_split`

### 9.5 Hard contract rules

- no post-pitch outcomes may be used as model features in the challenge-now feature set
- full `bases_state` must be preserved; never collapse to runner count
- decision-time feature availability must be explicitly flagged
- geometry-derived fields must be versioned
- challenge outcome fields must be nullable for non-challenged pitches
- train/eval split labels must be materialized into the dataset itself
- spring-training rows may exist in the dataset, but `competition_phase` must be explicit so spring and regular-season evaluation can be separated
- `abs_zone_outcome` must be computed for all called pitches, not only challenged pitches
- the dataset must preserve at least two geometry interpretations until validated against real ABS challenges:
  - center-only
  - radius-adjusted
- no single geometry interpretation may be presented as final truth until challenge-outcome validation selects the supported version

### 9.6 Geometry validation requirement

The dataset must support direct testing of this unresolved question:

- do `plate_x` / `plate_z` behave like center-of-ball coordinates for ABS reconstruction?

Because MLB defines a strike as any pitch where any part of the ball touches any part of the zone, we must support both:

1. center-only reconstruction
2. radius-adjusted reconstruction

Required validation path:

- compare geometry variants against actual challenged ABS outcomes in `raw.savant_abs_events`
- record the winning geometry specification as a versioned decision, not an implicit assumption

## 10. Split Governance Contract

Every modelable table must eventually support:

- `split_set`: `train`, `validation`, `test`
- `split_policy_version`
- `data_snapshot_id`
- `feature_freeze_ts`

Hard rule:

- evaluation scripts may not infer splits from dates ad hoc
- splits must be materialized and queryable

This matters especially for:

- `historical_pitch_states`
- future `modeling.called_pitch_decisions`
- overturn audit input tables

## 11. Immediate Data Work Required

### 11.1 Priority 0: document and enforce database roles

- local warehouse is the model build source
- Neon is the serving source
- polling/deployment env must be referenced explicitly in docs and scripts

### 11.2 Priority 1: reconcile current 2026 app data

- investigate the `72` prod-only games
- investigate the `356` prod-only challenge dedupe keys
- investigate the `9` local-only challenge dedupe keys
- define canonical authority and sync behavior for `games`, `pitches`, `abs_challenges`

### 11.3 Priority 2: backfill 2026 Statcast

- backfill `raw.statcast_games`
- backfill `raw.statcast_pitches`
- rebuild `historical_pitch_states`

Why:

- this is the cleanest path to modern holdout testing
- this also unlocks the full called-pitch decision dataset

### 11.4 Priority 3: build `modeling.called_pitch_decisions`

- engineer all taken pitches
- join challenge outcomes where present
- version geometry logic
- materialize split labels

### 11.5 Priority 4: publish compact lookup tables intentionally

- regenerate serving fallbacks from local warehouse
- publish to Neon
- version the publish event

## 12. Query Appendix

The following query classes were used to verify this document:

- table inventory via `pg_tables`
- row counts via `count(*)`
- date cutoffs via `min(...)`, `max(...)`
- season coverage via `group by season`
- local vs Neon overlap via `dblink` and natural keys
- schema parity via `information_schema.columns`

This document should be refreshed whenever:

- a warehouse backfill runs
- a serving publish runs
- the called-pitch dataset is first built
- a new model audit cycle begins
