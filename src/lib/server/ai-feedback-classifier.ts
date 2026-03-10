import OpenAI from "openai";

import { sql, sqlOne } from "@/lib/db";
import { writeAuditLog } from "@/lib/server/audit";
import { recordAiGenerationEvent } from "@/lib/server/ai-generations";
import { estimateAiCostUsd } from "@/lib/server/ai-pricing";

const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;
const DEFAULT_FEEDBACK_MODEL = process.env.OPENAI_FEEDBACK_MODEL ?? process.env.OPENAI_SUMMARY_MODEL ?? "gpt-4.1-mini";

const POSITIVE_BUCKETS = [
  "positive_no_comment",
  "helpful_analysis",
  "clarity",
  "baseball_reasoning",
  "data_confidence",
  "actionable",
  "tone_style",
  "other_positive",
] as const;

const NEGATIVE_BUCKETS = [
  "negative_no_comment",
  "baseball_logic",
  "data_accuracy",
  "missed_context",
  "hallucination",
  "formatting_clarity",
  "too_verbose",
  "too_vague",
  "not_actionable",
  "tone_style",
  "latency",
  "other_negative",
] as const;

type PositiveBucket = (typeof POSITIVE_BUCKETS)[number];
type NegativeBucket = (typeof NEGATIVE_BUCKETS)[number];
type FeedbackBucket = PositiveBucket | NegativeBucket;
type ConfidenceLevel = "low" | "medium" | "high";

type FeedbackRecord = {
  feedbackid: string;
  userid: string | null;
  surface: string;
  targettype: string;
  targetid: string;
  sentiment: "up" | "down";
  comment: string | null;
  metadata: Record<string, unknown> | null;
};

type ClassificationResult = {
  bucket: FeedbackBucket;
  confidence: ConfidenceLevel;
  notes: string;
  source: "rules" | "openai";
  modelName: string;
};

function stripCodeFences(value: string) {
  return value.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
}

function normalizeBucket(sentiment: "up" | "down", rawBucket: string | null | undefined): FeedbackBucket {
  const bucket = rawBucket?.trim().toLowerCase() ?? "";
  if (sentiment === "up") {
    if ((POSITIVE_BUCKETS as readonly string[]).includes(bucket)) {
      return bucket as PositiveBucket;
    }
    return "other_positive";
  }

  if ((NEGATIVE_BUCKETS as readonly string[]).includes(bucket)) {
    return bucket as NegativeBucket;
  }
  return "other_negative";
}

function normalizeConfidence(rawConfidence: string | null | undefined): ConfidenceLevel {
  const value = rawConfidence?.trim().toLowerCase();
  if (value === "high" || value === "medium" || value === "low") {
    return value;
  }
  return "medium";
}

function keywordMatch(comment: string, needles: string[]) {
  return needles.some((needle) => comment.includes(needle));
}

