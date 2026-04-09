#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
from dataclasses import asdict, dataclass
from datetime import date, datetime
from pathlib import Path

try:
    import psycopg2
except ModuleNotFoundError:  # pragma: no cover
    psycopg2 = None

try:
    from dotenv import load_dotenv
except ModuleNotFoundError:  # pragma: no cover
    def load_dotenv(*_args, **_kwargs):  # type: ignore[no-untyped-def]
        return False

from db_target import log_database_target, resolve_database_target


def require_psycopg2() -> None:
    if psycopg2 is None:
        raise RuntimeError("psycopg2 is required to inspect called pitch decision status")


@dataclass
class CalledPitchSummary:
    row_count: int
    min_game_date: str | None
    max_game_date: str | None
    spring_rows: int
    regular_rows: int
    challenged_rows: int
    savant_only_rows: int
    train_rows: int
    validation_rows: int
    test_rows: int
    rows_with_bases_state: int
    savant_only_rows_with_bases_state: int
    rows_with_score_context: int
    savant_only_rows_with_score_context: int
    rows_with_team_context: int
    rows_with_opportunity_team: int
    challenged_with_actual_challenge_team: int
    rows_with_zone_bounds: int
    rows_with_abs_center: int
    rows_with_abs_radius: int
    challenged_with_result: int
    duplicate_natural_keys: int
    raw_abs_event_rows: int


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Report quality and completeness for modeling.called_pitch_decisions")
    parser.add_argument("--start-date", required=True)
    parser.add_argument("--end-date", required=True)
    parser.add_argument("--database-url", help="Postgres connection string; defaults to WAREHOUSE_DATABASE_URL")
    parser.add_argument(
        "--artifact-dir",
        default=".runtime/called-pitch-status",
        help="Directory to write JSON status artifacts into",
    )
    parser.add_argument(
        "--write-artifact",
        action=argparse.BooleanOptionalAction,
        default=True,
        help="Write a JSON artifact to disk",
    )
    parser.add_argument(
        "--strict",
        action="store_true",
        help="Exit nonzero when the dataset has duplicates, no rows, stale cutoffs, or challenge mismatch vs raw ABS events",
    )
    return parser.parse_args()


def write_artifact(artifact_dir: str, payload: dict) -> Path:
    directory = Path(artifact_dir)
    directory.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%dT%H%M%S")
    output_path = directory / f"called-pitch-status-{timestamp}.json"
    output_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    return output_path


def summarize(cur, start_date: str, end_date: str) -> CalledPitchSummary:
    cur.execute(
        """
        WITH dataset AS (
          SELECT *
          FROM modeling.called_pitch_decisions
          WHERE game_date BETWEEN %s AND %s
        ),
        duplicates AS (
          SELECT COUNT(*)::bigint AS duplicate_natural_keys
          FROM (
            SELECT game_pk, at_bat_number, pitch_number
            FROM dataset
            GROUP BY 1, 2, 3
            HAVING COUNT(*) > 1
          ) dup
        ),
        raw_abs AS (
          SELECT COUNT(*)::bigint AS raw_abs_event_rows
          FROM raw.savant_abs_events
          WHERE game_date BETWEEN %s AND %s
        )
        SELECT
          COUNT(*)::bigint AS row_count,
          MIN(game_date)::text AS min_game_date,
          MAX(game_date)::text AS max_game_date,
          COUNT(*) FILTER (WHERE competition_phase = 'spring_training')::bigint AS spring_rows,
          COUNT(*) FILTER (WHERE competition_phase = 'regular_season')::bigint AS regular_rows,
          COUNT(*) FILTER (WHERE was_challenged)::bigint AS challenged_rows,
          COUNT(*) FILTER (WHERE source_system = 'raw.savant_abs_events')::bigint AS savant_only_rows,
          COUNT(*) FILTER (WHERE split_set = 'train')::bigint AS train_rows,
          COUNT(*) FILTER (WHERE split_set = 'validation')::bigint AS validation_rows,
          COUNT(*) FILTER (WHERE split_set = 'test')::bigint AS test_rows,
          COUNT(*) FILTER (WHERE bases_state IS NOT NULL)::bigint AS rows_with_bases_state,
          COUNT(*) FILTER (
            WHERE source_system = 'raw.savant_abs_events' AND bases_state IS NOT NULL
          )::bigint AS savant_only_rows_with_bases_state,
          COUNT(*) FILTER (
            WHERE home_score IS NOT NULL AND away_score IS NOT NULL AND score_diff_batting IS NOT NULL
          )::bigint AS rows_with_score_context,
          COUNT(*) FILTER (
            WHERE source_system = 'raw.savant_abs_events'
              AND home_score IS NOT NULL
              AND away_score IS NOT NULL
              AND score_diff_batting IS NOT NULL
          )::bigint AS savant_only_rows_with_score_context,
          COUNT(*) FILTER (
            WHERE batting_team_id IS NOT NULL AND fielding_team_id IS NOT NULL
          )::bigint AS rows_with_team_context,
          COUNT(*) FILTER (WHERE opportunity_team_id IS NOT NULL)::bigint AS rows_with_opportunity_team,
          COUNT(*) FILTER (
            WHERE was_challenged AND actual_challenge_team_id IS NOT NULL
          )::bigint AS challenged_with_actual_challenge_team,
          COUNT(*) FILTER (
            WHERE strike_zone_top IS NOT NULL AND strike_zone_bottom IS NOT NULL
          )::bigint AS rows_with_zone_bounds,
          COUNT(*) FILTER (WHERE abs_zone_outcome_center_only IS NOT NULL)::bigint AS rows_with_abs_center,
          COUNT(*) FILTER (WHERE abs_zone_outcome_radius_adjusted IS NOT NULL)::bigint AS rows_with_abs_radius,
          COUNT(*) FILTER (WHERE was_challenged AND challenge_outcome IS NOT NULL)::bigint AS challenged_with_result,
          (SELECT duplicate_natural_keys FROM duplicates) AS duplicate_natural_keys,
          (SELECT raw_abs_event_rows FROM raw_abs) AS raw_abs_event_rows
        FROM dataset
        """,
        (start_date, end_date, start_date, end_date),
    )
    row = cur.fetchone()
    return CalledPitchSummary(
        row_count=int(row[0] or 0),
        min_game_date=row[1],
        max_game_date=row[2],
        spring_rows=int(row[3] or 0),
        regular_rows=int(row[4] or 0),
        challenged_rows=int(row[5] or 0),
        savant_only_rows=int(row[6] or 0),
        train_rows=int(row[7] or 0),
        validation_rows=int(row[8] or 0),
        test_rows=int(row[9] or 0),
        rows_with_bases_state=int(row[10] or 0),
        savant_only_rows_with_bases_state=int(row[11] or 0),
        rows_with_score_context=int(row[12] or 0),
        savant_only_rows_with_score_context=int(row[13] or 0),
        rows_with_team_context=int(row[14] or 0),
        rows_with_opportunity_team=int(row[15] or 0),
        challenged_with_actual_challenge_team=int(row[16] or 0),
        rows_with_zone_bounds=int(row[17] or 0),
        rows_with_abs_center=int(row[18] or 0),
        rows_with_abs_radius=int(row[19] or 0),
        challenged_with_result=int(row[20] or 0),
        duplicate_natural_keys=int(row[21] or 0),
        raw_abs_event_rows=int(row[22] or 0),
    )


