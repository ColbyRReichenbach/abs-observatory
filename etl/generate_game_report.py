#!/usr/bin/env python3
import argparse
import os
from typing import Optional, Tuple

import psycopg2
from openai import OpenAI
from dotenv import load_dotenv
from psycopg2.extras import Json

load_dotenv()


def load_game_context(cur, game_pk: int) -> Optional[Tuple]:
    cur.execute(
        """
        SELECT g.game_pk, g.game_date, g.home_team_id, g.away_team_id,
               home.name AS home_name, away.name AS away_name,
               COUNT(c.*) AS challenge_count,
               COUNT(*) FILTER (WHERE c.is_overturned) AS overturned
        FROM games g
        LEFT JOIN teams home ON home.team_id = g.home_team_id
        LEFT JOIN teams away ON away.team_id = g.away_team_id
        LEFT JOIN abs_challenges c ON c.game_pk = g.game_pk
        WHERE g.game_pk = %s
        GROUP BY g.game_pk, g.game_date, g.home_team_id, g.away_team_id, home.name, away.name
        """,
        (game_pk,),
    )
    return cur.fetchone()


def build_narrative(summary_prompt: str, model_name: str) -> str:
    api_key = os.getenv("OPENAI_API_KEY")
    if api_key:
        client = OpenAI(api_key=api_key)
        response = client.responses.create(model=model_name, input=summary_prompt)
        return response.output_text.strip()
    return ""


def upsert_game_report(cur, game_pk: int, model_name: str, narrative: str, chart_spec: dict) -> None:
    cur.execute(
        """
        INSERT INTO game_reports (game_pk, model_name, narrative_md, chart_spec)
        VALUES (%s,%s,%s,%s)
        ON CONFLICT (game_pk) DO UPDATE SET
          model_name = EXCLUDED.model_name,
          narrative_md = EXCLUDED.narrative_md,
          chart_spec = EXCLUDED.chart_spec,
          generated_at = NOW()
        """,
        (game_pk, model_name, narrative, Json(chart_spec)),
    )


def report_exists(cur, game_pk: int) -> bool:
    cur.execute("SELECT 1 FROM game_reports WHERE game_pk = %s LIMIT 1", (game_pk,))
    return cur.fetchone() is not None


def generate_and_store_report(cur, game_pk: int, force: bool = False) -> bool:
    if report_exists(cur, game_pk) and not force:
        return False

    context = load_game_context(cur, game_pk)
    if not context:
        return False

    (row_game_pk, game_date, _home_team_id, _away_team_id, home_name, away_name, challenge_count, overturned) = context
    model_name = os.getenv("OPENAI_SUMMARY_MODEL", "gpt-4.1-mini")
    summary_prompt = (
        f"Write a concise MLB ABS after-action report for game {row_game_pk} ({away_name} at {home_name}) "
        f"on {game_date}. Challenge events: {challenge_count}, overturned: {overturned}. "
        "Include sections: headline, key moments, umpire context, team strategy notes, and caveats."
    )

    narrative = build_narrative(summary_prompt, model_name)
    if not narrative:
        narrative = (
            f"# ABS Report\n\nGame {row_game_pk}: {away_name} at {home_name}.\n"
            f"Total challenges: {challenge_count}. Overturned: {overturned}.\n"
            "OPENAI_API_KEY not set, so this is a fallback narrative."
        )
        model_name = "fallback"

    chart_spec = {
        "type": "bar",
        "title": "Challenges vs Overturned",
        "data": [{"label": "Challenges", "value": int(challenge_count)}, {"label": "Overturned", "value": int(overturned)}],
    }
    upsert_game_report(cur, row_game_pk, model_name, narrative, chart_spec)
    return True


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--game-pk", type=int, required=True)
    parser.add_argument("--force", action="store_true", help="Regenerate report even if one already exists")
    args = parser.parse_args()

    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        raise SystemExit("DATABASE_URL is required")

    conn = psycopg2.connect(database_url)
    cur = conn.cursor()

    if not generate_and_store_report(cur, args.game_pk, force=args.force):
        raise SystemExit(f"Game {args.game_pk} not found")
    conn.commit()
    cur.close()
    conn.close()


if __name__ == "__main__":
    main()
