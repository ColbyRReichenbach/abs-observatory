import sys
import unittest
from datetime import date
from pathlib import Path


ETL_DIR = Path(__file__).resolve().parents[1]
if str(ETL_DIR) not in sys.path:
    sys.path.insert(0, str(ETL_DIR))

from ingest_savant_abs_gamefeed import (  # noqa: E402
    ScheduleGame,
    extract_abs_rows,
    normalize_savant_game,
    parse_game_date,
)


class SavantAbsGamefeedTests(unittest.TestCase):
    def test_parse_game_date_handles_savant_format(self) -> None:
        self.assertEqual(parse_game_date("3/8/2026"), date(2026, 3, 8))

    def test_normalize_savant_game_uses_payload_status_and_schedule_identity(self) -> None:
        schedule_game = ScheduleGame(
            game_pk=831575,
            sport_id=1,
            game_date=date(2026, 3, 8),
            season=2026,
            game_type="S",
            home_team_id=121,
            away_team_id=147,
        )
        payload = {
            "game_status_code": "F",
            "game_status": "Final",
            "gameDate": "3/8/2026",
            "hasAbs": True,
            "team_home_id": 121,
            "team_away_id": 147,
        }

        row = normalize_savant_game(payload, schedule_game)

        self.assertEqual(row[0], 831575)
        self.assertEqual(row[1], 1)
        self.assertEqual(row[2], date(2026, 3, 8))
        self.assertEqual(row[3], 2026)
        self.assertEqual(row[4], "S")
        self.assertEqual(row[7], True)

    def test_extract_abs_rows_maps_event_level_challenge_fields(self) -> None:
        schedule_game = ScheduleGame(
            game_pk=831575,
            sport_id=1,
            game_date=date(2026, 3, 8),
            season=2026,
            game_type="S",
            home_team_id=121,
            away_team_id=147,
        )
        payload = {
            "gameDate": "3/8/2026",
            "team_home": [
                {
                    "ab_number": 2,
                    "pitch_number": 1,
                    "play_id": "c7409a54-2810-37fd-9bb2-2376e574e24b",
                    "rowId": "home-2-1",
                    "inning": 1,
                    "outs": 1,
                    "balls": 0,
                    "strikes": 0,
                    "pre_balls": 0,
                    "pre_strikes": 0,
                    "team_batting": "NYY",
                    "team_batting_id": 147,
                    "team_fielding": "NYM",
                    "team_fielding_id": 121,
                    "batter": 687798,
                    "batter_name": "J.C. Escarra",
                    "pitcher": 642547,
                    "pitcher_name": "Freddy Peralta",
                    "catcher": 687771,
                    "catcher_name": "Francisco Alvarez",
                    "stand": "L",
                    "p_throws": "R",
                    "pitch_type": "CU",
                    "pitch_name": "Curveball",
                    "description": "Called Strike",
                    "call_name": "called_strike",
                    "pitch_call": "C",
                    "result": "Strike",
                    "events": "Flyout",
                    "px": -0.1627,
                    "pz": 1.5471,
                    "plate_x": -0.1627,
                    "plate_z": 1.5471,
                    "sz_top": 3.35,
                    "sz_bot": 1.56,
                    "zone": 14,
                    "start_speed": 79.3,
                    "end_speed": 73.1,
                    "spin_rate": 2654,
                    "contextMetrics": {"homeTeamWinProbability": 0.51},
                    "is_abs_challenge": True,
                    "abs_challenge": {
                        "is_batter": False,
                        "is_in_progress": False,
                        "is_overturned": True,
                        "challenge_team_id": 121,
                        "edge_distance": 0.00702,
                        "edge_distance_calc": 0.00702,
                    },
                }
            ],
            "team_away": [],
        }

        rows = extract_abs_rows(payload, schedule_game)

        self.assertEqual(len(rows), 1)
        row = rows[0]
        self.assertEqual(row[0], 831575)
        self.assertEqual(row[1], 1)
        self.assertEqual(row[2], date(2026, 3, 8))
        self.assertEqual(row[4], "home")
        self.assertEqual(row[7], "c7409a54-2810-37fd-9bb2-2376e574e24b")
        self.assertEqual(row[15], "NYY")
        self.assertEqual(row[21], 642547)
        self.assertEqual(row[34], True)
        self.assertEqual(row[37], 121)
        self.assertAlmostEqual(row[38], 0.00702)
        self.assertAlmostEqual(row[40], -0.1627)
        self.assertAlmostEqual(row[44], 3.35)


if __name__ == "__main__":
    unittest.main()
