#!/usr/bin/env python3
import argparse
import os
from typing import Dict, List, Optional

try:
    import psycopg2
    from psycopg2.extras import Json, RealDictCursor
except ModuleNotFoundError:  # pragma: no cover - exercised in CI/unit-test import paths
    psycopg2 = None

    def Json(value):  # type: ignore[no-untyped-def]
        return value

    RealDictCursor = None

try:
    from dotenv import load_dotenv
except ModuleNotFoundError:  # pragma: no cover - exercised in CI/unit-test import paths
    def load_dotenv(*_args, **_kwargs):  # type: ignore[no-untyped-def]
        return False

try:
    from openai import OpenAI
except ModuleNotFoundError:  # pragma: no cover - exercised in CI/unit-test import paths
    OpenAI = None

load_dotenv()


def require_psycopg2() -> None:
    if psycopg2 is None or RealDictCursor is None:
        raise RuntimeError("psycopg2 is required to generate and store game reports")


def fetch_one_dict(cur, query: str, params: tuple) -> Optional[Dict]:
    require_psycopg2()
    with cur.connection.cursor(cursor_factory=RealDictCursor) as dict_cur:
        dict_cur.execute(query, params)
        return dict_cur.fetchone()


def fetch_all_dicts(cur, query: str, params: tuple) -> List[Dict]:
    require_psycopg2()
    with cur.connection.cursor(cursor_factory=RealDictCursor) as dict_cur:
        dict_cur.execute(query, params)
        return list(dict_cur.fetchall())


def load_game_context(cur, game_pk: int) -> Optional[Dict]:
    return fetch_one_dict(
        cur,
        """
        SELECT
          g.game_pk,
          g.game_date::text AS game_date,
          home.name AS home_name,
          away.name AS away_name,
          g.home_score,
          g.away_score,
          g.venue_name,
          g.status_abstract
        FROM games g
        LEFT JOIN teams home ON home.team_id = g.home_team_id
        LEFT JOIN teams away ON away.team_id = g.away_team_id
        WHERE g.game_pk = %s
        """,
        (game_pk,),
    )


def load_challenge_evidence(cur, game_pk: int) -> List[Dict]:
    rows = fetch_all_dicts(
        cur,
        """
        SELECT DISTINCT ON (c.challenge_id)
          c.challenge_id,
          c.challenged_at,
          c.inning,
          c.half_inning,
          c.balls,
          c.strikes,
          c.outs,
          c.bases_state,
          c.home_score,
          c.away_score,
          t.name AS challenge_team_name,
          c.challenge_player_name,
          c.batter_name,
          c.pitcher_name,
          p.called_description,
          COALESCE(c.pitch_number, c.inferred_pitch_number) AS pitch_number,
          p.pitch_type_description AS pitch_type,
          p.start_speed,
          c.is_overturned,
          COALESCE(c.px, c.inferred_px) AS px,
          COALESCE(c.pz, c.inferred_pz) AS pz,
          COALESCE(c.strike_zone_top, c.inferred_strike_zone_top) AS strike_zone_top,
          COALESCE(c.strike_zone_bottom, c.inferred_strike_zone_bottom) AS strike_zone_bottom,
          p.balls_before,
          p.strikes_before,
          p.balls_after,
          p.strikes_after,
          timeline.impact_type,
          timeline.impact_summary,
          c.location_source,
          c.inference_method,
          c.inference_confidence
        FROM abs_challenges c
        LEFT JOIN teams t ON t.team_id = c.challenge_team_id
        LEFT JOIN pitches p
          ON p.game_pk = c.game_pk
          AND p.at_bat_index = c.at_bat_index
          AND p.pitch_number = COALESCE(c.pitch_number, c.inferred_pitch_number)
        LEFT JOIN mart_game_pitch_timeline timeline
          ON timeline.challenge_id = c.challenge_id
        WHERE c.game_pk = %s
        ORDER BY c.challenge_id, c.challenged_at ASC NULLS LAST
        """,
        (game_pk,),
    )

    for row in rows:
        balls_before = row.get("balls_before")
        strikes_before = row.get("strikes_before")
        balls_after = row.get("balls_after")
        strikes_after = row.get("strikes_after")

        row["count_before"] = None if balls_before is None or strikes_before is None else f"{balls_before}-{strikes_before}"
        row["count_after"] = None if balls_after is None or strikes_after is None else f"{balls_after}-{strikes_after}"

        if balls_before is None or strikes_before is None:
            row["umpire_count"] = None
        elif not row.get("is_overturned"):
            row["umpire_count"] = row["count_after"]
        elif balls_after is not None and balls_after > balls_before:
            row["umpire_count"] = f"{balls_before}-{strikes_before + 1}"
        elif strikes_after is not None and strikes_after > strikes_before:
            row["umpire_count"] = f"{balls_before + 1}-{strikes_before}"
        else:
            row["umpire_count"] = row["count_after"]

    return sorted(rows, key=lambda row: row.get("challenged_at") or "")


