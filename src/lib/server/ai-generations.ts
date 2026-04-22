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

export type AiSavedArtifact = {
  artifactId: string;
  userId: string;
  generationId: string | null;
  surfaceKey: AiGenerationSurfaceKey;
  surfaceDetail: string | null;
  targetType: string;
  targetId: string;
  routeScope: string | null;
  routeEntityId: string | null;
  articleId: string | null;
  gamePk: number | null;
  title: string | null;
  summary: string | null;
  artifactPayload: unknown;
  metadata: unknown;
  lastViewedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AiArtifactRegistrationInput = Pick<
  AiGenerationEventInput,
  "surfaceKey" | "surfaceDetail" | "targetType" | "targetId" | "routeScope" | "routeEntityId" | "articleId" | "gamePk" | "metadata"
> & {
  userId?: string | null;
  title?: string | null;
  summary?: string | null;
  artifactPayload?: unknown;
};

type AiSavedArtifactRow = {
  artifactid: string;
  userid: string;
  generationid: string | null;
  surfacekey: AiGenerationSurfaceKey;
  surfacedetail: string | null;
  targettype: string;
  targetid: string;
  routescope: string | null;
  routeentityid: string | null;
  articleid: string | null;
  gamepk: number | null;
  title: string | null;
  summary: string | null;
  artifactpayload: unknown;
  metadata: unknown;
  lastviewedat: string | null;
  createdat: string;
  updatedat: string;
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
    AiArtifactRegistrationInput,
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

function mapSavedArtifact(row: AiSavedArtifactRow): AiSavedArtifact {
  return {
    artifactId: row.artifactid,
    userId: row.userid,
    generationId: row.generationid,
    surfaceKey: row.surfacekey,
    surfaceDetail: row.surfacedetail,
    targetType: row.targettype,
    targetId: row.targetid,
    routeScope: row.routescope,
    routeEntityId: row.routeentityid,
    articleId: row.articleid,
    gamePk: row.gamepk === null ? null : Number(row.gamepk),
    title: row.title,
    summary: row.summary,
    artifactPayload: row.artifactpayload,
    metadata: row.metadata,
    lastViewedAt: row.lastviewedat,
    createdAt: row.createdat,
    updatedAt: row.updatedat,
  };
}

async function upsertViewerAiArtifact(input: Required<Pick<AiArtifactRegistrationInput, "userId">> & AiArtifactRegistrationInput & { generationId?: string | null }) {
  const row = await sqlOne<AiSavedArtifactRow>(
    `
    INSERT INTO ai.saved_artifacts (
      user_id,
      generation_id,
      surface_key,
      surface_detail,
      target_type,
      target_id,
      route_scope,
      route_entity_id,
      article_id,
      game_pk,
      title,
      summary,
      artifact_payload,
      metadata,
      last_viewed_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW())
    ON CONFLICT (user_id, surface_key, target_type, target_id)
    DO UPDATE SET
      generation_id = COALESCE(EXCLUDED.generation_id, ai.saved_artifacts.generation_id),
      surface_detail = COALESCE(EXCLUDED.surface_detail, ai.saved_artifacts.surface_detail),
      route_scope = COALESCE(EXCLUDED.route_scope, ai.saved_artifacts.route_scope),
      route_entity_id = COALESCE(EXCLUDED.route_entity_id, ai.saved_artifacts.route_entity_id),
      article_id = COALESCE(EXCLUDED.article_id, ai.saved_artifacts.article_id),
      game_pk = COALESCE(EXCLUDED.game_pk, ai.saved_artifacts.game_pk),
      title = COALESCE(EXCLUDED.title, ai.saved_artifacts.title),
      summary = COALESCE(EXCLUDED.summary, ai.saved_artifacts.summary),
      artifact_payload = COALESCE(EXCLUDED.artifact_payload, ai.saved_artifacts.artifact_payload),
      metadata = CASE
        WHEN EXCLUDED.metadata IS NULL THEN ai.saved_artifacts.metadata
        WHEN ai.saved_artifacts.metadata IS NULL THEN EXCLUDED.metadata
        ELSE ai.saved_artifacts.metadata || EXCLUDED.metadata
      END,
      last_viewed_at = NOW(),
      updated_at = NOW()
    RETURNING
      artifact_id AS artifactId,
      user_id AS userId,
      generation_id AS generationId,
      surface_key AS surfaceKey,
      surface_detail AS surfaceDetail,
      target_type AS targetType,
      target_id AS targetId,
      route_scope AS routeScope,
      route_entity_id AS routeEntityId,
      article_id AS articleId,
      game_pk AS gamePk,
      title,
      summary,
      artifact_payload AS artifactPayload,
      metadata,
      last_viewed_at AS lastViewedAt,
      created_at AS createdAt,
      updated_at AS updatedAt
    `,
    [
      input.userId,
      input.generationId ?? null,
      input.surfaceKey,
      input.surfaceDetail ?? null,
      input.targetType,
      input.targetId,
      input.routeScope ?? null,
      input.routeEntityId ?? null,
      input.articleId ?? null,
      input.gamePk ?? null,
      input.title ?? null,
      input.summary ?? null,
      input.artifactPayload ?? null,
      input.metadata ?? null,
    ],
  );

  return row ? mapSavedArtifact(row) : null;
}

export async function registerAiArtifact(input: AiArtifactRegistrationInput): Promise<{
  generationId: string | null;
  artifactId: string | null;
  saved: boolean;
}> {
  const generationId = await getOrCreateAiArtifactGeneration(input);

  if (!input.userId) {
    return {
      generationId,
      artifactId: null,
      saved: false,
    };
  }

  const artifact = await upsertViewerAiArtifact({
    ...input,
    userId: input.userId,
    generationId,
  });

  return {
    generationId,
    artifactId: artifact?.artifactId ?? null,
    saved: Boolean(artifact?.artifactId),
  };
}

export async function listViewerAiArtifacts(userId: string, limit = 12): Promise<AiSavedArtifact[]> {
  const rows = await sql<AiSavedArtifactRow>(
    `
    SELECT
      artifact_id AS artifactId,
      user_id AS userId,
      generation_id AS generationId,
      surface_key AS surfaceKey,
      surface_detail AS surfaceDetail,
      target_type AS targetType,
      target_id AS targetId,
      route_scope AS routeScope,
      route_entity_id AS routeEntityId,
      article_id AS articleId,
      game_pk AS gamePk,
      title,
      summary,
      artifact_payload AS artifactPayload,
      metadata,
      last_viewed_at AS lastViewedAt,
      created_at AS createdAt,
      updated_at AS updatedAt
    FROM ai.saved_artifacts
    WHERE user_id = $1::uuid
    ORDER BY updated_at DESC, created_at DESC
    LIMIT $2
    `,
    [userId, limit],
  );

  return rows.map(mapSavedArtifact);
}

export async function getViewerAiArtifactById(userId: string, artifactId: string): Promise<AiSavedArtifact | null> {
  const row = await sqlOne<AiSavedArtifactRow>(
    `
    SELECT
      artifact_id AS artifactId,
      user_id AS userId,
      generation_id AS generationId,
      surface_key AS surfaceKey,
      surface_detail AS surfaceDetail,
      target_type AS targetType,
      target_id AS targetId,
      route_scope AS routeScope,
      route_entity_id AS routeEntityId,
      article_id AS articleId,
      game_pk AS gamePk,
      title,
      summary,
      artifact_payload AS artifactPayload,
      metadata,
      last_viewed_at AS lastViewedAt,
      created_at AS createdAt,
      updated_at AS updatedAt
    FROM ai.saved_artifacts
    WHERE user_id = $1::uuid
      AND artifact_id = $2::uuid
    `,
    [userId, artifactId],
  );

  return row ? mapSavedArtifact(row) : null;
}

export async function getPublicAiArtifactById(artifactId: string): Promise<AiSavedArtifact | null> {
  const row = await sqlOne<AiSavedArtifactRow>(
    `
    SELECT
      artifact_id AS artifactId,
      user_id AS userId,
      generation_id AS generationId,
      surface_key AS surfaceKey,
      surface_detail AS surfaceDetail,
      target_type AS targetType,
      target_id AS targetId,
      route_scope AS routeScope,
      route_entity_id AS routeEntityId,
      article_id AS articleId,
      game_pk AS gamePk,
      title,
      summary,
      artifact_payload AS artifactPayload,
      metadata,
      last_viewed_at AS lastViewedAt,
      created_at AS createdAt,
      updated_at AS updatedAt
    FROM ai.saved_artifacts
    WHERE artifact_id = $1::uuid
      AND COALESCE((metadata ->> 'publicShare')::boolean, FALSE) = TRUE
    `,
    [artifactId],
  );

  return row ? mapSavedArtifact(row) : null;
}
