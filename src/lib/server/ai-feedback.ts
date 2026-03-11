import { createHash } from "node:crypto";

import { z } from "zod";

import { sqlOne } from "@/lib/db";
import { writeAuditLog } from "@/lib/server/audit";
import { assertValidCsrf } from "@/lib/server/csrf";
import { enqueueJob } from "@/lib/server/job-queue";
import { logServerError } from "@/lib/server/logging";
import { getViewerProfile } from "@/lib/server/profiles";

const FEEDBACK_SURFACES = [
  "copilot",
  "visualizer",
  "chart_insight",
  "game_debrief",
  "article",
] as const;

const FEEDBACK_TARGET_TYPES = [
  "ai_message",
  "game_report",
  "article",
  "chart_insight",
  "challenge_summary",
] as const;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const OPTIONAL_UUID_SCHEMA = z.preprocess((value) => {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed || !UUID_PATTERN.test(trimmed)) {
    return null;
  }

  return trimmed;
}, z.string().uuid().nullable().optional());

const OPTIONAL_METADATA_SCHEMA = z.preprocess((value) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value;
}, z.record(z.string(), z.unknown()).nullable().optional());

export const AI_FEEDBACK_INPUT_SCHEMA = z.object({
  sessionId: z.string().min(8).max(128).optional(),
  surface: z.enum(FEEDBACK_SURFACES),
  targetType: z.enum(FEEDBACK_TARGET_TYPES),
  targetId: z.string().trim().min(1).max(512),
  sentiment: z.enum(["up", "down"]),
  generationId: OPTIONAL_UUID_SCHEMA,
  conversationId: OPTIONAL_UUID_SCHEMA,
  messageId: OPTIONAL_UUID_SCHEMA,
  articleId: OPTIONAL_UUID_SCHEMA,
  gamePk: z.coerce.number().int().optional().nullable(),
  comment: z.string().trim().max(1000).optional().nullable(),
  metadata: OPTIONAL_METADATA_SCHEMA,
});

export type AIFeedbackInput = z.infer<typeof AI_FEEDBACK_INPUT_SCHEMA>;

function normalizeComment(comment: string | null | undefined) {
  const trimmed = comment?.trim();
  return trimmed ? trimmed : null;
}

function buildClassificationIdempotencyKey(feedbackId: string, sentiment: "up" | "down", comment: string | null) {
  const signature = createHash("sha256")
    .update(JSON.stringify({ feedbackId, sentiment, comment }))
    .digest("hex")
    .slice(0, 16);
  return `ai-feedback-classification:${feedbackId}:${signature}`;
}