def build_narrative(summary_prompt: str, model_name: str) -> str:
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key or OpenAI is None:
        return ""

    try:
        client = OpenAI(api_key=api_key)
        response = client.responses.create(model=model_name, input=summary_prompt)
        return response.output_text.strip()
    except Exception:
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


def format_final_score(context: Dict) -> str:
    if context.get("away_score") is None or context.get("home_score") is None:
        return "with a final score not captured in the evidence packet"

    return f"with **{context['away_name']} {context['away_score']}, {context['home_name']} {context['home_score']}**"


def format_half_inning(challenge: Dict) -> str:
    inning = challenge.get("inning")
    half_inning = challenge.get("half_inning")
    if inning is None or half_inning is None:
        return "Unknown inning"
    return f"{'Top' if half_inning == 'Top' else 'Bottom'} {inning}"


def format_score_at_challenge(challenge: Dict) -> str:
    if challenge.get("away_score") is None or challenge.get("home_score") is None:
        return "score unavailable"
    return f"score {challenge['away_score']}-{challenge['home_score']}"


def format_count_change(challenge: Dict) -> str:
    initial = challenge.get("umpire_count") or challenge.get("count_before")
    if initial is None and challenge.get("balls") is not None and challenge.get("strikes") is not None:
        initial = f"{challenge['balls']}-{challenge['strikes']}"
    final = challenge.get("count_after")

    if initial and final:
        return initial if initial == final else f"{initial} -> {final}"
    return initial or final or "count unavailable"


def describe_impact_type(impact_type: Optional[str]) -> str:
    if impact_type == "direct_ending_impact":
        return "plate appearance changed"
    if impact_type == "direct_count_impact":
        return "count changed"
    if impact_type == "downstream_inferred_impact":
        return "downstream outcome changed"
    return "challenge recorded"


def challenge_weight(challenge: Dict) -> float:
    impact_type = challenge.get("impact_type")
    if impact_type == "direct_ending_impact":
        base_weight = 4
    elif impact_type == "downstream_inferred_impact":
        base_weight = 3
    elif impact_type == "direct_count_impact":
        base_weight = 2
    else:
        base_weight = 1

    late_weight = 1 if (challenge.get("inning") or 0) >= 7 else 0
    overturned_weight = 1 if challenge.get("is_overturned") else 0
    close_game_weight = 0
    if challenge.get("home_score") is not None and challenge.get("away_score") is not None:
        close_game_weight = 0.75 if abs(challenge["home_score"] - challenge["away_score"]) <= 2 else 0

    return base_weight + late_weight + overturned_weight + close_game_weight


def build_team_ledgers(context: Dict, challenges: List[Dict]) -> List[Dict]:
    ledgers = {
        context["home_name"]: {"team_name": context["home_name"], "total": 0, "overturned": 0},
        context["away_name"]: {"team_name": context["away_name"], "total": 0, "overturned": 0},
    }

    for challenge in challenges:
        team_name = challenge.get("challenge_team_name") or "Unknown team"
        if team_name not in ledgers:
            ledgers[team_name] = {"team_name": team_name, "total": 0, "overturned": 0}
        ledgers[team_name]["total"] += 1
        if challenge.get("is_overturned"):
            ledgers[team_name]["overturned"] += 1

    return [
        ledgers.get(context["home_name"], {"team_name": context["home_name"], "total": 0, "overturned": 0}),
        ledgers.get(context["away_name"], {"team_name": context["away_name"], "total": 0, "overturned": 0}),
    ]


