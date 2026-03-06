import { NextResponse } from "next/server";

import { sql } from "@/lib/db";
import { formatContextWindow, withContextPrompt, type CopilotContext } from "@/lib/copilot-context";
import { METRIC_DICTIONARY } from "@/lib/metrics";
import { generateAnswer, generateSql, isBaseballRelated, parseQuestion, validateSql } from "@/lib/guardrails";

export async function POST(request: Request) {
  const body = await request.json();
  const { question } = parseQuestion(body);
  const context = (body?.context ?? undefined) as CopilotContext | undefined;
  const scopedQuestion = withContextPrompt(question, context);

  if (!isBaseballRelated(question)) {
    return NextResponse.json(
      {
        error: "Question rejected by baseball scope classifier.",
        hint: "Ask about MLB ABS challenges, teams, umpires, game contexts, or strike/ball challenge behavior.",
      },
      { status: 400 },
    );
  }

  const sqlText = await generateSql(scopedQuestion);
  const validation = validateSql(sqlText);
  if (!validation.ok) {
    return NextResponse.json({ error: validation.reason, sql: sqlText }, { status: 400 });
  }

  const rows = await sql<Record<string, unknown>>(sqlText);
  const completion = await generateAnswer({ question: scopedQuestion, sqlText, rows });

  return NextResponse.json({
    answer: completion.answer,
    confidence: completion.confidence,
    sql: sqlText,
    contextWindow: formatContextWindow(context),
    sources: ["mart_abs_events_enriched", "mart_team_abs_daily", "mart_umpire_abs_daily", "mart_game_abs_timeline"],
    metrics: METRIC_DICTIONARY,
    rows,
  });
}
