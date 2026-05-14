import OpenAI from "openai";

import { buildAiPromptRegistrySnapshot, getAiPromptDefinition } from "@/lib/ai-prompt-registry";
import type { ChartInsightPayload, StructuredChartInsight } from "@/lib/chart-insight-payload";
import type { CopilotContext } from "@/lib/copilot-context";
import { formatContextWindow, withContextPrompt } from "@/lib/copilot-context";
import { sql, sqlOne, withTransaction } from "@/lib/db";
import { isBaseballRelated } from "@/lib/guardrails";
import { buildSurfaceCacheKey } from "@/lib/server/ai/cache";
import { resolveAiAudienceMode, type AiAudienceMode } from "@/lib/server/ai/context";
import { CHAT_REQUEST_SCHEMA, type AiChatSurface } from "@/lib/server/ai/request-schema";
import { runChartInsightSurface } from "@/lib/server/ai/surfaces/chart-insight";
import { runCopilotSurface } from "@/lib/server/ai/surfaces/copilot";
import { runVisualizerSurface } from "@/lib/server/ai/surfaces/visualizer";
import { resolveTaskFamily, type SurfaceTaskFamily } from "@/lib/server/ai/task-family";
import { buildAiExecutionTelemetry, estimateAiPromptChars } from "@/lib/server/ai/telemetry";
import { compileTerminologyAppendix, deriveSemanticTags, selectTerminologyBundle } from "@/lib/server/ai/terminology";
import type { AIVisualizerPlan } from "@/lib/types";
import { writeAuditLog } from "./audit";
import { assertValidCsrf } from "./csrf";
import { enqueueJob } from "./job-queue";
import {
  recordAiGenerationEventWithQuery,
  recordAiModelTrace,
  recordAiModelTraceWithQuery,
  type AiModelTraceStatus,
} from "./ai-generations";
import {
  AI_ERROR_CODES,
  AiPolicyError,
  buildAiErrorPayload,
  classifyAnswerLeak,
  classifyPromptMisuse,
  estimateCostUsd,
  estimateTokenCount,
  postProcessAnswer,
  shouldQueueAiRequest,
  validateChatMessage,
} from "./ai-policy";
import { assertAiUsageAllowed, type AiPlanCode, type AiUsageFeature } from "./entitlements";
import { getViewerProfile, type ViewerProfile } from "./profiles";
import { ConcurrencyLimitError, consumeRateLimit, getCacheKey, getCachedValue, setCachedValue, withConcurrencyGate } from "./scale";
import { getLatestSuccessfulEtlDataVersion } from "./data-version";

function hasUsableOpenAiKey(rawKey: string | undefined): rawKey is string {
  const key = rawKey?.trim();
  if (!key) return false;
  const normalized = key.toLowerCase();
  return !normalized.startsWith("test-") && !normalized.includes("placeholder");
}

const AI_USAGE_DAY_SQL = "(CURRENT_TIMESTAMP AT TIME ZONE 'America/New_York')::date";
const AI_USAGE_MONTH_SQL = "DATE_TRUNC('month', CURRENT_TIMESTAMP AT TIME ZONE 'America/New_York')::date";

function buildScopeCheckMessage(params: {
  message: string;
  context?: CopilotContext;
  chartContext?: { chartType: string; chartTitle: string; baseballQuestion: string } | null;
}) {
  const contextualMessage = withContextPrompt(params.message, params.context);
  if (!params.chartContext) return contextualMessage;
  return [
    contextualMessage,
    `[Chart Type: ${params.chartContext.chartType}]`,
    `[Chart Title: ${params.chartContext.chartTitle}]`,
    `[Baseball Question: ${params.chartContext.baseballQuestion}]`,
  ].join(" ");
}

function getSurfaceDetail(surface: AiChatSurface, chartContext?: ChartInsightPayload) {
  if (surface === "visualizer") {
    return "ai_bs_visualizer";
  }

  if (surface === "chart_insight") {
    return chartContext?.chartType ?? "chart_insight";
  }

  return "contextual_copilot";
}

const openai = hasUsableOpenAiKey(process.env.OPENAI_API_KEY)
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;
const AI_CACHE_TTL_MS = 5 * 60 * 1000;
const AI_MAX_REQUESTS_PER_MINUTE = 8;
const AI_GLOBAL_REQUESTS_PER_MINUTE = 50;
const AI_MAX_CONCURRENT_REQUESTS = 4;

export type ChatResponse = {
  conversationId: string;
  assistantMessageId?: string | null;
  generationId?: string | null;
  modelName?: string;
  answer: string;
  structuredInsight?: StructuredChartInsight | null;
  structuredPlan?: AIVisualizerPlan | null;
  toolResults: Array<{ toolName: string; payload: unknown }>;
  citations: string[];
  safetyDisposition: "allowed" | "blocked";
  confidence: "low" | "medium" | "high";
  status?: "complete" | "queued";
  jobRunId?: string;
  pollAfterSeconds?: number;
  code?: string;
};

async function createConversation(
  userId: string | null,
  context?: CopilotContext,
): Promise<string> {
  const row = await sqlOne<{ conversationid: string }>(
    `
    INSERT INTO ai.conversations (user_id, route_scope, route_entity_id, title)
    VALUES ($1, $2, $3, $4)
    RETURNING conversation_id AS conversationId
    `,
    [userId, context?.scope ?? "global", context?.entityId ?? null, formatContextWindow(context)],
  );

  if (!row) {
    throw new Error("Failed to create conversation");
  }

  return row.conversationid;
}

