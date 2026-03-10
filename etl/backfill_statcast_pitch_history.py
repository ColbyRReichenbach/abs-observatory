#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import math
import os
import random
import time
from dataclasses import dataclass
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Any, Dict, Iterable, Iterator, List, Optional, Sequence, Tuple

import psycopg2
import requests
from dotenv import load_dotenv
from psycopg2.extras import Json, execute_batch

try:
    from pybaseball import cache as pybaseball_cache
    from pybaseball import statcast
except ImportError:  # pragma: no cover - exercised through CLI behavior, not unit tests
    pybaseball_cache = None
    statcast = None


API_BASE = "https://statsapi.mlb.com/api/v1"
DEFAULT_CHECKPOINT_PATH = Path(__file__).resolve().parent / ".statcast_backfill_checkpoint.json"
REGULAR_SEASON_GAME_TYPE = "R"
DEFAULT_DELAY_SECONDS = 1.5
DEFAULT_MAX_RETRIES = 5
DEFAULT_BACKOFF_SECONDS = 2.0


@dataclass(frozen=True)
class StatcastGameRecord:
    game_pk: int
    game_date: date
    season: int
    game_type: str
    home_team_id: Optional[int]
    away_team_id: Optional[int]
    home_score_final: Optional[int]
    away_score_final: Optional[int]
    winning_team_id: Optional[int]


def daterange(start: date, end: date) -> Iterator[date]:
    current = start
    while current <= end:
        yield current
        current += timedelta(days=1)


def resolve_half_inning(value: Any) -> str:
    normalized = str(value or "").strip().lower()
    return "Top" if normalized in {"top", "top inning", "t"} else "Bottom"


def resolve_bases_state(on_1b: Any, on_2b: Any, on_3b: Any) -> str:
    def occupied(value: Any) -> bool:
        if value is None:
            return False
        if isinstance(value, bool):
            return value
        if isinstance(value, (int, float)):
            return value > 0
        text = str(value).strip().lower()
        return text not in {"", "0", "false", "nan", "none"}

    return f"{'1' if occupied(on_1b) else '0'}{'1' if occupied(on_2b) else '0'}{'1' if occupied(on_3b) else '0'}"


def resolve_score_diff_batting(half_inning: str, home_score: Optional[int], away_score: Optional[int]) -> Optional[int]:
    if home_score is None or away_score is None:
        return None
    return away_score - home_score if half_inning == "Top" else home_score - away_score


def chunk_statcast_records(rows: Iterable[Dict[str, Any]]) -> List[Dict[str, Any]]:
    records = list(rows)
    if not records:
        return []

    last_pitch_by_pa: Dict[Tuple[int, int], int] = {}
    for row in records:
        game_pk = safe_int(row.get("game_pk"))
        at_bat_number = safe_int(row.get("at_bat_number"))
        pitch_number = safe_int(row.get("pitch_number"))
        if game_pk is None or at_bat_number is None or pitch_number is None:
            continue
        key = (game_pk, at_bat_number)
        last_pitch_by_pa[key] = max(last_pitch_by_pa.get(key, 0), pitch_number)

    for row in records:
        game_pk = safe_int(row.get("game_pk"))
        at_bat_number = safe_int(row.get("at_bat_number"))
        pitch_number = safe_int(row.get("pitch_number"))
        row["_is_last_pitch_of_pa"] = (
            game_pk is not None
            and at_bat_number is not None
            and pitch_number is not None
            and last_pitch_by_pa.get((game_pk, at_bat_number)) == pitch_number
        )
    return records


def safe_int(value: Any) -> Optional[int]:
    if value is None:
        return None
    text = str(value).strip()
    if text in {"", "nan", "None"}:
        return None
    return int(float(text))


def safe_float(value: Any) -> Optional[float]:
    if value is None:
        return None
    text = str(value).strip()
    if text in {"", "nan", "None"}:
        return None
    return float(text)


