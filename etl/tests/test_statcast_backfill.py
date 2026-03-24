import sys
import unittest
from datetime import date
from pathlib import Path


ETL_DIR = Path(__file__).resolve().parents[1]
if str(ETL_DIR) not in sys.path:
    sys.path.insert(0, str(ETL_DIR))

from backfill_statcast_pitch_history import (  # noqa: E402
    StatcastGameRecord,
    normalize_statcast_payload,
    resolve_bases_state,
    resolve_score_diff_batting,
)
from validate_historical_games import summarize_validation  # noqa: E402


class StatcastBackfillTests(unittest.TestCase):
    def test_resolve_bases_state_builds_binary_string(self) -> None:
        self.assertEqual(resolve_bases_state(123, None, "0"), "100")
        self.assertEqual(resolve_bases_state(None, 456, 789), "011")

    def test_resolve_score_diff_batting_respects_half_inning(self) -> None:
        self.assertEqual(resolve_score_diff_batting("Top", 2, 5), 3)
        self.assertEqual(resolve_score_diff_batting("Bottom", 2, 5), -3)

    def test_normalize_statcast_payload_maps_schedule_identity(self) -> None:
        records = [
            {
                "game_pk": 123,
                "inning": 4,
                "inning_topbot": "Top",
                "at_bat_number": 17,
                "pitch_number": 3,
                "balls": 1,
                "strikes": 2,
                "outs_when_up": 1,
                "on_1b": 555,
                "on_2b": None,
                "on_3b": None,
                "home_score": 2,
                "away_score": 3,
                "bat_score": 3,
                "fld_score": 2,
                "post_bat_score": 3,
                "post_fld_score": 2,
                "batter": 101,
                "pitcher": 202,
                "stand": "R",
                "p_throws": "L",
                "pitch_type": "FF",
                "pitch_name": "4-Seam Fastball",
                "description": "called_strike",
                "events": None,
                "plate_x": 0.21,
                "plate_z": 3.11,
                "type": "S",
                "_is_last_pitch_of_pa": False,
            }
        ]
        games = {
            123: StatcastGameRecord(
                game_pk=123,
                game_date=date(2025, 4, 10),
                season=2025,
                game_type="R",
                home_team_id=147,
                away_team_id=111,
                home_score_final=4,
                away_score_final=5,
                winning_team_id=111,
            )
        }

        game_rows, pitch_rows = normalize_statcast_payload(records, games)

        self.assertEqual(len(game_rows), 1)
        self.assertEqual(len(pitch_rows), 1)
        pitch = pitch_rows[0]
        self.assertEqual(pitch[0], 123)
        self.assertEqual(pitch[4], "Top")
        self.assertEqual(pitch[13], "100")
        self.assertEqual(pitch[25], 111)  # batting team id
        self.assertEqual(pitch[26], 147)  # fielding team id
        self.assertEqual(pitch[27], 111)  # winning team id

    def test_validation_summary_counts_missing_identity_and_winners(self) -> None:
        imported = [
            {"game_pk": 1, "home_team_id": 111, "away_team_id": 147, "winning_team_id": 111},
            {"game_pk": 2, "home_team_id": None, "away_team_id": 158, "winning_team_id": None},
        ]
        schedule = {1: {}, 2: {}, 3: {}}

        summary = summarize_validation(imported, schedule)

        self.assertEqual(summary.imported_games, 2)
        self.assertEqual(summary.scheduled_games, 3)
        self.assertEqual(summary.missing_schedule_games, 1)
        self.assertEqual(summary.missing_team_identity, 1)
        self.assertEqual(summary.missing_winner, 1)


if __name__ == "__main__":
    unittest.main()
