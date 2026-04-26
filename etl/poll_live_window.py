#!/usr/bin/env python3
import json
import os
import time
from datetime import datetime, timedelta
from typing import Any, Dict, List, Set
from zoneinfo import ZoneInfo

from ingest_mlb_abs import API_BASE, psycopg2, requests, require_psycopg2, require_requests, run

LIVE_STATES = {"live"}
FINAL_STATES = {"final", "game over", "completed early"}
EASTERN = ZoneInfo("America/New_York")
CATCHUP_HOURS = int(os.getenv("POLL_CATCHUP_HOURS", "8"))
STALE_BACKFILL_HOURS = int(os.getenv("POLL_STALE_BACKFILL_HOURS", "8"))
MAX_BACKFILL_DAYS = int(os.getenv("POLL_MAX_BACKFILL_DAYS", "7"))
SCHEDULE_FETCH_TIMEOUT_SECONDS = int(os.getenv("SCHEDULE_FETCH_TIMEOUT_SECONDS", "30"))
SCHEDULE_FETCH_RETRIES = max(1, int(os.getenv("SCHEDULE_FETCH_RETRIES", "3")))
SCHEDULE_FETCH_BACKOFF_SECONDS = float(os.getenv("SCHEDULE_FETCH_BACKOFF_SECONDS", "2"))


def write_poll_result(payload: Dict[str, Any]) -> None:
    result_file = os.getenv("POLL_RESULT_FILE")
    if not result_file:
        return

    parent = os.path.dirname(result_file)
    if parent:
        os.makedirs(parent, exist_ok=True)

    with open(result_file, "w", encoding="utf-8") as handle:
        json.dump(
            {
                "generated_at": datetime.now(EASTERN).isoformat(),
                **payload,
            },
            handle,
            indent=2,
            sort_keys=True,
        )
        handle.write("\n")


def fetch_schedule_games(date_text: str, game_type: str) -> List[Dict[str, Any]]:
    require_requests()
    last_error: Exception | None = None
    for attempt in range(1, SCHEDULE_FETCH_RETRIES + 1):
        try:
            response = requests.get(
                f"{API_BASE}/schedule",
                params={
                    "sportId": 1,
                    "date": date_text,
                    "gameType": game_type,
                },
                timeout=SCHEDULE_FETCH_TIMEOUT_SECONDS,
            )
            response.raise_for_status()
            payload = response.json()
            break
        except requests.exceptions.RequestException as exc:
            last_error = exc
            if attempt == SCHEDULE_FETCH_RETRIES:
                print(
                    f"[poll] Schedule fetch failed for {date_text} after {attempt} attempt(s): {exc}. "
                    "Skipping this tick."
                )
                return []
            sleep_seconds = SCHEDULE_FETCH_BACKOFF_SECONDS * attempt
            print(
                f"[poll] Schedule fetch attempt {attempt}/{SCHEDULE_FETCH_RETRIES} failed for {date_text}: {exc}. "
                f"Retrying in {sleep_seconds:.1f}s."
            )
            time.sleep(sleep_seconds)
    else:  # pragma: no cover - defensive fallback; loop always breaks or returns
        if last_error is not None:
            print(f"[poll] Schedule fetch failed for {date_text}: {last_error}. Skipping this tick.")
        return []

    games: List[Dict[str, Any]] = []
    for day in payload.get("dates", []):
        for game in day.get("games", []):
            games.append(game)
    return games


def fetch_last_successful_run_finished_at(database_url: str) -> datetime | None:
    require_psycopg2()
    conn = psycopg2.connect(database_url, connect_timeout=5)
    try:
        cur = conn.cursor()
        cur.execute(
            """
            SELECT finished_at
            FROM etl_runs
            WHERE status = 'success'
              AND finished_at IS NOT NULL
            ORDER BY finished_at DESC
            LIMIT 1
            """
        )
        row = cur.fetchone()
        return row[0] if row else None
    finally:
        conn.close()


def candidate_et_dates(now_et: datetime) -> List[str]:
    dates = [now_et.date()]
    if now_et.hour < 4:
        dates.insert(0, (now_et - timedelta(days=1)).date())
    return [day.isoformat() for day in dates]


def date_range(start_date: datetime.date, end_date: datetime.date) -> List[str]:
    days = []
    current = start_date
    while current <= end_date:
        days.append(current.isoformat())
        current += timedelta(days=1)
    return days