async function assertConversationOwnership(conversationId: string, userId: string) {
  const row = await sqlOne<{ conversationid: string }>(
    `
    SELECT conversation_id AS conversationId
    FROM ai.conversations
    WHERE conversation_id = $1
      AND user_id = $2
    `,
    [conversationId, userId],
  );

  if (!row) {
    throw new AiPolicyError("Conversation not found", AI_ERROR_CODES.AUTH_REQUIRED, 404);
  }
}

async function assertPublicConversationAccess(conversationId: string) {
  const row = await sqlOne<{ conversationid: string }>(
    `
    SELECT conversation_id AS conversationId
    FROM ai.conversations
    WHERE conversation_id = $1
      AND user_id IS NULL
    `,
    [conversationId],
  );

  if (!row) {
    throw new AiPolicyError("Conversation not found", AI_ERROR_CODES.AUTH_REQUIRED, 404);
  }
}

async function storeMessage(params: {
  conversationId: string;
  userId?: string | null;
  role: "user" | "assistant" | "system";
  content: string;
  metadata?: unknown;
}) {
  return sqlOne<{ messageid: string }>(
    `
    INSERT INTO ai.messages (conversation_id, user_id, role, content, metadata)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING message_id AS messageId
    `,
    [
      params.conversationId,
      params.userId ?? null,
      params.role,
      params.content,
      params.metadata === undefined ? null : JSON.stringify(params.metadata),
    ],
  );
}

async function getConversationTranscript(conversationId: string, limit = 8) {
  const rows = await sql<{
    role: "user" | "assistant" | "system";
    content: string;
    createdat: string;
  }>(
    `
    SELECT role, content, created_at AS createdAt
    FROM ai.messages
    WHERE conversation_id = $1
    ORDER BY created_at DESC
    LIMIT $2
    `,
    [conversationId, limit],
  );

  return rows.reverse();
}

function formatConversationTranscript(
  transcript: Array<{ role: "user" | "assistant" | "system"; content: string }>,
) {
  return transcript
    .map((message) => `${message.role.toUpperCase()}: ${message.content}`)
    .join("\n");
}

async function recordSafetyEvent(params: {
  conversationId: string;
  messageId: string | null;
  disposition: "allowed" | "blocked" | "review";
  reason: string;
  details?: unknown;
}) {
  await sqlOne(
    `
    INSERT INTO ai.safety_events (conversation_id, message_id, disposition, reason, details)
    VALUES ($1, $2, $3, $4, $5)
    `,
    [
      params.conversationId,
      params.messageId,
      params.disposition,
      params.reason,
      params.details === undefined ? null : JSON.stringify(params.details),
    ],
  );
}

async function applyAiStrike(
  userId: string,
  reason: string,
  conversationId: string,
  messageId: string | null,
  details?: Record<string, unknown>,
) {
  const row = await sqlOne<{ aistrikecount: number }>(
    `
    UPDATE product.user_profiles
    SET
      ai_strike_count = ai_strike_count + 1,
      last_ai_misuse_at = NOW(),
      ai_suspended_until = CASE
        WHEN ai_strike_count = 0 THEN NOW() + INTERVAL '1 hour'
        WHEN ai_strike_count = 1 THEN NOW() + INTERVAL '24 hours'
        ELSE ai_suspended_until
      END,
      ai_banned_at = CASE
        WHEN ai_strike_count >= 2 THEN NOW()
        ELSE ai_banned_at
      END
    WHERE user_id = $1
    RETURNING ai_strike_count AS aiStrikeCount
    `,
    [userId],
  );

  await recordSafetyEvent({
    conversationId,
    messageId,
    disposition: "blocked",
    reason,
    details: { ...details, strikeCount: row ? Number(row.aistrikecount) : null },
  });

  await writeAuditLog({
    actorUserId: userId,
    action: "ai_strike_applied",
    targetType: "product.user",
    targetId: userId,
    metadata: { conversationId, reason, strikeCount: row ? Number(row.aistrikecount) : null },
  });
}

async function recordAiRateLimitEvent(subjectKey: string, subjectType: "user" | "global", requestCount: number) {
  await sqlOne(
    `
    INSERT INTO ops.rate_limit_events (subject_key, subject_type, endpoint, window_seconds, request_count)
    VALUES ($1, $2, 'ai.chat', 60, $3)
    `,
    [subjectKey, subjectType, requestCount],
  );
}

