#!/usr/bin/env python3
import argparse
import hashlib
import json
import os
from datetime import date
from typing import Any, Dict, List, Optional, Tuple

try:
    import requests
except ModuleNotFoundError:  # pragma: no cover - exercised in CI/unit-test import paths
    requests = None
try:
    from dotenv import load_dotenv
except ModuleNotFoundError:  # pragma: no cover - exercised in CI/unit-test import paths
    def load_dotenv(*_args: Any, **_kwargs: Any) -> bool:
        return False
try:
    import psycopg2
    from psycopg2.extras import Json, execute_batch
except ModuleNotFoundError:  # pragma: no cover - exercised in CI/unit-test import paths
    psycopg2 = None

    def Json(value: Any) -> Any:
        return value

    def execute_batch(*_args: Any, **_kwargs: Any) -> None:
        raise RuntimeError("psycopg2 is required for ETL database writes")

load_dotenv()

API_BASE = "https://statsapi.mlb.com/api/v1"


def require_psycopg2() -> None:
    if psycopg2 is None:
        raise RuntimeError("psycopg2 is required to run ETL database operations")


def require_requests() -> None:
    if requests is None:
        raise RuntimeError("requests is required to fetch standings snapshots")


def fetch_standings_snapshot(snapshot_date: str, season: Optional[int] = None) -> Dict[str, Any]:
    require_requests()
    params = {
        "leagueId": "103,104",
        "standingsTypes": "regularSeason",
        "date": snapshot_date,
    }
    if season is not None:
      params["season"] = season
    response = requests.get(f"{API_BASE}/standings", params=params, timeout=30)
    response.raise_for_status()
    return response.json()


def extract_standings_rows(snapshot_date: str, payload: Dict[str, Any]) -> List[Tuple[Any, ...]]:
    rows: List[Tuple[Any, ...]] = []
    for record in payload.get("records", []):
        league = record.get("league") or {}
        division = record.get("division") or {}
        for team_record in record.get("teamRecords", []):
            team = team_record.get("team") or {}
            rows.append(
                (
                    snapshot_date,
                    league.get("id"),
                    division.get("id"),
                    team.get("id"),
                    int(team_record.get("wins", 0)),
                    int(team_record.get("losses", 0)),
                    team_record.get("winningPercentage"),
                    team_record.get("gamesBack"),
                    int(team_record.get("wildCardRank")) if team_record.get("wildCardRank") not in (None, "") else None,
                    int(team_record.get("divisionRank")) if team_record.get("divisionRank") not in (None, "") else None,
                    Json(team_record),
                )
            )
    return rows


def upsert_standings_snapshot(cur, snapshot_date: str, rows: List[Tuple[Any, ...]]) -> int:
    execute_batch(
        cur,
        """
        INSERT INTO editorial.standings_snapshots (
          snapshot_date,
          league_id,
          division_id,
          team_id,
          wins,
          losses,
          pct,
          games_back,
          wild_card_rank,
          division_rank,
          raw_payload
        )
        VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
        ON CONFLICT (snapshot_date, league_id, team_id) DO UPDATE SET
          division_id = EXCLUDED.division_id,
          wins = EXCLUDED.wins,
          losses = EXCLUDED.losses,
          pct = EXCLUDED.pct,
          games_back = EXCLUDED.games_back,
          wild_card_rank = EXCLUDED.wild_card_rank,
          division_rank = EXCLUDED.division_rank,
          raw_payload = EXCLUDED.raw_payload
        """,
        rows,
        page_size=250,
    )
    return len(rows)


def store_source_snapshot(cur, snapshot_date: str, payload: Dict[str, Any]) -> None:
    payload_text = json.dumps(payload, sort_keys=True, separators=(",", ":"))
    payload_hash = hashlib.sha256(payload_text.encode("utf-8")).hexdigest()
    cur.execute(
        """
        INSERT INTO ops.source_snapshots (source_name, entity_key, payload_hash, payload)
        VALUES (%s, %s, %s, %s)
        ON CONFLICT DO NOTHING
        """,
        ("mlb_statsapi.standings", f"standings:{snapshot_date}", payload_hash, Json(payload)),
    )


def run(database_url: str, snapshot_date: str, season: Optional[int] = None) -> int:
    require_psycopg2()
    payload = fetch_standings_snapshot(snapshot_date, season)
    rows = extract_standings_rows(snapshot_date, payload)
    conn = psycopg2.connect(database_url)
    try:
        with conn:
            with conn.cursor() as cur:
                store_source_snapshot(cur, snapshot_date, payload)
                return upsert_standings_snapshot(cur, snapshot_date, rows)
    finally:
        conn.close()


def main() -> None:
    parser = argparse.ArgumentParser(description="Sync MLB standings snapshot into editorial schema")
    parser.add_argument("--snapshot-date", default=date.today().isoformat(), help="YYYY-MM-DD")
    parser.add_argument("--season", type=int)
    args = parser.parse_args()

    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        raise SystemExit("DATABASE_URL is required")

    count = run(database_url, args.snapshot_date, args.season)
    print(f"Upserted {count} standings rows for {args.snapshot_date}.")


if __name__ == "__main__":
    main()