def main() -> None:
    load_dotenv()
    args = parse_args()
    start_date = date.fromisoformat(args.start_date)
    end_date = date.fromisoformat(args.end_date)

    target = resolve_database_target(cli_database_url=args.database_url, role="warehouse")
    log_database_target("[report_called_pitch_decisions_status]", target)

    require_psycopg2()
    conn = psycopg2.connect(target.connection_string)
    try:
        with conn.cursor() as cur:
            summary = summarize(cur, args.start_date, args.end_date)
    finally:
        conn.close()

    status = {
        "window": {
            "startDate": start_date.isoformat(),
            "endDate": end_date.isoformat(),
        },
        "databaseTarget": {
            "role": target.role,
            "source": target.source,
            "host": target.host,
            "database": target.database,
        },
        "summary": asdict(summary),
    }

    failures: list[str] = []
    if summary.row_count <= 0:
        failures.append("called_pitch_decisions:zero_rows")
    if summary.max_game_date != end_date.isoformat():
        failures.append(
            f"called_pitch_decisions:max_game_date={summary.max_game_date or 'null'} expected={end_date.isoformat()}",
        )
    if summary.duplicate_natural_keys > 0:
        failures.append(f"called_pitch_decisions:duplicate_natural_keys={summary.duplicate_natural_keys}")
    if summary.challenged_rows != summary.raw_abs_event_rows:
        failures.append(
            f"called_pitch_decisions:challenged_rows={summary.challenged_rows} raw_abs_event_rows={summary.raw_abs_event_rows}",
        )
    if summary.challenged_with_result != summary.challenged_rows:
        failures.append(
            f"called_pitch_decisions:challenged_with_result={summary.challenged_with_result} challenged_rows={summary.challenged_rows}",
        )
    if summary.rows_with_opportunity_team != summary.row_count:
        failures.append(
            f"called_pitch_decisions:rows_with_opportunity_team={summary.rows_with_opportunity_team} row_count={summary.row_count}",
        )
    if summary.challenged_with_actual_challenge_team != summary.challenged_rows:
        failures.append(
            "called_pitch_decisions:"
            f"challenged_with_actual_challenge_team={summary.challenged_with_actual_challenge_team} "
            f"challenged_rows={summary.challenged_rows}",
        )

    status["strictFailures"] = failures

    if args.write_artifact:
        artifact_path = write_artifact(args.artifact_dir, status)
        status["artifactPath"] = str(artifact_path)

    print(json.dumps(status, indent=2))

    if args.strict and failures:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