async function recordBlockedAiEvalTrace(params: {
  userId?: string | null;
  conversationId: string;
  userMessageId: string | null;
  surface: AiChatSurface;
  taskFamily: SurfaceTaskFamily;
  message: string;
  context?: CopilotContext;
  chartContext?: ChartInsightPayload;
  scopedMessage?: string | null;
  reason: string;
  policySnapshot: unknown;
}) {
  const promptVersion = getAiPromptDefinition(params.surface).version;
  await recordAiModelTrace({
    userId: params.userId ?? null,
    conversationId: params.conversationId,
    userMessageId: params.userMessageId,
    surfaceKey: params.surface,
    surfaceDetail: getSurfaceDetail(params.surface, params.chartContext),
    routeScope: params.context?.scope ?? "global",
    routeEntityId: params.context?.entityId ?? null,
    provider: "policy",
    modelName: "prefilter",
    promptVersion,
    status: "blocked",
    requestEnvelope: {
      message: params.message,
      scopedMessage: params.scopedMessage ?? null,
      context: params.context ?? null,
      chartContext: params.chartContext ?? null,
    },
    responseEnvelope: null,
    policySnapshot: params.policySnapshot,
    evalTags: [params.surface, params.taskFamily, "input_safety_block"],
    inputTokens: estimateTokenCount(params.message),
    outputTokens: 0,
    blockedReason: params.reason,
  });
}

async function assertAssistantAnswerIsSafe(params: {
  conversationId: string;
  userMessageId: string | null;
  userId?: string | null;
  surface: AiChatSurface;
  surfaceDetail: string;
  routeScope?: string | null;
  routeEntityId?: string | null;
  provider: string;
  modelName: string;
  promptVersion: string;
  answer: string;
  requestEnvelope?: unknown;
  responseEnvelope?: unknown;
  policySnapshot?: unknown;
  inputTokens?: number;
  outputTokens?: number;
  latencyMs?: number | null;
}) {
  const leak = classifyAnswerLeak(params.answer);
  if (!leak.blocked) return;

  await recordSafetyEvent({
    conversationId: params.conversationId,
    messageId: params.userMessageId,
    disposition: "blocked",
    reason: leak.reason ?? "AI response blocked by output safety filter.",
    details: {
      surface: params.surface,
      category: "response_leak",
      matchedSignals: leak.matchedSignals,
    },
  });

  await recordAiModelTrace({
    userId: params.userId ?? null,
    conversationId: params.conversationId,
    userMessageId: params.userMessageId,
    surfaceKey: params.surface,
    surfaceDetail: params.surfaceDetail,
    routeScope: params.routeScope ?? null,
    routeEntityId: params.routeEntityId ?? null,
    provider: params.provider,
    modelName: params.modelName,
    promptVersion: params.promptVersion,
    status: "blocked",
    requestEnvelope: params.requestEnvelope ?? null,
    responseEnvelope: {
      ...(params.responseEnvelope && typeof params.responseEnvelope === "object" ? params.responseEnvelope : {}),
      blockedOutputPreview: params.answer.slice(0, 2000),
    },
    policySnapshot: {
      ...(params.policySnapshot && typeof params.policySnapshot === "object" ? params.policySnapshot : {}),
      outputSafety: leak,
    },
    evalTags: [params.surface, "output_safety_block"],
    inputTokens: params.inputTokens ?? 0,
    outputTokens: params.outputTokens ?? 0,
    latencyMs: params.latencyMs ?? null,
    blockedReason: leak.reason ?? "AI response blocked by output safety filter.",
  });

  throw new AiPolicyError(
    leak.reason ?? "AI response blocked by output safety filter.",
    AI_ERROR_CODES.RESPONSE_BLOCKED,
    400,
  );
}

function getAnonymousRateLimitSubject(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = request.headers.get("x-real-ip")?.trim();
  const cloudflareIp = request.headers.get("cf-connecting-ip")?.trim();
  return forwarded || realIp || cloudflareIp || "anonymous";
}

async function getAiViewerState(
  userId: string,
): Promise<Pick<ViewerProfile, "userId" | "isVerified" | "aiBannedAt" | "aiSuspendedUntil" | "roles"> | null> {
  const row = await sqlOne<{
    userid: string;
    isverified: boolean;
    aibannedat: string | null;
    aisuspendeduntil: string | null;
    roles: string[] | null;
  }>(
    `
    SELECT
      u.user_id AS userId,
      u.is_verified AS isVerified,
      p.ai_banned_at AS aiBannedAt,
      p.ai_suspended_until AS aiSuspendedUntil,
      ARRAY_REMOVE(ARRAY_AGG(DISTINCT r.role), NULL) AS roles
    FROM product.users u
    LEFT JOIN product.user_profiles p ON p.user_id = u.user_id
    LEFT JOIN product.user_roles r ON r.user_id = u.user_id
    WHERE u.user_id = $1
    GROUP BY
      u.user_id,
      u.is_verified,
      p.ai_banned_at,
      p.ai_suspended_until
    `,
    [userId],
  );

  if (!row) return null;

  return {
    userId: row.userid,
    isVerified: row.isverified,
    aiBannedAt: row.aibannedat,
    aiSuspendedUntil: row.aisuspendeduntil,
    roles: row.roles ?? [],
  };
}

function assertViewerCanUseAi(
  viewer: Pick<ViewerProfile, "userId" | "isVerified" | "aiBannedAt" | "aiSuspendedUntil" | "roles"> | null,
): asserts viewer is Pick<ViewerProfile, "userId" | "isVerified" | "aiBannedAt" | "aiSuspendedUntil" | "roles"> {
  if (!viewer) {
    throw new AiPolicyError("Authentication required", AI_ERROR_CODES.AUTH_REQUIRED, 401);
  }
  if (!viewer.isVerified) {
    throw new AiPolicyError("Verified identity required", AI_ERROR_CODES.VERIFIED_REQUIRED, 403);
  }
  if (viewer.aiBannedAt) {
    throw new AiPolicyError("AI access banned", AI_ERROR_CODES.BANNED, 403);
  }
  if (viewer.aiSuspendedUntil && Date.parse(viewer.aiSuspendedUntil) > Date.now()) {
    throw new AiPolicyError("AI access temporarily suspended", AI_ERROR_CODES.SUSPENDED, 403);
  }
}

