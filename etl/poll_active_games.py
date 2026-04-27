#!/usr/bin/env python3
import os
import subprocess
import time
from datetime import datetime, timedelta
from urllib.parse import urlparse
from zoneinfo import ZoneInfo

ACTIVE_INTERVAL_SECONDS = int(os.getenv("ACTIVE_POLL_SECONDS", "30"))
IDLE_INTERVAL_SECONDS = int(os.getenv("IDLE_POLL_SECONDS", "120"))
POLL_TIMEZONE = ZoneInfo(os.getenv("POLL_TIMEZONE", "America/New_York"))
PREVIOUS_DATE_UNTIL_HOUR = int(os.getenv("POLL_PREVIOUS_DATE_UNTIL_HOUR", "4"))


def describe_target() -> str:
    target = os.getenv("WAREHOUSE_DATABASE_URL") or os.getenv("DATABASE_URL") or ""
    if not target:
        return "role=warehouse host=unset db=unset source=missing"
    parsed = urlparse(target)
    host = parsed.hostname or "local_socket"
    database = parsed.path.lstrip("/") or os.getenv("PGDATABASE") or "postgres"
    source = "WAREHOUSE_DATABASE_URL" if os.getenv("WAREHOUSE_DATABASE_URL") else "DATABASE_URL"
    return f"role=warehouse host={host} db={database} source={source}"


def candidate_poll_dates(now: datetime | None = None) -> list[str]:
    now_et = (now or datetime.now(POLL_TIMEZONE)).astimezone(POLL_TIMEZONE)
    dates = []
    if now_et.hour < PREVIOUS_DATE_UNTIL_HOUR:
        dates.append((now_et - timedelta(days=1)).date().isoformat())
    dates.append(now_et.date().isoformat())
    return dates


def run_ingest_for_date(date_text: str) -> bool:
    cmd = [
        "python3",
        "etl/ingest_mlb_abs.py",
        "--start-date",
        date_text,
        "--end-date",
        date_text,
        "--game-type",
        "S,R",
        "--skip-final-existing",
        "--skip-reports",
    ]
    result = subprocess.run(cmd, check=False)  # noqa: S603
    return result.returncode == 0


def run_once() -> bool:
    ok = True
    dates = candidate_poll_dates()
    print(f"[poll_active_games] polling ET dates={','.join(dates)}", flush=True)
    for date_text in dates:
        ok = run_ingest_for_date(date_text) and ok
    return ok


def main() -> None:
    print(
        f"[poll_active_games] active_seconds={ACTIVE_INTERVAL_SECONDS} "
        f"idle_seconds={IDLE_INTERVAL_SECONDS} timezone={POLL_TIMEZONE.key} "
        f"previous_date_until_hour={PREVIOUS_DATE_UNTIL_HOUR} {describe_target()}",
        flush=True,
    )
    while True:
        ok = run_once()
        time.sleep(ACTIVE_INTERVAL_SECONDS if ok else IDLE_INTERVAL_SECONDS)


if __name__ == "__main__":
    main()
