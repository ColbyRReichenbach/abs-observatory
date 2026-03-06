#!/usr/bin/env python3
import argparse
import os
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

import psycopg2
import requests
from dotenv import load_dotenv
from psycopg2.extras import Json, execute_batch

from generate_game_report import generate_and_store_report

load_dotenv()

API_BASE = "https://statsapi.mlb.com/api/v1"
API_BASE_V11 = "https://statsapi.mlb.com/api/v1.1"


def _bases_state(play: Dict[str, Any]) -> str:
    matchup = play.get("matchup", {})
    first = matchup.get("postOnFirst")
    second = matchup.get("postOnSecond")
    third = matchup.get("postOnThird")
    bits = ["1" if first else "0", "1" if second else "0", "1" if third else "0"]
    return "".join(bits)


def _parse_iso(s: Optional[str]) -> Optional[datetime]:
    if not s:
        return None
    return datetime.fromisoformat(s.replace("Z", "+00:00"))


def fetch_schedule(start_date: str, end_date: str, game_type: str = "S,R") -> List[int]:
    url = f"{API_BASE}/schedule"
    params = {
        "sportId": 1,
        "startDate": start_date,
        "endDate": end_date,
        "gameType": game_type,
    }
    payload = requests.get(url, params=params, timeout=30).json()
    game_pks: List[int] = []
    for d in payload.get("dates", []):
      for g in d.get("games", []):
        game_pks.append(g["gamePk"])
    return game_pks


def fetch_game_feed(game_pk: int) -> Dict[str, Any]:
    url = f"{API_BASE_V11}/game/{game_pk}/feed/live"
    return requests.get(url, timeout=30).json()


def upsert_game(cur, feed: Dict[str, Any]) -> None:
    gd = feed.get("gameData", {})
    teams = gd.get("teams", {})
    datetime_info = gd.get("datetime", {})
    status = gd.get("status", {})

    cur.execute(
        """
        INSERT INTO games (
          game_pk, game_date, game_type, season, status_abstract, status_detailed,
          home_team_id, away_team_id, home_score, away_score, venue_name
        ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
        ON CONFLICT (game_pk) DO UPDATE SET
          game_date = EXCLUDED.game_date,
          game_type = EXCLUDED.game_type,
          season = EXCLUDED.season,
          status_abstract = EXCLUDED.status_abstract,
          status_detailed = EXCLUDED.status_detailed,
          home_score = EXCLUDED.home_score,
          away_score = EXCLUDED.away_score,
          venue_name = EXCLUDED.venue_name,
          updated_at = NOW()
        """,
        (
            feed.get("gamePk"),
            _parse_iso(datetime_info.get("dateTime")) or datetime.now(timezone.utc),
            gd.get("game", {}).get("type", "U"),
            int(gd.get("game", {}).get("season", datetime.now().year)),
            status.get("abstractGameState", "Unknown"),
            status.get("detailedState"),
            teams.get("home", {}).get("id"),
            teams.get("away", {}).get("id"),
            feed.get("liveData", {}).get("linescore", {}).get("teams", {}).get("home", {}).get("runs"),
            feed.get("liveData", {}).get("linescore", {}).get("teams", {}).get("away", {}).get("runs"),
            gd.get("venue", {}).get("name"),
        ),
    )


def upsert_officials(cur, game_pk: int, feed: Dict[str, Any]) -> None:
    officials = feed.get("liveData", {}).get("boxscore", {}).get("officials", [])
    cur.execute("DELETE FROM officials WHERE game_pk = %s", (game_pk,))
    rows = []
    for off in officials:
        official = off.get("official", {})
        rows.append((game_pk, official.get("id"), official.get("fullName"), off.get("officialType")))
    if rows:
        execute_batch(
            cur,
            """
            INSERT INTO officials (game_pk, official_id, official_name, official_type)
            VALUES (%s,%s,%s,%s)
            ON CONFLICT (game_pk, official_id, official_type) DO NOTHING
            """,
            rows,
        )


