#!/usr/bin/env python3
import argparse
import hashlib
import json
import os
from datetime import datetime, timezone
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

    class Json:  # pragma: no cover - simple import-safe shim
        def __init__(self, value: Any):
            self.adapted = value

    def execute_batch(*_args: Any, **_kwargs: Any) -> None:
        raise RuntimeError("psycopg2 is required for ETL database writes")

from db_target import log_database_target, resolve_database_target

load_dotenv()

API_BASE = "https://statsapi.mlb.com/api/v1"
API_BASE_V11 = "https://statsapi.mlb.com/api/v1.1"
FINAL_PITCH_CALLED_TAKES = {"BALL", "CALLED STRIKE", "BALL IN DIRT"}


def require_psycopg2() -> None:
    if psycopg2 is None:
        raise RuntimeError("psycopg2 is required to run ETL database operations")


def require_requests() -> None:
    if requests is None:
        raise RuntimeError("requests is required to fetch MLB Stats API payloads")


def _env_bool(name: str, default: bool = True) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


def should_write_raw_source_snapshot(source_name: str) -> bool:
    if not _env_bool("WRITE_RAW_SNAPSHOTS", True):
        return False

    source_flag_map = {
        "mlb_statsapi.feed_live": "WRITE_RAW_FEED_LIVE",
        "mlb_statsapi.standings": "WRITE_RAW_STANDINGS",
        "baseball_savant.gamefeed": "WRITE_RAW_SAVANT",
    }
    flag_name = source_flag_map.get(source_name)
    if not flag_name:
        return True
    return _env_bool(flag_name, True)


def _height_to_inches(height_text: Optional[str]) -> Optional[float]:
    if not height_text:
        return None
    normalized = height_text.strip()
    try:
        feet_part, inches_part = normalized.split("'")
        feet = int(feet_part.strip())
        inches = int(inches_part.replace('"', "").strip())
        return float(feet * 12 + inches)
    except (ValueError, AttributeError):
        return None


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


def _parse_mlb_timestamp(s: Optional[str]) -> Optional[datetime]:
    if not s:
        return None
    try:
        return datetime.strptime(s, "%Y%m%d_%H%M%S").replace(tzinfo=timezone.utc)
    except ValueError:
        return _parse_iso(s)


def _normalize_count_state(
    balls: Optional[int],
    strikes: Optional[int],
    outs: Optional[int],
) -> Dict[str, Optional[int]]:
    return {
        "balls": balls,
        "strikes": strikes,
        "outs": outs,
    }


def _derive_after_count(
    before: Dict[str, Optional[int]],
    event: Dict[str, Any],
    is_last_pitch: bool,
) -> Dict[str, Optional[int]]:
    event_count = event.get("count") or {}
    details = event.get("details") or {}

    after_balls = event_count.get("balls")
    after_strikes = event_count.get("strikes")
    after_outs = event_count.get("outs")

    if after_balls is None:
        after_balls = before.get("balls")
        if details.get("isBall") and not is_last_pitch and after_balls is not None:
            after_balls = min(after_balls + 1, 4)

    if after_strikes is None:
        after_strikes = before.get("strikes")
        if details.get("isStrike") and not is_last_pitch and after_strikes is not None:
            code = ((details.get("call") or {}).get("code") or details.get("code") or "").upper()
            if code == "F" and before.get("strikes") == 2:
                after_strikes = before.get("strikes")
            else:
                after_strikes = min(after_strikes + 1, 3)

    if after_outs is None:
        after_outs = before.get("outs")

    return _normalize_count_state(after_balls, after_strikes, after_outs)


def _score_from_result(play: Dict[str, Any], previous: Dict[str, int]) -> Dict[str, int]:
    result = play.get("result") or {}
    return {
        "home": int(result.get("homeScore", previous["home"])),
        "away": int(result.get("awayScore", previous["away"])),
    }


def fetch_schedule(start_date: str, end_date: str, game_type: str = "S,R") -> List[int]:
    require_requests()
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
    require_requests()
    url = f"{API_BASE_V11}/game/{game_pk}/feed/live"
    return requests.get(url, timeout=30).json()