def normalize_json_value(value: Any) -> Any:
    if value is None or isinstance(value, (str, int, float, bool)):
        if isinstance(value, float) and math.isnan(value):
            return None
        return value
    if isinstance(value, (date, datetime)):
        return value.isoformat()
    if hasattr(value, "item"):
        try:
            return normalize_json_value(value.item())
        except Exception:
            pass
    if isinstance(value, dict):
        return {str(key): normalize_json_value(item) for key, item in value.items()}
    if isinstance(value, (list, tuple, set)):
        return [normalize_json_value(item) for item in value]
    if hasattr(value, "isoformat"):
        try:
            return value.isoformat()
        except Exception:
            pass
    return str(value)


def fetch_schedule_games(start_date: date, end_date: date) -> Dict[int, StatcastGameRecord]:
    payload = requests.get(  # pragma: no cover - thin wrapper retained for backward compatibility in tests
        f"{API_BASE}/schedule",
        params={
            "sportId": 1,
            "startDate": start_date.isoformat(),
            "endDate": end_date.isoformat(),
            "gameType": REGULAR_SEASON_GAME_TYPE,
        },
        timeout=30,
    ).json()

    records: Dict[int, StatcastGameRecord] = {}
    for day in payload.get("dates", []):
        for game in day.get("games", []):
            game_pk = int(game["gamePk"])
            home_score = safe_int((game.get("teams") or {}).get("home", {}).get("score"))
            away_score = safe_int((game.get("teams") or {}).get("away", {}).get("score"))
            if home_score is None or away_score is None:
                winning_team_id = None
            elif home_score > away_score:
                winning_team_id = safe_int((game.get("teams") or {}).get("home", {}).get("team", {}).get("id"))
            elif away_score > home_score:
                winning_team_id = safe_int((game.get("teams") or {}).get("away", {}).get("team", {}).get("id"))
            else:
                winning_team_id = None

            records[game_pk] = StatcastGameRecord(
                game_pk=game_pk,
                game_date=date.fromisoformat(day["date"]),
                season=safe_int(game.get("season")) or date.fromisoformat(day["date"]).year,
                game_type=game.get("gameType") or REGULAR_SEASON_GAME_TYPE,
                home_team_id=safe_int((game.get("teams") or {}).get("home", {}).get("team", {}).get("id")),
                away_team_id=safe_int((game.get("teams") or {}).get("away", {}).get("team", {}).get("id")),
                home_score_final=home_score,
                away_score_final=away_score,
                winning_team_id=winning_team_id,
            )
    return records


def sleep_with_jitter(base_seconds: float, jitter_seconds: float = 0.35) -> None:
    duration = max(0.0, base_seconds + random.uniform(0, jitter_seconds))
    time.sleep(duration)


def fetch_schedule_games_with_backoff(
    session: requests.Session,
    start_date: date,
    end_date: date,
    max_retries: int,
    base_backoff_seconds: float,
) -> Dict[int, StatcastGameRecord]:
    params = {
        "sportId": 1,
        "startDate": start_date.isoformat(),
        "endDate": end_date.isoformat(),
        "gameType": REGULAR_SEASON_GAME_TYPE,
    }
    last_error: Exception | None = None
    for attempt in range(max_retries):
        try:
            response = session.get(f"{API_BASE}/schedule", params=params, timeout=30)
            if response.status_code in {429, 500, 502, 503, 504}:
                raise requests.HTTPError(f"schedule request returned {response.status_code}", response=response)
            response.raise_for_status()
            payload = response.json()
            records: Dict[int, StatcastGameRecord] = {}
            for day in payload.get("dates", []):
                for game in day.get("games", []):
                    game_pk = int(game["gamePk"])
                    home_score = safe_int((game.get("teams") or {}).get("home", {}).get("score"))
                    away_score = safe_int((game.get("teams") or {}).get("away", {}).get("score"))
                    if home_score is None or away_score is None:
                        winning_team_id = None
                    elif home_score > away_score:
                        winning_team_id = safe_int((game.get("teams") or {}).get("home", {}).get("team", {}).get("id"))
                    elif away_score > home_score:
                        winning_team_id = safe_int((game.get("teams") or {}).get("away", {}).get("team", {}).get("id"))
                    else:
                        winning_team_id = None

                    records[game_pk] = StatcastGameRecord(
                        game_pk=game_pk,
                        game_date=date.fromisoformat(day["date"]),
                        season=safe_int(game.get("season")) or date.fromisoformat(day["date"]).year,
                        game_type=game.get("gameType") or REGULAR_SEASON_GAME_TYPE,
                        home_team_id=safe_int((game.get("teams") or {}).get("home", {}).get("team", {}).get("id")),
                        away_team_id=safe_int((game.get("teams") or {}).get("away", {}).get("team", {}).get("id")),
                        home_score_final=home_score,
                        away_score_final=away_score,
                        winning_team_id=winning_team_id,
                    )
            return records
        except Exception as exc:  # pragma: no cover - network path
            last_error = exc
            if attempt == max_retries - 1:
                break
            sleep_with_jitter(base_backoff_seconds * (2 ** attempt))
    raise RuntimeError(f"Failed to fetch schedule for {start_date} after {max_retries} attempts") from last_error


