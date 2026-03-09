import type { QueryResultRow } from "pg";

import { sql, sqlOne } from "@/lib/db";

export const AI_GENERATION_SURFACES = [
  "copilot",
  "visualizer",
  "chart_insight",
  "game_debrief",
  "gazette_daily_author",
  "gazette_daily_validation",
  "feedback_classifier",
] as const;

export type AiGenerationSurfaceKey = (typeof AI_GENERATION_SURFACES)[number];
export type AiGenerationStatus = "succeeded" | "fallback" | "failed" | "cached";

type QueryFn = <T extends QueryResultRow>(statement: string, values?: unknown[]) => Promise<T[]>;

export type AiGenerationEventInput = {
  userId?: string | null;
  sessionId?: string | null;
  surfaceKey: AiGenerationSurfaceKey;
  surfaceDetail?: string | null;
  targetType: string;
  targetId: string;
  routeScope?: string | null;
  routeEntityId?: string | null;
  conversationId?: string | null;
  messageId?: string | null;
  articleId?: string | null;
  gamePk?: number | null;
  provider: string;
  modelName: string;
  promptVersion?: string | null;
  inputTokens?: number;
  outputTokens?: number;
  estimatedCostUsd?: number;
  latencyMs?: number | null;
  status: AiGenerationStatus;
  cacheHit?: boolean;
  metadata?: unknown;
};

async function insertGenerationEvent(
  query: QueryFn,
  input: AiGenerationEventInput,
) {
  return query<{ generation_id: string }>(
    `
    INSERT INTO ai.generation_events (
      user_id,
      session_id,
      surface_key,
      surface_detail,
      target_type,
      target_id,
      route_scope,
      route_entity_id,
      conversation_id,
      message_id,
      article_id,
      game_pk,
      provider,
      model_name,
      prompt_version,
      input_tokens,
      output_tokens,
      total_tokens,
      estimated_cost_usd,
      latency_ms,
      status,
      cache_hit,
      metadata
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)
    RETURNING generation_id
    `,
    [
      input.userId ?? null,
      input.sessionId ?? null,
      input.surfaceKey,
      input.surfaceDetail ?? null,
      input.targetType,
      input.targetId,
      input.routeScope ?? null,
      input.routeEntityId ?? null,
      input.conversationId ?? null,
      input.messageId ?? null,
      input.articleId ?? null,
      input.gamePk ?? null,
      input.provider,
      input.modelName,
      input.promptVersion ?? null,
      input.inputTokens ?? 0,
      input.outputTokens ?? 0,
      (input.inputTokens ?? 0) + (input.outputTokens ?? 0),
      input.estimatedCostUsd ?? 0,
      input.latencyMs ?? null,
      input.status,
      input.cacheHit ?? false,
      input.metadata ?? null,
    ],
  );
}

export async function recordAiGenerationEvent(input: AiGenerationEventInput): Promise<string | null> {
  const row = await sqlOne<{ generation_id: string }>(
    `
    INSERT INTO ai.generation_events (
      user_id,
      session_id,
      surface_key,
      surface_detail,
      target_type,
      target_id,
      route_scope,
      route_entity_id,
      conversation_id,
      message_id,
      article_id,
      game_pk,
      provider,
      model_name,
      prompt_version,
      input_tokens,
      output_tokens,
      total_tokens,
      estimated_cost_usd,
      latency_ms,
      status,
      cache_hit,
      metadata
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)
    RETURNING generation_id
    `,
    [
      input.userId ?? null,
      input.sessionId ?? null,
      input.surfaceKey,
      input.surfaceDetail ?? null,
      input.targetType,
      input.targetId,
      input.routeScope ?? null,
      input.routeEntityId ?? null,
      input.conversationId ?? null,
      input.messageId ?? null,
      input.articleId ?? null,
      input.gamePk ?? null,
      input.provider,
      input.modelName,
      input.promptVersion ?? null,
      input.inputTokens ?? 0,
      input.outputTokens ?? 0,
      (input.inputTokens ?? 0) + (input.outputTokens ?? 0),
      input.estimatedCostUsd ?? 0,
      input.latencyMs ?? null,
      input.status,
      input.cacheHit ?? false,
      input.metadata ?? null,
    ],
  );

  return row?.generation_id ?? null;
}

export async function recordAiGenerationEventWithQuery(
  query: QueryFn,
  input: AiGenerationEventInput,
): Promise<string | null> {
  const rows = await insertGenerationEvent(query, input);
  return rows[0]?.generation_id ?? null;
}

export async function getOrCreateAiArtifactGeneration(
  input: Pick<
    AiGenerationEventInput,
    "surfaceKey" | "surfaceDetail" | "targetType" | "targetId" | "routeScope" | "routeEntityId" | "articleId" | "gamePk" | "metadata"
  >,
): Promise<string | null> {
  const existing = await sqlOne<{ generationid: string }>(
    `
    SELECT generation_id AS generationId
    FROM ai.generation_events
    WHERE surface_key = $1
      AND target_type = $2
      AND target_id = $3
      AND provider = 'deterministic'
      AND model_name = 'artifact_v1'
      AND status = 'cached'
    ORDER BY created_at DESC
    LIMIT 1
    `,
    [input.surfaceKey, input.targetType, input.targetId],
  );

  if (existing?.generationid) {
    return existing.generationid;
  }

  const row = await sql<{ generationid: string }>(
    `
    INSERT INTO ai.generation_events (
      surface_key,
      surface_detail,
      target_type,
      target_id,
      route_scope,
      route_entity_id,
      article_id,
      game_pk,
      provider,
      model_name,
      status,
      cache_hit,
      metadata
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'deterministic', 'artifact_v1', 'cached', TRUE, $9)
    RETURNING generation_id AS generationId
    `,
    [
      input.surfaceKey,
      input.surfaceDetail ?? null,
      input.targetType,
      input.targetId,
      input.routeScope ?? null,
      input.routeEntityId ?? null,
      input.articleId ?? null,
      input.gamePk ?? null,
      input.metadata ?? null,
    ],
  );

  return row[0]?.generationid ?? null;
}