async function persistUserTurn(params: {
  conversationId?: string;
  userId?: string | null;
  message: string;
  context?: CopilotContext;
  chartContext?: ChartInsightPayload;
}) {
  if (params.conversationId) {
    if (params.userId) {
      await assertConversationOwnership(params.conversationId, params.userId);
    } else {
      await assertPublicConversationAccess(params.conversationId);
    }
  }

  const conversationId = params.conversationId ?? (await createConversation(params.userId ?? null, params.context));
  const userMessage = await storeMessage({
    conversationId,
    userId: params.userId ?? null,
    role: "user",
    content: params.message,
    metadata: {
      context: params.context,
      chartContext: params.chartContext ?? null,
      tokenEstimate: estimateTokenCount(params.message),
    },
  });

  return {
    conversationId,
    userMessageId: userMessage?.messageid ?? null,
  };
}

async function completeChatTurn(params: {
  conversationId: string;
  userId?: string | null;
  userMessageId: string | null;
  message: string;
  audienceMode: AiAudienceMode;
  taskFamily: SurfaceTaskFamily;
  context?: CopilotContext;
  planCode?: AiPlanCode;
  featureKey?: AiUsageFeature;
  surface: AiChatSurface;
  chartContext?: ChartInsightPayload;
}): Promise<ChatResponse> {
  const startedAt = Date.now();
  let modelName = process.env.OPENAI_SUMMARY_MODEL || "gpt-4.1-mini";
  const transcriptRows = await getConversationTranscript(params.conversationId);
  const transcript = formatConversationTranscript(transcriptRows);
  const hasPriorAssistantTurn = transcriptRows.some((message) => message.role === "assistant");
  const dataVersion = await getLatestSuccessfulEtlDataVersion();
  const promptDefinition = getAiPromptDefinition(params.surface);
  const promptRegistry = buildAiPromptRegistrySnapshot(params.surface);
  const promptVersion = promptDefinition.version;
  const surfaceDetail = getSurfaceDetail(params.surface, params.chartContext);
  const semanticTags = deriveSemanticTags({
    message: params.message,
    taskFamily: params.taskFamily,
    chartContext: params.chartContext,
  });
  const terminologySelection = selectTerminologyBundle({
    surfaceKey: params.surface,
    audienceMode: params.audienceMode,
    taskFamily: params.taskFamily,
    semanticTags,
  });
  const compiledTerminology = compileTerminologyAppendix(terminologySelection);
  const contextWindow = formatContextWindow(params.context);
  const executionTelemetry = buildAiExecutionTelemetry({
    surface: params.surface,
    taskFamily: params.taskFamily,
    promptVersion,
    terminology: {
      stylePackSlug: compiledTerminology.stylePackSlug,
      selectedCardSlugs: compiledTerminology.selectedCardSlugs,
      appendixChars: compiledTerminology.appendixChars,
    },
    estimatedPromptChars: estimateAiPromptChars({
      surface: params.surface,
      message: params.message,
      transcript,
      terminologyAppendix: compiledTerminology.appendix,
      contextWindow,
      chartContext: params.chartContext,
    }),
  });
  const canUseSharedCache = !(params.surface === "chart_insight" && hasPriorAssistantTurn);
  const responseCacheKey = canUseSharedCache
    ? buildSurfaceCacheKey({
        surface: params.surface,
        promptVersion,
        modelName,
        dataVersion,
        scope: params.context?.scope ?? "global",
        entityId: params.context?.entityId ?? null,
        range: params.context?.range ?? null,
        taskFamily: params.taskFamily,
        chartKey: params.chartContext?.chartKey ?? null,
        promptFingerprint: [
          params.chartContext ? JSON.stringify(params.chartContext.payload).slice(0, 1200) : "none",
          compiledTerminology.stylePackSlug ?? "none",
          compiledTerminology.selectedCardSlugs.join(",") || "none",
        ].join("|"),
        message: params.message,
      })
    : null;
  const cached = getCachedValue<{
    answer: string;
    structuredInsight?: StructuredChartInsight | null;
    structuredPlan?: AIVisualizerPlan | null;
    toolResults: Array<{ toolName: string; payload: unknown }>;
    citations: string[];
    confidence: "low" | "medium" | "high";
    modelName: string;
  }>(responseCacheKey ?? "__disabled__");

  let toolResults: Array<{ toolName: string; payload: unknown }> = [];
  let answer = "";
  let confidence: "low" | "medium" | "high" = "medium";
  let usage:
    | {
        inputTokens?: number;
        outputTokens?: number;
      }
    | undefined;
  let citations: string[] = [];
  let structuredInsight: StructuredChartInsight | null = null;
  let structuredPlan: AIVisualizerPlan | null = null;
  let answerSafetyChecked = false;
  let modelTrace: {
    provider: string;
    modelName: string;
    requestEnvelope?: unknown;
    responseEnvelope?: unknown;
  } | null = null;

  if (cached) {
    toolResults = cached.toolResults;
    answer = cached.answer;
    structuredInsight = cached.structuredInsight ?? null;
    structuredPlan = cached.structuredPlan ?? null;
    citations = cached.citations;
    confidence = cached.confidence;
    modelName = cached.modelName || "cache";
    modelTrace = {
      provider: "internal",
      modelName: "cache",
      requestEnvelope: {
        cacheKey: responseCacheKey,
        cacheHit: true,
        message: params.message,
        context: params.context ?? null,
        chartContext: params.chartContext ?? null,
      },
      responseEnvelope: {
        finalAnswer: answer,
        structuredInsight,
        structuredPlan,
        citations,
      },
    };
    usage = {
      inputTokens: estimateTokenCount(params.message),
      outputTokens: estimateTokenCount(answer),
    };
  } else {
    try {
      const uncached = await withConcurrencyGate("ai-chat", AI_MAX_CONCURRENT_REQUESTS, async () => {
        const runnerParams = {
          openaiClient: openai,
          modelName,
          surface: params.surface,
          audienceMode: params.audienceMode,
          taskFamily: params.taskFamily,
          message: params.message,
          transcript,
          terminologyAppendix: compiledTerminology.appendix,
          context: params.context,
          chartContext: params.chartContext,
        } as const;

        if (params.surface === "chart_insight") {
          return runChartInsightSurface(runnerParams);
        }
        if (params.surface === "visualizer") {
          return runVisualizerSurface(runnerParams);
        }
        return runCopilotSurface(runnerParams);
      });

      toolResults = uncached.toolResults ?? [];
      answer = uncached.answer;
      structuredInsight = uncached.structuredInsight ?? null;
      structuredPlan = uncached.structuredPlan ?? null;
      confidence = uncached.confidence;
      usage = uncached.usage;
      modelTrace = uncached.trace ?? null;
    } catch (error) {
      if (error instanceof ConcurrencyLimitError) {
        throw new AiPolicyError("AI temporarily overloaded", AI_ERROR_CODES.OVERLOADED, 429);
      }
      throw error;
    }

    citations = toolResults.map((tool) => tool.toolName);
    const traceInputTokens = usage?.inputTokens ?? estimateTokenCount(params.message);
    const traceOutputTokens = usage?.outputTokens ?? estimateTokenCount(answer);
    await assertAssistantAnswerIsSafe({
      conversationId: params.conversationId,
      userMessageId: params.userMessageId,
      userId: params.userId ?? null,
      surface: params.surface,
      surfaceDetail,
      routeScope: params.context?.scope ?? "global",
      routeEntityId: params.context?.entityId ?? null,
      provider: modelTrace?.provider ?? (openai ? "openai" : "template"),
      modelName: modelTrace?.modelName ?? modelName,
      promptVersion,
      answer,
      requestEnvelope: modelTrace?.requestEnvelope ?? null,
      responseEnvelope: {
        ...(modelTrace?.responseEnvelope && typeof modelTrace.responseEnvelope === "object" ? modelTrace.responseEnvelope : {}),
        finalAnswer: answer,
        structuredInsight,
        structuredPlan,
        citations,
      },
      policySnapshot: {
        promptRegistry,
        aiExecution: executionTelemetry,
        semanticTags,
      },
      inputTokens: traceInputTokens,
      outputTokens: traceOutputTokens,
      latencyMs: Date.now() - startedAt,
    });
    answerSafetyChecked = true;
    answer = postProcessAnswer(answer, citations);
    if (responseCacheKey) {
      setCachedValue(
        responseCacheKey,
        {
          answer,
          structuredInsight,
          structuredPlan,
          toolResults,
          citations,
          confidence,
          modelName,
        },
        AI_CACHE_TTL_MS,
      );
    }
  }

  citations = citations.length > 0 ? citations : toolResults.map((tool) => tool.toolName);
  if (!answerSafetyChecked) {
    const traceInputTokens = usage?.inputTokens ?? estimateTokenCount(params.message);
    const traceOutputTokens = usage?.outputTokens ?? estimateTokenCount(answer);
    await assertAssistantAnswerIsSafe({
      conversationId: params.conversationId,
      userMessageId: params.userMessageId,
      userId: params.userId ?? null,
      surface: params.surface,
      surfaceDetail,
      routeScope: params.context?.scope ?? "global",
      routeEntityId: params.context?.entityId ?? null,
      provider: modelTrace?.provider ?? (cached ? "internal" : openai ? "openai" : "template"),
      modelName: modelTrace?.modelName ?? (cached ? "cache" : modelName),
      promptVersion,
      answer,
      requestEnvelope: modelTrace?.requestEnvelope ?? null,
      responseEnvelope: {
        ...(modelTrace?.responseEnvelope && typeof modelTrace.responseEnvelope === "object" ? modelTrace.responseEnvelope : {}),
        finalAnswer: answer,
        structuredInsight,
        structuredPlan,
        citations,
      },
      policySnapshot: {
        promptRegistry,
        aiExecution: executionTelemetry,
        semanticTags,
      },
      inputTokens: traceInputTokens,
      outputTokens: traceOutputTokens,
      latencyMs: Date.now() - startedAt,
    });
  }
  answer = postProcessAnswer(answer, citations);
  const latencyMs = Date.now() - startedAt;
  const inputTokens = usage?.inputTokens ?? estimateTokenCount(params.message);
  const outputTokens = usage?.outputTokens ?? estimateTokenCount(answer);
  const estimatedCostUsd = estimateCostUsd(modelName, inputTokens, outputTokens);
  const traceProvider = modelTrace?.provider ?? (cached ? "internal" : openai ? "openai" : "template");
  const traceModelName = modelTrace?.modelName ?? (cached ? "cache" : modelName);
  const traceStatus: AiModelTraceStatus = cached ? "cached" : traceProvider === "template" ? "fallback" : "succeeded";
  const responseEnvelope = {
    ...(modelTrace?.responseEnvelope && typeof modelTrace.responseEnvelope === "object" ? modelTrace.responseEnvelope : {}),
    finalAnswer: answer,
    structuredInsight,
    structuredPlan,
    citations,
  };
  const policySnapshot = {
    inputSafety: {
      blocked: false,
      scope: "baseball",
    },
    outputSafety: {
      blocked: false,
    },
    promptRegistry,
    aiExecution: executionTelemetry,
    semanticTags,
  };

  let assistantMessageId: string | null = null;
  let generationId: string | null = null;

  await withTransaction(async (query) => {
    const assistantMessage = await query<{ message_id: string }>(
      `
      INSERT INTO ai.messages (conversation_id, user_id, role, content, metadata)
      VALUES ($1, $2, 'assistant', $3, $4)
      RETURNING message_id
      `,
      [
        params.conversationId,
        params.userId ?? null,
        answer,
        JSON.stringify({
          surface: params.surface,
          audienceMode: params.audienceMode,
          taskFamily: params.taskFamily,
          promptRegistry,
          aiExecution: executionTelemetry,
          semanticTags,
          terminology: compiledTerminology,
          context: params.context,
          citations: toolResults.map((tool) => tool.toolName),
          chartContext: params.chartContext ?? null,
          structuredInsight,
          structuredPlan,
        }),
      ],
    );

    assistantMessageId = assistantMessage[0]?.message_id ?? null;

    for (const tool of toolResults) {
      await query(
        `
        INSERT INTO ai.tool_calls (conversation_id, message_id, tool_name, result_json)
        VALUES ($1, $2, $3, $4)
        `,
        [params.conversationId, assistantMessageId, tool.toolName, JSON.stringify(tool.payload ?? null)],
      );
    }

    await query(
      `
      INSERT INTO ai.safety_events (conversation_id, message_id, disposition, reason, details)
      VALUES ($1, $2, 'allowed', 'Baseball-scoped request accepted.', $3)
      `,
      [
        params.conversationId,
        assistantMessageId,
        JSON.stringify({
          context: params.context,
          surface: params.surface,
          audienceMode: params.audienceMode,
          taskFamily: params.taskFamily,
          promptRegistry,
          aiExecution: executionTelemetry,
          semanticTags,
          terminology: compiledTerminology,
        }),
      ],
    );

    await query(
      `
      INSERT INTO ai.cost_events (
        conversation_id,
        message_id,
        model_name,
        input_tokens,
        output_tokens,
        estimated_cost_usd,
        latency_ms
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      `,
      [params.conversationId, assistantMessageId, modelName, inputTokens, outputTokens, estimatedCostUsd, latencyMs],
    );

    if (params.userId && params.planCode && params.featureKey) {
      await query(
        `
        INSERT INTO ai.usage_ledger (
          user_id,
          conversation_id,
          message_id,
          plan_code,
          feature_key,
          model_name,
          request_count,
          input_tokens,
          output_tokens,
          total_tokens,
          estimated_cost_usd,
          usage_day,
          usage_month,
          metadata
        )
        VALUES ($1, $2, $3, $4, $5, $6, 1, $7, $8, $9, $10, ${AI_USAGE_DAY_SQL}, ${AI_USAGE_MONTH_SQL}, $11)
        `,
        [
          params.userId,
          params.conversationId,
          assistantMessageId,
          params.planCode,
          params.featureKey,
          modelName,
          inputTokens,
          outputTokens,
          inputTokens + outputTokens,
          estimatedCostUsd,
          JSON.stringify({
            context: params.context,
            citations,
            chartContext: params.chartContext ?? null,
            surface: params.surface,
            audienceMode: params.audienceMode,
            taskFamily: params.taskFamily,
            promptRegistry,
            aiExecution: executionTelemetry,
            semanticTags,
            terminology: compiledTerminology,
          }),
        ],
      );
    }

    generationId = assistantMessageId
      ? await recordAiGenerationEventWithQuery(query, {
          userId: params.userId ?? null,
          surfaceKey: params.surface,
          surfaceDetail,
          targetType: "ai_message",
          targetId: assistantMessageId,
          routeScope: params.context?.scope ?? "global",
          routeEntityId: params.context?.entityId ?? null,
          conversationId: params.conversationId,
          messageId: assistantMessageId,
          provider: traceProvider,
          modelName: traceModelName,
          promptVersion,
          inputTokens,
          outputTokens,
          estimatedCostUsd,
          latencyMs,
          status: traceStatus,
          cacheHit: Boolean(cached),
          metadata: {
            featureKey: params.featureKey ?? null,
            citations,
            audienceMode: params.audienceMode,
            taskFamily: params.taskFamily,
            semanticTags,
            context: params.context ?? null,
            chartContext: params.chartContext ?? null,
            promptRegistry,
            terminology: compiledTerminology,
            structuredPlan,
            aiExecution: executionTelemetry,
          },
        })
      : null;

    if (assistantMessageId) {
      await recordAiModelTraceWithQuery(query, {
        generationId,
        userId: params.userId ?? null,
        conversationId: params.conversationId,
        userMessageId: params.userMessageId,
        assistantMessageId,
        surfaceKey: params.surface,
        surfaceDetail,
        routeScope: params.context?.scope ?? "global",
        routeEntityId: params.context?.entityId ?? null,
        provider: traceProvider,
        modelName: traceModelName,
        promptVersion,
        status: traceStatus,
        requestEnvelope: modelTrace?.requestEnvelope ?? null,
        responseEnvelope,
        policySnapshot,
        evalTags: [params.surface, params.taskFamily, params.audienceMode],
        inputTokens,
        outputTokens,
        latencyMs,
      });
    }
  });

  return {
    conversationId: params.conversationId,
    assistantMessageId,
    generationId,
    modelName: cached ? "cache" : modelName,
    answer,
    structuredInsight,
    structuredPlan,
    toolResults,
    citations,
    safetyDisposition: "allowed",
    confidence,
    status: "complete",
  };
}