function buildFallbackClassification(feedback: FeedbackRecord): ClassificationResult {
  const comment = feedback.comment?.trim().toLowerCase() ?? "";

  if (!comment) {
    return {
      bucket: feedback.sentiment === "up" ? "positive_no_comment" : "negative_no_comment",
      confidence: "high",
      notes:
        feedback.sentiment === "up"
          ? "Positive signal recorded without a written reason."
          : "Negative signal recorded without a written reason.",
      source: "rules",
      modelName: "rules",
    };
  }

  if (feedback.sentiment === "up") {
    if (keywordMatch(comment, ["clear", "clean", "easy to read", "readable", "understand"])) {
      return { bucket: "clarity", confidence: "high", notes: "User praised readability or clarity.", source: "rules", modelName: "rules" };
    }
    if (keywordMatch(comment, ["helpful", "useful", "insightful", "good analysis", "great analysis"])) {
      return { bucket: "helpful_analysis", confidence: "high", notes: "User found the response helpful or insightful.", source: "rules", modelName: "rules" };
    }
    if (keywordMatch(comment, ["accurate", "right", "correct", "trusted data", "good data", "numbers"])) {
      return { bucket: "data_confidence", confidence: "medium", notes: "User expressed trust in the data or accuracy.", source: "rules", modelName: "rules" };
    }
    if (keywordMatch(comment, ["logic", "reasoning", "baseball", "made sense", "smart"])) {
      return { bucket: "baseball_reasoning", confidence: "medium", notes: "User liked the baseball logic or reasoning.", source: "rules", modelName: "rules" };
    }
    if (keywordMatch(comment, ["actionable", "decision", "use this", "useful for", "helped me"])) {
      return { bucket: "actionable", confidence: "medium", notes: "User found the output actionable.", source: "rules", modelName: "rules" };
    }
    if (keywordMatch(comment, ["tone", "voice", "style", "sounds good"])) {
      return { bucket: "tone_style", confidence: "medium", notes: "User reacted positively to the tone or style.", source: "rules", modelName: "rules" };
    }
    return { bucket: "other_positive", confidence: "low", notes: "Positive feedback did not map to a more specific bucket.", source: "rules", modelName: "rules" };
  }

  if (keywordMatch(comment, ["wrong", "incorrect", "doesn't know baseball", "bad baseball", "logic", "reasoning"])) {
    return { bucket: "baseball_logic", confidence: "high", notes: "User flagged baseball logic or reasoning issues.", source: "rules", modelName: "rules" };
  }
  if (keywordMatch(comment, ["data", "stat", "stats", "numbers", "axis", "chart", "mismatch", "accurate"])) {
    return { bucket: "data_accuracy", confidence: "high", notes: "User flagged a data or chart accuracy issue.", source: "rules", modelName: "rules" };
  }
  if (keywordMatch(comment, ["context", "missed", "left out", "didn't mention", "no mention"])) {
    return { bucket: "missed_context", confidence: "high", notes: "User said the answer missed important context.", source: "rules", modelName: "rules" };
  }
  if (keywordMatch(comment, ["made up", "halluc", "invented", "fabricated"])) {
    return { bucket: "hallucination", confidence: "high", notes: "User said the answer invented unsupported information.", source: "rules", modelName: "rules" };
  }
  if (keywordMatch(comment, ["format", "hard to read", "messy", "layout", "readability"])) {
    return { bucket: "formatting_clarity", confidence: "high", notes: "User flagged formatting or readability issues.", source: "rules", modelName: "rules" };
  }
  if (keywordMatch(comment, ["too long", "wordy", "long", "verbose"])) {
    return { bucket: "too_verbose", confidence: "high", notes: "User said the answer was too long or wordy.", source: "rules", modelName: "rules" };
  }
  if (keywordMatch(comment, ["vague", "generic", "surface level", "not enough detail"])) {
    return { bucket: "too_vague", confidence: "high", notes: "User said the answer was too vague or generic.", source: "rules", modelName: "rules" };
  }
  if (keywordMatch(comment, ["not actionable", "what do i do", "next step", "didn't help"])) {
    return { bucket: "not_actionable", confidence: "medium", notes: "User said the answer was not useful for action or interpretation.", source: "rules", modelName: "rules" };
  }
  if (keywordMatch(comment, ["tone", "style", "voice", "sounds weird"])) {
    return { bucket: "tone_style", confidence: "medium", notes: "User flagged tone or style problems.", source: "rules", modelName: "rules" };
  }
  if (keywordMatch(comment, ["slow", "latency", "wait", "took too long"])) {
    return { bucket: "latency", confidence: "high", notes: "User complained about response speed.", source: "rules", modelName: "rules" };
  }
  return { bucket: "other_negative", confidence: "low", notes: "Negative feedback did not map to a more specific bucket.", source: "rules", modelName: "rules" };
}

function buildClassificationPrompt(feedback: FeedbackRecord) {
  const allowedBuckets = feedback.sentiment === "up" ? POSITIVE_BUCKETS : NEGATIVE_BUCKETS;

  return [
    "You classify user feedback about an AI feature into one bucket.",
    "Choose exactly one bucket from the allowed list.",
    "Return strict JSON only with keys: bucket, confidence, notes.",
    'confidence must be one of: "low", "medium", "high".',
    "notes must be one short sentence under 140 characters.",
    "Prefer the most specific bucket supported by the user comment.",
    "Do not mention the model, prompt, or policy.",
    "",
    `Sentiment: ${feedback.sentiment}`,
    `Surface: ${feedback.surface}`,
    `Target type: ${feedback.targettype}`,
    `Target id: ${feedback.targetid}`,
    `Metadata: ${JSON.stringify(feedback.metadata ?? {})}`,
    `Comment: ${feedback.comment ?? "(no comment)"}`,
    "",
    `Allowed buckets: ${allowedBuckets.join(", ")}`,
  ].join("\n");
}

