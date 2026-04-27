# Data Platform Master Plan

Status: `Dated Program Reference`

Last updated: April 8, 2026

> Status note: this plan records the April 2026 target data-platform architecture and program decisions. Use the launch runbooks, technical overview, and serving policy docs for current operating truth.

## Purpose

This document is the execution plan for the AiBS data platform.

It replaces “we should probably” language with:

- the target architecture
- the exact database roles
- the exact environment contract
- the exact ETL ownership model
- the exact backfill sequence
- the exact publish flow
- the exact reconciliation rules
- the exact file-level implementation targets

The goal is a system that is:

- statistically safe for modeling
- operationally safe for production
- reproducible for audits
- lean in serving
- not dependent on a laptop as the source of truth

The exact per-table Warehouse -> Serving slice rules live in:

- [../launch/serving-publish-contract.md](/Users/colbyreichenbach/Downloads/mlb/abs-observatory/docs/launch/serving-publish-contract.md)

## Decision

AiBS should use `two remote Neon databases` plus an optional local sample database.

1. `Warehouse Neon`
   - canonical ingest authority
   - raw baseball data
   - historical backfills
   - model-development tables
   - audit inputs
   - canonical train/validation/test materialization

2. `Serving Neon`
   - production app database
   - page-facing baseball tables
   - compact model outputs
   - product/editorial/community/auth state

3. `Local sample`
   - optional
   - small development subset only
   - never canonical

This is the target operating model. The laptop should not remain the primary warehouse.

## Non-Negotiable Rules

1. There is exactly one canonical ingest authority.
2. Raw ingest lands in `Warehouse Neon`, not in Serving and not on the laptop.
3. Serving data is published from Warehouse through a deliberate one-way publish step.
4. The web app reads from `Serving Neon`, not from Warehouse.
5. Model training, audits, and backfills run against `Warehouse Neon`.
6. Local databases are convenience environments only.
7. No independent dual-poller architecture is allowed.
8. No production claim may be made against data whose source, cutoff, and split are not recorded.

## Current State

As of the verified `2026-04-08` inspection:

- local warehouse has historical Statcast and `historical_pitch_states`
- Neon serving has fresher current-season `games`, `pitches`, and `abs_challenges`
- both local and Neon have `raw.savant_abs_events`
- local and Neon are not synchronized

Verified gaps from the live check:

- `72` games existed in Neon but not local
- `356` challenge `dedupe_key`s existed in Neon but not local
- `9` challenge `dedupe_key`s existed in local but not Neon
- local had `2019-2025` Statcast history
- local did not yet have `2026` Statcast history

That current shape is acceptable as a transition state. It is not acceptable as the long-term platform.

## Target Architecture

### 1. Warehouse Neon

Warehouse stores:

- `raw.statcast_games`
- `raw.statcast_pitches`
- `raw.savant_gamefeed_games`
- `raw.savant_abs_events`
- `ops.source_snapshots`
- `historical_pitch_states`
- future `modeling.called_pitch_decisions`
- future split-materialized training tables
- full model audit inputs

Warehouse is responsible for:

- live ingest
- raw payload retention
- backfills
- canonical transforms
- audit runs
- model builds
- publish artifacts

### 2. Serving Neon

Serving stores:

- `games`
- `teams`
- `players`
- `officials`
- `abs_challenges`
- `at_bats`
- `play_events`
- `pitches`
- `game_state_snapshots`
- `team_abs_game_summary`
- `umpire_abs_game_summary`
- `game_reports`
- `serving_run_expectancy_fallbacks`
- `serving_win_expectancy_fallbacks`
- `serving_count_state_outcome_baselines`
- future compact recommendation outputs
- product/editorial/community/auth tables

Serving is responsible for:

- app reads
- lightweight APIs
- page render data
- compact lookup table consumption

### 3. Local sample

Local sample stores:

- a sampled subset of serving-safe baseball data
- optional small snapshots for dev/testing

Local sample is not allowed to be:

- ingest authority
- audit authority
- model-training authority

## Environment Contract

This contract should be implemented everywhere.

### 1. Required environment variables

Common:

- `WAREHOUSE_DATABASE_URL`
- `SERVING_DATABASE_URL`

Optional local convenience:

- `LOCAL_SAMPLE_DATABASE_URL`

Worker / poller:

- `POLL_TIMEZONE`
- `ACTIVE_POLL_SECONDS`
- `IDLE_POLL_SECONDS`
- `POLL_GAME_TYPE`

