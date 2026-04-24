# Local Poller Commands

This file is the quick command sheet for the macOS `launchd`-based live poller.

These commands assume:

- LaunchAgent label: `com.colbyreichenbach.aibs-live-poll`
- a user LaunchAgent plist at `~/Library/LaunchAgents/com.colbyreichenbach.aibs-live-poll.plist`
- a repo checkout rooted at `$AIBS_ROOT`
- a poll env file at `$AIBS_ROOT/.env.poll` or another path injected through `POLL_ENV_FILE`

Example local setup:

```bash
export AIBS_ROOT="$HOME/Code/abs-observatory-polling"
export AIBS_PLIST="$HOME/Library/LaunchAgents/com.colbyreichenbach.aibs-live-poll.plist"
```

## Check status

```bash
launchctl print gui/$(id -u)/com.colbyreichenbach.aibs-live-poll
```

Useful signals:

- `state = not running`
  - normal between scheduled runs
- `last exit code = 0`
  - last run completed successfully

## Start or reload the poller

```bash
launchctl bootout gui/$(id -u) "$AIBS_PLIST" 2>/dev/null || true
launchctl bootstrap gui/$(id -u) "$AIBS_PLIST"
```

This reloads the LaunchAgent and runs it immediately because `RunAtLoad` is enabled.

## Stop the poller

```bash
launchctl bootout gui/$(id -u) "$AIBS_PLIST"
```

## View poll logs

Main poll log:

```bash
tail -n 40 "$AIBS_ROOT/.runtime/live-poll/poll.log"
```

Error log:

```bash
tail -n 40 "$AIBS_ROOT/.runtime/live-poll/error.log"
```

LaunchAgent stderr log:

```bash
tail -n 40 "$AIBS_ROOT/.runtime/live-poll/launchd.err.log"
```

## Follow logs live

```bash
tail -f "$AIBS_ROOT/.runtime/live-poll/poll.log"
```

## Run the poller manually once

```bash
cd "$AIBS_ROOT"
./scripts/local-live-poll.sh
```

The manual run uses the same product path as launchd: Warehouse ingest, Savant refresh, warehouse QA, serving publish, serving QA, and warehouse/serving reconciliation whenever real ingest runs.

## Run a manual backfill window

```bash
cd "$AIBS_ROOT"
set -a
source "${POLL_ENV_FILE:-.env.poll}"
set +a
python3 etl/ingest_mlb_abs.py --start-date 2026-04-01 --end-date 2026-04-03 --game-type S,R
```

Use `--skip-final-existing` only when you explicitly want to avoid reprocessing already-final games.

## Check the latest warehouse ETL rows

```bash
cd "$AIBS_ROOT"
set -a
source "${POLL_ENV_FILE:-.env.poll}"
set +a
psql "$WAREHOUSE_DATABASE_URL" -Atc "
select run_type, status,
       to_char(started_at at time zone 'America/New_York','YYYY-MM-DD HH24:MI:SS'),
       to_char(finished_at at time zone 'America/New_York','YYYY-MM-DD HH24:MI:SS'),
       rows_written
from etl_runs
order by started_at desc
limit 5;
"
```

## Check structured linescore freshness

```bash
cd "$AIBS_ROOT"
set -a
source "${POLL_ENV_FILE:-.env.poll}"
set +a
psql "$DATABASE_URL" -Atc "
select count(*) as linescore_rows,
       max(updated_at at time zone 'America/New_York')
from ops.game_linescores;
"
```

## Check Savant ABS coverage

```bash
cd "$AIBS_ROOT"
set -a
source "${POLL_ENV_FILE:-.env.poll}"
set +a
psql "$WAREHOUSE_DATABASE_URL" -Atc "
select count(*) as savant_abs_rows, max(game_date) as latest_savant_game_date
from raw.savant_abs_events;
"
```

## Notes

- The scheduler runs on exact `:00`, `:05`, `:10`, `:15`, `:20`, `:25`, `:30`, `:35`, `:40`, `:45`, `:50`, and `:55` minute marks.
- Display sleep is fine. The machine itself still needs to remain awake for the scheduler to fire on time.
- This setup replaced the old `cron` job because macOS background execution was unreliable from TCC-protected paths such as `Desktop` or `Downloads`.