def select_top_moments(challenges: List[Dict]) -> List[Dict]:
    return sorted(
        challenges,
        key=lambda challenge: (challenge_weight(challenge), challenge.get("challenged_at") or ""),
        reverse=True,
    )


def describe_turning_point(challenge: Dict) -> str:
    challenge_team = challenge.get("challenge_team_name") or "Unknown club"
    player = challenge.get("challenge_player_name") or challenge.get("batter_name") or "Unknown player"
    called_pitch = challenge.get("called_description") or "called pitch"
    impact = describe_impact_type(challenge.get("impact_type"))
    summary = challenge.get("impact_summary") or (
        f"{challenge_team} challenged a {called_pitch} and the review "
        f"{'overturned' if challenge.get('is_overturned') else 'confirmed'} the call."
    )

    return (
        f"**{format_half_inning(challenge)}**: **{challenge_team}** challenged for **{player}** on a **{called_pitch}**. "
        f"The review {'**overturned**' if challenge.get('is_overturned') else '**confirmed**'} the call, "
        f"moved the count to **{format_count_change(challenge)}**, and registered as **{impact}**. {summary}"
    )


def build_location_quality_line(challenges: List[Dict]) -> str:
    if not challenges:
        return "No challenge rows were available, so there was no location evidence to evaluate."

    tracked_coordinates = sum(
        1
        for challenge in challenges
        if challenge.get("px") is not None
        and challenge.get("pz") is not None
        and challenge.get("strike_zone_top") is not None
        and challenge.get("strike_zone_bottom") is not None
    )
    inferred_count = sum(
        1 for challenge in challenges if challenge.get("inference_method") or challenge.get("location_source") == "inferred"
    )

    if tracked_coordinates == 0:
        return "Pitch-location evidence was limited, so any strike-zone read should stay conservative."
    if inferred_count > 0:
        return (
            f"Pitch-location evidence was available on **{tracked_coordinates} of {len(challenges)}** challenges, "
            f"but **{inferred_count}** relied on inferred coordinates, so zone takeaways should stay measured."
        )
    return (
        f"Pitch-location evidence was available on **{tracked_coordinates} of {len(challenges)}** challenges, "
        "which gives the umpire section enough support for a limited zone read."
    )


def build_location_caveat(challenges: List[Dict]) -> str:
    inferred_count = sum(
        1 for challenge in challenges if challenge.get("inference_method") or challenge.get("location_source") == "inferred"
    )
    if inferred_count > 0:
        return (
            f"{inferred_count} challenge locations relied on inferred coordinates, "
            "so any zone commentary should be treated as directional rather than exact."
        )

    tracked_coordinates = sum(
        1
        for challenge in challenges
        if challenge.get("px") is not None
        and challenge.get("pz") is not None
        and challenge.get("strike_zone_top") is not None
        and challenge.get("strike_zone_bottom") is not None
    )
    if tracked_coordinates == 0:
        return "No tracked pitch coordinates were available for these challenges, so zone-level commentary is intentionally limited."

    return "The report is based on challenge events only, not the full pitch-by-pitch plate appearance context."


def build_strategy_fallback(ledgers: List[Dict], challenges: List[Dict]) -> str:
    if not challenges:
        return "No challenge activity was recorded, so there is no team challenge strategy to evaluate."

    sorted_ledgers = sorted(ledgers, key=lambda ledger: (ledger["overturned"], ledger["total"]), reverse=True)
    best_ledger = sorted_ledgers[0]
    late_challenges = sum(1 for challenge in challenges if (challenge.get("inning") or 0) >= 7)
    return (
        f"**{best_ledger['team_name']}** extracted the most value from its reviews, while the game logged "
        f"**{late_challenges}** challenges from the seventh inning on. Use the turning-point ledger below to judge whether "
        "the most aggressive team was also the most efficient."
    )


