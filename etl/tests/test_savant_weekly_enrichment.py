import sys
import unittest
from pathlib import Path


ETL_DIR = Path(__file__).resolve().parents[1]
if str(ETL_DIR) not in sys.path:
    sys.path.insert(0, str(ETL_DIR))

from sync_savant_weekly_enrichment import normalize_savant_weekly_rows, resolve_week_window  # noqa: E402


class SavantWeeklyEnrichmentTests(unittest.TestCase):
    def test_resolve_week_window_returns_seven_day_span(self) -> None:
        start, end = resolve_week_window("2026-03-02")

        self.assertEqual(start, "2026-03-02")
        self.assertEqual(end, "2026-03-08")

    def test_normalize_savant_weekly_rows_rolls_up_pitch_data(self) -> None:
        rows = [
            {"team": "LAD", "pitch_type": "FF", "call": "called_strike", "release_speed": "98.5"},
            {"team": "LAD", "pitch_type": "FF", "call": "ball", "release_speed": "99.5"},
            {"team": "NYY", "pitch_type": "SL", "call": "called_strike", "release_speed": "86.2"},
        ]

        normalized = normalize_savant_weekly_rows(rows)

        self.assertEqual(
            normalized,
            [
                {
                    "team": "LAD",
                    "pitchType": "FF",
                    "pitches": 2,
                    "calledStrikes": 1,
                    "balls": 1,
                    "avgVelocity": 99.0,
                },
                {
                    "team": "NYY",
                    "pitchType": "SL",
                    "pitches": 1,
                    "calledStrikes": 1,
                    "balls": 0,
                    "avgVelocity": 86.2,
                },
            ],
        )


if __name__ == "__main__":
    unittest.main()