def fetch_statcast_day_with_backoff(
    window_start: str,
    max_retries: int,
    base_backoff_seconds: float,
):
    last_error: Exception | None = None
    for attempt in range(max_retries):
        try:
            frame = statcast(start_dt=window_start, end_dt=window_start)
            return frame
        except Exception as exc:  # pragma: no cover - network path
            last_error = exc
            if attempt == max_retries - 1:
                break
            sleep_with_jitter(base_backoff_seconds * (2 ** attempt))
    raise RuntimeError(f"Failed to fetch Statcast data for {window_start} after {max_retries} attempts") from last_error


def normalize_statcast_payload(
    records: Sequence[Dict[str, Any]],
    game_lookup: Dict[int, StatcastGameRecord],
) -> Tuple[List[Tuple[Any, ...]], List[Tuple[Any, ...]]]:
    game_rows = [
        (
            game.game_pk,
            game.game_date,
            game.season,
            game.game_type,
            game.home_team_id,
            game.away_team_id,
            game.home_score_final,
            game.away_score_final,
            game.winning_team_id,
            "baseball_savant",
        )
        for game in game_lookup.values()
    ]

    pitch_rows: List[Tuple[Any, ...]] = []
    for row in records:
        game_pk = safe_int(row.get("game_pk"))
        inning = safe_int(row.get("inning"))
        at_bat_number = safe_int(row.get("at_bat_number"))
        pitch_number = safe_int(row.get("pitch_number"))
        if game_pk is None or inning is None or at_bat_number is None or pitch_number is None:
            continue

        game = game_lookup.get(game_pk)
        if game is None:
            continue

        half_inning = resolve_half_inning(row.get("inning_topbot"))
        batting_team_id = game.away_team_id if half_inning == "Top" else game.home_team_id
        fielding_team_id = game.home_team_id if half_inning == "Top" else game.away_team_id
        home_score = safe_int(row.get("home_score"))
        away_score = safe_int(row.get("away_score"))
        pitch_rows.append(
            (
                game_pk,
                game.game_date,
                game.season,
                inning,
                half_inning,
                at_bat_number,
                pitch_number,
                safe_int(row.get("balls")),
                safe_int(row.get("strikes")),
                safe_int(row.get("outs_when_up")),
                safe_int(row.get("on_1b")),
                safe_int(row.get("on_2b")),
                safe_int(row.get("on_3b")),
                resolve_bases_state(row.get("on_1b"), row.get("on_2b"), row.get("on_3b")),
                home_score,
                away_score,
                safe_int(row.get("bat_score")),
                safe_int(row.get("fld_score")),
                safe_int(row.get("post_bat_score")),
                safe_int(row.get("post_fld_score")),
                resolve_score_diff_batting(half_inning, home_score, away_score),
                safe_int(row.get("batter")),
                safe_int(row.get("pitcher")),
                row.get("stand"),
                row.get("p_throws"),
                batting_team_id,
                fielding_team_id,
                game.winning_team_id,
                row.get("pitch_type"),
                row.get("pitch_name"),
                row.get("description"),
                row.get("events"),
                safe_float(row.get("plate_x")),
                safe_float(row.get("plate_z")),
                str(row.get("type") or "").strip().upper() == "X" or "hit_into_play" in str(row.get("description") or "").lower(),
                bool(row.get("_is_last_pitch_of_pa")),
                Json(normalize_json_value(dict(row))),
            )
        )

    return game_rows, pitch_rows


