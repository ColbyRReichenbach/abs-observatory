import sys
import unittest
from datetime import timezone
from pathlib import Path


ETL_DIR = Path(__file__).resolve().parents[1]
if str(ETL_DIR) not in sys.path:
    sys.path.insert(0, str(ETL_DIR))

from ingest_mlb_abs import _bases_state, _challenge_from_review, _extract_game_rows, _parse_iso, store_source_snapshot  # noqa: E402


class IngestSmokeTests(unittest.TestCase):
    maxDiff = None

    def test_bases_state_uses_post_on_base_flags(self) -> None:
        play = {
            "matchup": {
                "postOnFirst": {"id": 1},
                "postOnSecond": None,
                "postOnThird": {"id": 3},
            }
        }

        self.assertEqual(_bases_state(play), "101")

    def test_parse_iso_returns_timezone_aware_datetime(self) -> None:
        parsed = _parse_iso("2026-03-05T23:15:00Z")

        self.assertIsNotNone(parsed)
        self.assertEqual(parsed.tzinfo, timezone.utc)
        self.assertEqual(parsed.isoformat(), "2026-03-05T23:15:00+00:00")

    def test_challenge_from_review_uses_pitch_review_context(self) -> None:
        play = {
            "homeTeamId": 147,
            "awayTeamId": 111,
            "about": {
                "atBatIndex": 12,
                "inning": 8,
                "halfInning": "bottom",
                "endTime": "2026-03-05T23:15:00Z",
            },
            "count": {"balls": 2, "strikes": 2, "outs": 1},
            "matchup": {
                "batter": {"id": 6001, "fullName": "Mookie Betts"},
                "pitcher": {"id": 7001, "fullName": "Paul Skenes"},
                "postOnFirst": None,
                "postOnSecond": {"id": 2},
                "postOnThird": None,
            },
            "result": {
                "eventType": "called_strike",
                "description": "Called strike on the outer edge",
                "homeScore": 4,
                "awayScore": 3,
            },
        }
        review = {
            "challengeTeamId": 147,
            "isOverturned": True,
            "reviewType": "ABS challenge",
            "inProgress": False,
            "player": {"id": 4001, "fullName": "Will Smith"},
        }
        pitch_event = {
            "details": {
                "description": "Called strike",
                "call": {"code": "C", "description": "Called Strike"},
            },
            "pitchData": {
                "strikeZoneTop": 3.4,
                "strikeZoneBottom": 1.5,
                "coordinates": {"pX": 0.82, "pZ": 3.61, "x": 121.5, "y": 202.1},
            },
        }

        row = _challenge_from_review(
            831638,
            play,
            review,
            "pitch",
            5,
            pitch_event,
        )

        self.assertIsNotNone(row)
        assert row is not None
        self.assertEqual(row[0], "831638:12:5:147:True:pitch")
        self.assertEqual(row[1], 831638)
        self.assertEqual(row[2], 12)
        self.assertEqual(row[3], 5)
        self.assertEqual(row[5], 147)
        self.assertEqual(row[6], "home")
        self.assertTrue(row[9])
        self.assertEqual(row[13], "Called strike")
        self.assertEqual(row[25], "010")
        self.assertEqual(row[26], 0.82)
        self.assertEqual(row[27], 3.61)
        self.assertEqual(row[30].isoformat(), "2026-03-05T23:15:00+00:00")
        self.assertEqual(row[31], 121.5)
        self.assertEqual(row[32], 202.1)
        self.assertEqual(row[44], "reviewed_pitch_px_pz")

    def test_extract_game_rows_persists_pitches_play_events_and_both_review_types(self) -> None:
        feed = {
            "gamePk": 831638,
            "gameData": {
                "teams": {
                    "home": {"id": 147},
                    "away": {"id": 111},
                }
            },
            "liveData": {
                "plays": {
                    "allPlays": [
                        {
                            "about": {
                                "atBatIndex": 12,
                                "inning": 1,
                                "halfInning": "top",
                                "startTime": "2026-03-05T18:00:00Z",
                                "endTime": "2026-03-05T18:03:00Z",
                                "isComplete": True,
                                "isScoringPlay": False,
                            },
                            "count": {"balls": 0, "strikes": 3, "outs": 1},
                            "matchup": {
                                "batter": {"id": 6001, "fullName": "Mookie Betts"},
                                "pitcher": {"id": 7001, "fullName": "Paul Skenes"},
                                "postOnFirst": None,
                                "postOnSecond": None,
                                "postOnThird": None,
                            },
                            "result": {
                                "eventType": "strikeout",
                                "description": "Mookie Betts strikes out swinging.",
                                "homeScore": 0,
                                "awayScore": 0,
                            },
                            "playEvents": [
                                {
                                    "details": {
                                        "description": "Defensive timeout",
                                        "eventType": "defensive_timeout",
                                        "code": "N",
                                    },
                                    "count": {"balls": 0, "strikes": 0, "outs": 0},
                                    "isPitch": False,
                                },
                                {
                                    "pitchNumber": 1,
                                    "isPitch": True,
                                    "details": {
                                        "description": "Called strike",
                                        "call": {"code": "C", "description": "Called Strike"},
                                        "type": {"code": "FF", "description": "4-Seam Fastball"},
                                        "isStrike": True,
                                        "isBall": False,
                                        "hasReview": False,
                                    },
                                    "count": {"balls": 0, "strikes": 1, "outs": 0},
                                    "pitchData": {
                                        "startSpeed": 98.7,
                                        "endSpeed": 89.2,
                                        "zone": 5,
                                        "strikeZoneTop": 3.5,
                                        "strikeZoneBottom": 1.5,
                                        "coordinates": {"pX": 0.1, "pZ": 2.4},
                                        "breaks": {"spinRate": 2401},
                                    },
                                },
                                {
                                    "pitchNumber": 2,
                                    "isPitch": True,
                                    "details": {
                                        "description": "Called strike",
                                        "call": {"code": "C", "description": "Called Strike"},
                                        "type": {"code": "FF", "description": "4-Seam Fastball"},
                                        "isStrike": True,
                                        "isBall": False,
                                        "hasReview": True,
                                    },
                                    "count": {"balls": 0, "strikes": 2, "outs": 0},
                                    "pitchData": {
                                        "startSpeed": 99.1,
                                        "endSpeed": 90.0,
                                        "zone": 9,
                                        "strikeZoneTop": 3.5,
                                        "strikeZoneBottom": 1.5,
                                        "coordinates": {"pX": 0.92, "pZ": 3.62},
                                        "breaks": {"spinRate": 2450},
                                    },
                                    "reviewDetails": {
                                        "challengeTeamId": 147,
                                        "isOverturned": True,
                                        "reviewType": "ABS challenge",
                                        "inProgress": False,
                                        "player": {"id": 4001, "fullName": "Will Smith"},
                                    },
                                },
                                {
                                    "pitchNumber": 3,
                                    "isPitch": True,
                                    "details": {
                                        "description": "Called strike three",
                                        "call": {"code": "C", "description": "Called Strike"},
                                        "type": {"code": "SL", "description": "Slider"},
                                        "isStrike": True,
                                        "isBall": False,
                                        "hasReview": True,
                                    },
                                    "count": {"balls": 0, "strikes": 3, "outs": 1},
                                    "pitchData": {
                                        "startSpeed": 90.3,
                                        "endSpeed": 82.5,
                                        "zone": 11,
                                        "strikeZoneTop": 3.4,
                                        "strikeZoneBottom": 1.4,
                                        "coordinates": {"pX": -0.71, "pZ": 1.42},
                                        "breaks": {"spinRate": 2712},
                                    },
                                    "reviewDetails": {
                                        "challengeTeamId": 147,
                                        "isOverturned": True,
                                        "reviewType": "ABS challenge",
                                        "inProgress": False,
                                        "player": {"id": 4001, "fullName": "Will Smith"},
                                    },
                                },
                            ],
                        },
                        {
                            "about": {
                                "atBatIndex": 13,
                                "inning": 1,
                                "halfInning": "top",
                                "startTime": "2026-03-05T18:04:00Z",
                                "endTime": "2026-03-05T18:06:00Z",
                                "isComplete": True,
                                "isScoringPlay": False,
                            },
                            "count": {"balls": 4, "strikes": 2, "outs": 1},
                            "matchup": {
                                "batter": {"id": 6002, "fullName": "Freddie Freeman"},
                                "pitcher": {"id": 7001, "fullName": "Paul Skenes"},
                                "postOnFirst": {"id": 5},
                                "postOnSecond": None,
                                "postOnThird": None,
                            },
                            "result": {
                                "eventType": "walk",
                                "description": "Freddie Freeman walks.",
                                "homeScore": 0,
                                "awayScore": 0,
                            },
                            "reviewDetails": {
                                "challengeTeamId": 111,
                                "isOverturned": False,
                                "reviewType": "ABS challenge",
                                "inProgress": False,
                                "player": {"id": 5001, "fullName": "Austin Barnes"},
                            },
                            "playEvents": [
                                {
                                    "pitchNumber": 1,
                                    "isPitch": True,
                                    "details": {
                                        "description": "Ball",
                                        "call": {"code": "B", "description": "Ball"},
                                        "type": {"code": "CH", "description": "Changeup"},
                                        "isStrike": False,
                                        "isBall": True,
                                        "hasReview": False,
                                    },
                                    "count": {"balls": 1, "strikes": 0, "outs": 1},
                                    "pitchData": {
                                        "startSpeed": 88.0,
                                        "endSpeed": 80.4,
                                        "zone": 14,
                                        "strikeZoneTop": 3.4,
                                        "strikeZoneBottom": 1.4,
                                        "coordinates": {"pX": 1.12, "pZ": 2.1},
                                        "breaks": {"spinRate": 1711},
                                    },
                                }
                            ],
                        },
                    ]
                }
            },
        }

        at_bats, play_events, pitches, challenges = _extract_game_rows(831638, feed)

        self.assertEqual(len(at_bats), 2)
        self.assertEqual(len(play_events), 5)
        self.assertEqual(len(pitches), 4)
        self.assertEqual(len(challenges), 3)

        terminal_pitch = pitches[2]
        self.assertEqual(terminal_pitch[2], 3)
        self.assertEqual(terminal_pitch[3], 3)
        self.assertEqual(terminal_pitch[27], True)
        self.assertEqual(terminal_pitch[28], 0)
        self.assertEqual(terminal_pitch[29], 2)
        self.assertEqual(terminal_pitch[31], 0)
        self.assertEqual(terminal_pitch[32], 3)
        self.assertEqual(terminal_pitch[33], 1)

        first_play_event = play_events[0]
        self.assertFalse(first_play_event[13])
        self.assertEqual(first_play_event[11], "N")

        last_challenge = challenges[-1]
        self.assertEqual(last_challenge[4], "at_bat")
        self.assertEqual(last_challenge[6], "away")
        self.assertEqual(last_challenge[25], "100")
        self.assertEqual(last_challenge[33], 1)
        self.assertEqual(last_challenge[34], 0)
        self.assertEqual(last_challenge[35], 1.12)
        self.assertEqual(last_challenge[36], 2.1)
        self.assertEqual(last_challenge[42], "at_bat_final_pitch_called_take")
        self.assertEqual(last_challenge[43], "high")
        self.assertEqual(last_challenge[44], "inferred_final_pitch_px_pz")

    def test_extract_game_rows_is_deterministic_for_retry_runs(self) -> None:
        feed = {
            "gamePk": 831638,
            "gameData": {"teams": {"home": {"id": 147}, "away": {"id": 111}}},
            "liveData": {
                "plays": {
                    "allPlays": [
                        {
                            "about": {
                                "atBatIndex": 99,
                                "inning": 9,
                                "halfInning": "bottom",
                                "startTime": "2026-03-05T21:00:00Z",
                                "endTime": "2026-03-05T21:01:00Z",
                                "isComplete": True,
                                "isScoringPlay": False,
                            },
                            "count": {"balls": 1, "strikes": 2, "outs": 2},
                            "matchup": {
                                "batter": {"id": 1, "fullName": "A"},
                                "pitcher": {"id": 2, "fullName": "B"},
                                "postOnFirst": None,
                                "postOnSecond": None,
                                "postOnThird": None,
                            },
                            "result": {
                                "eventType": "strikeout",
                                "description": "Strikeout",
                                "homeScore": 3,
                                "awayScore": 2,
                            },
                            "playEvents": [
                                {
                                    "pitchNumber": 1,
                                    "isPitch": True,
                                    "details": {
                                        "description": "Called strike",
                                        "call": {"code": "C", "description": "Called Strike"},
                                        "type": {"code": "FF", "description": "4-Seam Fastball"},
                                        "isStrike": True,
                                        "isBall": False,
                                    },
                                    "count": {"balls": 0, "strikes": 1, "outs": 2},
                                    "pitchData": {
                                        "strikeZoneTop": 3.3,
                                        "strikeZoneBottom": 1.4,
                                        "coordinates": {"pX": 0.11, "pZ": 2.3},
                                        "breaks": {"spinRate": 2100},
                                    },
                                }
                            ],
                        }
                    ]
                }
            },
        }

        first = _extract_game_rows(831638, feed)
        second = _extract_game_rows(831638, feed)

        def normalize(rows):
            at_bats, play_events, pitches, challenges = rows
            normalized_events = [event[:-1] + (event[-1].adapted,) for event in play_events]
            return at_bats, normalized_events, pitches, challenges

        self.assertEqual(normalize(first), normalize(second))

    def test_store_source_snapshot_hashes_payload_deterministically(self) -> None:
        executed = []

        class Cursor:
            def execute(self, statement, values):
                executed.append((statement, values))

        payload = {"b": 2, "a": 1}
        store_source_snapshot(Cursor(), "mlb_statsapi.feed_live", "game:1", payload)

        self.assertEqual(len(executed), 1)
        _, values = executed[0]
        self.assertEqual(values[0], "mlb_statsapi.feed_live")
        self.assertEqual(values[1], "game:1")
        self.assertEqual(
            values[2],
            "43258cff783fe7036d8a43033f830adfc60ec037382473548ac742b888292777",
        )


if __name__ == "__main__":
    unittest.main()