export async function executeQueuedChatJob(payload: {
  userId: string;
  conversationId: string;
  userMessageId: string | null;
  message: string;
  audienceMode?: AiAudienceMode;
  taskFamily?: SurfaceTaskFamily;
  surface?: AiChatSurface;
  context?: CopilotContext;
  chartContext?: ChartInsightPayload;
}) {
  const viewer = await getAiViewerState(payload.userId);
  assertViewerCanUseAi(viewer);
  const surface = payload.surface ?? "copilot";
  const audienceMode = payload.audienceMode ?? resolveAiAudienceMode(viewer);
  const taskFamily =
    payload.audienceMode && payload.taskFamily
      ? payload.taskFamily
      : resolveTaskFamily({
          surface,
          message: payload.message,
          audienceMode,
          context: payload.context,
          chartContext: payload.chartContext,
        });
  const modelName = process.env.OPENAI_SUMMARY_MODEL || "gpt-4.1-mini";
  const featureKey: AiUsageFeature = surface === "visualizer" ? "ai_chart_generation" : "ai_chat_heavy";
  const usagePolicy = await assertAiUsageAllowed({
    userId: payload.userId,
    featureKey,
    estimatedInputTokens: estimateTokenCount(payload.message),
    modelName,
  });
  return completeChatTurn({
    ...payload,
    surface,
    audienceMode,
    taskFamily,
    planCode: usagePolicy.entitlement.planCode,
    featureKey,
  });
}

