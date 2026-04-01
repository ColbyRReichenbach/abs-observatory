#!/usr/bin/env python3
import os
import subprocess
import time
from datetime import datetime, timedelta
from urllib.parse import urlparse
from zoneinfo import ZoneInfo

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TZ_NAME = os.getenv("POLL_TIMEZONE", "America/New_York")
SLEEP_SECONDS = int(os.getenv("ACTIVE_POLL_SECONDS", "30"))
GAME_TYPE = os.getenv("POLL_GAME_TYPE", "S,R")


def describe_target() -> str:
    target = os.getenv("WAREHOUSE_DATABASE_URL") or os.getenv("DATABASE_URL") or ""
    if not target:
        return "role=warehouse host=unset db=unset source=missing"
    parsed = urlparse(target)
    host = parsed.hostname or "local_socket"
    database = parsed.path.lstrip("/") or os.getenv("PGDATABASE") or "postgres"
    source = "WAREHOUSE_DATABASE_URL" if os.getenv("WAREHOUSE_DATABASE_URL") else "DATABASE_URL"
    return f"role=warehouse host={host} db={database} source={source}"


def run_once() -> int:
    tz = ZoneInfo(TZ_NAME)
    local_today = datetime.now(tz).date()
    local_tomorrow = local_today + timedelta(days=1)
    cmd = [
        "python3",
        os.path.join(ROOT, "etl", "ingest_mlb_abs.py"),
        "--start-date",
        local_today.isoformat(),
        "--end-date",
        local_tomorrow.isoformat(),
        "--game-type",
        GAME_TYPE,
    ]
    print(f"[{datetime.now(tz).isoformat()}] running: {' '.join(cmd)}", flush=True)
    rc = subprocess.run(cmd, cwd=ROOT, env=os.environ.copy()).returncode
    print(f"[{datetime.now(tz).isoformat()}] rc={rc}", flush=True)
    return rc


def main() -> None:
    print(
        f"[poll_local_window] timezone={TZ_NAME} active_seconds={SLEEP_SECONDS} "
        f"game_type={GAME_TYPE} {describe_target()}",
        flush=True,
    )
    while True:
        run_once()
        time.sleep(SLEEP_SECONDS)


if __name__ == "__main__":
    main()
