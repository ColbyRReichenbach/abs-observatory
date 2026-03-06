#!/usr/bin/env python3
import os
import subprocess
import time
from datetime import datetime, timezone

ACTIVE_INTERVAL_SECONDS = int(os.getenv("ACTIVE_POLL_SECONDS", "30"))
IDLE_INTERVAL_SECONDS = int(os.getenv("IDLE_POLL_SECONDS", "120"))


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
    while True:
        ok = run_once()
        time.sleep(ACTIVE_INTERVAL_SECONDS if ok else IDLE_INTERVAL_SECONDS)


if __name__ == "__main__":
    main()