export async function runChat(request: Request): Promise<ChatResponse> {
  const body = CHAT_REQUEST_SCHEMA.parse(await request.json());
  const isPublicChartInsight = body.surface === "chart_insight";
  const isChartInsightFollowUp = isPublicChartInsight && Boolean(body.conversationId);
  if (isPublicChartInsight && !body.chartContext) {
    throw new AiPolicyError("Chart context required", AI_ERROR_CODES.OUT_OF_SCOPE, 400);
  }
  const viewer = await getViewerProfile(request);
  assertValidCsrf(request);
  if (!isPublicChartInsight || isChartInsightFollowUp) {
    assertViewerCanUseAi(viewer);
  }
  if (process.env.AI_GLOBAL_KILL_SWITCH === "true") {
    throw new AiPolicyError("AI access disabled by incident control", AI_ERROR_CODES.OVERLOADED, 503);
  }

  validateChatMessage(body.message);
  const context = body.context;
  const audienceMode = resolveAiAudienceMode(viewer);
  const taskFamily = resolveTaskFamily({
    surface: body.surface,
    message: body.message,
    audienceMode,
    context,
    chartContext: body.chartContext,
  });
  const rateLimitSubject = viewer?.userId ?? `anon:${getAnonymousRateLimitSubject(request)}`;

  const [userLimit, globalLimit] = await Promise.all([
    consumeRateLimit({
      bucket: "ai:user",
      subject: rateLimitSubject,
      limit: AI_MAX_REQUESTS_PER_MINUTE,
      windowMs: 60_000,
    }),
    consumeRateLimit({
      bucket: "ai:global",
      subject: "global",
      limit: AI_GLOBAL_REQUESTS_PER_MINUTE,
      windowMs: 60_000,
    }),
  ]);

  if (!userLimit.allowed) {
    await recordAiRateLimitEvent(rateLimitSubject, "user", userLimit.currentCount);
    throw new AiPolicyError("AI rate limit exceeded", AI_ERROR_CODES.OVERLOADED, 429);
  }
  if (!globalLimit.allowed) {
    await recordAiRateLimitEvent("global", "global", globalLimit.currentCount);
    throw new AiPolicyError("AI temporarily overloaded", AI_ERROR_CODES.OVERLOADED, 429);
  }

  const persistedTurn = await persistUserTurn({
    conversationId: body.conversationId,
    userId: viewer?.userId ?? null,
    message: body.message,
    context,
    chartContext: body.chartContext,
  });

  const misuse = classifyPromptMisuse(body.message);
  if (misuse.blocked) {
    const policySnapshot = {
      inputSafety: misuse,
      scopeSafety: null,
    };
    if (viewer?.userId) {
      await applyAiStrike(
        viewer.userId,
        misuse.reason ?? "AI misuse detected",
        persistedTurn.conversationId,
        persistedTurn.userMessageId,
        {
          surface: body.surface,
          category: misuse.category,
          matchedSignals: misuse.matchedSignals,
        },
      );
    } else {
      await recordSafetyEvent({
        conversationId: persistedTurn.conversationId,
        messageId: persistedTurn.userMessageId,
        disposition: "blocked",
        reason: misuse.reason ?? "AI misuse detected",
        details: {
          message: body.message,
          surface: body.surface,
          category: misuse.category,
          matchedSignals: misuse.matchedSignals,
        },
      });
    }
    await recordBlockedAiEvalTrace({
      userId: viewer?.userId ?? null,
      conversationId: persistedTurn.conversationId,
      userMessageId: persistedTurn.userMessageId,
      surface: body.surface,
      taskFamily,
      message: body.message,
      context,
      chartContext: body.chartContext,
      reason: misuse.reason ?? "AI misuse detected",
      policySnapshot,
    });
    throw new AiPolicyError(misuse.reason ?? "AI misuse detected", AI_ERROR_CODES.MISUSE, 403);
  }

  const scopedMessage = buildScopeCheckMessage({
    message: body.message,
    context,
    chartContext: body.chartContext
      ? {
          chartType: body.chartContext.chartType,
          chartTitle: body.chartContext.chartTitle,
          baseballQuestion: body.chartContext.baseballQuestion,
        }
      : null,
  });

  if (!isBaseballRelated(scopedMessage)) {
    const reason = "Question rejected by baseball scope classifier.";
    await recordSafetyEvent({
      conversationId: persistedTurn.conversationId,
      messageId: persistedTurn.userMessageId,
      disposition: "blocked",
      reason,
      details: { message: body.message, scopedMessage },
    });
    await recordBlockedAiEvalTrace({
      userId: viewer?.userId ?? null,
      conversationId: persistedTurn.conversationId,
      userMessageId: persistedTurn.userMessageId,
      surface: body.surface,
      taskFamily,
      message: body.message,
      context,
      chartContext: body.chartContext,
      scopedMessage,
      reason,
      policySnapshot: {
        inputSafety: {
          blocked: false,
          category: "allowed",
        },
        scopeSafety: {
          blocked: true,
          reason,
        },
      },
    });
    throw new AiPolicyError(reason, AI_ERROR_CODES.OUT_OF_SCOPE, 400);
  }

  const shouldQueue = isPublicChartInsight ? false : shouldQueueAiRequest({ message: body.message, context, delivery: body.delivery });
  const featureKey: AiUsageFeature | undefined = isPublicChartInsight
    ? isChartInsightFollowUp
      ? "ai_chart_followup"
      : undefined
    : body.surface === "visualizer"
      ? "ai_chart_generation"
    : shouldQueue
      ? "ai_chat_heavy"
      : "ai_chat_basic";
  const modelName = process.env.OPENAI_SUMMARY_MODEL || "gpt-4.1-mini";
  const usagePolicy =
    viewer && featureKey
      ? await assertAiUsageAllowed({
          userId: viewer.userId,
          featureKey,
          estimatedInputTokens: estimateTokenCount(body.message),
          modelName,
        })
      : null;

  if (shouldQueue) {
    if (!viewer) {
      throw new AiPolicyError("Authentication required", AI_ERROR_CODES.AUTH_REQUIRED, 401);
    }
    const queuedJob = await enqueueJob({
      jobType: "ai_heavy_chat",
      ownerUserId: viewer.userId,
      payload: {
        userId: viewer.userId,
        conversationId: persistedTurn.conversationId,
        userMessageId: persistedTurn.userMessageId,
        message: body.message,
        audienceMode,
        taskFamily,
        surface: body.surface,
        context,
        chartContext: body.chartContext,
      },
      idempotencyKey: getCacheKey([
        "ai-heavy",
        viewer.userId,
        persistedTurn.conversationId,
        body.message.trim().toLowerCase(),
        context?.scope ?? "global",
        context?.entityId ?? "none",
        context?.range ?? "default",
      ]),
      metadata: {
        enqueuedFrom: "api.ai.chat",
      },
    });

    return {
      conversationId: persistedTurn.conversationId,
      answer: "Your scouting report is queued. Check back in a few moments.",
      toolResults: [],
      citations: [],
      safetyDisposition: "allowed",
      confidence: "low",
      status: "queued",
      jobRunId: queuedJob.jobRunId,
      pollAfterSeconds: 2,
    };
  }

  return completeChatTurn({
    conversationId: persistedTurn.conversationId,
    userId: viewer?.userId ?? null,
    userMessageId: persistedTurn.userMessageId,
    message: body.message,
    audienceMode,
    taskFamily,
    context,
    chartContext: body.chartContext,
    planCode: usagePolicy?.entitlement.planCode,
    featureKey,
    surface: body.surface,
  });
}

export { AiPolicyError, buildAiErrorPayload };
