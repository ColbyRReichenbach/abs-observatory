#!/usr/bin/env python3
import argparse
import os
from typing import Dict, Optional

try:
    from dotenv import load_dotenv
except ModuleNotFoundError:  # pragma: no cover
    def load_dotenv(*_args, **_kwargs):
        return False

try:
    import psycopg2
except ModuleNotFoundError:  # pragma: no cover
    psycopg2 = None

load_dotenv()

SOURCE_NAMES = {
    "feed_live": "mlb_statsapi.feed_live",
    "standings": "mlb_statsapi.standings",
    "savant": "baseball_savant.gamefeed",
}


def require_psycopg2() -> None:
    if psycopg2 is None:
        raise RuntimeError("psycopg2 is required to prune source snapshots")


def build_cutoff_clause(retention_days: Optional[int]) -> str:
    if retention_days is None:
        return "FALSE"
    if retention_days <= 0:
        return "TRUE"
    return f"fetched_at < NOW() - INTERVAL '{int(retention_days)} days'"


def collect_counts(cur, retention_by_source: Dict[str, Optional[int]]) -> Dict[str, int]:
    counts: Dict[str, int] = {}
    for key, source_name in SOURCE_NAMES.items():
        clause = build_cutoff_clause(retention_by_source.get(key))
        cur.execute(
            f"""
            SELECT COUNT(*)
            FROM ops.source_snapshots
            WHERE source_name = %s
              AND ({clause})
            """,
            (source_name,),
        )
        counts[key] = int(cur.fetchone()[0])
    return counts


def delete_snapshots(cur, retention_by_source: Dict[str, Optional[int]]) -> Dict[str, int]:
    deleted: Dict[str, int] = {}
    for key, source_name in SOURCE_NAMES.items():
        clause = build_cutoff_clause(retention_by_source.get(key))
        cur.execute(
            f"""
            WITH deleted_rows AS (
              DELETE FROM ops.source_snapshots
              WHERE source_name = %s
                AND ({clause})
              RETURNING 1
            )
            SELECT COUNT(*) FROM deleted_rows
            """,
            (source_name,),
        )
        deleted[key] = int(cur.fetchone()[0])
    return deleted


def main() -> None:
    parser = argparse.ArgumentParser(description="Prune raw source snapshots by source-specific retention windows.")
    parser.add_argument("--feed-live-days", type=int, default=14, help="Retention window for mlb_statsapi.feed_live. Use 0 to delete all.")
    parser.add_argument("--standings-days", type=int, default=0, help="Retention window for mlb_statsapi.standings. Use 0 to delete all.")
    parser.add_argument("--savant-days", type=int, default=0, help="Retention window for baseball_savant.gamefeed. Use 0 to delete all.")
    parser.add_argument("--dry-run", action="store_true", help="Report counts without deleting rows.")
    args = parser.parse_args()

    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        raise SystemExit("DATABASE_URL is required")

    require_psycopg2()
    conn = psycopg2.connect(database_url)
    retention_by_source = {
        "feed_live": args.feed_live_days,
        "standings": args.standings_days,
        "savant": args.savant_days,
    }

    try:
        with conn:
            with conn.cursor() as cur:
                if args.dry_run:
                    counts = collect_counts(cur, retention_by_source)
                    for key in ("feed_live", "standings", "savant"):
                        print(f"{key}\t{counts[key]}")
                    return

                deleted = delete_snapshots(cur, retention_by_source)
                for key in ("feed_live", "standings", "savant"):
                    print(f"{key}\t{deleted[key]}")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
