#!/usr/bin/env python3
from __future__ import annotations

import argparse
import os
from dataclasses import dataclass
from datetime import date
from typing import Dict

try:
    import psycopg2
except ModuleNotFoundError:  # pragma: no cover - exercised in CI/unit-test import paths
    psycopg2 = None

try:
    import requests
except ModuleNotFoundError:  # pragma: no cover - exercised in CI/unit-test import paths
    requests = None

try:
    from dotenv import load_dotenv
except ModuleNotFoundError:  # pragma: no cover - exercised in CI/unit-test import paths
    def load_dotenv(*_args, **_kwargs):  # type: ignore[no-untyped-def]
        return False


API_BASE = "https://statsapi.mlb.com/api/v1"


def require_psycopg2() -> None:
    if psycopg2 is None:
        raise RuntimeError("psycopg2 is required to validate historical games")


def require_requests() -> None:
    if requests is None:
        raise RuntimeError("requests is required to fetch MLB schedule data")


@dataclass
class ValidationSummary:
    imported_games: int
    scheduled_games: int
    missing_schedule_games: int
    missing_team_identity: int
    missing_winner: int


def fetch_schedule_index(start_date: date, end_date: date) -> Dict[int, dict]:
    require_requests()
    response = requests.get(
        f"{API_BASE}/schedule",
        params={
            "sportId": 1,
            "startDate": start_date.isoformat(),
            "endDate": end_date.isoformat(),
            "gameType": "R",
        },
        timeout=30,
    )
    response.raise_for_status()
    payload = response.json()
    index: Dict[int, dict] = {}
    for day in payload.get("dates", []):
        for game in day.get("games", []):
            index[int(game["gamePk"])] = game
    return index


def summarize_validation(imported_rows: list[dict], schedule_index: Dict[int, dict]) -> ValidationSummary:
    imported_game_ids = {int(row["game_pk"]) for row in imported_rows}
    missing_schedule_games = len([game_pk for game_pk in schedule_index if game_pk not in imported_game_ids])
    missing_team_identity = len(
        [
            row
            for row in imported_rows
            if row["home_team_id"] is None or row["away_team_id"] is None
        ]
    )
    missing_winner = len([row for row in imported_rows if row["winning_team_id"] is None])

    return ValidationSummary(
        imported_games=len(imported_rows),
        scheduled_games=len(schedule_index),
        missing_schedule_games=missing_schedule_games,
        missing_team_identity=missing_team_identity,
        missing_winner=missing_winner,
    )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Validate raw historical Statcast games against MLB schedule identity")
    parser.add_argument("--start-date", required=True)
    parser.add_argument("--end-date", required=True)
    parser.add_argument("--strict", action="store_true")
    return parser.parse_args()


def main() -> None:
    load_dotenv()
    args = parse_args()
    start_date = date.fromisoformat(args.start_date)
    end_date = date.fromisoformat(args.end_date)

    connection_string = os.environ.get("DATABASE_URL")
    if not connection_string:
        raise SystemExit("DATABASE_URL is required.")

    schedule_index = fetch_schedule_index(start_date, end_date)
    require_psycopg2()
    conn = psycopg2.connect(connection_string)
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT game_pk, home_team_id, away_team_id, winning_team_id
                FROM raw.statcast_games
                WHERE game_date BETWEEN %s AND %s
                ORDER BY game_date, game_pk
                """,
                (args.start_date, args.end_date),
            )
            imported_rows = [
                {
                    "game_pk": row[0],
                    "home_team_id": row[1],
                    "away_team_id": row[2],
                    "winning_team_id": row[3],
                }
                for row in cur.fetchall()
            ]
    finally:
        conn.close()

    summary = summarize_validation(imported_rows, schedule_index)
    print(f"Imported games: {summary.imported_games}")
    print(f"Scheduled games: {summary.scheduled_games}")
    print(f"Missing scheduled games: {summary.missing_schedule_games}")
    print(f"Missing team identity: {summary.missing_team_identity}")
    print(f"Missing winner labels: {summary.missing_winner}")

    if args.strict and (summary.missing_schedule_games > 0 or summary.missing_team_identity > 0 or summary.missing_winner > 0):
        raise SystemExit(1)


if __name__ == "__main__":
    main()