### 2. Role-specific usage

Web app:

- `DATABASE_URL` must equal `SERVING_DATABASE_URL`

Warehouse ETL and backfill jobs:

- default target must be `WAREHOUSE_DATABASE_URL`

Publish jobs:

- source must be `WAREHOUSE_DATABASE_URL`
- target must be `SERVING_DATABASE_URL`

Local sample refresh:

- source should be `SERVING_DATABASE_URL` or a warehouse-derived sampled export
- target should be `LOCAL_SAMPLE_DATABASE_URL`

### 3. Required precedence rules

All data-moving scripts must resolve URLs in this order:

1. explicit CLI/database arg if present
2. role-specific env var
3. `DATABASE_URL` only as a compatibility fallback

This is required so we stop accidentally pointing warehouse jobs at serving or vice versa.

## Implementation Contract By File

The following file changes are required.

### 1. ETL writers must target Warehouse by default

Files:

- [etl/ingest_mlb_abs.py](/Users/colbyreichenbach/Downloads/mlb/abs-observatory/etl/ingest_mlb_abs.py)
- [etl/ingest_savant_abs_gamefeed.py](/Users/colbyreichenbach/Downloads/mlb/abs-observatory/etl/ingest_savant_abs_gamefeed.py)
- [etl/backfill_statcast_pitch_history.py](/Users/colbyreichenbach/Downloads/mlb/abs-observatory/etl/backfill_statcast_pitch_history.py)
- [etl/build_historical_pitch_states.py](/Users/colbyreichenbach/Downloads/mlb/abs-observatory/etl/build_historical_pitch_states.py)

Required change:

- add a shared resolver:
  - CLI `--database-url` override
  - else `WAREHOUSE_DATABASE_URL`
  - else `DATABASE_URL`
- emit a startup log line identifying:
  - target host
  - target database
  - role = `warehouse`

Acceptance criteria:

- all ETL and backfill scripts can run without editing `.env.local`
- no ETL script defaults to Serving if `WAREHOUSE_DATABASE_URL` is set

### 2. Pollers must call warehouse-targeted ingestion only

Files:

- [etl/poll_active_games.py](/Users/colbyreichenbach/Downloads/mlb/abs-observatory/etl/poll_active_games.py)
- [etl/poll_local_window.py](/Users/colbyreichenbach/Downloads/mlb/abs-observatory/etl/poll_local_window.py)

Required change:

- do not let pollers rely on an ambient `DATABASE_URL`
- have them inherit `WAREHOUSE_DATABASE_URL`
- add a startup banner that prints:
  - poll window
  - game type
  - target warehouse host/db

Acceptance criteria:

- one poller process updates Warehouse only
- no local-vs-serving drift can be caused by parallel pollers writing to different DBs

### 3. Publish script must become fully role-aware

File:

- [scripts/publish-serving-db.sh](/Users/colbyreichenbach/Downloads/mlb/abs-observatory/scripts/publish-serving-db.sh)

Required change:

- source default:
  - `WAREHOUSE_DATABASE_URL`
- target default:
  - `SERVING_DATABASE_URL`
- compatibility fallback:
  - keep current env names only temporarily

Also add:

- publish manifest row or JSON artifact including:
  - publish timestamp
  - source DB host/db
  - target DB host/db
  - source max dates for key tables
  - git SHA
  - row counts for serving tables loaded

Acceptance criteria:

- publish can be run without editing script internals
- every publish event is traceable

### 4. Audit scripts must run against Warehouse by default

Files:

- all scripts under [scripts/model-audits](/Users/colbyreichenbach/Downloads/mlb/abs-observatory/scripts/model-audits)

Required change:

- default to `WAREHOUSE_DATABASE_URL`
- allow explicit `--database-url`
- print target database role at startup

Acceptance criteria:

- no audit accidentally runs against Serving when Warehouse is configured

### 5. Documentation must stop describing a single-database architecture

Files:

- [docs/reference/technical.md](/Users/colbyreichenbach/Downloads/mlb/abs-observatory/docs/reference/technical.md)
- [docs/launch/serving-db-policy.md](/Users/colbyreichenbach/Downloads/mlb/abs-observatory/docs/launch/serving-db-policy.md)
- [docs/launch/vercel-neon-runbook.md](/Users/colbyreichenbach/Downloads/mlb/abs-observatory/docs/launch/vercel-neon-runbook.md)

Required change:

- update docs to reflect:
  - Warehouse Neon
  - Serving Neon
  - optional local sample

