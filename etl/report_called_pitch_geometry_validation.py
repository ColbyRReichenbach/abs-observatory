#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import math
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
    accuracy_ci_low: float | None
    accuracy_ci_high: float | None
    predicted_overturned: int
    predicted_confirmed: int
    true_overturned: int
    true_confirmed: int
    true_positive: int
    true_negative: int
    false_positive: int
    false_negative: int
    overturn_precision: float | None
    overturn_precision_ci_low: float | None
    overturn_precision_ci_high: float | None
    overturn_recall: float | None
    overturn_recall_ci_low: float | None
    overturn_recall_ci_high: float | None


@dataclass
class SegmentSummary:
    segment_type: str
    segment_value: str
    variant: str
    covered_rows: int
    true_overturned: int
    predicted_overturned: int
    accuracy: float | None
    accuracy_ci_low: float | None
    accuracy_ci_high: float | None
    overturn_precision: float | None
    overturn_precision_ci_low: float | None
    overturn_precision_ci_high: float | None
    overturn_recall: float | None
    overturn_recall_ci_low: float | None
    overturn_recall_ci_high: float | None


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


def wilson_interval(successes: int, trials: int, z: float = 1.96) -> tuple[float | None, float | None]:
    if trials <= 0:
        return (None, None)
    p_hat = successes / trials
    denominator = 1 + (z * z / trials)
    center = (p_hat + (z * z) / (2 * trials)) / denominator
    margin = (
        z
        * math.sqrt((p_hat * (1 - p_hat) / trials) + ((z * z) / (4 * trials * trials)))
        / denominator
    )
    return (max(0.0, center - margin), min(1.0, center + margin))


def build_prediction(observed_call: str, modeled_call: str) -> str:
    if observed_call == modeled_call:
        return "confirmed"
    return "overturned"


def compute_variant_summary(rows: list[dict], variant_key: str, variant_name: str) -> GeometrySummary:
    covered = [row for row in rows if row[variant_key] in ("strike", "ball")]
    true_overturned = sum(1 for row in covered if row["challenge_outcome"] == "overturned")
    true_confirmed = sum(1 for row in covered if row["challenge_outcome"] == "confirmed")

    predicted = [build_prediction(row["observed_call"], row[variant_key]) for row in covered]

    true_positive = sum(
        1
        for row, pred in zip(covered, predicted)
        if pred == "overturned" and row["challenge_outcome"] == "overturned"
    )
    true_negative = sum(
        1
        for row, pred in zip(covered, predicted)
        if pred == "confirmed" and row["challenge_outcome"] == "confirmed"
    )
    false_positive = sum(
        1
        for row, pred in zip(covered, predicted)
        if pred == "overturned" and row["challenge_outcome"] == "confirmed"
    )
    false_negative = sum(
        1
        for row, pred in zip(covered, predicted)
        if pred == "confirmed" and row["challenge_outcome"] == "overturned"
    )
    predicted_overturned = sum(1 for pred in predicted if pred == "overturned")
    predicted_confirmed = sum(1 for pred in predicted if pred == "confirmed")
    accuracy = (true_positive + true_negative) / len(covered) if covered else None
    precision = true_positive / predicted_overturned if predicted_overturned else None
    recall = true_positive / true_overturned if true_overturned else None
    accuracy_ci_low, accuracy_ci_high = wilson_interval(true_positive + true_negative, len(covered))
    precision_ci_low, precision_ci_high = wilson_interval(true_positive, predicted_overturned)
    recall_ci_low, recall_ci_high = wilson_interval(true_positive, true_overturned)

    return GeometrySummary(
        variant=variant_name,
        covered_rows=len(covered),
        accuracy=accuracy,
        accuracy_ci_low=accuracy_ci_low,
        accuracy_ci_high=accuracy_ci_high,
        predicted_overturned=predicted_overturned,
        predicted_confirmed=predicted_confirmed,
        true_overturned=true_overturned,
        true_confirmed=true_confirmed,
        true_positive=true_positive,
        true_negative=true_negative,
        false_positive=false_positive,
        false_negative=false_negative,
        overturn_precision=precision,
        overturn_precision_ci_low=precision_ci_low,
        overturn_precision_ci_high=precision_ci_high,
        overturn_recall=recall,
        overturn_recall_ci_low=recall_ci_low,
        overturn_recall_ci_high=recall_ci_high,
    )


