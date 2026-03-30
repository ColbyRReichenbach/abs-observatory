#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import os
import random
import time
from dataclasses import dataclass
from datetime import date, datetime, timedelta
from typing import Any, Dict, Iterator, List, Optional, Sequence, Tuple

try:
    import requests
except ModuleNotFoundError:  # pragma: no cover - exercised in CI/unit-test import paths
    requests = None
from dotenv import load_dotenv
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

STATSAPI_BASE = "https://statsapi.mlb.com/api/v1"
SAVANT_GAMEFEED_BASE = "https://baseballsavant.mlb.com/gf"
REQUEST_TIMEOUT = 30
USER_AGENT = "AiBS/1.0 (+https://github.com/ColbyRReichenbach)"


def require_psycopg2() -> None:
    if psycopg2 is None:
        raise RuntimeError("psycopg2 is required to run ETL database operations")


def require_requests() -> None:
    if requests is None:
        raise RuntimeError("requests is required to fetch Savant and Stats API payloads")


@dataclass(frozen=True)
class ScheduleGame:
    game_pk: int
    sport_id: int
    game_date: date
    season: int
    game_type: Optional[str]
    home_team_id: Optional[int]
    away_team_id: Optional[int]


@dataclass(frozen=True)
class SavantAbsScanSummary:
    total_games_scanned: int
    total_abs_games: int
    total_challenge_rows: int
    sport_id: int
    game_type: str


def daterange(start_date: str, end_date: str) -> Iterator[date]:
    current = date.fromisoformat(start_date)
    end = date.fromisoformat(end_date)
    while current <= end:
        yield current
        current += timedelta(days=1)


def parse_game_date(value: str) -> date:
    return datetime.strptime(value.strip(), "%m/%d/%Y").date()


def request_json(
    session: requests.Session,
    url: str,
    *,
    params: Optional[Dict[str, Any]] = None,
    retries: int = 5,
    base_backoff_seconds: float = 2.0,
) -> Dict[str, Any]:
    require_requests()
    for attempt in range(retries):
        try:
            response = session.get(url, params=params, timeout=REQUEST_TIMEOUT)
            response.raise_for_status()
            return response.json()
        except Exception:
            if attempt == retries - 1:
                raise
            sleep_for = base_backoff_seconds * (2**attempt) + random.uniform(0, 0.5)
            time.sleep(sleep_for)
    raise RuntimeError("unreachable")


def fetch_schedule_for_date(
    session: requests.Session,
    *,
    target_date: date,
    sport_id: int,
    game_type: str,
    retries: int,
    base_backoff_seconds: float,
) -> List[ScheduleGame]:
    payload = request_json(
        session,
        f"{STATSAPI_BASE}/schedule",
        params={
            "timeZone": "America/New_York",
            "sportId": sport_id,
            "date": target_date.isoformat(),
            "gameType": game_type,
        },
        retries=retries,
        base_backoff_seconds=base_backoff_seconds,
    )

    games: List[ScheduleGame] = []
    for day in payload.get("dates", []):
        for game in day.get("games", []):
            games.append(
                ScheduleGame(
                    game_pk=int(game["gamePk"]),
                    sport_id=sport_id,
                    game_date=date.fromisoformat(day["date"]),
                    season=int(game.get("season") or target_date.year),
                    game_type=game.get("gameType"),
                    home_team_id=(game.get("teams", {}).get("home", {}).get("team", {}) or {}).get("id"),
                    away_team_id=(game.get("teams", {}).get("away", {}).get("team", {}) or {}).get("id"),
                )
            )
    return games


def fetch_savant_gamefeed(
    session: requests.Session,
    game_pk: int,
    *,
    retries: int,
    base_backoff_seconds: float,
) -> Dict[str, Any]:
    return request_json(
        session,
        SAVANT_GAMEFEED_BASE,
        params={"game_pk": game_pk},
        retries=retries,
        base_backoff_seconds=base_backoff_seconds,
    )


def store_source_snapshot(cur, source_name: str, entity_key: str, payload: Dict[str, Any]) -> None:
    payload_text = json.dumps(payload, sort_keys=True, separators=(",", ":"), default=str)
    payload_hash = __import__("hashlib").sha256(payload_text.encode("utf-8")).hexdigest()
    cur.execute(
        """
        INSERT INTO ops.source_snapshots (source_name, entity_key, payload_hash, payload)
        VALUES (%s, %s, %s, %s)
        ON CONFLICT DO NOTHING
        """,
        (source_name, entity_key, payload_hash, Json(payload)),
    )