def read_checkpoint(path: Path) -> Optional[str]:
    if not path.exists():
        return None
    payload = json.loads(path.read_text())
    return payload.get("last_completed_date")


def write_checkpoint(path: Path, completed_day: date) -> None:
    path.write_text(json.dumps({"last_completed_date": completed_day.isoformat()}, indent=2))


def insert_rows(
    conn,
    game_rows: Sequence[Tuple[Any, ...]],
    pitch_rows: Sequence[Tuple[Any, ...]],
) -> None:
    with conn:
        with conn.cursor() as cur:
            if game_rows:
                execute_batch(
                    cur,
                    """
                    INSERT INTO raw.statcast_games (
                      game_pk, game_date, season, game_type, home_team_id, away_team_id,
                      home_score_final, away_score_final, winning_team_id, source
                    ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                    ON CONFLICT (game_pk) DO UPDATE SET
                      game_date = EXCLUDED.game_date,
                      season = EXCLUDED.season,
                      game_type = EXCLUDED.game_type,
                      home_team_id = EXCLUDED.home_team_id,
                      away_team_id = EXCLUDED.away_team_id,
                      home_score_final = EXCLUDED.home_score_final,
                      away_score_final = EXCLUDED.away_score_final,
                      winning_team_id = EXCLUDED.winning_team_id,
                      source = EXCLUDED.source,
                      imported_at = NOW()
                    """,
                    list(game_rows),
                )
            if pitch_rows:
                execute_batch(
                    cur,
                    """
                    INSERT INTO raw.statcast_pitches (
                      game_pk, game_date, season, inning, half_inning, at_bat_number, pitch_number,
                      balls, strikes, outs, on_1b, on_2b, on_3b, bases_state, home_score, away_score,
                      bat_score, fld_score, post_bat_score, post_fld_score, score_diff_batting,
                      batter_id, pitcher_id, stand, p_throws, batting_team_id, fielding_team_id, winning_team_id,
                      pitch_type, pitch_name, description, events, plate_x, plate_z, is_in_play, is_last_pitch_of_pa, source_payload
                    ) VALUES (
                      %s,%s,%s,%s,%s,%s,%s,
                      %s,%s,%s,%s,%s,%s,%s,%s,%s,
                      %s,%s,%s,%s,%s,
                      %s,%s,%s,%s,%s,%s,%s,
                      %s,%s,%s,%s,%s,%s,%s,%s,%s
                    )
                    ON CONFLICT (game_pk, at_bat_number, pitch_number) DO UPDATE SET
                      game_date = EXCLUDED.game_date,
                      season = EXCLUDED.season,
                      inning = EXCLUDED.inning,
                      half_inning = EXCLUDED.half_inning,
                      balls = EXCLUDED.balls,
                      strikes = EXCLUDED.strikes,
                      outs = EXCLUDED.outs,
                      on_1b = EXCLUDED.on_1b,
                      on_2b = EXCLUDED.on_2b,
                      on_3b = EXCLUDED.on_3b,
                      bases_state = EXCLUDED.bases_state,
                      home_score = EXCLUDED.home_score,
                      away_score = EXCLUDED.away_score,
                      bat_score = EXCLUDED.bat_score,
                      fld_score = EXCLUDED.fld_score,
                      post_bat_score = EXCLUDED.post_bat_score,
                      post_fld_score = EXCLUDED.post_fld_score,
                      score_diff_batting = EXCLUDED.score_diff_batting,
                      batter_id = EXCLUDED.batter_id,
                      pitcher_id = EXCLUDED.pitcher_id,
                      stand = EXCLUDED.stand,
                      p_throws = EXCLUDED.p_throws,
                      batting_team_id = EXCLUDED.batting_team_id,
                      fielding_team_id = EXCLUDED.fielding_team_id,
                      winning_team_id = EXCLUDED.winning_team_id,
                      pitch_type = EXCLUDED.pitch_type,
                      pitch_name = EXCLUDED.pitch_name,
                      description = EXCLUDED.description,
                      events = EXCLUDED.events,
                      plate_x = EXCLUDED.plate_x,
                      plate_z = EXCLUDED.plate_z,
                      is_in_play = EXCLUDED.is_in_play,
                      is_last_pitch_of_pa = EXCLUDED.is_last_pitch_of_pa,
                      source_payload = EXCLUDED.source_payload,
                      imported_at = NOW()
                    """,
                    list(pitch_rows),
                    page_size=500,
                )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Backfill historical Statcast pitch states into raw tables")
    parser.add_argument("--start-date", help="YYYY-MM-DD")
    parser.add_argument("--end-date", help="YYYY-MM-DD")
    parser.add_argument("--season", type=int, help="Convenience flag to backfill an entire regular-season year")
    parser.add_argument("--resume", action="store_true", help="Resume from the checkpoint file if present")
    parser.add_argument("--checkpoint-file", default=str(DEFAULT_CHECKPOINT_PATH))
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--delay-seconds", type=float, default=DEFAULT_DELAY_SECONDS)
    parser.add_argument("--max-retries", type=int, default=DEFAULT_MAX_RETRIES)
    parser.add_argument("--base-backoff-seconds", type=float, default=DEFAULT_BACKOFF_SECONDS)
    parser.add_argument("--disable-cache", action="store_true", help="Disable pybaseball local cache")
    return parser.parse_args()


