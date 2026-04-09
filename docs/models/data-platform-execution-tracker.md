# Data Platform Execution Tracker

Status: `Execution Plan`

Last updated: April 8, 2026

Primary methodology and architecture sources:

- [data-platform-master-plan.md](/Users/colbyreichenbach/Desktop/mlb/abs-observatory/docs/models/data-platform-master-plan.md)
- [data-foundation-spec.md](/Users/colbyreichenbach/Desktop/mlb/abs-observatory/docs/models/data-foundation-spec.md)
- [../launch/serving-publish-contract.md](/Users/colbyreichenbach/Desktop/mlb/abs-observatory/docs/launch/serving-publish-contract.md)

## Purpose

This document is the implementation checklist for the AiBS data platform rebuild.

Use it to track:

- what has been completed
- what is still open
- the exact file targets
- the exact operational dependencies
- the exit criteria for each phase

This is intentionally execution-first. If the master plan says what the system should become, this tracker says exactly how we finish it.

## Tracking Rules

1. A task is not complete until code, docs, and verification all exist.
2. A task is not complete if the system still depends on manual memory.
3. A task is not complete if the env contract is ambiguous.
4. A task is not complete if warehouse vs serving authority is still unclear.
5. A task is not complete if a later operator could accidentally reintroduce drift.

## Program Status

### Completed in planning/docs

- [x] Create platform architecture source of truth
- [x] Verify actual local vs Neon database state with direct queries
- [x] Document current cutoffs, counts, and sync gaps
- [x] Define canonical warehouse vs serving contract
- [x] Define canonical `called_pitch_decisions` dataset contract

### Not yet implemented in code/ops

- [ ] Create Warehouse Neon as the canonical ingest authority
- [x] Repoint ETL writers to Warehouse-aware database targeting
- [ ] Repoint pollers to Warehouse Neon by default in deployed runtime
- [ ] Make Serving Neon the app-only authority
- [ ] Add reconciliation jobs and publish manifests
- [ ] Backfill `2026` Statcast into Warehouse
- [ ] Rebuild `historical_pitch_states` with 2026 support
- [ ] Create `modeling.called_pitch_decisions`
- [x] Make all audits run against Warehouse by default

## Workstreams

### Workstream A: Database Authority And Environment Contract

Goal:

- make warehouse vs serving roles explicit in code and env

### Workstream B: Ingest And Polling

Goal:

- ensure there is one canonical live ingest path into Warehouse

### Workstream C: Publish And Reconciliation

Goal:

- create a deterministic one-way Warehouse -> Serving publish flow with drift checks

### Workstream D: Historical Backfill And Canonical State Builds

Goal:

- move historical modeling data into Warehouse and bring it current through 2026

### Workstream E: New Modeling Foundation Tables

Goal:

- add split-aware canonical model tables including `called_pitch_decisions`

### Workstream F: Audit And Operations Hardening

Goal:

- make audits, QA, and daily operations warehouse-first and reproducible

## Phase Order

### Phase 0: Platform Freeze And Inventory

Status:

- [x] Completed

Tasks:

- [x] verify current local vs Neon counts and cutoffs
- [x] verify current env topology
- [x] document the current-state data inventory
- [x] write the platform architecture source of truth

Primary file targets:

- [data-foundation-spec.md](/Users/colbyreichenbach/Desktop/mlb/abs-observatory/docs/models/data-foundation-spec.md)
- [data-platform-master-plan.md](/Users/colbyreichenbach/Desktop/mlb/abs-observatory/docs/models/data-platform-master-plan.md)

Exit criteria:

- one current data-platform source of truth exists
- verified counts and cutoffs are recorded

### Phase 1: Environment And Database Role Cutover

Status:

- [ ] In progress

Tasks:

- [x] create and document `WAREHOUSE_DATABASE_URL`
- [x] create and document `SERVING_DATABASE_URL`
- [ ] keep `DATABASE_URL` as serving-only in app runtime
- [x] update `.env.example` to show warehouse + serving roles
- [x] define transition compatibility rules for scripts still using `DATABASE_URL`

Primary file targets:

- [.env.example](/Users/colbyreichenbach/Desktop/mlb/abs-observatory/.env.example)
- [docs/launch/vercel-neon-runbook.md](/Users/colbyreichenbach/Desktop/mlb/abs-observatory/docs/launch/vercel-neon-runbook.md)
- [docs/launch/serving-db-policy.md](/Users/colbyreichenbach/Desktop/mlb/abs-observatory/docs/launch/serving-db-policy.md)
- [docs/reference/technical.md](/Users/colbyreichenbach/Desktop/mlb/abs-observatory/docs/reference/technical.md)

Exit criteria:

- env contract is explicit
- warehouse and serving roles are documented consistently
- no core doc still describes a single-DB architecture

### Phase 2: ETL Writer Cutover To Warehouse

Status:

- [x] Completed

Tasks:

- [x] add a shared DB target resolver for ETL scripts
- [x] add `--database-url` override support where missing
- [x] default ETL writes to `WAREHOUSE_DATABASE_URL`
- [x] emit target host/db/role logs at startup

Primary file targets:

- [etl/ingest_mlb_abs.py](/Users/colbyreichenbach/Desktop/mlb/abs-observatory/etl/ingest_mlb_abs.py)
- [etl/ingest_savant_abs_gamefeed.py](/Users/colbyreichenbach/Desktop/mlb/abs-observatory/etl/ingest_savant_abs_gamefeed.py)
- [etl/backfill_statcast_pitch_history.py](/Users/colbyreichenbach/Desktop/mlb/abs-observatory/etl/backfill_statcast_pitch_history.py)
- [etl/build_historical_pitch_states.py](/Users/colbyreichenbach/Desktop/mlb/abs-observatory/etl/build_historical_pitch_states.py)

Dependencies:

- Phase 1

Exit criteria:

- ETL scripts target Warehouse by default
- ETL scripts do not silently write to Serving when Warehouse is configured

### Phase 3: Poller Cutover

Status:

- [x] Completed

Tasks:

- [x] update active poller to run warehouse-targeted ingest only
- [x] update local-window poller to run warehouse-targeted ingest only
- [x] add poll startup banner with target DB role
- [x] point scheduled GitHub Actions poller secret to `WAREHOUSE_DATABASE_URL`
- [x] deprecate any dual-writer polling pattern
- [x] disable and remove the old local launchd poller from active use

Primary file targets:

- [etl/poll_active_games.py](/Users/colbyreichenbach/Desktop/mlb/abs-observatory/etl/poll_active_games.py)
- [etl/poll_local_window.py](/Users/colbyreichenbach/Desktop/mlb/abs-observatory/etl/poll_local_window.py)
- [package.json](/Users/colbyreichenbach/Desktop/mlb/abs-observatory/package.json)

Dependencies:

- Phase 2

Exit criteria:

- there is one canonical poller path
- warehouse is the only poller write target

Current progress:

- GitHub Actions is now the intended live polling authority
- the old Mac launchd poller has been disabled and its plist has been removed from active `~/Library/LaunchAgents`
- the scheduled live polling workflow now includes a follow-on serving publish job after successful warehouse ingest

### Phase 4: Warehouse And Serving Reconciliation Layer

Status:

- [ ] In progress

Tasks:

- [x] create a reconciliation script for Warehouse vs Serving
- [x] compare row counts, min/max dates, and natural-key overlap
- [x] compare `games` by `game_pk`
- [x] compare `abs_challenges` by `dedupe_key`
- [ ] add drift thresholds and failure states
- [x] define where reconciliation artifacts are written

Primary file targets:

- new script recommended:
  - `scripts/reconcile-warehouse-serving.mjs`
- [docs/models/data-foundation-spec.md](/Users/colbyreichenbach/Desktop/mlb/abs-observatory/docs/models/data-foundation-spec.md)
- [docs/models/data-platform-master-plan.md](/Users/colbyreichenbach/Desktop/mlb/abs-observatory/docs/models/data-platform-master-plan.md)

Dependencies:

- Phase 1

Exit criteria:

- silent warehouse/serving drift is no longer possible
- reconciliation can be run on demand and on schedule