def normalize_savant_game(payload: Dict[str, Any], schedule_game: ScheduleGame) -> Tuple[Any, ...]:
    game_date_raw = payload.get("gameDate")
    game_date = parse_game_date(game_date_raw) if game_date_raw else schedule_game.game_date
    return (
        schedule_game.game_pk,
        schedule_game.sport_id,
        game_date,
        schedule_game.season,
        schedule_game.game_type,
        payload.get("game_status_code"),
        payload.get("game_status"),
        bool(payload.get("hasAbs", False)),
        payload.get("team_home_id") or schedule_game.home_team_id,
        payload.get("team_away_id") or schedule_game.away_team_id,
        Json(payload),
    )


def extract_abs_rows(payload: Dict[str, Any], schedule_game: ScheduleGame) -> List[Tuple[Any, ...]]:
    game_date_raw = payload.get("gameDate")
    game_date = parse_game_date(game_date_raw) if game_date_raw else schedule_game.game_date
    rows: List[Tuple[Any, ...]] = []

    for team_side in ("team_home", "team_away"):
        for event in payload.get(team_side, []) or []:
            challenge = event.get("abs_challenge") or {}
            if not (event.get("is_abs_challenge") or challenge):
                continue

            rows.append(
                (
                    schedule_game.game_pk,
                    schedule_game.sport_id,
                    game_date,
                    schedule_game.season,
                    "home" if team_side == "team_home" else "away",
                    event.get("ab_number"),
                    event.get("pitch_number"),
                    event.get("play_id"),
                    event.get("rowId"),
                    event.get("inning"),
                    event.get("outs"),
                    event.get("balls"),
                    event.get("strikes"),
                    event.get("pre_balls"),
                    event.get("pre_strikes"),
                    event.get("team_batting"),
                    event.get("team_batting_id"),
                    event.get("team_fielding"),
                    event.get("team_fielding_id"),
                    event.get("batter"),
                    event.get("batter_name"),
                    event.get("pitcher"),
                    event.get("pitcher_name"),
                    event.get("catcher"),
                    event.get("catcher_name"),
                    event.get("stand"),
                    event.get("p_throws"),
                    event.get("pitch_type"),
                    event.get("pitch_name"),
                    event.get("description"),
                    event.get("call_name"),
                    event.get("pitch_call"),
                    event.get("result"),
                    event.get("events"),
                    bool(challenge.get("is_overturned", False)),
                    challenge.get("is_batter"),
                    bool(challenge.get("is_in_progress", False)),
                    challenge.get("challenge_team_id"),
                    challenge.get("edge_distance"),
                    challenge.get("edge_distance_calc"),
                    event.get("px"),
                    event.get("pz"),
                    event.get("plate_x"),
                    event.get("plate_z"),
                    event.get("sz_top"),
                    event.get("sz_bot"),
                    event.get("zone"),
                    event.get("start_speed"),
                    event.get("end_speed"),
                    event.get("spin_rate"),
                    Json(event.get("contextMetrics")),
                    Json(event),
                )
            )
    return rows


def upsert_raw_games(cur, rows: Sequence[Tuple[Any, ...]]) -> None:
    if not rows:
        return
    execute_batch(
        cur,
        """
        INSERT INTO raw.savant_gamefeed_games (
          game_pk, sport_id, game_date, season, game_type, status_code, status_text,
          has_abs, home_team_id, away_team_id, source_payload
        ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
        ON CONFLICT (game_pk) DO UPDATE SET
          sport_id = EXCLUDED.sport_id,
          game_date = EXCLUDED.game_date,
          season = EXCLUDED.season,
          game_type = EXCLUDED.game_type,
          status_code = EXCLUDED.status_code,
          status_text = EXCLUDED.status_text,
          has_abs = EXCLUDED.has_abs,
          home_team_id = EXCLUDED.home_team_id,
          away_team_id = EXCLUDED.away_team_id,
          source_payload = EXCLUDED.source_payload,
          imported_at = NOW()
        """,
        rows,
        page_size=100,
    )


