# Warehouse Backfill Runbook

Status: `Current Source Of Truth`

Last updated: April 8, 2026

## Purpose

This runbook defines the exact operational sequence for backfilling current-season Statcast history into `Warehouse Neon` and rebuilding the canonical historical state table.

Use it for:

- `2026` Statcast backfill
- `historical_pitch_states` rebuild
- warehouse validation after backfill

This runbook assumes the environment contract defined in:

- [serving-db-policy.md](./serving-db-policy.md)
- [serving-publish-contract.md](./serving-publish-contract.md)
- [data-platform-master-plan.md](/Users/colbyreichenbach/Downloads/mlb/abs-observatory/docs/models/data-platform-master-plan.md)

## Preconditions

Before running a warehouse backfill:

1. `WAREHOUSE_DATABASE_URL` is set to the canonical warehouse database.
2. Warehouse schema has been applied.
3. ETL dependencies are installed from [etl/requirements.txt](/Users/colbyreichenbach/Downloads/mlb/abs-observatory/etl/requirements.txt).
4. No one is treating local Postgres as the canonical warehouse.

## Commands

### 1. Dry-run smoke test for one day

Use this first to confirm:

- pybaseball access works
- schedule fetch works
- env points to the intended warehouse

```bash
python3 etl/backfill_statcast_pitch_history.py \
  --start-date 2026-03-26 \
  --end-date 2026-03-26 \
  --dry-run
```

### 2. Full current-season Statcast backfill

```bash
python3 etl/backfill_statcast_pitch_history.py \
  --start-date 2026-03-26 \
  --end-date 2026-04-07 \
  --resume
```

### 3. Historical state rebuild for the same window

```bash
python3 etl/build_historical_pitch_states.py \
  --start-date 2026-03-26 \
  --end-date 2026-04-07
```

### 4. Game identity validation

```bash
python3 etl/validate_historical_games.py \
  --start-date 2026-03-26 \
  --end-date 2026-04-07 \
  --strict
```

Important:

- ABS challenge-event coverage begins before regular season
- the Statcast backfill path in this repo is scoped to regular-season schedule games
- use the first regular-season date in scope for Statcast backfill commands

## Suggested NPM Surface

The repo exposes these equivalent commands:

```bash
npm run etl:backfill:2026
npm run etl:build:historical:2026
npm run etl:validate:historical:2026
npm run etl:report:historical:2026
```

## Expected Outputs

After successful backfill:

- `raw.statcast_games` has `2026` rows in Warehouse
- `raw.statcast_pitches` has `2026` rows in Warehouse
- `historical_pitch_states` has `2026` rows in Warehouse
- validation shows no unacceptable schedule identity gaps

## Post-Backfill Verification Queries

Run these checks on Warehouse:

```sql
select min(game_date), max(game_date), count(*) from raw.statcast_games where season = 2026;
select min(game_date), max(game_date), count(*) from raw.statcast_pitches where season = 2026;
select min(game_date), max(game_date), count(*) from historical_pitch_states where season = 2026;
```

Or run the structured reporter:

```bash
python3 etl/report_warehouse_backfill_status.py \
  --start-date 2026-03-26 \
  --end-date 2026-04-07 \
  --strict
```

The reporter verifies:

- `raw.statcast_games` row count and date coverage
- `raw.statcast_pitches` row count and date coverage
- `historical_pitch_states` row count and date coverage
- warehouse target host/db provenance
- a JSON artifact under `.runtime/backfill-status/`

Before the backfill runs, `--strict` is expected to fail for the target window if Warehouse does not yet contain `2026` Statcast history. That failure is the correct baseline, not an unexpected error.

Current stable cutoff note:

- as of `2026-04-08`, the latest fully pitch-backed Statcast date in Warehouse is `2026-04-07`
- `2026-04-08` schedule rows may exist before pitch-level Statcast is fully available
- use `2026-04-07` as the stable backfill/report cutoff until `2026-04-08` pitch rows are available

## Failure Handling

If backfill fails:

1. inspect the last successful checkpoint in `etl/.statcast_backfill_checkpoint.json`
2. fix env or dependency issues
3. rerun with `--resume`

If validation fails:

1. inspect missing schedule games
2. inspect missing team identity rows
3. inspect missing winner labels
4. do not proceed to model rebuild claims until resolved
