import sys
import unittest
from pathlib import Path


ETL_DIR = Path(__file__).resolve().parents[1]
if str(ETL_DIR) not in sys.path:
    sys.path.insert(0, str(ETL_DIR))

from sync_standings_snapshots import extract_standings_rows  # noqa: E402


class StandingsSyncTests(unittest.TestCase):
    def test_extract_standings_rows_maps_team_records(self) -> None:
        payload = {
            "records": [
                {
                    "league": {"id": 103},
                    "division": {"id": 200},
                    "teamRecords": [
                        {
                            "team": {"id": 147},
                            "wins": 12,
                            "losses": 5,
                            "winningPercentage": ".706",
                            "gamesBack": "-",
                            "wildCardRank": "1",
                            "divisionRank": "1",
                        },
                        {
                            "team": {"id": 111},
                            "wins": 10,
                            "losses": 7,
                            "winningPercentage": ".588",
                            "gamesBack": "2.0",
                            "wildCardRank": "3",
                            "divisionRank": "2",
                        },
                    ],
                }
            ]
        }

        rows = extract_standings_rows("2026-03-05", payload)

        self.assertEqual(len(rows), 2)
        self.assertEqual(rows[0][0], "2026-03-05")
        self.assertEqual(rows[0][1], 103)
        self.assertEqual(rows[0][2], 200)
        self.assertEqual(rows[0][3], 147)
        self.assertEqual(rows[0][4], 12)
        self.assertEqual(rows[0][5], 5)
        self.assertEqual(rows[0][8], 1)
        self.assertEqual(rows[1][3], 111)
        self.assertEqual(rows[1][7], "2.0")
        self.assertEqual(rows[1][9], 2)


if __name__ == "__main__":
    unittest.main()