def filter_existing_final_game_pks(cur, game_pks: List[int]) -> List[int]:
    if not game_pks:
        return []

    cur.execute(
        """
        SELECT game_pk
        FROM games
        WHERE game_pk = ANY(%s)
          AND LOWER(status_abstract) = 'final'
        """,
        (game_pks,),
    )
    existing_final = {row[0] for row in cur.fetchall()}
    return [game_pk for game_pk in game_pks if game_pk not in existing_final]


def store_source_snapshot(cur, source_name: str, entity_key: str, payload: Dict[str, Any]) -> None:
    if not should_write_raw_source_snapshot(source_name):
        return

    payload_text = json.dumps(payload, sort_keys=True, separators=(",", ":"))
    payload_hash = hashlib.sha256(payload_text.encode("utf-8")).hexdigest()
    cur.execute(
        """
        INSERT INTO ops.source_snapshots (source_name, entity_key, payload_hash, payload)
        VALUES (%s, %s, %s, %s)
        ON CONFLICT DO NOTHING
        """,
        (source_name, entity_key, payload_hash, Json(payload)),
    )


def _extract_linescore_innings(linescore: Dict[str, Any]) -> List[Dict[str, Any]]:
    innings: List[Dict[str, Any]] = []
    for index, inning in enumerate(linescore.get("innings") or []):
        away = inning.get("away") or {}
        home = inning.get("home") or {}
        innings.append(
            {
                "inning": int(inning.get("num") or (index + 1)),
                "awayRuns": away.get("runs"),
                "homeRuns": home.get("runs"),
                "awayHits": away.get("hits"),
                "homeHits": home.get("hits"),
                "awayErrors": away.get("errors"),
                "homeErrors": home.get("errors"),
            }
        )
    return innings


def upsert_game_linescore(cur, game_pk: int, feed: Dict[str, Any]) -> None:
    linescore = (feed.get("liveData") or {}).get("linescore") or {}
    teams = linescore.get("teams") or {}
    away = teams.get("away") or {}
    home = teams.get("home") or {}
    status = (feed.get("gameData") or {}).get("status") or {}
    metadata = feed.get("metaData") or {}
    source_updated_at = _parse_mlb_timestamp(metadata.get("timeStamp")) or datetime.now(timezone.utc)

    cur.execute(
        """
        INSERT INTO ops.game_linescores (
          game_pk,
          source_name,
          source_updated_at,
          status_abstract,
          current_inning,
          current_inning_ordinal,
          inning_state,
          inning_half,
          is_top_inning,
          scheduled_innings,
          balls,
          strikes,
          outs,
          away_runs,
          home_runs,
          away_hits,
          home_hits,
          away_errors,
          home_errors,
          innings_json,
          raw_linescore
        ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
        ON CONFLICT (game_pk) DO UPDATE SET
          source_name = EXCLUDED.source_name,
          source_updated_at = EXCLUDED.source_updated_at,
          status_abstract = EXCLUDED.status_abstract,
          current_inning = EXCLUDED.current_inning,
          current_inning_ordinal = EXCLUDED.current_inning_ordinal,
          inning_state = EXCLUDED.inning_state,
          inning_half = EXCLUDED.inning_half,
          is_top_inning = EXCLUDED.is_top_inning,
          scheduled_innings = EXCLUDED.scheduled_innings,
          balls = EXCLUDED.balls,
          strikes = EXCLUDED.strikes,
          outs = EXCLUDED.outs,
          away_runs = EXCLUDED.away_runs,
          home_runs = EXCLUDED.home_runs,
          away_hits = EXCLUDED.away_hits,
          home_hits = EXCLUDED.home_hits,
          away_errors = EXCLUDED.away_errors,
          home_errors = EXCLUDED.home_errors,
          innings_json = EXCLUDED.innings_json,
          raw_linescore = EXCLUDED.raw_linescore,
          updated_at = NOW()
        """,
        (
            game_pk,
            "mlb_statsapi.feed_live",
            source_updated_at,
            status.get("abstractGameState"),
            linescore.get("currentInning"),
            linescore.get("currentInningOrdinal"),
            linescore.get("inningState"),
            linescore.get("inningHalf"),
            linescore.get("isTopInning"),
            linescore.get("scheduledInnings"),
            linescore.get("balls"),
            linescore.get("strikes"),
            linescore.get("outs"),
            away.get("runs"),
            home.get("runs"),
            away.get("hits"),
            home.get("hits"),
            away.get("errors"),
            home.get("errors"),
            Json(_extract_linescore_innings(linescore)),
            Json(linescore),
        ),
    )


