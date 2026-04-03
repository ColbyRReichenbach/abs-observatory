# Live Polling Runbook

This runbook describes the current live polling setup for AiBS as it exists in the repository today.

Use it for:

- local cron polling
- serving versus archive poll configuration
- stale-gap recovery behavior
- snapshot pruning policy
- manual backfill and verification steps

## 1. Current Polling Shape

AiBS currently uses a local cron heartbeat with an ET-aware poll gate.

Current cron entry:

```cron
*/5 * * * * /Users/colbyreichenbach/Desktop/mlb/abs-observatory-doc-update-debug/scripts/local-live-poll.sh
```

That heartbeat is intentionally simple. The cron job always wakes every five minutes, and the poll gate decides whether real ingest work should run.

Core scripts:

- `scripts/local-live-poll.sh`
- `etl/poll_live_window.py`
- `etl/ingest_mlb_abs.py`
- `etl/prune_source_snapshots.py`

## 2. What The Poll Gate Does

The poll gate uses Eastern Time game windows.

Current behavior:

- if no games are scheduled for the relevant ET date window, it exits quickly
- if games are scheduled but none are live, it exits quickly
- before `4:00 AM ET`, it still considers the previous ET date so late west-coast finishes are not missed
- if the last successful ingest is older than `POLL_STALE_BACKFILL_HOURS`, it can automatically backfill scheduled ET dates
- automatic catch-up is bounded by `POLL_MAX_BACKFILL_DAYS`

This means the scheduler is fixed, but the ingest workload is conditional.

## 3. Serving Versus Archive Mode

AiBS now treats serving and raw archive concerns separately.

Serving mode:

- target database is the hosted serving database
- structured serving data is written
- raw heavy sources should be minimized
- snapshot pruning is enabled

Archive mode:

- target database is local/archive storage
- full raw snapshots can be retained for audit and replay

Current serving-oriented `.env.poll` settings:

```env
POLL_INTERVAL_MINUTES=5
POLL_CATCHUP_HOURS=8
POLL_STALE_BACKFILL_HOURS=8
POLL_MAX_BACKFILL_DAYS=7

WRITE_RAW_SNAPSHOTS=true
WRITE_RAW_FEED_LIVE=false
WRITE_RAW_STANDINGS=false
WRITE_RAW_SAVANT=false

RUN_SNAPSHOT_PRUNE=true
FEED_LIVE_RETENTION_DAYS=14
STANDINGS_RETENTION_DAYS=0
SAVANT_RETENTION_DAYS=0
```

The important design point is:

- the hosted serving database keeps structured live state
- raw archive material is retained outside the hosted serving footprint

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
cd /Users/colbyreichenbach/Desktop/mlb/abs-observatory-doc-update-debug
set -a
source .env.poll
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
5. game scoreboards render correctly for preview, live, and final games

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

## 8. Operational Notes

- the local machine can let the display sleep, but the computer itself must stay awake for cron to run on schedule
- when the machine wakes after an outage, the poller resumes automatically on the next 5-minute tick
- stale `etl_runs` bookkeeping can be corrected separately if an interrupted local run leaves an orphaned `running` row

The system should be thought of as:

- fixed heartbeat
- ET-aware work gate
- structured serving writes
- bounded automatic recovery
- explicit manual backfill when needed