def compute_segment_summaries(
    rows: list[dict],
    variant_key: str,
    variant_name: str,
    segment_key: str,
) -> list[SegmentSummary]:
    segment_values = sorted({str(row[segment_key]) for row in rows if row[segment_key] is not None})
    summaries: list[SegmentSummary] = []
    for segment_value in segment_values:
        segment_rows = [row for row in rows if str(row[segment_key]) == segment_value and row[variant_key] in ("strike", "ball")]
        if not segment_rows:
            continue
        predicted = [build_prediction(row["observed_call"], row[variant_key]) for row in segment_rows]
        true_overturned = sum(1 for row in segment_rows if row["challenge_outcome"] == "overturned")
        predicted_overturned = sum(1 for pred in predicted if pred == "overturned")
        true_positive = sum(
            1
            for row, pred in zip(segment_rows, predicted)
            if pred == "overturned" and row["challenge_outcome"] == "overturned"
        )
        true_negative = sum(
            1
            for row, pred in zip(segment_rows, predicted)
            if pred == "confirmed" and row["challenge_outcome"] == "confirmed"
        )
        accuracy = (true_positive + true_negative) / len(segment_rows)
        precision = true_positive / predicted_overturned if predicted_overturned else None
        recall = true_positive / true_overturned if true_overturned else None
        accuracy_ci_low, accuracy_ci_high = wilson_interval(true_positive + true_negative, len(segment_rows))
        precision_ci_low, precision_ci_high = wilson_interval(true_positive, predicted_overturned)
        recall_ci_low, recall_ci_high = wilson_interval(true_positive, true_overturned)
        summaries.append(
            SegmentSummary(
                segment_type=segment_key,
                segment_value=segment_value,
                variant=variant_name,
                covered_rows=len(segment_rows),
                true_overturned=true_overturned,
                predicted_overturned=predicted_overturned,
                accuracy=accuracy,
                accuracy_ci_low=accuracy_ci_low,
                accuracy_ci_high=accuracy_ci_high,
                overturn_precision=precision,
                overturn_precision_ci_low=precision_ci_low,
                overturn_precision_ci_high=precision_ci_high,
                overturn_recall=recall,
                overturn_recall_ci_low=recall_ci_low,
                overturn_recall_ci_high=recall_ci_high,
            )
        )
    return summaries


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
                  competition_phase,
                  CASE
                    WHEN observed_call = 'ball' THEN 'ball_to_strike'
                    WHEN observed_call = 'strike' THEN 'strike_to_ball'
                    ELSE NULL
                  END AS challenge_direction,
                  CASE
                    WHEN (
                      CASE
                        WHEN observed_call = 'ball' THEN min_edge_distance_center_only
                        WHEN observed_call = 'strike' THEN -min_edge_distance_center_only
                        ELSE NULL
                      END
                    ) IS NULL THEN 'unknown'
                    WHEN (
                      CASE
                        WHEN observed_call = 'ball' THEN min_edge_distance_center_only
                        WHEN observed_call = 'strike' THEN -min_edge_distance_center_only
                        ELSE NULL
                      END
                    ) <= -0.15 THEN 'strong_confirm'
                    WHEN (
                      CASE
                        WHEN observed_call = 'ball' THEN min_edge_distance_center_only
                        WHEN observed_call = 'strike' THEN -min_edge_distance_center_only
                        ELSE NULL
                      END
                    ) <= -0.03 THEN 'lean_confirm'
                    WHEN (
                      CASE
                        WHEN observed_call = 'ball' THEN min_edge_distance_center_only
                        WHEN observed_call = 'strike' THEN -min_edge_distance_center_only
                        ELSE NULL
                      END
                    ) < 0.03 THEN 'borderline'
                    WHEN (
                      CASE
                        WHEN observed_call = 'ball' THEN min_edge_distance_center_only
                        WHEN observed_call = 'strike' THEN -min_edge_distance_center_only
                        ELSE NULL
                      END
                    ) < 0.15 THEN 'lean_overturn'
                    ELSE 'strong_overturn'
                  END AS edge_bucket,
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
                    "competition_phase": row[2],
                    "challenge_direction": row[3],
                    "edge_bucket": row[4],
                    "abs_zone_outcome_center_only": row[5],
                    "abs_zone_outcome_radius_adjusted": row[6],
                }
                for row in cur.fetchall()
            ]
    finally:
        conn.close()

    center = compute_variant_summary(rows, "abs_zone_outcome_center_only", "center_only")
    radius = compute_variant_summary(rows, "abs_zone_outcome_radius_adjusted", "radius_adjusted")
    segment_keys = ["challenge_direction", "edge_bucket", "competition_phase"]
    segmented = []
    for segment_key in segment_keys:
        segmented.extend(compute_segment_summaries(rows, "abs_zone_outcome_center_only", "center_only", segment_key))
        segmented.extend(compute_segment_summaries(rows, "abs_zone_outcome_radius_adjusted", "radius_adjusted", segment_key))

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
        "segments": [asdict(summary) for summary in segmented],
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
