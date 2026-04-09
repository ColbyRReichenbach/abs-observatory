# Local Poller Commands

This file is the quick command sheet for the macOS `launchd`-based live poller.

Current setup:

- LaunchAgent label: `com.colbyreichenbach.aibs-live-poll`
- LaunchAgent plist: `/Users/colbyreichenbach/Library/LaunchAgents/com.colbyreichenbach.aibs-live-poll.plist`
- Poller repo: `/Users/colbyreichenbach/Code/abs-observatory-polling`
- Poller env file: `/Users/colbyreichenbach/Code/abs-observatory-polling/.env.poll`

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
launchctl bootout gui/$(id -u) /Users/colbyreichenbach/Library/LaunchAgents/com.colbyreichenbach.aibs-live-poll.plist 2>/dev/null || true
launchctl bootstrap gui/$(id -u) /Users/colbyreichenbach/Library/LaunchAgents/com.colbyreichenbach.aibs-live-poll.plist
```

This reloads the LaunchAgent and runs it immediately because `RunAtLoad` is enabled.

## Stop the poller

```bash
launchctl bootout gui/$(id -u) /Users/colbyreichenbach/Library/LaunchAgents/com.colbyreichenbach.aibs-live-poll.plist
```

## View poll logs

Main poll log:

```bash
tail -n 40 /Users/colbyreichenbach/Code/abs-observatory-polling/.runtime/live-poll/poll.log
```

Error log:

```bash
tail -n 40 /Users/colbyreichenbach/Code/abs-observatory-polling/.runtime/live-poll/error.log
```

LaunchAgent stderr log:

```bash
tail -n 40 /Users/colbyreichenbach/Code/abs-observatory-polling/.runtime/live-poll/launchd.err.log
```

## Follow logs live

```bash
tail -f /Users/colbyreichenbach/Code/abs-observatory-polling/.runtime/live-poll/poll.log
```

## Run the poller manually once

```bash
cd /Users/colbyreichenbach/Code/abs-observatory-polling
./scripts/local-live-poll.sh
```

## Run a manual backfill window

```bash
cd /Users/colbyreichenbach/Code/abs-observatory-polling
set -a
source .env.poll
set +a
python3 etl/ingest_mlb_abs.py --start-date 2026-04-01 --end-date 2026-04-03 --game-type S,R
```

Use `--skip-final-existing` only when you explicitly want to avoid reprocessing already-final games.

## Check the latest ETL rows in the database

```bash
cd /Users/colbyreichenbach/Code/abs-observatory-polling
set -a
source .env.poll
set +a
psql "$DATABASE_URL" -Atc "
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
cd /Users/colbyreichenbach/Code/abs-observatory-polling
set -a
source .env.poll
set +a
psql "$DATABASE_URL" -Atc "
select count(*) as linescore_rows,
       max(updated_at at time zone 'America/New_York')
from ops.game_linescores;
"
```

## Notes

- The scheduler runs on exact `:00`, `:05`, `:10`, `:15`, `:20`, `:25`, `:30`, `:35`, `:40`, `:45`, `:50`, and `:55` minute marks.
- Display sleep is fine. The machine itself still needs to remain awake for the scheduler to fire on time.
- This setup replaced the old `cron` job because macOS was blocking execution from the `Desktop` path.