def upsert_abs_counters(cur, game_pk: int, feed: Dict[str, Any]) -> None:
    gd = feed.get("gameData", {})
    teams = gd.get("teams", {})
    abs_data = gd.get("absChallenges", {})

    home = abs_data.get("home", {})
    away = abs_data.get("away", {})

    cur.execute(
        """
        INSERT INTO team_abs_game_summary (game_pk, team_id, team_side, used_successful, used_failed, remaining)
        VALUES (%s,%s,'home',%s,%s,%s)
        ON CONFLICT (game_pk, team_id) DO UPDATE SET
          used_successful = EXCLUDED.used_successful,
          used_failed = EXCLUDED.used_failed,
          remaining = EXCLUDED.remaining,
          updated_at = NOW()
        """,
        (
            game_pk,
            teams.get("home", {}).get("id"),
            int(home.get("usedSuccessful", 0)),
            int(home.get("usedFailed", 0)),
            int(home.get("remaining", 0)),
        ),
    )

    cur.execute(
        """
        INSERT INTO team_abs_game_summary (game_pk, team_id, team_side, used_successful, used_failed, remaining)
        VALUES (%s,%s,'away',%s,%s,%s)
        ON CONFLICT (game_pk, team_id) DO UPDATE SET
          used_successful = EXCLUDED.used_successful,
          used_failed = EXCLUDED.used_failed,
          remaining = EXCLUDED.remaining,
          updated_at = NOW()
        """,
        (
            game_pk,
            teams.get("away", {}).get("id"),
            int(away.get("usedSuccessful", 0)),
            int(away.get("usedFailed", 0)),
            int(away.get("remaining", 0)),
        ),
    )


def _challenge_from_review(
    game_pk: int,
    play: Dict[str, Any],
    review: Dict[str, Any],
    challenge_level: str,
    pitch_number: Optional[int],
    pitch_event: Optional[Dict[str, Any]],
) -> Optional[Tuple[Any, ...]]:
    if not review:
        return None

    matchup = play.get("matchup", {})
    count = play.get("count", {})
    about = play.get("about", {})
    result = play.get("result", {})

    pitch_data = (pitch_event or {}).get("pitchData", {})
    coords = pitch_data.get("coordinates", {})

    dedupe_key = f"{game_pk}:{about.get('atBatIndex')}:{pitch_number if pitch_number is not None else 'na'}:{review.get('challengeTeamId')}:{review.get('isOverturned')}:{challenge_level}"

    challenge_team_id = review.get("challengeTeamId")
    home_team_id = play.get("homeTeamId")
    away_team_id = play.get("awayTeamId")
    challenge_team_side = (
        "home"
        if challenge_team_id == home_team_id
        else "away"
        if challenge_team_id == away_team_id
        else None
    )

    return (
        dedupe_key,
        game_pk,
        about.get("atBatIndex"),
        pitch_number,
        challenge_level,
        challenge_team_id,
        challenge_team_side,
        (review.get("player") or {}).get("id"),
        (review.get("player") or {}).get("fullName"),
        bool(review.get("isOverturned", False)),
        review.get("reviewType"),
        bool(review.get("inProgress", False)),
        (pitch_event or {}).get("details", {}).get("call", {}).get("code") or result.get("eventType"),
        (pitch_event or {}).get("details", {}).get("description") or result.get("description"),
        about.get("inning"),
        about.get("halfInning"),
        count.get("balls"),
        count.get("strikes"),
        count.get("outs"),
        matchup.get("batter", {}).get("id"),
        matchup.get("batter", {}).get("fullName"),
        matchup.get("pitcher", {}).get("id"),
        matchup.get("pitcher", {}).get("fullName"),
        result.get("homeScore"),
        result.get("awayScore"),
        _bases_state(play),
        coords.get("pX"),
        coords.get("pZ"),
        pitch_data.get("strikeZoneTop"),
        pitch_data.get("strikeZoneBottom"),
        _parse_iso(about.get("endTime")),
    )


