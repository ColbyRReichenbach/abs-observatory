#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG_DIR="$ROOT_DIR/.runtime/live-poll"
LOCK_DIR="$ROOT_DIR/.runtime/live-poll.lock"

# Cron on macOS runs with a very small environment.
export PATH="/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin:/Library/Frameworks/Python.framework/Versions/3.10/bin"

load_env_file() {
  local env_file="$1"
  if [[ -f "$env_file" ]]; then
    set +u
    set -a
    # shellcheck disable=SC1090
    . "$env_file"
    set +a
    set -u
  fi
}

# Use an explicit env file when provided, otherwise fall back to common local paths.
if [[ -n "${POLL_ENV_FILE:-}" ]]; then
  load_env_file "$POLL_ENV_FILE"
else
  load_env_file "$ROOT_DIR/.env.local"
  load_env_file "$ROOT_DIR/.env"
  load_env_file "/Users/colbyreichenbach/Desktop/mlb/abs-observatory/.env.local"
  load_env_file "/Users/colbyreichenbach/Desktop/mlb/abs-observatory/.env"
  load_env_file "$ROOT_DIR/.env.poll"
fi

mkdir -p "$LOG_DIR"

timestamp() {
  date '+%Y-%m-%d %H:%M:%S'
}

is_true() {
  case "${1:-false}" in
    true | TRUE | 1 | yes | YES | y | Y) return 0 ;;
    *) return 1 ;;
  esac
}

is_local_database_url() {
  python3 - "$1" <<'PY'
import sys
from urllib.parse import urlparse

parsed = urlparse(sys.argv[1])
host = parsed.hostname
path = parsed.path.lstrip("/")
is_local = host in (None, "", "localhost", "127.0.0.1", "::1") or (
    host is None and path == "abs_observatory"
)
print("true" if is_local else "false")
PY
}

json_value() {
  local file="$1"
  local key="$2"
  python3 - "$file" "$key" <<'PY'
import json
import sys

path, key = sys.argv[1:3]
try:
    with open(path, "r", encoding="utf-8") as handle:
        value = json.load(handle)
except FileNotFoundError:
    print("")
    raise SystemExit(0)

for part in key.split("."):
    if not isinstance(value, dict):
        value = None
        break
    value = value.get(part)

if isinstance(value, bool):
    print("true" if value else "false")
elif value is None:
    print("")
else:
    print(value)
PY
}

date_window_start() {
  local end_date="$1"
  local days="$2"
  python3 - "$end_date" "$days" <<'PY'
from datetime import date, timedelta
import sys

end_date = date.fromisoformat(sys.argv[1])
days = max(int(sys.argv[2]), 1)
print((end_date - timedelta(days=days - 1)).isoformat())
PY
}

should_run_interval_task() {
  local task_name="$1"
  local interval_minutes="$2"
  local stamp_file="$LOG_DIR/${task_name}.stamp"

  if [[ "$interval_minutes" -le 0 || ! -f "$stamp_file" ]]; then
    return 0
  fi

  local now
  local last
  now="$(date +%s)"
  last="$(cat "$stamp_file" 2>/dev/null || echo 0)"
  if [[ $((now - last)) -ge $((interval_minutes * 60)) ]]; then
    return 0
  fi
  return 1
}

mark_interval_task() {
  local task_name="$1"
  date +%s >"$LOG_DIR/${task_name}.stamp"
}

pid_is_running() {
  local pid="$1"
  [[ "$pid" =~ ^[0-9]+$ ]] && kill -0 "$pid" 2>/dev/null
}

acquire_lock() {
  if mkdir "$LOCK_DIR" 2>/dev/null; then
    echo "$$" >"$LOCK_DIR/pid"
    return 0
  fi

  local lock_pid=""
  if [[ -f "$LOCK_DIR/pid" ]]; then
    lock_pid="$(cat "$LOCK_DIR/pid" 2>/dev/null || true)"
  fi

  if [[ -n "$lock_pid" ]] && pid_is_running "$lock_pid"; then
    echo "[$(timestamp)] live poll already running pid=$lock_pid; exiting" >>"$LOG_DIR/poll.log"
    exit 0
  fi

  local now
  local mtime
  local age_seconds
  local stale_seconds
  now="$(date +%s)"
  mtime="$(stat -f %m "$LOCK_DIR" 2>/dev/null || echo 0)"
  age_seconds=$((now - mtime))
  stale_seconds=$((${LOCK_STALE_MINUTES:-180} * 60))

  if [[ -z "$lock_pid" || "$age_seconds" -ge "$stale_seconds" ]]; then
    echo "[$(timestamp)] removing stale live poll lock pid=${lock_pid:-unknown} age_seconds=$age_seconds" >>"$LOG_DIR/poll.log"
    rm -rf "$LOCK_DIR"
    if mkdir "$LOCK_DIR" 2>/dev/null; then
      echo "$$" >"$LOCK_DIR/pid"
      return 0
    fi
  fi

  echo "[$(timestamp)] live poll lock exists but could not be recovered; exiting" >>"$LOG_DIR/poll.log"
  exit 0
}

