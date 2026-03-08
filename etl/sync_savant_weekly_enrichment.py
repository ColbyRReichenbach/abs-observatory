#!/usr/bin/env python3
from __future__ import annotations

import argparse
from datetime import datetime, timedelta, timezone
from typing import Dict, Iterable, List, Tuple


def resolve_week_window(week_start: str) -> Tuple[str, str]:
    start = datetime.fromisoformat(f"{week_start}T00:00:00+00:00")
    end = start + timedelta(days=6)
    return start.date().isoformat(), end.date().isoformat()


def normalize_savant_weekly_rows(rows: Iterable[Dict[str, str]]) -> List[Dict[str, object]]:
    normalized: Dict[Tuple[str, str], Dict[str, object]] = {}

    for row in rows:
        team = row.get("team") or "unknown"
        pitch_type = row.get("pitch_type") or "unknown"
        key = (team, pitch_type)
        if key not in normalized:
            normalized[key] = {
                "team": team,
                "pitchType": pitch_type,
                "pitches": 0,
                "calledStrikes": 0,
                "balls": 0,
                "avgVelocity": 0.0,
            }

        record = normalized[key]
        record["pitches"] = int(record["pitches"]) + 1
        record["calledStrikes"] = int(record["calledStrikes"]) + (1 if row.get("call") == "called_strike" else 0)
        record["balls"] = int(record["balls"]) + (1 if row.get("call") == "ball" else 0)
        record["avgVelocity"] = float(record["avgVelocity"]) + float(row.get("release_speed") or 0)

    for record in normalized.values():
        pitches = int(record["pitches"])
        record["avgVelocity"] = round(float(record["avgVelocity"]) / pitches, 3) if pitches else 0.0

    return list(normalized.values())


def main() -> None:
    parser = argparse.ArgumentParser(description="Resolve weekly Savant enrichment window")
    parser.add_argument("--week-start", required=True, help="YYYY-MM-DD")
    args = parser.parse_args()

    start, end = resolve_week_window(args.week_start)
    print(f"Weekly Savant enrichment window: {start} -> {end}")


if __name__ == "__main__":
    main()
