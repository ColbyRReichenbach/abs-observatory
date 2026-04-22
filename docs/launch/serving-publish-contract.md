# Serving Publish Contract

Status: `Current Source Of Truth`

Last updated: April 8, 2026

## Purpose

This document defines exactly how data moves from `Warehouse Neon` into `Serving Neon`.

It answers:

- which tables are published
- which tables are never published
- the warehouse source for each serving relation
- the natural key for reconciliation
- the publish method
- the refresh cadence
- the retention rule

This is the canonical slicing contract for the AiBS production-serving database.

## Governing Rules

1. `Warehouse Neon` is the source of truth.
2. `Serving Neon` receives a curated subset only.
3. No app route may depend on a warehouse-only table.
4. No training table may be copied into serving unless it is explicitly approved as a compact serving artifact.
5. Every published relation must have:
   - a warehouse source
   - a natural key
   - a publish method
   - a cadence
   - a retention policy
6. If a relation does not have a contract row below, it is not part of the serving publish scope.

## Publish Methods

Use one of these methods for each relation.

### `full_refresh`

Definition:

- replace the entire serving relation on publish

Use for:

- small reference tables
- compact lookup tables
- deterministic summary tables

### `incremental_upsert`

Definition:

- insert/update only changed rows using natural keys

Use for:

- current-season operational tables
- hot app-facing baseball tables

### `never_publish`

Definition:

- relation remains warehouse-only

Use for:

- raw historical ingest
- training tables
- source payload archives
- full modeling tables

## Serving Table Contracts

### Core App Baseball Tables

| Serving Relation | Warehouse Source | Natural Key | Publish Method | Cadence | Retention | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `public.games` | `public.games` | `game_pk` | `incremental_upsert` | after each live ingest batch and daily finalization | season and historical app records as needed | hot app-facing canonical game table |
| `public.teams` | `public.teams` | `team_id` | `full_refresh` | on schema/bootstrap and when team metadata changes | indefinite | small reference table |
| `public.players` | `public.players` | `player_id` | `incremental_upsert` | daily or after player-profile sync | indefinite | compact serving-safe identity/profile use |
| `public.officials` | `public.officials` | `game_pk, official_id, official_type` | `incremental_upsert` | after live ingest batch | season and historical app records as needed | page-facing game official rows |
| `public.at_bats` | `public.at_bats` | `game_pk, at_bat_index` | `incremental_upsert` | after live ingest batch | prefer recent-only if serving storage pressure increases | hot detail table |
| `public.play_events` | `public.play_events` | `game_pk, at_bat_index, play_event_index` | `incremental_upsert` | after live ingest batch | prefer recent-only if serving storage pressure increases | hot detail table |
| `public.pitches` | `public.pitches` | `game_pk, at_bat_index, pitch_number` | `incremental_upsert` | after live ingest batch | prefer recent-only if serving storage pressure increases | hot detail table |
| `public.game_state_snapshots` | `public.game_state_snapshots` | `game_pk, snapshot_at` or canonical PK from schema | `incremental_upsert` | after live ingest batch | prefer recent-only if serving storage pressure increases | hot detail/state table |
| `public.abs_challenges` | `public.abs_challenges` | `dedupe_key` | `incremental_upsert` | after live ingest batch | indefinite for challenge history shown in product | natural-key reconciliation must use `dedupe_key`, not UUID |

### Serving Summary And Editorial Tables

| Serving Relation | Warehouse Source | Natural Key | Publish Method | Cadence | Retention | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `public.team_abs_game_summary` | `public.team_abs_game_summary` | `game_pk, team_id` | `incremental_upsert` | after live ingest batch | indefinite | page-facing team challenge summary |
| `public.umpire_abs_game_summary` | `public.umpire_abs_game_summary` | `game_pk, official_id` or canonical PK from schema | `incremental_upsert` | after live ingest batch | indefinite | page-facing umpire summary |
| `public.game_reports` | `public.game_reports` | `game_pk` | `incremental_upsert` | after report generation | indefinite | editorial output table |

### Compact Model Output Tables