def parse_game_time(game: Dict[str, Any]) -> datetime | None:
    raw = game.get("gameDate")
    if not raw:
        return None
    try:
        return datetime.fromisoformat(raw.replace("Z", "+00:00")).astimezone(EASTERN)
    except ValueError:
        return None


def active_poll_dates(game_type: str) -> Set[str]:
    now_et = datetime.now(EASTERN)
    active_dates: Set[str] = set()
    scheduled_count = 0

    for date_text in candidate_et_dates(now_et):
        games = fetch_schedule_games(date_text, game_type)
        scheduled_count += len(games)
        for game in games:
            status = (
                (game.get("status") or {}).get("abstractGameState")
                or (game.get("status") or {}).get("detailedState")
                or ""
            ).strip().lower()
            start_time = parse_game_time(game)

            if status in LIVE_STATES:
                active_dates.add(date_text)
                continue

            # Catch games we may have missed while the laptop was asleep or offline.
            # As long as the scheduled start was recent enough, let the ingest run and
            # use --skip-final-existing to avoid rewriting finals we already have.
            if start_time is not None and start_time <= now_et <= start_time + timedelta(hours=CATCHUP_HOURS):
                active_dates.add(date_text)
                continue

            if status not in FINAL_STATES and start_time is not None and start_time <= now_et:
                active_dates.add(date_text)

    if scheduled_count == 0:
        print(f"[poll] No games scheduled for ET candidate dates at {now_et.isoformat()}; exiting.")
    elif not active_dates:
        print(f"[poll] Games are scheduled, but none are live or within the catch-up window at {now_et.isoformat()}; exiting.")

    return active_dates


def stale_backfill_dates(database_url: str, game_type: str) -> Set[str]:
    now_et = datetime.now(EASTERN)
    last_success = fetch_last_successful_run_finished_at(database_url)
    if last_success is None:
        return set()

    gap = now_et - last_success.astimezone(EASTERN)
    if gap < timedelta(hours=STALE_BACKFILL_HOURS):
        return set()

    start_date = last_success.astimezone(EASTERN).date()
    max_start = now_et.date() - timedelta(days=max(MAX_BACKFILL_DAYS - 1, 0))
    if start_date < max_start:
        start_date = max_start

    candidate_dates = date_range(start_date, now_et.date())
    scheduled_dates: Set[str] = set()

    for date_text in candidate_dates:
        if fetch_schedule_games(date_text, game_type):
            scheduled_dates.add(date_text)

    if scheduled_dates:
        print(
            "[poll] Last successful ingest was "
            f"{gap.total_seconds() / 3600:.1f}h ago; backfilling ET dates "
            f"{min(scheduled_dates)}..{max(scheduled_dates)}."
        )

    return scheduled_dates


def main() -> None:
    database_url = os.getenv("WAREHOUSE_DATABASE_URL") or os.getenv("DATABASE_URL")
    if not database_url:
        raise SystemExit("WAREHOUSE_DATABASE_URL or DATABASE_URL is required")

    game_type = os.getenv("MLB_GAME_TYPES", "S,R")
    skip_reports = True
    stale_dates = sorted(stale_backfill_dates(database_url, game_type))
    if stale_dates:
        start_date = stale_dates[0]
        end_date = stale_dates[-1]
        write_poll_result(
            {
                "ran_ingest": True,
                "mode": "stale_backfill",
                "start_date": start_date,
                "end_date": end_date,
                "game_type": game_type,
            }
        )
        run(
            database_url,
            start_date,
            end_date,
            game_type,
            skip_final_existing=True,
            skip_reports=skip_reports,
        )
        return

    live_dates = sorted(active_poll_dates(game_type))
    if not live_dates:
        write_poll_result(
            {
                "ran_ingest": False,
                "mode": "no_active_window",
                "start_date": None,
                "end_date": None,
                "game_type": game_type,
            }
        )
        return

    start_date = live_dates[0]
    end_date = live_dates[-1]
    print(f"[poll] Active game window detected for ET date window {start_date}..{end_date}; starting ingest.")
    write_poll_result(
        {
            "ran_ingest": True,
            "mode": "active_window",
            "start_date": start_date,
            "end_date": end_date,
            "game_type": game_type,
        }
    )
    run(
        database_url,
        start_date,
        end_date,
        game_type,
        skip_final_existing=True,
        skip_reports=skip_reports,
    )


if __name__ == "__main__":
    main()