def upsert_raw_events(cur, rows: Sequence[Tuple[Any, ...]]) -> None:
    if not rows:
        return
    execute_batch(
        cur,
        """
        INSERT INTO raw.savant_abs_events (
          game_pk, sport_id, game_date, season, team_side, at_bat_number, pitch_number,
          play_id, row_id, inning, outs, balls, strikes, pre_balls, pre_strikes,
          team_batting, team_batting_id, team_fielding, team_fielding_id, batter_id,
          batter_name, pitcher_id, pitcher_name, catcher_id, catcher_name, stand,
          p_throws, pitch_type, pitch_name, description, call_name, pitch_call,
          result, events, is_overturned, is_batter_challenge, is_in_progress,
          challenge_team_id, edge_distance, edge_distance_calc, px, pz, plate_x,
          plate_z, strike_zone_top, strike_zone_bottom, zone, start_speed, end_speed,
          spin_rate, context_metrics, source_payload
        ) VALUES (
          %s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,
          %s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,
          %s,%s
        )
        ON CONFLICT (game_pk, play_id, pitch_number) DO UPDATE SET
          sport_id = EXCLUDED.sport_id,
          game_date = EXCLUDED.game_date,
          season = EXCLUDED.season,
          team_side = EXCLUDED.team_side,
          at_bat_number = EXCLUDED.at_bat_number,
          row_id = EXCLUDED.row_id,
          inning = EXCLUDED.inning,
          outs = EXCLUDED.outs,
          balls = EXCLUDED.balls,
          strikes = EXCLUDED.strikes,
          pre_balls = EXCLUDED.pre_balls,
          pre_strikes = EXCLUDED.pre_strikes,
          team_batting = EXCLUDED.team_batting,
          team_batting_id = EXCLUDED.team_batting_id,
          team_fielding = EXCLUDED.team_fielding,
          team_fielding_id = EXCLUDED.team_fielding_id,
          batter_id = EXCLUDED.batter_id,
          batter_name = EXCLUDED.batter_name,
          pitcher_id = EXCLUDED.pitcher_id,
          pitcher_name = EXCLUDED.pitcher_name,
          catcher_id = EXCLUDED.catcher_id,
          catcher_name = EXCLUDED.catcher_name,
          stand = EXCLUDED.stand,
          p_throws = EXCLUDED.p_throws,
          pitch_type = EXCLUDED.pitch_type,
          pitch_name = EXCLUDED.pitch_name,
          description = EXCLUDED.description,
          call_name = EXCLUDED.call_name,
          pitch_call = EXCLUDED.pitch_call,
          result = EXCLUDED.result,
          events = EXCLUDED.events,
          is_overturned = EXCLUDED.is_overturned,
          is_batter_challenge = EXCLUDED.is_batter_challenge,
          is_in_progress = EXCLUDED.is_in_progress,
          challenge_team_id = EXCLUDED.challenge_team_id,
          edge_distance = EXCLUDED.edge_distance,
          edge_distance_calc = EXCLUDED.edge_distance_calc,
          px = EXCLUDED.px,
          pz = EXCLUDED.pz,
          plate_x = EXCLUDED.plate_x,
          plate_z = EXCLUDED.plate_z,
          strike_zone_top = EXCLUDED.strike_zone_top,
          strike_zone_bottom = EXCLUDED.strike_zone_bottom,
          zone = EXCLUDED.zone,
          start_speed = EXCLUDED.start_speed,
          end_speed = EXCLUDED.end_speed,
          spin_rate = EXCLUDED.spin_rate,
          context_metrics = EXCLUDED.context_metrics,
          source_payload = EXCLUDED.source_payload,
          imported_at = NOW()
        """,
        rows,
        page_size=250,
    )