| Serving Relation | Warehouse Source | Natural Key | Publish Method | Cadence | Retention | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `public.serving_run_expectancy_fallbacks` | `mart_run_expectancy_fallbacks` | fallback tier + state columns | `full_refresh` | after RE rebuild or model publish | replace on publish | compact lookup artifact only |
| `public.serving_win_expectancy_fallbacks` | `mart_win_expectancy_fallbacks` | fallback tier + state columns | `full_refresh` | after WE rebuild or model publish | replace on publish | compact lookup artifact only |
| `public.serving_count_state_outcome_baselines` | warehouse count-state aggregate query | `count_key` | `full_refresh` | after count-state rebuild or model publish | replace on publish | compact lookup artifact only |
| future compact decision/output tables | warehouse audited output tables | documented per-table | `full_refresh` unless proven hot-path need | after model publish | replace on publish | do not publish full training tables |

### Shared Raw ABS Tables

| Serving Relation | Warehouse Source | Natural Key | Publish Method | Cadence | Retention | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `raw.savant_abs_events` | `raw.savant_abs_events` | `game_pk, play_id, pitch_number` | `incremental_upsert` | after Savant ingest batch | current contract allows serving presence; revisit later | tolerated in serving because it powers current challenge surfaces, but still logically raw |

## Warehouse-Only Relations

These must remain out of Serving unless this contract is explicitly amended.

| Warehouse Relation | Reason | Publish Method |
| --- | --- | --- |
| `raw.statcast_games` | large raw historical ingest table | `never_publish` |
| `raw.statcast_pitches` | large raw historical pitch table | `never_publish` |
| `raw.savant_gamefeed_games` | raw source table not needed by app routes | `never_publish` |
| `ops.source_snapshots` | source payload archive and traceability layer | `never_publish` |
| `public.historical_pitch_states` | model-training canonical state table | `never_publish` |
| `modeling.called_pitch_decisions` | full modeling table for challenge-now and geometry work | `never_publish` |
| split-materialized training/eval tables | audit/training only | `never_publish` |

## Cadence Rules

### Live operational publish

After successful live ingest into Warehouse:

1. update current-season operational tables
2. run reconciliation checks
3. publish operational serving tables

Applies primarily to:

- `games`
- `pitches`
- `at_bats`
- `play_events`
- `game_state_snapshots`
- `abs_challenges`
- summary tables

### Model publish

After a model rebuild in Warehouse:

1. validate warehouse artifacts
2. publish compact serving lookup tables
3. record publish manifest

Applies primarily to:

- `serving_run_expectancy_fallbacks`
- `serving_win_expectancy_fallbacks`
- `serving_count_state_outcome_baselines`
- future compact recommendation outputs

## Retention Rules

### Keep indefinitely in Serving

- reference tables
- summary tables
- compact model lookup tables
- editorial outputs
- challenge history used by product surfaces

### Eligible for recent-only retention in Serving

- `pitches`
- `play_events`
- `at_bats`
- `game_state_snapshots`

Recommended policy if serving storage pressure increases:

- keep full-detail rows for the most recent `30-45` days
- keep summary and challenge surfaces indefinitely
- regenerate older detail from Warehouse when needed

## Reconciliation Rules

Every published relation must be reconcilable by natural key.

Current required reconciliation keys:

- `public.games` -> `game_pk`
- `public.abs_challenges` -> `dedupe_key`
- `public.pitches` -> `game_pk, at_bat_index, pitch_number`
- `public.at_bats` -> `game_pk, at_bat_index`
- `public.play_events` -> `game_pk, at_bat_index, play_event_index`
- `raw.savant_abs_events` -> `game_pk, play_id, pitch_number`

If a table cannot be reconciled by a stable natural key, it should not be part of the publish contract until fixed.

## Current Implementation Notes

Current repo behavior already supports part of this contract:

- [scripts/publish-serving-db.sh](/Users/colbyreichenbach/Downloads/mlb/abs-observatory/scripts/publish-serving-db.sh) performs the current publish flow
- [scripts/reconcile-warehouse-serving.mjs](/Users/colbyreichenbach/Downloads/mlb/abs-observatory/scripts/reconcile-warehouse-serving.mjs) performs current drift checks

Current gaps:

- hot operational tables still need a fuller incremental publish strategy
- publish manifests exist, but publish method is still primarily dump/restore plus compact table reload
- some future compact model outputs are not yet defined

## Amendment Rule

Any new serving relation must be added to this contract before it is published.

That amendment must specify:

- warehouse source
- natural key
- publish method
- cadence
- retention
- whether reconciliation is required before publish