### Phase 5: Publish Flow Hardening

Status:

- [x] Completed

Tasks:

- [x] update publish script to default source to `WAREHOUSE_DATABASE_URL`
- [x] update publish script to default target to `SERVING_DATABASE_URL`
- [x] add publish manifest output
- [x] log source and target connection targets
- [x] verify serving relations after publish
- [x] document daily publish sequence

Primary file targets:

- [scripts/publish-serving-db.sh](/Users/colbyreichenbach/Desktop/mlb/abs-observatory/scripts/publish-serving-db.sh)
- new manifest path recommended under:
  - `.runtime/publish-manifests/`
- [docs/launch/serving-db-policy.md](/Users/colbyreichenbach/Desktop/mlb/abs-observatory/docs/launch/serving-db-policy.md)

Dependencies:

- Phase 4

Exit criteria:

- Warehouse -> Serving publish is deterministic
- every publish has a recorded manifest

### Phase 6: 2026 Statcast Backfill

Status:

- [x] Completed

Tasks:

- [x] create/confirm Warehouse Neon schema
- [x] backfill `raw.statcast_games` for `2026-03-26` through latest stable date
- [x] backfill `raw.statcast_pitches` for `2026-03-26` through latest stable date
- [x] add warehouse-aware historical validation command path
- [x] add runbook and npm command surface for `2026` backfill
- [x] document that early `2026` is an engineering and forward-monitoring window, not final publication evidence
- [x] add structured warehouse backfill status reporter
- [x] validate historical game identity
- [x] record initial row counts and date cutoffs

Primary file targets:

- [etl/backfill_statcast_pitch_history.py](/Users/colbyreichenbach/Desktop/mlb/abs-observatory/etl/backfill_statcast_pitch_history.py)
- [etl/validate_historical_games.py](/Users/colbyreichenbach/Desktop/mlb/abs-observatory/etl/validate_historical_games.py)
- [etl/report_warehouse_backfill_status.py](/Users/colbyreichenbach/Desktop/mlb/abs-observatory/etl/report_warehouse_backfill_status.py)
- [data-foundation-spec.md](/Users/colbyreichenbach/Desktop/mlb/abs-observatory/docs/models/data-foundation-spec.md)

Dependencies:

- Phase 2

Exit criteria:

- Warehouse has nonzero `2026` `raw.statcast_games`
- Warehouse has nonzero `2026` `raw.statcast_pitches`
- cutoffs are documented

Current observed warehouse state after completed stable-window backfill:

- `raw.statcast_games`: `166` rows, `2026-03-26` through `2026-04-07`
- `raw.statcast_pitches`: `49,854` rows, `2026-03-26` through `2026-04-07`
- `historical_pitch_states`: `49,854` rows, `2026-03-26` through `2026-04-07`
- `validate_historical_games.py --strict` on `2026-03-26` through `2026-04-07` reported:
  - `Imported games: 166`
  - `Scheduled games: 166`
  - `Missing scheduled games: 0`
  - `Missing team identity: 0`
  - `Missing winner labels: 0`
- interpretation:
  - warehouse is structurally healthy
  - current stable pitch-backed cutoff is `2026-04-07`
  - `2026-04-08` should remain excluded from strict backfill/report commands until pitch-level Statcast is complete
  - warehouse still needs the `2019-2025` historical backbone migrated in before count-state / RE / WE rebuilds can run on the canonical remote source

### Phase 7: Historical State Rebuild

Status:

- [ ] In progress

Tasks:

- [x] identify that Warehouse currently holds only the `2026` forward slice while local still holds the `2019-2025` backbone
- [x] add a dedicated sync command for the pre-2026 historical backbone:
  - `npm run db:sync:historical:warehouse`
- [x] rebuild `historical_pitch_states` for the `2026` backfilled window
- [x] verify 2026 rows exist
- [x] sync `2019-2025` `raw.statcast_games`, `raw.statcast_pitches`, and `historical_pitch_states` from local into Warehouse
- [ ] add split-governance fields or split-materialized companion tables
- [ ] document train/validation/test policy

Primary file targets:

- [etl/build_historical_pitch_states.py](/Users/colbyreichenbach/Desktop/mlb/abs-observatory/etl/build_historical_pitch_states.py)
- [db/schema.sql](/Users/colbyreichenbach/Desktop/mlb/abs-observatory/db/schema.sql)
- [scripts/sync-historical-backbone-to-warehouse.sh](/Users/colbyreichenbach/Desktop/mlb/abs-observatory/scripts/sync-historical-backbone-to-warehouse.sh)
- [data-foundation-spec.md](/Users/colbyreichenbach/Desktop/mlb/abs-observatory/docs/models/data-foundation-spec.md)

Dependencies:

- Phase 6

Exit criteria:

- `historical_pitch_states` in Warehouse includes both the migrated `2019-2025` backbone and the live `2026` window
- split policy is explicit

Current observed Warehouse state after historical backbone sync:

- sync manifest:
  - [historical-backbone-2019-03-20-to-2025-09-28-20260408-165223.json](/Users/colbyreichenbach/Desktop/mlb/abs-observatory/.runtime/historical-backbone-sync/historical-backbone-2019-03-20-to-2025-09-28-20260408-165223.json)
- Warehouse now contains:
  - `raw.statcast_games` historical backbone: `15,480`
  - `raw.statcast_pitches` historical backbone: `4,566,992`
  - `historical_pitch_states` historical backbone: `4,566,992`
  - `historical_pitch_states` live `2026` slice: `49,854`
- interpretation:
  - the canonical remote warehouse now has the full pre-2026 historical backbone plus the current forward window
  - count-state / RE / WE rebuilds are no longer blocked on missing historical Warehouse coverage

### Phase 8: Called-Pitch Canonical Dataset

Status:

- [ ] In progress

Tasks:

- [x] add schema for `modeling.called_pitch_decisions`
- [x] create ETL builder script
- [x] derive one row per taken pitch
- [x] preserve exact `bases_state`
- [x] join challenge outcomes where present
- [x] add geometry versioning and provenance fields
- [x] add split labels
- [x] sync `players` zone-profile table into Warehouse
- [x] complete full ABS raw ingest into Warehouse for spring-to-date challenge coverage
- [x] add artifact-backed status report for `called_pitch_decisions`
- [x] sync live MLB feed context tables into Warehouse for challenge enrichment

Primary file targets:

- [db/schema.sql](/Users/colbyreichenbach/Desktop/mlb/abs-observatory/db/schema.sql)
- [etl/build_called_pitch_decisions.py](/Users/colbyreichenbach/Desktop/mlb/abs-observatory/etl/build_called_pitch_decisions.py)
- [etl/report_called_pitch_decisions_status.py](/Users/colbyreichenbach/Desktop/mlb/abs-observatory/etl/report_called_pitch_decisions_status.py)
- [scripts/sync-players-to-warehouse.mjs](/Users/colbyreichenbach/Desktop/mlb/abs-observatory/scripts/sync-players-to-warehouse.mjs)
- [scripts/sync-live-context-to-warehouse.mjs](/Users/colbyreichenbach/Desktop/mlb/abs-observatory/scripts/sync-live-context-to-warehouse.mjs)
- [data-foundation-spec.md](/Users/colbyreichenbach/Desktop/mlb/abs-observatory/docs/models/data-foundation-spec.md)

Dependencies:

- Phase 6
- Phase 7

Exit criteria:

- `called_pitch_decisions` exists as a canonical warehouse table
- no duplicate natural keys
- challenge linkage reconciles to raw ABS sources

Current observed warehouse state after rebuilt full-window canonical build:

- `modeling.called_pitch_decisions`: `28,557` rows for `2026-02-20` through `2026-04-07`
- composition:
  - `26,646` regular-season rows
  - `1,911` spring-training rows
- challenge coverage in current build:
  - `2,564` rows with `was_challenged = TRUE`
  - `2,564` challenged rows reconciled to `raw.savant_abs_events`
- ABS geometry coverage:
  - `28,557` rows with batter-specific zone bounds
  - `28,369` rows with non-null center-only and radius-adjusted modeled ABS outcomes
