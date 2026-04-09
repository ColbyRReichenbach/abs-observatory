#!/usr/bin/env python3
import os
import subprocess
import time
from datetime import datetime, timezone
from urllib.parse import urlparse

ACTIVE_INTERVAL_SECONDS = int(os.getenv("ACTIVE_POLL_SECONDS", "30"))
IDLE_INTERVAL_SECONDS = int(os.getenv("IDLE_POLL_SECONDS", "120"))


def describe_target() -> str:
    target = os.getenv("WAREHOUSE_DATABASE_URL") or os.getenv("DATABASE_URL") or ""
    if not target:
        return "role=warehouse host=unset db=unset source=missing"
    parsed = urlparse(target)
    host = parsed.hostname or "local_socket"
    database = parsed.path.lstrip("/") or os.getenv("PGDATABASE") or "postgres"
    source = "WAREHOUSE_DATABASE_URL" if os.getenv("WAREHOUSE_DATABASE_URL") else "DATABASE_URL"
    return f"role=warehouse host={host} db={database} source={source}"


def run_once() -> bool:
    today = datetime.now(timezone.utc).date().isoformat()
    cmd = [
        "python3",
        "etl/ingest_mlb_abs.py",
        "--start-date",
        today,
        "--end-date",
        today,
        "--game-type",
        "S,R",
    ]
    result = subprocess.run(cmd, check=False)  # noqa: S603
    return result.returncode == 0


def main() -> None:
    print(
        f"[poll_active_games] active_seconds={ACTIVE_INTERVAL_SECONDS} "
        f"idle_seconds={IDLE_INTERVAL_SECONDS} {describe_target()}",
        flush=True,
    )
    while True:
        ok = run_once()
        time.sleep(ACTIVE_INTERVAL_SECONDS if ok else IDLE_INTERVAL_SECONDS)


if __name__ == "__main__":
    main()