if [[ -z "${WAREHOUSE_DATABASE_URL:-}" ]]; then
  if [[ -n "${DATABASE_URL:-}" ]] && is_true "${ALLOW_DATABASE_URL_POLL_TARGET:-false}"; then
    export WAREHOUSE_DATABASE_URL="$DATABASE_URL"
  else
    echo "[$(timestamp)] WAREHOUSE_DATABASE_URL is not set; refusing to poll an implicit local or serving database" >>"$LOG_DIR/error.log"
    exit 1
  fi
fi

if [[ "$(is_local_database_url "$WAREHOUSE_DATABASE_URL")" == "true" ]] && ! is_true "${ALLOW_LOCAL_WAREHOUSE_POLL:-false}"; then
  echo "[$(timestamp)] WAREHOUSE_DATABASE_URL resolves to a local database; set ALLOW_LOCAL_WAREHOUSE_POLL=true only for intentional local archive polling" >>"$LOG_DIR/error.log"
  exit 1
fi

export DATABASE_URL="${DATABASE_URL:-$WAREHOUSE_DATABASE_URL}"

if is_true "${RUN_SERVING_PUBLISH:-true}" && [[ -z "${SERVING_DATABASE_URL:-}" ]]; then
  echo "[$(timestamp)] RUN_SERVING_PUBLISH=true but SERVING_DATABASE_URL is not set; refusing to ingest data that cannot be published" >>"$LOG_DIR/error.log"
  exit 1
fi

acquire_lock

cleanup() {
  if [[ -f "$LOCK_DIR/pid" ]] && [[ "$(cat "$LOCK_DIR/pid" 2>/dev/null || true)" == "$$" ]]; then
    rm -f "$LOCK_DIR/pid"
    rmdir "$LOCK_DIR" 2>/dev/null || true
  fi
}
trap cleanup EXIT

PYTHON_BIN="${PYTHON_BIN:-$(command -v python3)}"
POLL_RESULT_FILE="$LOG_DIR/poll-result.json"
export POLL_RESULT_FILE

