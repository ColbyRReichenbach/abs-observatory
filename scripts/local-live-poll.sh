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
    set -a
    # shellcheck disable=SC1090
    . "$env_file"
    set +a
  fi
}

# Use an explicit env file when provided, otherwise fall back to common local paths.
if [[ -n "${POLL_ENV_FILE:-}" ]]; then
  load_env_file "$POLL_ENV_FILE"
else
  load_env_file "$ROOT_DIR/.env.poll"
  load_env_file "$ROOT_DIR/.env.local"
  load_env_file "$ROOT_DIR/.env"
  load_env_file "/Users/colbyreichenbach/Desktop/mlb/abs-observatory/.env.local"
  load_env_file "/Users/colbyreichenbach/Desktop/mlb/abs-observatory/.env"
fi

mkdir -p "$LOG_DIR"

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] DATABASE_URL is not set; exiting" >>"$LOG_DIR/error.log"
  exit 1
fi

if ! mkdir "$LOCK_DIR" 2>/dev/null; then
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] live poll already running; exiting" >>"$LOG_DIR/poll.log"
  exit 0
fi

cleanup() {
  rmdir "$LOCK_DIR" 2>/dev/null || true
}
trap cleanup EXIT

PYTHON_BIN="${PYTHON_BIN:-$(command -v python3)}"

{
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] starting local live poll"
  "$PYTHON_BIN" "$ROOT_DIR/etl/poll_live_window.py"
  if [[ "${RUN_SNAPSHOT_PRUNE:-false}" == "true" ]]; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] starting snapshot prune"
    "$PYTHON_BIN" "$ROOT_DIR/etl/prune_source_snapshots.py" \
      --feed-live-days "${FEED_LIVE_RETENTION_DAYS:-14}" \
      --standings-days "${STANDINGS_RETENTION_DAYS:-0}" \
      --savant-days "${SAVANT_RETENTION_DAYS:-0}"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] completed snapshot prune"
  fi
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] completed local live poll"
} >>"$LOG_DIR/poll.log" 2>>"$LOG_DIR/error.log"