def build_evidence_packet(context: Dict, challenges: List[Dict]) -> str:
    total_challenges = len(challenges)
    overturned = sum(1 for challenge in challenges if challenge.get("is_overturned"))
    confirmed = max(0, total_challenges - overturned)
    ledgers = build_team_ledgers(context, challenges)
    top_moments = select_top_moments(challenges)[: min(3, total_challenges)]

    inning_counts: Dict[str, int] = {}
    for challenge in challenges:
        label = format_half_inning(challenge)
        inning_counts[label] = inning_counts.get(label, 0) + 1
    inning_distribution = ", ".join(
        f"{label}: {count}" for label, count in sorted(inning_counts.items(), key=lambda item: item[1], reverse=True)[:4]
    )

    count_clusters: Dict[str, int] = {}
    for challenge in challenges:
        label = challenge.get("count_before") or challenge.get("umpire_count") or "unknown"
        count_clusters[label] = count_clusters.get(label, 0) + 1
    common_counts = ", ".join(
        f"{label}: {count}" for label, count in sorted(count_clusters.items(), key=lambda item: item[1], reverse=True)[:3]
    )

    late_close = sum(
        1
        for challenge in challenges
        if (challenge.get("inning") or 0) >= 7
        and challenge.get("home_score") is not None
        and challenge.get("away_score") is not None
        and abs(challenge["home_score"] - challenge["away_score"]) <= 2
    )
    inferred_count = sum(
        1 for challenge in challenges if challenge.get("inference_method") or challenge.get("location_source") == "inferred"
    )
    tracked_pitch_count = sum(
        1 for challenge in challenges if challenge.get("px") is not None and challenge.get("pz") is not None
    )

    lines = [
        "GAME FACTS",
        f"- Matchup: {context['away_name']} at {context['home_name']}",
        f"- Venue: {context.get('venue_name') or 'Venue unavailable'}",
        f"- Date: {context['game_date']}",
        (
            f"- Final score: {context['away_name']} {context['away_score']}, {context['home_name']} {context['home_score']}"
            if context.get("away_score") is not None and context.get("home_score") is not None
            else "- Final score: Unavailable"
        ),
        f"- Total challenges: {total_challenges}",
        f"- Overturned: {overturned}",
        f"- Confirmed: {confirmed}",
        "",
        "TEAM LEDGER",
    ]
    lines.extend(
        [f"- {ledger['team_name']}: {ledger['overturned']}/{ledger['total']} overturned" for ledger in ledgers]
    )
    lines.extend(
        [
            f"- Plate umpire line: {overturned}/{total_challenges} overturned",
            "",
            "GAME SHAPE",
            f"- Most active innings: {inning_distribution or 'No challenges recorded'}",
            f"- Most common counts: {common_counts or 'No count clusters available'}",
            f"- Late-and-close challenges: {late_close}",
            "",
            "TOP CHALLENGES",
        ]
    )
    if top_moments:
        lines.extend(
            [
                (
                    f"{index + 1}. {format_half_inning(challenge)} | {challenge.get('challenge_team_name') or 'Unknown club'} | "
                    f"{challenge.get('challenge_player_name') or challenge.get('batter_name') or 'Unknown player'} | "
                    f"{challenge.get('called_description') or 'called pitch'} | "
                    f"{'overturned' if challenge.get('is_overturned') else 'confirmed'} | "
                    f"count {format_count_change(challenge)} | {format_score_at_challenge(challenge)} | "
                    f"impact {describe_impact_type(challenge.get('impact_type'))} | "
                    f"note {challenge.get('impact_summary') or 'No extra summary available.'}"
                )
                for index, challenge in enumerate(top_moments)
            ]
        )
    else:
        lines.append("1. No challenge events recorded.")

    lines.extend(
        [
            "",
            "DATA QUALITY",
            f"- {build_location_quality_line(challenges).replace('**', '').replace('**', '')}",
            f"- Inferred locations: {inferred_count}",
            f"- Tracked pitch coordinates: {tracked_pitch_count}/{total_challenges}",
        ]
    )
    return "\n".join(lines)


