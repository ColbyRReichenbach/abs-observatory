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
        raise RuntimeError("psycopg2 is required to inspect geometry validation status")


@dataclass
class GeometrySummary:
    variant: str
    covered_rows: int
    accuracy: float | None
    predicted_overturned: int
    predicted_confirmed: int
    true_overturned: int
    true_confirmed: int
    true_positive: int
    true_negative: int
    false_positive: int
    false_negative: int
    overturn_precision: float | None
    overturn_recall: float | None


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Validate called-pitch geometry variants against challenged outcomes")
    parser.add_argument("--start-date", required=True)
    parser.add_argument("--end-date", required=True)
    parser.add_argument("--database-url", help="Postgres connection string; defaults to WAREHOUSE_DATABASE_URL")
    parser.add_argument(
        "--artifact-dir",
        default=".runtime/called-pitch-geometry",
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
        help="Exit nonzero when challenge coverage is empty or either geometry variant lacks coverage",
    )
    return parser.parse_args()


def write_artifact(artifact_dir: str, payload: dict) -> Path:
    directory = Path(artifact_dir)
    directory.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%dT%H%M%S")
    output_path = directory / f"called-pitch-geometry-validation-{timestamp}.json"
    output_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    return output_path


def compute_variant_summary(rows: list[dict], variant_key: str, variant_name: str) -> GeometrySummary:
    covered = [row for row in rows if row[variant_key] in ("strike", "ball")]
    true_overturned = sum(1 for row in covered if row["challenge_outcome"] == "overturned")
    true_confirmed = sum(1 for row in covered if row["challenge_outcome"] == "confirmed")

    predicted = []
    for row in covered:
      observed = row["observed_call"]
      modeled = row[variant_key]
      if observed == modeled:
        predicted.append("confirmed")
      else:
        predicted.append("overturned")

    true_positive = sum(
      1 for row, pred in zip(covered, predicted)
      if pred == "overturned" and row["challenge_outcome"] == "overturned"
    )
    true_negative = sum(
      1 for row, pred in zip(covered, predicted)
      if pred == "confirmed" and row["challenge_outcome"] == "confirmed"
    )
    false_positive = sum(
      1 for row, pred in zip(covered, predicted)
      if pred == "overturned" and row["challenge_outcome"] == "confirmed"
    )
    false_negative = sum(
      1 for row, pred in zip(covered, predicted)
      if pred == "confirmed" and row["challenge_outcome"] == "overturned"
    )
    predicted_overturned = sum(1 for pred in predicted if pred == "overturned")
    predicted_confirmed = sum(1 for pred in predicted if pred == "confirmed")
    accuracy = (true_positive + true_negative) / len(covered) if covered else None
    precision = true_positive / predicted_overturned if predicted_overturned else None
    recall = true_positive / true_overturned if true_overturned else None

    return GeometrySummary(
      variant=variant_name,
      covered_rows=len(covered),
      accuracy=accuracy,
      predicted_overturned=predicted_overturned,
      predicted_confirmed=predicted_confirmed,
      true_overturned=true_overturned,
      true_confirmed=true_confirmed,
      true_positive=true_positive,
      true_negative=true_negative,
      false_positive=false_positive,
      false_negative=false_negative,
      overturn_precision=precision,
      overturn_recall=recall,
    )


def main() -> None:
    load_dotenv()
    args = parse_args()
    start_date = date.fromisoformat(args.start_date)
    end_date = date.fromisoformat(args.end_date)

    target = resolve_database_target(cli_database_url=args.database_url, role="warehouse")
    log_database_target("[report_called_pitch_geometry_validation]", target)

    require_psycopg2()
    conn = psycopg2.connect(target.connection_string)
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT
                  observed_call,
                  challenge_outcome,
                  abs_zone_outcome_center_only,
                  abs_zone_outcome_radius_adjusted
                FROM modeling.called_pitch_decisions
                WHERE was_challenged = TRUE
                  AND challenge_outcome IN ('overturned', 'confirmed')
                  AND game_date BETWEEN %s AND %s
                """,
                (args.start_date, args.end_date),
            )
            rows = [
                {
                    "observed_call": row[0],
                    "challenge_outcome": row[1],
                    "abs_zone_outcome_center_only": row[2],
                    "abs_zone_outcome_radius_adjusted": row[3],
                }
                for row in cur.fetchall()
            ]
    finally:
        conn.close()

    center = compute_variant_summary(rows, "abs_zone_outcome_center_only", "center_only")
    radius = compute_variant_summary(rows, "abs_zone_outcome_radius_adjusted", "radius_adjusted")

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
        "challengedRows": len(rows),
        "variants": [asdict(center), asdict(radius)],
        "delta": {
            "accuracy": (
                None
                if center.accuracy is None or radius.accuracy is None
                else radius.accuracy - center.accuracy
            ),
            "overturnPrecision": (
                None
                if center.overturn_precision is None or radius.overturn_precision is None
                else radius.overturn_precision - center.overturn_precision
            ),
            "overturnRecall": (
                None
                if center.overturn_recall is None or radius.overturn_recall is None
                else radius.overturn_recall - center.overturn_recall
            ),
        },
    }

    failures: list[str] = []
    if len(rows) <= 0:
        failures.append("geometry_validation:no_challenged_rows")
    if center.covered_rows <= 0:
        failures.append("geometry_validation:center_only_no_coverage")
    if radius.covered_rows <= 0:
        failures.append("geometry_validation:radius_adjusted_no_coverage")
    status["strictFailures"] = failures

    if args.write_artifact:
        artifact_path = write_artifact(args.artifact_dir, status)
        status["artifactPath"] = str(artifact_path)

    print(json.dumps(status, indent=2))

    if args.strict and failures:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