def resolve_window(args: argparse.Namespace) -> Tuple[date, date]:
    if args.season:
        return date(args.season, 1, 1), date(args.season, 12, 31)
    if not args.start_date or not args.end_date:
        raise SystemExit("Provide either --season or both --start-date and --end-date.")
    return date.fromisoformat(args.start_date), date.fromisoformat(args.end_date)


def main() -> None:
    if statcast is None:
        raise SystemExit("pybaseball is required for Statcast backfill. Install etl requirements first.")

    load_dotenv()
    args = parse_args()
    start_date, end_date = resolve_window(args)
    checkpoint_path = Path(args.checkpoint_file)

    if args.resume:
        completed = read_checkpoint(checkpoint_path)
        if completed:
            start_date = max(start_date, date.fromisoformat(completed) + timedelta(days=1))

    connection_string = os.environ.get("DATABASE_URL")
    if not connection_string and not args.dry_run:
        raise SystemExit("DATABASE_URL is required unless --dry-run is used.")

    if pybaseball_cache is not None and not args.disable_cache:
        pybaseball_cache.enable()

    conn = psycopg2.connect(connection_string) if connection_string and not args.dry_run else None
    session = requests.Session()
    session.headers.update(
        {
            "User-Agent": "AiBS-Statcast-Backfill/1.0 (research+modeling; contact: local-runner)",
            "Accept": "application/json",
        }
    )
    try:
        for current_day in daterange(start_date, end_date):
            window_start = current_day.isoformat()
            print(f"[statcast-backfill] {window_start}")
            game_lookup = fetch_schedule_games_with_backoff(
                session,
                current_day,
                current_day,
                max_retries=max(1, args.max_retries),
                base_backoff_seconds=max(0.1, args.base_backoff_seconds),
            )
            if not game_lookup:
                print("  no regular-season games in schedule window")
                write_checkpoint(checkpoint_path, current_day)
                sleep_with_jitter(max(0.0, args.delay_seconds))
                continue

            sleep_with_jitter(max(0.0, args.delay_seconds))
            frame = fetch_statcast_day_with_backoff(
                window_start,
                max_retries=max(1, args.max_retries),
                base_backoff_seconds=max(0.1, args.base_backoff_seconds),
            )
            records = chunk_statcast_records(frame.to_dict("records") if hasattr(frame, "to_dict") else [])
            game_rows, pitch_rows = normalize_statcast_payload(records, game_lookup)
            print(f"  games={len(game_rows)} pitches={len(pitch_rows)}")

            if not args.dry_run and conn is not None:
                insert_rows(conn, game_rows, pitch_rows)
            write_checkpoint(checkpoint_path, current_day)
            sleep_with_jitter(max(0.0, args.delay_seconds))
    finally:
        session.close()
        if conn is not None:
            conn.close()


if __name__ == "__main__":
    main()