- context coverage after Warehouse live-feed sync:
  - `28,557` rows with non-null `bases_state`
  - `1,912` Savant-only rows with non-null `bases_state`
  - `28,557` rows with non-null score context
  - `1,912` Savant-only rows with non-null score context
- split coverage under `called_pitch_decisions_phase_time_v1`:
  - `13,822` train rows
  - `4,967` validation rows
  - `9,768` test rows
- artifact-backed validation:
  - [called-pitch-status-20260408T140553.json](/Users/colbyreichenbach/Desktop/mlb/abs-observatory/.runtime/called-pitch-status/called-pitch-status-20260408T140553.json)
  - strict report passed with zero duplicate natural keys and zero strict failures
- geometry head-to-head validation:
  - [called-pitch-geometry-validation-20260408T140829.json](/Users/colbyreichenbach/Desktop/mlb/abs-observatory/.runtime/called-pitch-geometry/called-pitch-geometry-validation-20260408T140829.json)
  - `center_only` outperformed `radius_adjusted` on the current challenged sample:
    - accuracy: `0.4938` vs `0.4590`
    - overturn precision: `0.5733` vs `0.4707`
    - overturn recall: `0.1922` vs `0.1299`
- current limitation:
  - split policy is provisional and early-window only; it is good enough for current governance, but should be revisited as the 2026 sample grows
  - geometry selection is still provisional until we rerun the comparison on a larger sample and by challenge direction

### Phase 9: Audit Runtime Cutover

Status:

- [ ] In progress

Tasks:

- [x] update audit scripts to default to `WAREHOUSE_DATABASE_URL`
- [x] add explicit startup logging of DB target
- [ ] add explicit startup logging of snapshot/cutoff
- [ ] ensure no audit is run against Serving by accident
- [ ] document audit runtime expectations

Primary file targets:

- [scripts/model-audits](/Users/colbyreichenbach/Desktop/mlb/abs-observatory/scripts/model-audits)
- [docs/models/operating-procedure.md](/Users/colbyreichenbach/Desktop/mlb/abs-observatory/docs/models/operating-procedure.md)

Dependencies:

- Phase 2
- Phase 7

Exit criteria:

- all audits are warehouse-first
- audit runtime is reproducible

### Phase 10: Production Ops Hardening

Status:

- [ ] Not started

Tasks:

- [ ] define DB roles/credentials by responsibility
- [ ] restrict web app to Serving credentials only
- [ ] restrict poller/worker to Warehouse credentials only
- [ ] define publish credential scope
- [ ] define daily ops checklist
- [ ] define incident response for stale serving data

Primary file targets:

- [docs/launch/vercel-neon-runbook.md](/Users/colbyreichenbach/Desktop/mlb/abs-observatory/docs/launch/vercel-neon-runbook.md)
- [docs/launch/serving-db-policy.md](/Users/colbyreichenbach/Desktop/mlb/abs-observatory/docs/launch/serving-db-policy.md)
- [docs/reference/technical.md](/Users/colbyreichenbach/Desktop/mlb/abs-observatory/docs/reference/technical.md)

Dependencies:

- Phase 5
- Phase 9

Exit criteria:

- operational ownership is clear
- failure handling is documented

## Immediate Next Sprint

Recommended next implementation order:

1. Phase 1: environment and database role cutover
2. Phase 2: ETL writer cutover
3. Phase 3: poller cutover
4. Phase 5: publish flow hardening
5. Phase 4: reconciliation layer

Why:

- this establishes the platform authority first
- prevents more drift while deeper modeling work continues

## Definition Of Done

The data-platform rebuild is complete only when all of the following are true:

- [ ] Warehouse Neon is the sole ingest authority
- [ ] Serving Neon is the sole app authority
- [ ] local is no longer the canonical warehouse
- [ ] one-way publish from Warehouse to Serving is live
- [ ] reconciliation runs exist and catch drift
- [ ] Warehouse contains `2026` Statcast history
- [ ] `historical_pitch_states` is current and split-governed
- [ ] `called_pitch_decisions` exists and is documented
- [ ] audits run against Warehouse by default
- [ ] docs and env contracts all agree on the same architecture