def build_summary_prompt(context: Dict, challenges: List[Dict]) -> str:
    evidence_packet = build_evidence_packet(context, challenges)
    return "\n".join(
        [
            "You are writing the AiBS postgame debrief as a sharp baseball analyst.",
            "Write with a calm, evidence-first voice that sounds like a polished game recap, not a scouting memo or list of notes.",
            "Use only the evidence below and obvious arithmetic from it.",
            "Take the supplied data points, contextualize them, and turn them into a smooth recap of how the ABS story fit into the game.",
            "Lead with the final result and the core ABS takeaway, then fold key review moments into the wider game context.",
            "Do not invent leverage, box-score details, emotions, player intent, or umpire tendencies that are not supported by the evidence.",
            "Return markdown only.",
            "Do not use headings.",
            "Do not use bullet lists.",
            "Do not wrap the answer in code fences.",
            "Formatting rules:",
            "- Write 2 to 4 short paragraphs.",
            "- Keep the full report concise, roughly 180 to 320 words.",
            "- Keep paragraphs readable and naturally flowing.",
            "- You may use bold sparingly for the most important team names, final score, challenge totals, and overturn totals.",
            "- The result should read like a game recap, not a ledger.",
            "Writing rules:",
            "- Open with the winner, final score, and the central ABS theme of the game.",
            "- Weave the most important challenge moments into sentences instead of listing them one by one.",
            "- Use stats first, then explain what they meant for the rhythm or shape of the game.",
            "- If the evidence supports an umpire-zone observation, mention it briefly and carefully.",
            "- If the data is limited or inferred, fold that caveat in naturally near the end instead of creating a separate section.",
            "",
            "EVIDENCE PACKET",
            evidence_packet,
        ]
    )


def build_fallback_narrative(context: Dict, challenges: List[Dict]) -> str:
    ledgers = build_team_ledgers(context, challenges)
    overturned = sum(1 for challenge in challenges if challenge.get("is_overturned"))
    confirmed = max(0, len(challenges) - overturned)
    top_moments = select_top_moments(challenges)[: min(3, len(challenges))]
    best_ledger = sorted(ledgers, key=lambda ledger: (ledger["overturned"], ledger["total"]), reverse=True)[0] if ledgers else None
    best_ledger_sentence = (
        f"**{best_ledger['team_name']}** got the most value from review, finishing **{best_ledger['overturned']}-for-{best_ledger['total']}** on its challenges."
        if best_ledger
        else ""
    )
    top_moment_summary = (
        " ".join(
            [
                (
                    f"In {format_half_inning(challenge)}, **{challenge.get('challenge_team_name') or 'Unknown club'}** challenged for "
                    f"**{challenge.get('challenge_player_name') or challenge.get('batter_name') or 'Unknown player'}** on a "
                    f"**{challenge.get('called_description') or 'called pitch'}**, and the review "
                    f"{'overturned' if challenge.get('is_overturned') else 'confirmed'} the call."
                )
                for challenge in top_moments
            ]
        )
        if top_moments
        else "No challenge events were available to identify specific review moments."
    )

    return "\n".join(
        [
            (
                f"**{context['away_name']} at {context['home_name']}** ended {format_final_score(context)}, and the ABS layer of the game "
                f"was defined by **{len(challenges)}** total challenges with **{overturned}** overturns. {best_ledger_sentence}"
            ),
            "",
            top_moment_summary,
            "",
            (
                f"Overall, the plate umpire had **{overturned}** calls overturned out of **{len(challenges)}** reviews, with **{confirmed}** confirmed. "
                f"{build_location_quality_line(challenges)} {build_location_caveat(challenges)} "
                "This recap used the deterministic fallback template rather than a model-written narrative, so it stays compact and evidence-based."
            ),
        ]
    )


def generate_and_store_report(cur, game_pk: int, force: bool = False) -> bool:
    if report_exists(cur, game_pk) and not force:
        return False

    context = load_game_context(cur, game_pk)
    if not context:
        return False

    challenges = load_challenge_evidence(cur, game_pk)
    model_name = os.getenv("OPENAI_SUMMARY_MODEL", "gpt-4.1-mini")
    summary_prompt = build_summary_prompt(context, challenges)

    narrative = build_narrative(summary_prompt, model_name)
    if not narrative:
        narrative = build_fallback_narrative(context, challenges)
        model_name = "fallback"

    chart_spec = {
        "type": "bar",
        "title": "Challenges vs Overturned",
        "data": [
            {"label": "Challenges", "value": len(challenges)},
            {"label": "Overturned", "value": sum(1 for challenge in challenges if challenge.get("is_overturned"))},
        ],
    }
    upsert_game_report(cur, context["game_pk"], model_name, narrative, chart_spec)
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