async function classifyWithOpenAI(feedback: FeedbackRecord): Promise<ClassificationResult> {
  if (!openai || !feedback.comment?.trim()) {
    return buildFallbackClassification(feedback);
  }

  const response = await openai.responses.create({
    model: DEFAULT_FEEDBACK_MODEL,
    temperature: 0,
    input: buildClassificationPrompt(feedback),
  });
  const raw = stripCodeFences(response.output_text?.trim() || "");
  const parsed = JSON.parse(raw) as {
    bucket?: string;
    confidence?: string;
    notes?: string;
  };

  return {
    bucket: normalizeBucket(feedback.sentiment, parsed.bucket),
    confidence: normalizeConfidence(parsed.confidence),
    notes: (parsed.notes?.trim() || buildFallbackClassification(feedback).notes).slice(0, 140),
    source: "openai",
    modelName: DEFAULT_FEEDBACK_MODEL,
  };
}

async function loadFeedback(feedbackId: string): Promise<FeedbackRecord | null> {
  return sqlOne<FeedbackRecord>(
    `
    SELECT
      feedback_id AS feedbackId,
      user_id AS userId,
      surface,
      target_type AS targetType,
      target_id AS targetId,
      sentiment,
      comment,
      metadata
    FROM ai.feedback
    WHERE feedback_id = $1
    `,
    [feedbackId],
  );
}

async function persistClassification(feedback: FeedbackRecord, result: ClassificationResult) {
  await sql(
    `
    UPDATE ai.feedback
    SET
      classification_status = 'classified',
      classification_bucket = $2,
      review_priority = CASE
        WHEN sentiment = 'down' AND comment IS NOT NULL AND $2 IN ('data_accuracy', 'hallucination') THEN 'high'
        WHEN sentiment = 'up' THEN 'low'
        ELSE review_priority
      END,
      classification_confidence = CASE
        WHEN $3 = 'high' THEN 0.9
        WHEN $3 = 'medium' THEN 0.6
        ELSE 0.3
      END,
      classification_notes = $4,
      metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
        'classification',
        jsonb_build_object(
          'bucket', $2,
          'confidence', $3,
          'notes', $4,
          'source', $5,
          'modelName', $6,
          'classifiedAt', NOW()
        )
      ),
      updated_at = NOW()
    WHERE feedback_id = $1
    `,
    [feedback.feedbackid, result.bucket, result.confidence, result.notes, result.source, result.modelName],
  );

  await writeAuditLog({
    actorUserId: feedback.userid,
    action: "ai_feedback_classified",
    targetType: "ai.feedback",
    targetId: feedback.feedbackid,
    metadata: {
      surface: feedback.surface,
      targetType: feedback.targettype,
      targetId: feedback.targetid,
      sentiment: feedback.sentiment,
      bucket: result.bucket,
      confidence: result.confidence,
      source: result.source,
      modelName: result.modelName,
    },
  });
}

export async function classifyFeedback(feedbackId: string): Promise<ClassificationResult> {
  const feedback = await loadFeedback(feedbackId);
  if (!feedback) {
    throw new Error("Feedback not found");
  }

  let result: ClassificationResult;

  try {
    result = await classifyWithOpenAI(feedback);
  } catch {
    result = buildFallbackClassification(feedback);
  }

  await persistClassification(feedback, result);
  await recordAiGenerationEvent({
    userId: feedback.userid,
    surfaceKey: "feedback_classifier",
    surfaceDetail: "feedback_comment_classifier",
    targetType: "ai_feedback",
    targetId: feedback.feedbackid,
    provider: result.source === "openai" ? "openai" : "rules",
    modelName: result.modelName,
    promptVersion: "feedback_classifier_v1",
    inputTokens: result.source === "openai" ? Math.ceil((feedback.comment?.length ?? 0) / 4) : 0,
    outputTokens: result.source === "openai" ? Math.ceil(result.notes.length / 4) : 0,
    estimatedCostUsd:
      result.source === "openai"
        ? estimateAiCostUsd({
            provider: "openai",
            modelName: result.modelName,
            inputTokens: Math.ceil((feedback.comment?.length ?? 0) / 4),
            outputTokens: Math.ceil(result.notes.length / 4),
          })
        : 0,
    status: "succeeded",
    metadata: {
      feedbackSurface: feedback.surface,
      sentiment: feedback.sentiment,
      bucket: result.bucket,
      source: result.source,
    },
  });
  return result;
}
