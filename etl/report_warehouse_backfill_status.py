#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
from dataclasses import asdict, dataclass
from datetime import date, datetime
from pathlib import Path

try:
    import psycopg2
except ModuleNotFoundError:  # pragma: no cover - exercised in CI/unit-test import paths
    psycopg2 = None

try:
    from dotenv import load_dotenv
except ModuleNotFoundError:  # pragma: no cover - exercised in CI/unit-test import paths
    def load_dotenv(*_args, **_kwargs):  # type: ignore[no-untyped-def]
        return False

from db_target import log_database_target, resolve_database_target


def require_psycopg2() -> None:
    if psycopg2 is None:
        raise RuntimeError("psycopg2 is required to inspect warehouse backfill status")


@dataclass
class TableWindowSummary:
    table_name: str
    row_count: int
    min_game_date: str | None
    max_game_date: str | None


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Report warehouse row counts and cutoffs for a historical backfill window",
    )
    parser.add_argument("--start-date", required=True)
    parser.add_argument("--end-date", required=True)
    parser.add_argument("--database-url", help="Postgres connection string; defaults to WAREHOUSE_DATABASE_URL")
    parser.add_argument(
        "--artifact-dir",
        default=".runtime/backfill-status",
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
        help="Exit nonzero when any tracked table has zero rows or does not reach the requested end date",
    )
    return parser.parse_args()


def summarize_table(cur, table_name: str, start_date: str, end_date: str) -> TableWindowSummary:
    cur.execute(
        f"""
        SELECT
          COUNT(*)::bigint AS row_count,
          MIN(game_date)::text AS min_game_date,
          MAX(game_date)::text AS max_game_date
        FROM {table_name}
        WHERE game_date BETWEEN %s AND %s
        """,
        (start_date, end_date),
    )
    row = cur.fetchone()
    return TableWindowSummary(
        table_name=table_name,
        row_count=int(row[0] or 0),
        min_game_date=row[1],
        max_game_date=row[2],
    )


def write_artifact(artifact_dir: str, payload: dict) -> Path:
    directory = Path(artifact_dir)
    directory.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%dT%H%M%S")
    output_path = directory / f"warehouse-backfill-status-{timestamp}.json"
    output_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    return output_path


def main() -> None:
    load_dotenv()
    args = parse_args()
    start_date = date.fromisoformat(args.start_date)
    end_date = date.fromisoformat(args.end_date)

    target = resolve_database_target(cli_database_url=args.database_url, role="warehouse")
    log_database_target("[report_warehouse_backfill_status]", target)

    require_psycopg2()
    conn = psycopg2.connect(target.connection_string)
    try:
        with conn.cursor() as cur:
            tables = [
                summarize_table(cur, "raw.statcast_games", args.start_date, args.end_date),
                summarize_table(cur, "raw.statcast_pitches", args.start_date, args.end_date),
                summarize_table(cur, "historical_pitch_states", args.start_date, args.end_date),
            ]
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
        "tables": [asdict(table) for table in tables],
    }

    failures: list[str] = []
    for table in tables:
        if table.row_count <= 0:
            failures.append(f"{table.table_name}:zero_rows")
        if table.max_game_date != end_date.isoformat():
            failures.append(
                f"{table.table_name}:max_game_date={table.max_game_date or 'null'} expected={end_date.isoformat()}",
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