Acceptance criteria:

- no core doc says “AiBS uses a single Postgres database” after cutover

## Canonical Data Contracts

### 1. Raw ingest contract

Raw tables are append/upsert staging tables with source-payload retention.

Required properties:

- natural key upserts
- payload retention where available
- source snapshot logging
- `imported_at` timestamps
- idempotent rerun behavior

Applies to:

- `raw.savant_gamefeed_games`
- `raw.savant_abs_events`
- `raw.statcast_games`
- `raw.statcast_pitches`

### 2. Historical state contract

`historical_pitch_states` is the canonical build source for:

- count-state value
- run expectancy
- win expectancy

Required additions:

- `data_snapshot_id`
- `split_set`
- `split_policy_version`

Hard rule:

- no audit infers the split by improvising date filters in the query

### 3. New canonical modeling contract

Add:

- `modeling.called_pitch_decisions`

This dataset must be implemented exactly as defined in [data-foundation-spec.md](/Users/colbyreichenbach/Downloads/mlb/abs-observatory/docs/models/data-foundation-spec.md).

Required additions at creation time:

- primary natural key
- split labels
- geometry version fields
- nullable challenge outcome linkage
- decision-time feature availability flags

## Live Ingest Plan

### 1. Ingest authority

Canonical live ingest authority:

- `Warehouse Neon`

No other database polls independently.

### 2. Polling coverage

The live poller should run:

- MLB Stats API ingest via [etl/ingest_mlb_abs.py](/Users/colbyreichenbach/Downloads/mlb/abs-observatory/etl/ingest_mlb_abs.py)
- official Savant ABS event ingest via [etl/ingest_savant_abs_gamefeed.py](/Users/colbyreichenbach/Downloads/mlb/abs-observatory/etl/ingest_savant_abs_gamefeed.py)

Operational rule:

- Stats API and Savant ingest should both land in Warehouse on a consistent schedule
- the app should not depend on direct poller writes to Serving

### 3. Polling cadence

Recommended:

- active windows: `30s`
- idle windows: `120s`
- explicit local-time window polling retained only if needed for schedule edges

### 4. Ingest completion policy

For any day with active games:

1. poll live into Warehouse
2. finalize game rows once final
3. run reconciliation checks
4. publish serving-safe deltas to Serving

## Backfill Plan

### 1. Immediate backfill target

Backfill `2026` regular-season Statcast into Warehouse.

Files:

- [etl/backfill_statcast_pitch_history.py](/Users/colbyreichenbach/Downloads/mlb/abs-observatory/etl/backfill_statcast_pitch_history.py)
- [etl/build_historical_pitch_states.py](/Users/colbyreichenbach/Downloads/mlb/abs-observatory/etl/build_historical_pitch_states.py)

Why:

- local warehouse currently stops at `2025-09-28`
- current-season forward validation requires `2026`
- `called_pitch_decisions` engineering needs current-season pitch rows

Important statistical guardrail:

- early `2026` rows are required for engineering readiness, current-season product relevance, and forward-monitoring
- early `2026` rows are not, by themselves, sufficient final publication evidence for calibration or policy-quality claims
- until the `2026` sample matures, treat it as an early forward window first and a publication test window second

### 2. Exact backfill sequence

1. Point script at `WAREHOUSE_DATABASE_URL`
2. backfill `raw.statcast_games`
3. backfill `raw.statcast_pitches`
4. validate game identity with [etl/validate_historical_games.py](/Users/colbyreichenbach/Downloads/mlb/abs-observatory/etl/validate_historical_games.py)
5. rebuild `historical_pitch_states` for the backfilled window
6. record resulting min/max dates and row counts

### 3. Exact first run

Recommended first production backfill run:

```bash
python3 etl/backfill_statcast_pitch_history.py --start-date 2026-03-26 --end-date 2026-04-07
python3 etl/build_historical_pitch_states.py --start-date 2026-03-26 --end-date 2026-04-07
python3 etl/validate_historical_games.py --start-date 2026-03-26 --end-date 2026-04-07
```

Note:

- current ABS product coverage begins before Opening Day
- the `statcast_backfill` path is regular-season only
- current-season Statcast backfill should therefore begin on the first regular-season date in scope, not the first ABS date

After that:

- run incremental daily catch-up for the latest missing dates

### 4. Backfill acceptance criteria

