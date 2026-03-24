import OpenAI from "openai";
import { z } from "zod";

import { ALLOWED_VIEWS } from "./metrics";

const QUESTION_SCHEMA = z.object({
  question: z.string().min(4).max(500),
});

const FORBIDDEN_PATTERNS = [
  /\b(insert|update|delete|drop|create|alter|truncate|grant|revoke)\b/i,
  /\b(pg_|information_schema|sqlite_|sys\.)\b/i,
  /;\s*$/,
];

const ALLOWED_VIEW_PATTERNS = ALLOWED_VIEWS.map((v) => new RegExp(`\\b${v}\\b`, "i"));

const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

export function parseQuestion(raw: unknown): { question: string } {
  return QUESTION_SCHEMA.parse(raw);
}

export function isBaseballRelated(question: string): boolean {
  const lower = question.toLowerCase();
  const terms = [
    "mlb",
    "baseball",
    "umpire",
    "challenge",
    "abs",
    "strike",
    "ball",
    "pitch",
    "inning",
    "team",
    "game",
    "batter",
    "pitcher",
  ];
  return terms.some((t) => lower.includes(t));
}

export function validateSql(sqlText: string): { ok: boolean; reason?: string } {
  if (!/^\s*select\b/i.test(sqlText)) {
    return { ok: false, reason: "Only SELECT queries are allowed." };
  }

  for (const pattern of FORBIDDEN_PATTERNS) {
    if (pattern.test(sqlText)) {
      return { ok: false, reason: "Query contained forbidden SQL patterns." };
    }
  }

  const usesAllowedView = ALLOWED_VIEW_PATTERNS.some((pattern) => pattern.test(sqlText));
  if (!usesAllowedView) {
    return { ok: false, reason: "Query must reference at least one approved semantic view." };
  }

  if (!/\blimit\s+\d+/i.test(sqlText)) {
    return { ok: false, reason: "Query must include LIMIT." };
  }

  return { ok: true };
}

export async function generateSql(question: string): Promise<string> {
  if (!openai) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  const response = await openai.responses.create({
    model: process.env.OPENAI_QUERY_MODEL || "gpt-4.1-mini",
    temperature: 0,
    input: `System: Generate a single Postgres SELECT query for baseball ABS analytics.
Use only allowed views: mart_abs_events_enriched, mart_team_abs_daily, mart_umpire_abs_daily, mart_game_abs_timeline.
Always include LIMIT 100.
Return only SQL.
User question: ${question}`,
  });

  const text = response.output_text?.trim();
  if (!text) {
    throw new Error("Model did not return SQL text.");
  }
  return text;
}

export async function generateAnswer(params: {
  question: string;
  sqlText: string;
  rows: unknown[];
}): Promise<{ answer: string; confidence: "low" | "medium" | "high" }> {
  if (!openai) {
    return {
      answer:
        "LLM answer generation is unavailable because OPENAI_API_KEY is not set. SQL executed successfully and rows are returned.",
      confidence: "medium",
    };
  }

  const response = await openai.responses.create({
    model: process.env.OPENAI_SUMMARY_MODEL || "gpt-4.1-mini",
    temperature: 0.2,
    input: `System: You are an MLB ABS analytics assistant. Only use provided SQL result rows. Avoid speculation. Return concise findings plus caveats.
Question: ${params.question}
SQL: ${params.sqlText}
Rows: ${JSON.stringify(params.rows).slice(0, 15000)}`,
  });

  const answer = response.output_text?.trim() || "No narrative generated.";
  const confidence: "low" | "medium" | "high" = params.rows.length > 15 ? "high" : params.rows.length > 3 ? "medium" : "low";
  return { answer, confidence };
}