{
  echo "[$(timestamp)] starting local live poll"
  rm -f "$POLL_RESULT_FILE"

  if is_true "${RUN_SCHEMA_ON_POLL:-true}"; then
    if should_run_interval_task "schema" "${SCHEMA_REFRESH_INTERVAL_MINUTES:-60}"; then
      echo "[$(timestamp)] applying warehouse schema/views"
      SCHEMA_DATABASE_URL="$WAREHOUSE_DATABASE_URL" bash "$ROOT_DIR/scripts/run-db-schema.sh"
      mark_interval_task "schema"
      echo "[$(timestamp)] completed warehouse schema/views"
    else
      echo "[$(timestamp)] warehouse schema/views recently applied; skipping"
    fi
  fi

  "$PYTHON_BIN" "$ROOT_DIR/etl/poll_live_window.py"

  poll_ran_ingest="$(json_value "$POLL_RESULT_FILE" "ran_ingest")"
  poll_mode="$(json_value "$POLL_RESULT_FILE" "mode")"
  poll_start_date="$(json_value "$POLL_RESULT_FILE" "start_date")"
  poll_end_date="$(json_value "$POLL_RESULT_FILE" "end_date")"
  echo "[$(timestamp)] poll result mode=${poll_mode:-unknown} ran_ingest=${poll_ran_ingest:-false} window=${poll_start_date:-none}..${poll_end_date:-none}"

  if [[ "$poll_ran_ingest" == "true" ]] || is_true "${RUN_POSTPROCESS_WITHOUT_INGEST:-false}"; then
    savant_end_date="${SAVANT_REFRESH_END_DATE:-${poll_end_date:-}}"
    if [[ -z "$savant_end_date" ]]; then
      savant_end_date="$(python3 - <<'PY'
from datetime import datetime
from zoneinfo import ZoneInfo

print(datetime.now(ZoneInfo("America/New_York")).date().isoformat())
PY
)"
    fi
    savant_start_date="${SAVANT_REFRESH_START_DATE:-$(date_window_start "$savant_end_date" "${SAVANT_REFRESH_DAYS:-3}")}"

    if is_true "${RUN_SAVANT_REFRESH:-true}"; then
      if should_run_interval_task "savant" "${SAVANT_REFRESH_INTERVAL_MINUTES:-0}"; then
        echo "[$(timestamp)] refreshing Savant ABS gamefeed rows window=$savant_start_date..$savant_end_date"
        "$PYTHON_BIN" "$ROOT_DIR/etl/ingest_savant_abs_gamefeed.py" \
          --start-date "$savant_start_date" \
          --end-date "$savant_end_date" \
          --game-type "${MLB_GAME_TYPES:-S,R}" \
          --only-has-abs \
          --summary-json \
          --sleep-seconds "${SAVANT_SLEEP_SECONDS:-0.2}" \
          --jitter-seconds "${SAVANT_JITTER_SECONDS:-0.15}"
        mark_interval_task "savant"
        echo "[$(timestamp)] completed Savant ABS refresh"
      else
        echo "[$(timestamp)] Savant ABS refresh recently completed; skipping"
      fi
    fi

    if is_true "${RUN_ABS_SUMMARY_REBUILD:-true}"; then
      echo "[$(timestamp)] rebuilding warehouse ABS summary tables"
      TARGET_DATABASE_URL="$WAREHOUSE_DATABASE_URL" bash "$ROOT_DIR/scripts/rebuild-abs-summary-tables.sh"
      echo "[$(timestamp)] completed warehouse ABS summary rebuild"
    fi

    if is_true "${RUN_MODEL_REFRESH_ON_POLL:-true}"; then
      if should_run_interval_task "model-refresh" "${MODEL_REFRESH_INTERVAL_MINUTES:-60}"; then
        model_end_date="${MODEL_REFRESH_END_DATE:-$savant_end_date}"
        model_start_date="${MODEL_REFRESH_START_DATE:-$(date_window_start "$model_end_date" "${MODEL_REFRESH_DAYS:-21}")}"
        model_season="${MODEL_REFRESH_SEASON:-$(date -j -f '%Y-%m-%d' "$model_end_date" '+%Y' 2>/dev/null || date '+%Y')}"
        echo "[$(timestamp)] refreshing warehouse model tables window=$model_start_date..$model_end_date season=$model_season"
        "$PYTHON_BIN" "$ROOT_DIR/etl/build_historical_pitch_states.py" \
          --season "$model_season" \
          --start-date "$model_start_date" \
          --end-date "$model_end_date"
        "$PYTHON_BIN" "$ROOT_DIR/etl/build_called_pitch_decisions.py" \
          --season "$model_season" \
          --start-date "$model_start_date" \
          --end-date "$model_end_date" \
          --data-snapshot-id "warehouse-live-$model_end_date" \
          --split-policy-version "${MODEL_SPLIT_POLICY_VERSION:-called_pitch_decisions_phase_time_v1}"
        mark_interval_task "model-refresh"
        echo "[$(timestamp)] completed warehouse model table refresh"
      else
        echo "[$(timestamp)] warehouse model tables recently refreshed; skipping"
      fi
    fi

    if is_true "${RUN_WAREHOUSE_ABS_QA:-true}"; then
      echo "[$(timestamp)] running warehouse ABS QA gate"
      MODEL_AUDIT_DATABASE_URL="$WAREHOUSE_DATABASE_URL" MODEL_AUDIT_WRITE_ARTIFACTS=false npm --prefix "$ROOT_DIR" run --silent qa:abs
      echo "[$(timestamp)] completed warehouse ABS QA gate"
    fi

    if is_true "${RUN_SERVING_PUBLISH:-true}"; then
      echo "[$(timestamp)] publishing warehouse window to serving"
      SOURCE_DATABASE_URL="$WAREHOUSE_DATABASE_URL" \
        TARGET_DATABASE_URL="$SERVING_DATABASE_URL" \
        SERVING_SYNC_DAYS="${SERVING_SYNC_DAYS:-3}" \
        bash "$ROOT_DIR/scripts/publish-serving-db.sh"
      echo "[$(timestamp)] completed serving publish"
    fi

    if is_true "${RUN_SERVING_ABS_QA:-true}" && [[ -n "${SERVING_DATABASE_URL:-}" ]]; then
      echo "[$(timestamp)] running serving ABS QA gate"
      MODEL_AUDIT_DATABASE_URL="$SERVING_DATABASE_URL" MODEL_AUDIT_WRITE_ARTIFACTS=false npm --prefix "$ROOT_DIR" run --silent qa:abs
      echo "[$(timestamp)] completed serving ABS QA gate"
    fi

    if is_true "${RUN_WAREHOUSE_SERVING_RECONCILE:-true}" && [[ -n "${SERVING_DATABASE_URL:-}" ]]; then
      echo "[$(timestamp)] reconciling warehouse and serving"
      WAREHOUSE_DATABASE_URL="$WAREHOUSE_DATABASE_URL" \
        SERVING_DATABASE_URL="$SERVING_DATABASE_URL" \
        npm --prefix "$ROOT_DIR" run --silent db:reconcile:warehouse-serving -- \
          --fail-on-fallback-drift true \
          --fail-on-savant-drift true \
          --write-artifact true
      echo "[$(timestamp)] completed warehouse/serving reconciliation"
    fi
  else
    echo "[$(timestamp)] no ingest ran; skipping Savant, summary, publish, and QA post-processing"
  fi

  if [[ "${RUN_SNAPSHOT_PRUNE:-false}" == "true" ]]; then
    echo "[$(timestamp)] starting snapshot prune"
    "$PYTHON_BIN" "$ROOT_DIR/etl/prune_source_snapshots.py" \
      --feed-live-days "${FEED_LIVE_RETENTION_DAYS:-14}" \
      --standings-days "${STANDINGS_RETENTION_DAYS:-0}" \
      --savant-days "${SAVANT_RETENTION_DAYS:-0}"
    echo "[$(timestamp)] completed snapshot prune"
  fi
  echo "[$(timestamp)] completed local live poll"
} >>"$LOG_DIR/poll.log" 2>>"$LOG_DIR/error.log"