def run(
    *,
    database_url: str,
    start_date: Optional[str],
    end_date: Optional[str],
    game_pk: Optional[int],
    sport_id: int,
    game_type: str,
    only_has_abs: bool,
    sleep_seconds: float,
    retries: int,
    base_backoff_seconds: float,
    jitter_seconds: float,
) -> SavantAbsScanSummary:
    session = requests.Session()
    session.headers.update({"User-Agent": USER_AGENT})

    conn = psycopg2.connect(database_url)
    conn.autocommit = False
    total_games = 0
    total_abs_games = 0
    total_challenges = 0
    try:
        with conn.cursor() as cur:
            work_items: List[ScheduleGame] = []
            if game_pk is not None:
                today = datetime.now().date()
                work_items = [
                    ScheduleGame(
                        game_pk=game_pk,
                        sport_id=sport_id,
                        game_date=today,
                        season=today.year,
                        game_type=game_type,
                        home_team_id=None,
                        away_team_id=None,
                    )
                ]
            else:
                assert start_date is not None and end_date is not None
                for target_day in daterange(start_date, end_date):
                    work_items.extend(
                        fetch_schedule_for_date(
                            session,
                            target_date=target_day,
                            sport_id=sport_id,
                            game_type=game_type,
                            retries=retries,
                            base_backoff_seconds=base_backoff_seconds,
                        )
                    )

            for schedule_game in work_items:
                payload = fetch_savant_gamefeed(
                    session,
                    schedule_game.game_pk,
                    retries=retries,
                    base_backoff_seconds=base_backoff_seconds,
                )
                challenge_rows = extract_abs_rows(payload, schedule_game)
                has_abs = bool(payload.get("hasAbs"))

                if has_abs or not only_has_abs:
                    store_source_snapshot(
                        cur,
                        "baseball_savant.gamefeed",
                        f"game:{schedule_game.game_pk}",
                        payload,
                    )
                    upsert_raw_games(cur, [normalize_savant_game(payload, schedule_game)])
                    upsert_raw_events(cur, challenge_rows)
                    conn.commit()
                else:
                    conn.rollback()

                total_games += 1
                if has_abs:
                    total_abs_games += 1
                total_challenges += len(challenge_rows)

                print(
                    f"[savant_abs] {normalize_savant_game(payload, schedule_game)[2]} "
                    f"game_pk={schedule_game.game_pk} has_abs={has_abs} "
                    f"challenges={len(challenge_rows)}",
                    flush=True,
                )
                time.sleep(max(0.0, sleep_seconds + random.uniform(0.0, jitter_seconds)))
    finally:
        conn.close()

    print(
        f"[savant_abs] complete games={total_games} abs_games={total_abs_games} "
        f"challenge_rows={total_challenges}",
        flush=True,
    )
    return SavantAbsScanSummary(
        total_games_scanned=total_games,
        total_abs_games=total_abs_games,
        total_challenge_rows=total_challenges,
        sport_id=sport_id,
        game_type=game_type,
    )


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Backfill official Baseball Savant ABS gamefeed data into raw staging tables"
    )
    parser.add_argument("--start-date", help="YYYY-MM-DD")
    parser.add_argument("--end-date", help="YYYY-MM-DD")
    parser.add_argument("--game-pk", type=int, help="Single gamePk to ingest directly")
    parser.add_argument("--sport-id", type=int, default=1, help="MLB Stats API sportId")
    parser.add_argument("--game-type", default="R", help="Comma-separated gameType filter for schedule")
    parser.add_argument(
        "--only-has-abs",
        action="store_true",
        help="Only persist games where Savant reports hasAbs=true; still scans the full window",
    )
    parser.add_argument(
        "--summary-json",
        action="store_true",
        help="Print a final JSON summary after the scan completes",
    )
    parser.add_argument(
        "--database-url",
        default=os.getenv("DATABASE_URL"),
        help="Postgres connection string; defaults to DATABASE_URL",
    )
    parser.add_argument("--sleep-seconds", type=float, default=1.5, help="Base delay between gamefeed requests")
    parser.add_argument("--jitter-seconds", type=float, default=0.75, help="Random additional delay cap")
    parser.add_argument("--retries", type=int, default=5, help="HTTP retry count")
    parser.add_argument("--base-backoff-seconds", type=float, default=2.0, help="Exponential backoff base")
    return parser


def main() -> None:
    parser = build_parser()
    args = parser.parse_args()
    if not args.database_url:
        raise SystemExit("DATABASE_URL was not set")
    if args.game_pk is None and (not args.start_date or not args.end_date):
        raise SystemExit("either --game-pk or both --start-date and --end-date are required")

    summary = run(
        database_url=args.database_url,
        start_date=args.start_date,
        end_date=args.end_date,
        game_pk=args.game_pk,
        sport_id=args.sport_id,
        game_type=args.game_type,
        only_has_abs=args.only_has_abs,
        sleep_seconds=args.sleep_seconds,
        retries=args.retries,
        base_backoff_seconds=args.base_backoff_seconds,
        jitter_seconds=args.jitter_seconds,
    )
    if args.summary_json:
        print(
            json.dumps(
                {
                    "totalGamesScanned": summary.total_games_scanned,
                    "totalAbsGames": summary.total_abs_games,
                    "totalChallengeRows": summary.total_challenge_rows,
                    "sportId": summary.sport_id,
                    "gameType": summary.game_type,
                },
                sort_keys=True,
            ),
            flush=True,
        )


if __name__ == "__main__":
    main()