def upsert_game(cur, feed: Dict[str, Any]) -> None:
    gd = feed.get("gameData", {})
    teams = gd.get("teams", {})
    datetime_info = gd.get("datetime", {})
    status = gd.get("status", {})

    cur.execute(
        """
        INSERT INTO games (
          game_pk, game_date, game_type, season, status_abstract, status_detailed,
          home_team_id, away_team_id, home_score, away_score, has_abs, venue_name
        ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
        ON CONFLICT (game_pk) DO UPDATE SET
          game_date = EXCLUDED.game_date,
          game_type = EXCLUDED.game_type,
          season = EXCLUDED.season,
          status_abstract = EXCLUDED.status_abstract,
          status_detailed = EXCLUDED.status_detailed,
          home_score = EXCLUDED.home_score,
          away_score = EXCLUDED.away_score,
          has_abs = COALESCE(EXCLUDED.has_abs, games.has_abs),
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
            bool(gd.get("absChallenges")) if gd.get("absChallenges") is not None else None,
            gd.get("venue", {}).get("name"),
        ),
    )


def upsert_players(cur, feed: Dict[str, Any]) -> None:
    players = (feed.get("gameData", {}) or {}).get("players", {}) or {}
    rows: List[Tuple[Any, ...]] = []

    for player in players.values():
        player_id = player.get("id")
        if player_id is None:
            continue
        rows.append(
            (
                player_id,
                player.get("fullName") or player.get("useName") or "Unknown Player",
                player.get("height"),
                _height_to_inches(player.get("height")),
                player.get("strikeZoneTop"),
                player.get("strikeZoneBottom"),
                bool(player.get("active", True)),
                Json(player),
                datetime.now(timezone.utc),
            )
        )

    if not rows:
        return

    execute_batch(
        cur,
        """
        INSERT INTO players (
          player_id,
          full_name,
          height_text,
          height_inches,
          abs_strike_zone_top,
          abs_strike_zone_bottom,
          active,
          source_payload,
          source_updated_at
        ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s)
        ON CONFLICT (player_id) DO UPDATE SET
          full_name = EXCLUDED.full_name,
          height_text = COALESCE(EXCLUDED.height_text, players.height_text),
          height_inches = COALESCE(EXCLUDED.height_inches, players.height_inches),
          abs_strike_zone_top = COALESCE(EXCLUDED.abs_strike_zone_top, players.abs_strike_zone_top),
          abs_strike_zone_bottom = COALESCE(EXCLUDED.abs_strike_zone_bottom, players.abs_strike_zone_bottom),
          active = EXCLUDED.active,
          source_payload = EXCLUDED.source_payload,
          source_updated_at = EXCLUDED.source_updated_at,
          updated_at = NOW()
        """,
        rows,
        page_size=200,
    )


def upsert_officials(cur, game_pk: int, feed: Dict[str, Any]) -> None:
    officials = feed.get("liveData", {}).get("boxscore", {}).get("officials", [])
    cur.execute("DELETE FROM officials WHERE game_pk = %s", (game_pk,))
    rows = []
    for off in officials:
        official = off.get("official", {})
        official_type = off.get("officialType")
        fallback_name = official_type or "Unknown Official"
        official_name = official.get("fullName") or official.get("lastName") or fallback_name
        rows.append((game_pk, official.get("id"), official_name, official_type))
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
    count_state: Optional[Dict[str, Optional[int]]] = None,
    bases_state: Optional[str] = None,
    inferred_pitch: Optional[Dict[str, Any]] = None,
) -> Optional[Tuple[Any, ...]]:
    if not review:
        return None

    matchup = play.get("matchup", {})
    count = count_state or play.get("count", {})
    about = play.get("about", {})
    result = play.get("result", {})

    pitch_data = (pitch_event or {}).get("pitchData", {})
    coords = pitch_data.get("coordinates", {})
    location_source = "unresolved"
    if coords.get("pX") is not None and coords.get("pZ") is not None:
        location_source = "reviewed_pitch_px_pz"
    elif coords.get("x") is not None and coords.get("y") is not None:
        location_source = "reviewed_pitch_xy_only"
    elif inferred_pitch:
        location_source = inferred_pitch.get("location_source") or "unresolved"

    dedupe_key = ":".join(
        [
            str(game_pk),
            str(about.get("atBatIndex")),
            str(pitch_number if pitch_number is not None else (inferred_pitch or {}).get("pitch_number", "na")),
            str(review.get("challengeTeamId") or "unknown_team"),
            str(review.get("reviewType") or "unknown_review"),
            challenge_level,
        ]
    )

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
        bases_state or _bases_state(play),
        coords.get("pX"),
        coords.get("pZ"),
        pitch_data.get("strikeZoneTop"),
        pitch_data.get("strikeZoneBottom"),
        _parse_iso(about.get("endTime")),
        coords.get("x"),
        coords.get("y"),
        (inferred_pitch or {}).get("pitch_number"),
        (inferred_pitch or {}).get("play_event_index"),
        (inferred_pitch or {}).get("px"),
        (inferred_pitch or {}).get("pz"),
        (inferred_pitch or {}).get("strike_zone_top"),
        (inferred_pitch or {}).get("strike_zone_bottom"),
        (inferred_pitch or {}).get("zone"),
        (inferred_pitch or {}).get("gameday_x"),
        (inferred_pitch or {}).get("gameday_y"),
        (inferred_pitch or {}).get("method"),
        (inferred_pitch or {}).get("confidence"),
        location_source,
    )


def _is_walk_like_result(result: Dict[str, Any]) -> bool:
    event_type = (result.get("eventType") or "").lower()
    return event_type in {"walk", "intent_walk"}


def _is_strikeout_like_result(result: Dict[str, Any]) -> bool:
    event_type = (result.get("eventType") or "").lower()
    description = (result.get("description") or "").lower()
    return event_type in {"strikeout", "strikeout_double_play"} or "called out on strikes" in description or "strikes out" in description


def _infer_at_bat_review_pitch(play: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    play_events = play.get("playEvents", [])
    pitch_events: List[Tuple[int, Dict[str, Any]]] = [
        (event_index, event)
        for event_index, event in enumerate(play_events)
        if event.get("isPitch") and event.get("pitchNumber") is not None
    ]
    if not pitch_events:
        return None

    play_event_index, pitch_event = pitch_events[-1]
    details = pitch_event.get("details", {})
    pitch_data = pitch_event.get("pitchData", {})
    coords = pitch_data.get("coordinates", {})
    description = (details.get("description") or "").strip()
    normalized_description = description.upper()
    call_code = ((details.get("call") or {}).get("code") or details.get("code") or "").upper()
    if normalized_description not in FINAL_PITCH_CALLED_TAKES and call_code not in {"B", "*B", "C"}:
        return None

    result = play.get("result", {})
    confidence = "medium"
    if _is_walk_like_result(result) and "BALL" in normalized_description:
        confidence = "high"
    elif _is_strikeout_like_result(result) and "STRIKE" in normalized_description:
        confidence = "high"

    location_source = "unresolved"
    if coords.get("pX") is not None and coords.get("pZ") is not None:
        location_source = "inferred_final_pitch_px_pz"
    elif coords.get("x") is not None and coords.get("y") is not None:
        location_source = "inferred_final_pitch_xy_only"

    return {
        "pitch_number": pitch_event.get("pitchNumber"),
        "play_event_index": play_event_index,
        "px": coords.get("pX"),
        "pz": coords.get("pZ"),
        "strike_zone_top": pitch_data.get("strikeZoneTop"),
        "strike_zone_bottom": pitch_data.get("strikeZoneBottom"),
        "zone": pitch_data.get("zone"),
        "gameday_x": coords.get("x"),
        "gameday_y": coords.get("y"),
        "method": "at_bat_final_pitch_called_take",
        "confidence": confidence,
        "location_source": location_source,
    }


def _extract_game_rows(
    game_pk: int, feed: Dict[str, Any]
) -> Tuple[List[Tuple[Any, ...]], List[Tuple[Any, ...]], List[Tuple[Any, ...]], List[Tuple[Any, ...]]]:
    plays = feed.get("liveData", {}).get("plays", {}).get("allPlays", [])
    rows_at_bat = []
    rows_play_event = []
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
        play_events = play.get("playEvents", [])
        first_event_count = next((ev.get("count") for ev in play_events if ev.get("count")), {}) or {}

        current_count = _normalize_count_state(
            0,
            0,
            first_event_count.get("outs", count.get("outs")),
        )
        current_score = {
            "home": int(result.get("homeScore") or 0),
            "away": int(result.get("awayScore") or 0),
        }
        bases_state = _bases_state(play)

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
                bases_state,
                bases_state,
                current_score["home"],
                current_score["away"],
                result.get("homeScore", current_score["home"]),
                result.get("awayScore", current_score["away"]),
            )
        )

        at_bat_review = play.get("reviewDetails")
        if at_bat_review:
            inferred_pitch = _infer_at_bat_review_pitch(play)
            row = _challenge_from_review(
                game_pk,
                play,
                at_bat_review,
                "at_bat",
                None,
                None,
                current_count,
                bases_state,
                inferred_pitch,
            )
            if row:
                rows_challenge.append(row)

        for event_index, ev in enumerate(play_events):
            is_pitch = bool(ev.get("isPitch"))
            pitch_data = ev.get("pitchData", {})
            details = ev.get("details", {})
            coords = pitch_data.get("coordinates", {})
            breaks = pitch_data.get("breaks", {})
            pitch_number = ev.get("pitchNumber")
            is_last_event = event_index == len(play_events) - 1
            after_count = _derive_after_count(current_count, ev, is_pitch and is_last_event)
            score_after = _score_from_result(play, current_score) if is_last_event else dict(current_score)
            event_type = details.get("eventType") or result.get("eventType")
            event_code = (details.get("call") or {}).get("code") or details.get("code")
            event_description = (details.get("call") or {}).get("description") or details.get("description") or result.get("description")
            is_in_play = bool(details.get("isInPlay") or (event_code and str(event_code).upper() == "X"))
            has_review = bool(details.get("hasReview", False) or ev.get("reviewDetails"))

            rows_play_event.append(
                (
                    game_pk,
                    at_bat_index,
                    event_index,
                    pitch_number,
                    about.get("inning"),
                    about.get("halfInning"),
                    matchup.get("batter", {}).get("id"),
                    matchup.get("batter", {}).get("fullName"),
                    matchup.get("pitcher", {}).get("id"),
                    matchup.get("pitcher", {}).get("fullName"),
                    event_type,
                    event_code,
                    event_description,
                    is_pitch,
                    is_in_play,
                    has_review,
                    _parse_iso(ev.get("startTime")) or _parse_iso(about.get("startTime")),
                    _parse_iso(ev.get("endTime")) or _parse_iso(about.get("endTime")),
                    current_count.get("balls"),
                    current_count.get("strikes"),
                    current_count.get("outs"),
                    after_count.get("balls"),
                    after_count.get("strikes"),
                    after_count.get("outs"),
                    bases_state,
                    bases_state,
                    current_score["home"],
                    current_score["away"],
                    score_after["home"],
                    score_after["away"],
                    Json(ev),
                )
            )

            if not is_pitch or pitch_number is None:
                current_count = after_count
                current_score = score_after
                continue

            rows_pitch.append(
                (
                    game_pk,
                    at_bat_index,
                    pitch_number,
                    event_index,
                    about.get("inning"),
                    about.get("halfInning"),
                    matchup.get("batter", {}).get("id"),
                    matchup.get("batter", {}).get("fullName"),
                    matchup.get("pitcher", {}).get("id"),
                    matchup.get("pitcher", {}).get("fullName"),
                    (details.get("call") or {}).get("code") or details.get("code"),
                    event_description,
                    event_description,
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
                    has_review,
                    is_in_play,
                    is_last_event,
                    current_count.get("balls"),
                    current_count.get("strikes"),
                    current_count.get("outs"),
                    after_count.get("balls"),
                    after_count.get("strikes"),
                    after_count.get("outs"),
                    bases_state,
                    bases_state,
                    current_score["home"],
                    current_score["away"],
                    score_after["home"],
                    score_after["away"],
                    coords.get("x"),
                    coords.get("y"),
                )
            )

            event_review = ev.get("reviewDetails")
            if event_review:
                row = _challenge_from_review(
                    game_pk,
                    play,
                    event_review,
                    "pitch",
                    pitch_number,
                    ev,
                    current_count,
                    bases_state,
                )
                if row:
                    rows_challenge.append(row)

            current_count = after_count
            current_score = score_after

    return rows_at_bat, rows_play_event, rows_pitch, rows_challenge


def upsert_plays(cur, game_pk: int, feed: Dict[str, Any]) -> int:
    rows_at_bat, rows_play_event, rows_pitch, rows_challenge = _extract_game_rows(game_pk, feed)

    cur.execute("DELETE FROM at_bats WHERE game_pk = %s", (game_pk,))

    execute_batch(
        cur,
        """
        INSERT INTO at_bats (
          game_pk, at_bat_index, inning, half_inning, start_time, end_time,
          batter_id, batter_name, pitcher_id, pitcher_name, event_type,
          event_description, balls, strikes, outs, is_complete, is_scoring_play,
          bases_state_start, bases_state_end, home_score_start, away_score_start,
          home_score_end, away_score_end
        ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
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
          is_scoring_play = EXCLUDED.is_scoring_play,
          bases_state_start = EXCLUDED.bases_state_start,
          bases_state_end = EXCLUDED.bases_state_end,
          home_score_start = EXCLUDED.home_score_start,
          away_score_start = EXCLUDED.away_score_start,
          home_score_end = EXCLUDED.home_score_end,
          away_score_end = EXCLUDED.away_score_end
        """,
        rows_at_bat,
        page_size=500,
    )

    execute_batch(
        cur,
        """
        INSERT INTO play_events (
          game_pk, at_bat_index, play_event_index, pitch_number, inning, half_inning,
          batter_id, batter_name, pitcher_id, pitcher_name, event_type, event_code,
          description, is_pitch, is_in_play, has_review, start_time, end_time,
          balls_before, strikes_before, outs_before, balls_after, strikes_after, outs_after,
          bases_state_before, bases_state_after, home_score_before, away_score_before,
          home_score_after, away_score_after, raw_payload
        ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
        ON CONFLICT (game_pk, at_bat_index, play_event_index) DO UPDATE SET
          pitch_number = EXCLUDED.pitch_number,
          event_type = EXCLUDED.event_type,
          event_code = EXCLUDED.event_code,
          description = EXCLUDED.description,
          is_pitch = EXCLUDED.is_pitch,
          is_in_play = EXCLUDED.is_in_play,
          has_review = EXCLUDED.has_review,
          balls_before = EXCLUDED.balls_before,
          strikes_before = EXCLUDED.strikes_before,
          outs_before = EXCLUDED.outs_before,
          balls_after = EXCLUDED.balls_after,
          strikes_after = EXCLUDED.strikes_after,
          outs_after = EXCLUDED.outs_after,
          bases_state_before = EXCLUDED.bases_state_before,
          bases_state_after = EXCLUDED.bases_state_after,
          home_score_before = EXCLUDED.home_score_before,
          away_score_before = EXCLUDED.away_score_before,
          home_score_after = EXCLUDED.home_score_after,
          away_score_after = EXCLUDED.away_score_after,
          raw_payload = EXCLUDED.raw_payload
        """,
        rows_play_event,
        page_size=1000,
    )

    execute_batch(
        cur,
        """
        INSERT INTO pitches (
          game_pk, at_bat_index, pitch_number, play_event_index, inning, half_inning,
          batter_id, batter_name, pitcher_id, pitcher_name, called_code, called_description, play_description,
          is_ball, is_strike, pitch_type_code, pitch_type_description, start_speed,
          end_speed, spin_rate, px, pz, strike_zone_top, strike_zone_bottom, zone, has_review,
          is_in_play, ended_plate_appearance, balls_before, strikes_before, outs_before,
          balls_after, strikes_after, outs_after, bases_state_before, bases_state_after,
          home_score_before, away_score_before, home_score_after, away_score_after,
          gameday_x, gameday_y
        ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
        ON CONFLICT (game_pk, at_bat_index, pitch_number) DO UPDATE SET
          play_event_index = EXCLUDED.play_event_index,
          inning = EXCLUDED.inning,
          half_inning = EXCLUDED.half_inning,
          batter_id = EXCLUDED.batter_id,
          batter_name = EXCLUDED.batter_name,
          pitcher_id = EXCLUDED.pitcher_id,
          pitcher_name = EXCLUDED.pitcher_name,
          called_code = EXCLUDED.called_code,
          called_description = EXCLUDED.called_description,
          play_description = EXCLUDED.play_description,
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
          has_review = EXCLUDED.has_review,
          is_in_play = EXCLUDED.is_in_play,
          ended_plate_appearance = EXCLUDED.ended_plate_appearance,
          balls_before = EXCLUDED.balls_before,
          strikes_before = EXCLUDED.strikes_before,
          outs_before = EXCLUDED.outs_before,
          balls_after = EXCLUDED.balls_after,
          strikes_after = EXCLUDED.strikes_after,
          outs_after = EXCLUDED.outs_after,
          bases_state_before = EXCLUDED.bases_state_before,
          bases_state_after = EXCLUDED.bases_state_after,
          home_score_before = EXCLUDED.home_score_before,
          away_score_before = EXCLUDED.away_score_before,
          home_score_after = EXCLUDED.home_score_after,
          away_score_after = EXCLUDED.away_score_after,
          gameday_x = EXCLUDED.gameday_x,
          gameday_y = EXCLUDED.gameday_y
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
          challenged_at, gameday_x, gameday_y, inferred_pitch_number, inferred_play_event_index,
          inferred_px, inferred_pz, inferred_strike_zone_top, inferred_strike_zone_bottom,
          inferred_zone, inferred_gameday_x, inferred_gameday_y, inference_method,
          inference_confidence, location_source
        ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
        ON CONFLICT (dedupe_key) DO UPDATE SET
          is_overturned = EXCLUDED.is_overturned,
          in_progress = EXCLUDED.in_progress,
          called_code = EXCLUDED.called_code,
          called_description = EXCLUDED.called_description,
          challenged_at = EXCLUDED.challenged_at,
          gameday_x = EXCLUDED.gameday_x,
          gameday_y = EXCLUDED.gameday_y,
          inferred_pitch_number = EXCLUDED.inferred_pitch_number,
          inferred_play_event_index = EXCLUDED.inferred_play_event_index,
          inferred_px = EXCLUDED.inferred_px,
          inferred_pz = EXCLUDED.inferred_pz,
          inferred_strike_zone_top = EXCLUDED.inferred_strike_zone_top,
          inferred_strike_zone_bottom = EXCLUDED.inferred_strike_zone_bottom,
          inferred_zone = EXCLUDED.inferred_zone,
          inferred_gameday_x = EXCLUDED.inferred_gameday_x,
          inferred_gameday_y = EXCLUDED.inferred_gameday_y,
          inference_method = EXCLUDED.inference_method,
          inference_confidence = EXCLUDED.inference_confidence,
          location_source = EXCLUDED.location_source
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
        FROM mart_abs_pitch_challenges c
        JOIN officials o ON o.game_pk = c.game_pk AND o.official_type = 'Home Plate'
        WHERE c.game_pk = %s
        GROUP BY c.game_pk, o.official_id, o.official_name;
        """,
        (game_pk, game_pk),
    )


def refresh_team_summary(cur, game_pk: int, feed: Dict[str, Any]) -> None:
    gd = feed.get("gameData", {})
    teams = gd.get("teams", {})
    abs_data = gd.get("absChallenges", {})
    home_remaining = int((abs_data.get("home") or {}).get("remaining") or 0)
    away_remaining = int((abs_data.get("away") or {}).get("remaining") or 0)

    cur.execute(
        """
        DELETE FROM team_abs_game_summary WHERE game_pk = %(game_pk)s;

        WITH team_challenges AS (
          SELECT
            challenge_team_id AS team_id,
            COUNT(*) FILTER (WHERE is_overturned = TRUE) AS used_successful,
            COUNT(*) FILTER (WHERE is_overturned = FALSE) AS used_failed
          FROM mart_abs_pitch_challenges
          WHERE game_pk = %(game_pk)s
            AND challenge_team_id IS NOT NULL
          GROUP BY challenge_team_id
        ),
        game_teams AS (
          SELECT
            %(game_pk)s::BIGINT AS game_pk,
            %(home_team_id)s::INTEGER AS team_id,
            'home'::TEXT AS team_side,
            %(home_remaining)s::INTEGER AS feed_remaining
          UNION ALL
          SELECT
            %(game_pk)s::BIGINT AS game_pk,
            %(away_team_id)s::INTEGER AS team_id,
            'away'::TEXT AS team_side,
            %(away_remaining)s::INTEGER AS feed_remaining
        )
        INSERT INTO team_abs_game_summary (
          game_pk,
          team_id,
          team_side,
          used_successful,
          used_failed,
          remaining
        )
        SELECT
          gt.game_pk,
          gt.team_id,
          gt.team_side,
          COALESCE(tc.used_successful, 0) AS used_successful,
          COALESCE(tc.used_failed, 0) AS used_failed,
          COALESCE(gt.feed_remaining, GREATEST(0, 2 - COALESCE(tc.used_failed, 0))) AS remaining
        FROM game_teams gt
        LEFT JOIN team_challenges tc ON tc.team_id = gt.team_id
        WHERE gt.team_id IS NOT NULL;
        """,
        {
            "game_pk": game_pk,
            "home_team_id": teams.get("home", {}).get("id"),
            "away_team_id": teams.get("away", {}).get("id"),
            "home_remaining": home_remaining,
            "away_remaining": away_remaining,
        },
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
    store_source_snapshot(cur, "mlb_statsapi.feed_live", f"game:{game_pk}", feed)
    upsert_game(cur, feed)
    upsert_game_linescore(cur, game_pk, feed)
    upsert_players(cur, feed)
    upsert_officials(cur, game_pk, feed)
    upsert_abs_counters(cur, game_pk, feed)
    inserted = upsert_plays(cur, game_pk, feed)
    refresh_team_summary(cur, game_pk, feed)
    refresh_umpire_summary(cur, game_pk)
    write_snapshot(cur, game_pk, feed)
    status = feed.get("gameData", {}).get("status", {}).get("abstractGameState", "")
    is_final = str(status).lower() == "final"
    return inserted, is_final


def maybe_generate_game_report(cur, game_pk: int, skip_reports: bool) -> bool:
    if skip_reports:
        return False

    from generate_game_report import generate_and_store_report

    return generate_and_store_report(cur, game_pk, force=False)


def run(
    database_url: str,
    start_date: str,
    end_date: str,
    game_type: str,
    skip_final_existing: bool = False,
    skip_reports: bool = True,
) -> None:
    conn = psycopg2.connect(database_url)
    conn.autocommit = False

    cur = conn.cursor()
    cur.execute(
        """
        UPDATE etl_runs
        SET
          status = 'failed',
          finished_at = NOW(),
          details = COALESCE(details, '{}'::jsonb) || jsonb_build_object('stale_timeout', TRUE)
        WHERE status = 'running'
          AND started_at < NOW() - INTERVAL '2 hours'
        """
    )
    cur.execute("INSERT INTO etl_runs (run_type) VALUES ('manual_window') RETURNING run_id")
    run_id = cur.fetchone()[0]
    conn.commit()

    rows_written = 0
    reports_generated = 0
    try:
        game_pks = fetch_schedule(start_date, end_date, game_type)
        if skip_final_existing:
            game_pks = filter_existing_final_game_pks(cur, game_pks)
        for game_pk in game_pks:
            try:
                inserted, is_final = ingest_game(cur, game_pk)
                rows_written += inserted
                if is_final and maybe_generate_game_report(cur, game_pk, skip_reports):
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
    parser.add_argument("--database-url", help="Postgres connection string; defaults to WAREHOUSE_DATABASE_URL")
    parser.add_argument(
        "--skip-final-existing",
        action="store_true",
        help="Skip games already marked final in the local games table",
    )
    parser.add_argument(
        "--skip-reports",
        action="store_true",
        help="Skip per-game narrative report generation during ingest. This is the default.",
    )
    parser.add_argument(
        "--generate-reports",
        action="store_true",
        help="Generate per-game narrative reports after final games. Disabled by default.",
    )
    args = parser.parse_args()

    target = resolve_database_target(cli_database_url=args.database_url, role="warehouse")
    log_database_target("[ingest_mlb_abs]", target)

    run(
        target.connection_string,
        args.start_date,
        args.end_date,
        args.game_type,
        skip_final_existing=args.skip_final_existing,
        skip_reports=(not args.generate_reports) or args.skip_reports,
    )


if __name__ == "__main__":
    main()