export async function saveAIFeedback(request: Request, input: AIFeedbackInput) {
  assertValidCsrf(request);

  const viewer = await getViewerProfile(request);
  const actorKey = viewer?.userId ? `user:${viewer.userId}` : input.sessionId ? `session:${input.sessionId}` : null;

  if (!actorKey) {
    throw new Error("Session identifier required");
  }

  const comment = normalizeComment(input.comment);
  const initialClassificationStatus = "pending" as const;
  const existing = await sqlOne<{ feedbackid: string; sentiment: "up" | "down"; comment: string | null }>(
    `
    SELECT feedback_id AS feedbackId, sentiment, comment
    FROM ai.feedback
    WHERE actor_key = $1
      AND surface = $2
      AND target_type = $3
      AND target_id = $4
    `,
    [actorKey, input.surface, input.targetType, input.targetId],
  );
  const shouldQueueClassification =
    !existing ||
    existing.sentiment !== input.sentiment ||
    normalizeComment(existing.comment) !== comment;
  const initialReviewPriority = input.sentiment === "up" ? "low" : "normal";

  const row = await sqlOne<{ feedbackid: string }>(
    `
    INSERT INTO ai.feedback (
      actor_key,
      user_id,
      session_id,
      surface,
      target_type,
      target_id,
      sentiment,
      generation_id,
      conversation_id,
      message_id,
      article_id,
      game_pk,
      comment,
      classification_status,
      review_priority,
      metadata
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
    ON CONFLICT (actor_key, surface, target_type, target_id) DO UPDATE SET
      sentiment = EXCLUDED.sentiment,
      generation_id = COALESCE(EXCLUDED.generation_id, ai.feedback.generation_id),
      conversation_id = COALESCE(EXCLUDED.conversation_id, ai.feedback.conversation_id),
      message_id = COALESCE(EXCLUDED.message_id, ai.feedback.message_id),
      article_id = COALESCE(EXCLUDED.article_id, ai.feedback.article_id),
      game_pk = COALESCE(EXCLUDED.game_pk, ai.feedback.game_pk),
      comment = EXCLUDED.comment,
      classification_status = CASE
        WHEN ai.feedback.comment IS DISTINCT FROM EXCLUDED.comment OR ai.feedback.sentiment IS DISTINCT FROM EXCLUDED.sentiment
          THEN EXCLUDED.classification_status
        ELSE ai.feedback.classification_status
      END,
      classification_bucket = CASE
        WHEN ai.feedback.comment IS DISTINCT FROM EXCLUDED.comment OR ai.feedback.sentiment IS DISTINCT FROM EXCLUDED.sentiment
          THEN NULL
        ELSE ai.feedback.classification_bucket
      END,
      classification_confidence = CASE
        WHEN ai.feedback.comment IS DISTINCT FROM EXCLUDED.comment OR ai.feedback.sentiment IS DISTINCT FROM EXCLUDED.sentiment
          THEN NULL
        ELSE ai.feedback.classification_confidence
      END,
      classification_notes = CASE
        WHEN ai.feedback.comment IS DISTINCT FROM EXCLUDED.comment OR ai.feedback.sentiment IS DISTINCT FROM EXCLUDED.sentiment
          THEN NULL
        ELSE ai.feedback.classification_notes
      END,
      review_priority = CASE
        WHEN ai.feedback.comment IS DISTINCT FROM EXCLUDED.comment OR ai.feedback.sentiment IS DISTINCT FROM EXCLUDED.sentiment
          THEN EXCLUDED.review_priority
        ELSE ai.feedback.review_priority
      END,
      metadata = COALESCE(EXCLUDED.metadata, ai.feedback.metadata),
      updated_at = NOW()
    RETURNING feedback_id AS feedbackId
    `,
    [
      actorKey,
      viewer?.userId ?? null,
      input.sessionId ?? null,
      input.surface,
      input.targetType,
      input.targetId,
      input.sentiment,
      input.generationId ?? null,
      input.conversationId ?? null,
      input.messageId ?? null,
      input.articleId ?? null,
      input.gamePk ?? null,
      comment,
      initialClassificationStatus,
      initialReviewPriority,
      input.metadata ?? null,
    ],
  );

  await writeAuditLog({
    actorUserId: viewer?.userId ?? null,
    action: "ai_feedback_saved",
    targetType: "ai.feedback",
    targetId: row?.feedbackid ?? null,
    metadata: {
      surface: input.surface,
      targetType: input.targetType,
      targetId: input.targetId,
      sentiment: input.sentiment,
      generationId: input.generationId ?? null,
      hasComment: Boolean(comment),
      conversationId: input.conversationId ?? null,
      messageId: input.messageId ?? null,
      articleId: input.articleId ?? null,
      gamePk: input.gamePk ?? null,
    },
  });

  if (row?.feedbackid && shouldQueueClassification) {
    try {
      await enqueueJob({
        jobType: "ai_feedback_classification",
        payload: { feedbackId: row.feedbackid },
        ownerUserId: viewer?.userId ?? null,
        metadata: {
          surface: input.surface,
          targetType: input.targetType,
          targetId: input.targetId,
        },
        idempotencyKey: buildClassificationIdempotencyKey(row.feedbackid, input.sentiment, comment),
      });
    } catch (error) {
      logServerError("ai.feedback.enqueue_classification", error, {
        feedbackId: row.feedbackid,
        surface: input.surface,
        targetType: input.targetType,
      });
    }
  }

  return { feedbackId: row?.feedbackid ?? null };
}