def upsert_plays(cur, game_pk: int, feed: Dict[str, Any]) -> int:
    plays = feed.get("liveData", {}).get("plays", {}).get("allPlays", [])
    rows_at_bat = []
    rows_pitch = []
    rows_challenge = []

    home_team_id = feed.get("gameData", {}).get("teams", {}).get("home", {}).get("id")
    away_team_id = feed.get("gameData", {}).get("teams", {}).get("away", {}).get("id")

    for play in plays:
        about = play.get("about", {})
        result = play.get("result", {})
        matchup = play.get("matchup", {})
        count = play.get("count", {})
        at_bat_index = about.get("atBatIndex")

        play["homeTeamId"] = home_team_id
        play["awayTeamId"] = away_team_id

        rows_at_bat.append(
            (
                game_pk,
                at_bat_index,
                about.get("inning"),
                about.get("halfInning"),
                _parse_iso(about.get("startTime")),
                _parse_iso(about.get("endTime")),
                matchup.get("batter", {}).get("id"),
                matchup.get("batter", {}).get("fullName"),
                matchup.get("pitcher", {}).get("id"),
                matchup.get("pitcher", {}).get("fullName"),
                result.get("eventType"),
                result.get("description"),
                count.get("balls"),
                count.get("strikes"),
                count.get("outs"),
                bool(about.get("isComplete", False)),
                bool(about.get("isScoringPlay", False)),
            )
        )

        at_bat_review = play.get("reviewDetails")
        if at_bat_review:
            row = _challenge_from_review(game_pk, play, at_bat_review, "at_bat", None, None)
            if row:
                rows_challenge.append(row)

        for ev in play.get("playEvents", []):
            if not ev.get("isPitch"):
                continue
            pitch_data = ev.get("pitchData", {})
            details = ev.get("details", {})
            coords = pitch_data.get("coordinates", {})
            breaks = pitch_data.get("breaks", {})
            pitch_number = ev.get("pitchNumber")
            if pitch_number is None:
                continue

            rows_pitch.append(
                (
                    game_pk,
                    at_bat_index,
                    pitch_number,
                    (details.get("call") or {}).get("code") or details.get("code"),
                    (details.get("call") or {}).get("description") or details.get("description"),
                    details.get("isBall"),
                    details.get("isStrike"),
                    (details.get("type") or {}).get("code"),
                    (details.get("type") or {}).get("description"),
                    pitch_data.get("startSpeed"),
                    pitch_data.get("endSpeed"),
                    breaks.get("spinRate"),
                    coords.get("pX"),
                    coords.get("pZ"),
                    pitch_data.get("strikeZoneTop"),
                    pitch_data.get("strikeZoneBottom"),
                    pitch_data.get("zone"),
                    bool(details.get("hasReview", False)),
                )
            )

            event_review = ev.get("reviewDetails")
            if event_review:
                row = _challenge_from_review(game_pk, play, event_review, "pitch", pitch_number, ev)
                if row:
                    rows_challenge.append(row)

    execute_batch(
        cur,
        """
        INSERT INTO at_bats (
          game_pk, at_bat_index, inning, half_inning, start_time, end_time,
          batter_id, batter_name, pitcher_id, pitcher_name, event_type,
          event_description, balls, strikes, outs, is_complete, is_scoring_play
        ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
        ON CONFLICT (game_pk, at_bat_index) DO UPDATE SET
          inning = EXCLUDED.inning,
          half_inning = EXCLUDED.half_inning,
          end_time = EXCLUDED.end_time,
          event_type = EXCLUDED.event_type,
          event_description = EXCLUDED.event_description,
          balls = EXCLUDED.balls,
          strikes = EXCLUDED.strikes,
          outs = EXCLUDED.outs,
          is_complete = EXCLUDED.is_complete,
          is_scoring_play = EXCLUDED.is_scoring_play
        """,
        rows_at_bat,
        page_size=500,
    )

    execute_batch(
        cur,
        """
        INSERT INTO pitches (
          game_pk, at_bat_index, pitch_number, called_code, called_description,
          is_ball, is_strike, pitch_type_code, pitch_type_description, start_speed,
          end_speed, spin_rate, px, pz, strike_zone_top, strike_zone_bottom, zone, has_review
        ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
        ON CONFLICT (game_pk, at_bat_index, pitch_number) DO UPDATE SET
          called_code = EXCLUDED.called_code,
          called_description = EXCLUDED.called_description,
          is_ball = EXCLUDED.is_ball,
          is_strike = EXCLUDED.is_strike,
          pitch_type_code = EXCLUDED.pitch_type_code,
          pitch_type_description = EXCLUDED.pitch_type_description,
          start_speed = EXCLUDED.start_speed,
          end_speed = EXCLUDED.end_speed,
          spin_rate = EXCLUDED.spin_rate,
          px = EXCLUDED.px,
          pz = EXCLUDED.pz,
          strike_zone_top = EXCLUDED.strike_zone_top,
          strike_zone_bottom = EXCLUDED.strike_zone_bottom,
          zone = EXCLUDED.zone,
          has_review = EXCLUDED.has_review
        """,
        rows_pitch,
        page_size=1000,
    )

    execute_batch(
        cur,
        """
        INSERT INTO abs_challenges (
          dedupe_key, game_pk, at_bat_index, pitch_number, challenge_level, challenge_team_id,
          challenge_team_side, challenge_player_id, challenge_player_name, is_overturned,
          review_type, in_progress, called_code, called_description, inning, half_inning,
          balls, strikes, outs, batter_id, batter_name, pitcher_id, pitcher_name,
          home_score, away_score, bases_state, px, pz, strike_zone_top, strike_zone_bottom,
          challenged_at
        ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
        ON CONFLICT (dedupe_key) DO UPDATE SET
          is_overturned = EXCLUDED.is_overturned,
          in_progress = EXCLUDED.in_progress,
          called_code = EXCLUDED.called_code,
          called_description = EXCLUDED.called_description,
          challenged_at = EXCLUDED.challenged_at
        """,
        rows_challenge,
        page_size=250,
    )

    return len(rows_challenge)


