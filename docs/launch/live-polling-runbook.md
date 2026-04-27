# Live Polling Runbook

This runbook describes the current local operator polling setup for AiBS as it exists in the repository today.

Quick command reference:

- [local-poller-commands.md](./local-poller-commands.md)

Use it for:

- local scheduled polling
- serving versus archive poll configuration
- stale-gap recovery behavior
- snapshot pruning policy
- manual backfill and verification steps

This is the active local operator polling path when the macOS LaunchAgent is enabled. Treat it as `launchd -> Warehouse -> Serving`; do not assume GitHub Actions is running this product path.

## 1. Current Local Polling Shape

AiBS currently includes a local scheduled heartbeat with an ET-aware poll gate.

On macOS, that scheduler now runs through a user `launchd` LaunchAgent instead of `cron`.

Current local scheduler shape:

```text
LaunchAgent label: com.colbyreichenbach.aibs-live-poll
LaunchAgent plist: ~/Library/LaunchAgents/com.colbyreichenbach.aibs-live-poll.plist
Program: <repo>/scripts/local-live-poll.sh
Env file: <repo>/.env.poll or POLL_ENV_FILE override
```

The LaunchAgent should run from a non-TCC-protected working directory such as `~/Code`.
macOS background agents cannot reliably execute from `Desktop` or `Downloads`.

That heartbeat is intentionally simple. The scheduler always wakes on ten-minute marks, and the poll gate decides whether real ingest work should run.

Core local scripts:

- `scripts/local-live-poll.sh`
- `etl/poll_live_window.py`
- `etl/ingest_mlb_abs.py`
- `etl/ingest_savant_abs_gamefeed.py`
- `scripts/rebuild-abs-summary-tables.sh`
- `scripts/publish-serving-db.sh`
- `scripts/reconcile-warehouse-serving.mjs`
- `scripts/model-audits/run-abs-product-qa.mjs`
- `etl/prune_source_snapshots.py`

## 2. What The Poll Gate Does

The poll gate uses Eastern Time game windows.

Current behavior:

- if no games are scheduled for the relevant ET date window, it exits quickly
- if games are scheduled but none are live, it exits quickly
- before `4:00 AM ET`, it still considers the previous ET date so late west-coast finishes are not missed
- if the last successful ingest is older than `POLL_STALE_BACKFILL_HOURS`, it can automatically backfill scheduled ET dates
- automatic catch-up is bounded by `POLL_MAX_BACKFILL_DAYS`

This means the scheduler is fixed, but the ingest workload is conditional. When ingest does run, the wrapper now performs the post-ingest trust path:

1. applies warehouse schema/views on a bounded interval
2. refreshes official Savant ABS gamefeed rows for the recent window
3. rebuilds warehouse ABS summary tables from canonical challenge facts
4. runs the ABS QA gate against warehouse
5. publishes the recent warehouse window to serving
6. runs ABS QA against serving
7. reconciles warehouse and serving row coverage, fallback lookup counts, and Savant ABS coverage

## 3. Serving Versus Archive Mode

AiBS now treats serving and raw archive concerns separately.

Hosted mode:

- MLB and Savant ingest target the hosted warehouse
- serving is updated only through `scripts/publish-serving-db.sh`
- the app reads serving through `DATABASE_URL`/`SERVING_DATABASE_URL`
- raw source snapshots can be pruned, but `raw.savant_abs_events` is published because serving canonical views use it for verified ABS geometry

Archive mode:

- target database is local/archive storage
- full raw snapshots can be retained for audit and replay

Current serving-oriented `.env.poll` settings:

```env
WAREHOUSE_DATABASE_URL=<hosted warehouse>
SERVING_DATABASE_URL=<hosted serving>
DATABASE_URL=${SERVING_DATABASE_URL}
POLL_INTERVAL_MINUTES=10
POLL_CATCHUP_HOURS=8
POLL_STALE_BACKFILL_HOURS=8
POLL_MAX_BACKFILL_DAYS=7

RUN_SAVANT_REFRESH=true
RUN_ABS_SUMMARY_REBUILD=true
RUN_WAREHOUSE_ABS_QA=true
RUN_SERVING_PUBLISH=true
RUN_SERVING_ABS_QA=true
RUN_WAREHOUSE_SERVING_RECONCILE=true

WRITE_RAW_SNAPSHOTS=true
WRITE_RAW_FEED_LIVE=true
WRITE_RAW_STANDINGS=false
WRITE_RAW_SAVANT=true

RUN_SNAPSHOT_PRUNE=true
FEED_LIVE_RETENTION_DAYS=14
STANDINGS_RETENTION_DAYS=0
SAVANT_RETENTION_DAYS=0
```

The important design point is:

- the hosted warehouse is canonical
- the hosted serving database is derived
- serving only updates after warehouse QA succeeds

## 4. Structured Live Serving

Game scoreboards are now backed by `ops.game_linescores`.

That table is populated during MLB feed ingest and acts as the serving-friendly scoreboard state for:

- preview games
- live games
- final games

The app still has a direct MLB fallback path, but structured linescores are now the primary source for scoreboard rendering.

## 5. Snapshot Pruning Policy

Current intended serving policy:

- `mlb_statsapi.feed_live`
  - recent-only retention
- `mlb_statsapi.standings`
  - prune from serving DB
- `baseball_savant.gamefeed`
  - prune from serving DB

The initial serving retention window is:

- `feed_live`: `14` days
- `standings`: `0` days
- `savant`: `0` days

This keeps the hosted database focused on serving data instead of long-term raw archive storage.

## 6. Manual Backfill

If the machine is offline long enough that the automatic stale-gap catch-up is not sufficient, run a manual window ingest.

Example:

```bash
cd "$AIBS_ROOT"
set -a
source "${POLL_ENV_FILE:-.env.poll}"
set +a
python3 etl/ingest_mlb_abs.py --start-date 2026-04-01 --end-date 2026-04-03 --game-type S,R
```

Use `--skip-final-existing` only when you intentionally want to avoid reprocessing already-final games. Do not use that flag for linescore backfills when the goal is to populate structured live-state coverage for older games.

## 7. Verification Checklist

After poller or retention changes, verify:

1. latest `etl_runs` row completed successfully
2. `ops.game_linescores` is receiving fresh updates
3. `ingest_errors` does not contain new repeated failures
4. the freshness indicator is visible on data routes
5. `raw.savant_abs_events` is current in warehouse and serving
6. `mart_abs_pitch_challenges` counts reconcile between warehouse and serving
7. game scoreboards render correctly for preview, live, and final games

Helpful queries:

```sql
SELECT status, started_at, finished_at, rows_written
FROM etl_runs
ORDER BY started_at DESC
LIMIT 5;
```

```sql
SELECT COUNT(*) AS linescore_rows, MAX(updated_at) AS latest_linescore_update
FROM ops.game_linescores;
```

```sql
SELECT source_name, COUNT(*) AS rows, MIN(fetched_at) AS oldest, MAX(fetched_at) AS newest
FROM ops.source_snapshots
GROUP BY source_name
ORDER BY source_name;
```

```sql
SELECT COUNT(*) AS canonical_abs_pitch_challenges
FROM mart_abs_pitch_challenges;
```

```sql
SELECT COUNT(*) AS savant_abs_rows, MAX(game_date) AS latest_savant_game_date
FROM raw.savant_abs_events;
```

## 8. Operational Notes

- on macOS, the local scheduler is a `launchd` LaunchAgent rather than a crontab entry
- the local machine can let the display sleep, but the computer itself must stay awake for the scheduler to run on time
- when the machine wakes after an outage, the poller resumes automatically on the next 5-minute tick
- stale `etl_runs` bookkeeping can be corrected separately if an interrupted local run leaves an orphaned `running` row

The system should be thought of as:

- fixed heartbeat
- ET-aware work gate
- canonical warehouse ingest
- official Savant geometry refresh
- QA-gated serving publish
- bounded automatic recovery
- explicit manual backfill when needed