- `raw.statcast_games` has nonzero `2026` rows in Warehouse
- `raw.statcast_pitches` has nonzero `2026` rows in Warehouse
- `historical_pitch_states` has nonzero `2026` rows in Warehouse
- min/max dates reconcile with schedule expectations
- validation script reports acceptable schedule identity integrity

## Serving Publish Plan

### 1. Publish source and target

- source: `WAREHOUSE_DATABASE_URL`
- target: `SERVING_DATABASE_URL`

### 2. Publish frequency

Recommended:

- after each successful ingest batch for current-season serving data
- after each model rebuild for compact lookup tables

### 3. Publish payload classes

Always publish:

- `games`
- `pitches`
- `abs_challenges`
- summary tables used by app routes
- compact fallback/model output tables

Never publish as full warehouse payload:

- `raw.statcast_pitches`
- `raw.statcast_games`
- `historical_pitch_states`
- `ops.source_snapshots`
- future full-row modeling tables

### 4. Publish verification

After each publish:

- verify row counts
- verify max dates
- verify summary tables exist
- verify fallback tables loaded
- record publish manifest

## Reconciliation Plan

### 1. Why reconciliation is mandatory

The verified current state already showed local/Neon drift. This means the system needs an explicit reconciliation layer.

### 2. Reconciliation keys

Use natural keys, not generated UUIDs.

Examples:

- `games`: `game_pk`
- `pitches`: `game_pk + at_bat_index/at_bat_number + pitch_number`
- `abs_challenges`: `dedupe_key`
- `raw.savant_abs_events`: `game_pk + at_bat_number + pitch_number + row_id/play_id` as appropriate

### 3. Required reconciliation checks

Add a recurring reconciliation script that compares Warehouse vs Serving for:

- row counts
- min/max dates
- natural-key overlap
- duplicate natural keys
- orphaned children

### 4. Required outputs

Every reconciliation run should emit:

- target tables checked
- source and target hosts/dbs
- counts
- overlap counts
- drift flags
- run timestamp

### 5. Failure policy

If reconciliation shows unexplained drift above threshold:

- publish is blocked
- audit claims for affected windows are blocked

## Called-Pitch Dataset Build Plan

### 1. Dataset

Create:

- `modeling.called_pitch_decisions`

### 2. Inputs

- `raw.statcast_pitches`
- `raw.savant_abs_events`
- canonical game metadata

### 3. Build sequence

1. isolate taken pitches from `raw.statcast_pitches`
2. attach game type / competition phase / ABS-enabled flags
3. derive exact pre-pitch state
4. derive geometry features
5. derive both center-only and radius-adjusted ABS outcomes
6. join challenge outcomes where present
7. assign train/validation/test splits
8. write provenance fields

### 4. Required file targets

- `db/schema.sql`
- new ETL builder script, recommended:
  - `etl/build_called_pitch_decisions.py`
- `docs/models/data-foundation-spec.md`

### 5. Acceptance criteria

- one row per taken pitch
- no duplicate natural keys
- `was_challenged` coverage reconciles against ABS challenge sources
- full `bases_state` preserved
- no post-pitch leakage in decision-time feature set
- `observed_call`, `abs_zone_outcome`, and `challenge_outcome` remain separate columns
- spring and regular-season rows are explicitly labeled and filterable
- geometry versioning supports center-only and radius-adjusted ABS interpretations

### 6. Current implemented state as of April 24, 2026

- `modeling.called_pitch_decisions` now exists in Warehouse and is populated by:
  - [build_called_pitch_decisions.py](/Users/colbyreichenbach/Downloads/mlb/abs-observatory/etl/build_called_pitch_decisions.py)
  - [sync-players-to-warehouse.mjs](/Users/colbyreichenbach/Downloads/mlb/abs-observatory/scripts/sync-players-to-warehouse.mjs)
  - [report_called_pitch_decisions_status.py](/Users/colbyreichenbach/Downloads/mlb/abs-observatory/etl/report_called_pitch_decisions_status.py)
  - [sync-live-context-to-warehouse.mjs](/Users/colbyreichenbach/Downloads/mlb/abs-observatory/scripts/sync-live-context-to-warehouse.mjs)
- current row inventory:
  - `62,086` total rows
  - `60,175` regular-season rows
  - `1,911` spring-training rows
  - `3,448` challenged rows reconciled to `raw.savant_abs_events`
- current geometry coverage:
  - canonical product margin uses Savant `edge_distance_calc` when present, otherwise radius-adjusted ABS edge distance
  - center-only and raw radius-adjusted fields are retained as diagnostic variants