def refresh_umpire_summary(cur, game_pk: int) -> None:
    cur.execute(
        """
        DELETE FROM umpire_abs_game_summary WHERE game_pk = %s;
        INSERT INTO umpire_abs_game_summary (
          game_pk, umpire_id, umpire_name, challenged_calls, overturned_calls, confirmed_calls
        )
        SELECT
          c.game_pk,
          o.official_id,
          o.official_name,
          COUNT(*) AS challenged_calls,
          COUNT(*) FILTER (WHERE c.is_overturned) AS overturned_calls,
          COUNT(*) FILTER (WHERE NOT c.is_overturned) AS confirmed_calls
        FROM abs_challenges c
        JOIN officials o ON o.game_pk = c.game_pk AND o.official_type = 'Home Plate'
        WHERE c.game_pk = %s
        GROUP BY c.game_pk, o.official_id, o.official_name;
        """,
        (game_pk, game_pk),
    )


def write_snapshot(cur, game_pk: int, feed: Dict[str, Any]) -> None:
    linescore = feed.get("liveData", {}).get("linescore", {})
    abs_data = feed.get("gameData", {}).get("absChallenges", {})
    cur.execute(
        """
        INSERT INTO game_state_snapshots (
          game_pk, inning, half_inning, balls, strikes, outs,
          home_score, away_score,
          abs_away_used_successful, abs_away_used_failed, abs_away_remaining,
          abs_home_used_successful, abs_home_used_failed, abs_home_remaining
        ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
        """,
        (
            game_pk,
            linescore.get("currentInning"),
            linescore.get("inningHalf"),
            linescore.get("balls"),
            linescore.get("strikes"),
            linescore.get("outs"),
            linescore.get("teams", {}).get("home", {}).get("runs"),
            linescore.get("teams", {}).get("away", {}).get("runs"),
            abs_data.get("away", {}).get("usedSuccessful", 0),
            abs_data.get("away", {}).get("usedFailed", 0),
            abs_data.get("away", {}).get("remaining", 0),
            abs_data.get("home", {}).get("usedSuccessful", 0),
            abs_data.get("home", {}).get("usedFailed", 0),
            abs_data.get("home", {}).get("remaining", 0),
        ),
    )


def ingest_game(cur, game_pk: int) -> Tuple[int, bool]:
    feed = fetch_game_feed(game_pk)
    upsert_game(cur, feed)
    upsert_officials(cur, game_pk, feed)
    upsert_abs_counters(cur, game_pk, feed)
    inserted = upsert_plays(cur, game_pk, feed)
    refresh_umpire_summary(cur, game_pk)
    write_snapshot(cur, game_pk, feed)
    status = feed.get("gameData", {}).get("status", {}).get("abstractGameState", "")
    is_final = str(status).lower() == "final"
    return inserted, is_final


def run(database_url: str, start_date: str, end_date: str, game_type: str) -> None:
    conn = psycopg2.connect(database_url)
    conn.autocommit = False

    cur = conn.cursor()
    cur.execute("INSERT INTO etl_runs (run_type) VALUES ('manual_window') RETURNING run_id")
    run_id = cur.fetchone()[0]
    conn.commit()

    rows_written = 0
    reports_generated = 0
    try:
        game_pks = fetch_schedule(start_date, end_date, game_type)
        for game_pk in game_pks:
            try:
                inserted, is_final = ingest_game(cur, game_pk)
                rows_written += inserted
                if is_final and generate_and_store_report(cur, game_pk, force=False):
                    reports_generated += 1
                conn.commit()
            except Exception as exc:  # pylint: disable=broad-except
                conn.rollback()
                cur.execute(
                    """
                    INSERT INTO ingest_errors (run_id, game_pk, stage, error_message, payload)
                    VALUES (%s,%s,%s,%s,%s)
                    """,
                    (run_id, game_pk, "ingest_game", str(exc), Json({"game_pk": game_pk})),
                )
                conn.commit()

        cur.execute(
            "UPDATE etl_runs SET status = 'success', finished_at = NOW(), rows_written = %s, details = %s WHERE run_id = %s",
            (rows_written, Json({"reports_generated": reports_generated}), run_id),
        )
        conn.commit()
    except Exception as exc:  # pylint: disable=broad-except
        conn.rollback()
        cur.execute(
            "UPDATE etl_runs SET status = 'failed', finished_at = NOW(), details = %s WHERE run_id = %s",
            (Json({"error": str(exc)}), run_id),
        )
        conn.commit()
        raise
    finally:
        cur.close()
        conn.close()


def main() -> None:
    parser = argparse.ArgumentParser(description="Ingest MLB ABS data into Postgres")
    parser.add_argument("--start-date", required=True, help="YYYY-MM-DD")
    parser.add_argument("--end-date", required=True, help="YYYY-MM-DD")
    parser.add_argument("--game-type", default="S,R", help="Comma separated game types")
    args = parser.parse_args()

    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        raise SystemExit("DATABASE_URL is required")

    run(database_url, args.start_date, args.end_date, args.game_type)


if __name__ == "__main__":
    main()