- current recovered pre-pitch context coverage:
  - `62,086` rows with non-null `bases_state`
  - `62,086` rows with non-null score context
- current split materialization under `called_pitch_decisions_phase_time_v1`:
  - `13,822` train rows
  - `4,967` validation rows
  - `43,297` test rows
- current model audit artifacts:
  - [2026-04-24-overturn-calibration.md](/Users/colbyreichenbach/Downloads/mlb/abs-observatory/docs/models/audits/2026-04-24-overturn-calibration.md)
  - [2026-04-24-decision-value-audit.md](/Users/colbyreichenbach/Downloads/mlb/abs-observatory/docs/models/audits/2026-04-24-decision-value-audit.md)
- current limitation:
  - the current split policy should be revisited as the 2026 sample grows
  - geometry calibration should keep refreshing, even though product surfaces now use one canonical margin

## Security And Permissions Plan

### 1. Database roles

Create separate credentials for:

- web app read/write on Serving
- worker/ETL write on Warehouse
- publish job read Warehouse / write Serving
- optional read-only audit user on Warehouse

### 2. Hard rule

The web app must not have warehouse write credentials.

### 3. Hard rule

The poller/ETL runtime must not have serving write credentials except through the explicit publish job if needed.

## Operational Runbooks

### 1. Daily live ops

1. poll Warehouse
2. confirm ingest freshness
3. run lightweight QA/reconciliation
4. publish serving delta
5. verify Serving counts and dates

### 2. Historical rebuild ops

1. backfill Warehouse raw tables
2. rebuild canonical historical tables
3. rerun audits on Warehouse
4. publish only compact outputs to Serving

### 3. Incident response

If app data is stale:

- check Serving max dates
- check last publish manifest
- check Warehouse ingest freshness
- check reconciliation results

If model audit inputs look stale:

- check Warehouse raw cutoffs
- check historical build cutoffs
- check split-materialized tables

## Phase Plan

### Phase 1: Authority Cutover

Implement:

- environment contract
- Warehouse-targeted ETL defaults
- Serving-targeted app defaults

Done when:

- pollers write only to Warehouse
- app reads only from Serving

### Phase 2: Reconciliation Layer

Implement:

- recurring Warehouse vs Serving checks
- publish manifests
- drift alerts

Done when:

- no silent divergence is possible

### Phase 3: 2026 Backfill

Implement:

- Statcast 2026 backfill
- `historical_pitch_states` rebuild

Done when:

- Warehouse has `2026` historical pitch coverage

### Phase 4: Called-Pitch Foundation

Implement:

- `modeling.called_pitch_decisions`

Done when:

- challenge-now foundation exists as a canonical dataset

### Phase 5: Split Governance

Implement:

- split materialization in Warehouse
- audit scripts reading split-aware tables only

Done when:

- no major model audit depends on ad hoc split logic

### Phase 6: Full Publication Readiness

Implement:

- model outputs built from Warehouse
- compact outputs published to Serving
- reconciliation and manifests retained

Done when:

- every published metric is reproducible from a recorded warehouse snapshot

## Exact Implementation Checklist

### Code and env

- add `WAREHOUSE_DATABASE_URL`
- add `SERVING_DATABASE_URL`
- update ETL writers to default to Warehouse
- update publish script to use Warehouse -> Serving
- update audit scripts to default to Warehouse
- update docs to remove single-DB framing

### Data

- create Warehouse Neon database
- confirm Serving Neon database
- load schema into Warehouse
- backfill `2026` Statcast into Warehouse
- rebuild `historical_pitch_states`
- reconcile current-season game/challenge drift

### Modeling foundation

- add split metadata to canonical model tables
- create `modeling.called_pitch_decisions`
- record data snapshot IDs

### Operations

- run one canonical poller against Warehouse
- add publish manifest
- add reconciliation job
- add freshness SLA checks

## Acceptance Standard

This plan is complete only when all of the following are true:

1. `Warehouse Neon` is the sole ingest authority.
2. `Serving Neon` is the sole app-serving authority.
3. no full historical warehouse payload lives on the laptop by default.
4. current-season Warehouse and Serving drift is measurable and controlled.
5. `2026` Statcast history exists in Warehouse.
6. `historical_pitch_states` is rebuilt with 2026 support.
7. `modeling.called_pitch_decisions` exists with a formal contract.
8. audits and model builds run against Warehouse.
9. compact outputs publish cleanly to Serving.
10. every production claim can be traced to a recorded warehouse snapshot and publish event.
