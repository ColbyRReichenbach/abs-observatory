import type { CopilotContext } from "@/lib/copilot-context";
import { COPILOT_RANGES } from "@/lib/copilot-context";
import { estimateAiCostUsd } from "./ai-pricing";

export const AI_MAX_MESSAGE_CHARS = 1200;
export const AI_MAX_ESTIMATED_INPUT_TOKENS = 600;
export const AI_MAX_RESPONSE_CHARS = 900;
export const AI_MAX_TOOL_PAYLOAD_BYTES = 12_000;
export const AI_ALLOWED_RANGES = COPILOT_RANGES;
export const AI_DELIVERY_MODES = ["auto", "sync", "async"] as const;

const HEAVY_QUERY_PATTERNS = [
  /\bhistor/i,
  /\bsince\s+20\d{2}\b/i,
  /\bseason\b/i,
  /\bcompare\b/i,
  /\btrend/i,
  /\bweek(?:ly)?\b/i,
  /\blast year\b/i,
] as const;

const INJECTION_PATTERNS = [
  /ignore (?:(?:all|any|the) )?previous instructions/i,
  /reveal (the )?(system|developer) prompt/i,
  /show (the )?(hidden|secret) instructions/i,
  /print your prompt/i,
  /developer message/i,
  /drop table/i,
  /union select/i,
  /select \*/i,
  /bypass (the )?(guardrails|filters|policy)/i,
] as const;

export const AI_ERROR_CODES = {
  AUTH_REQUIRED: "AI_AUTH_REQUIRED",
  VERIFIED_REQUIRED: "AI_VERIFIED_REQUIRED",
  SUSPENDED: "AI_SUSPENDED_USER",
  BANNED: "AI_BANNED_USER",
  PLAN_RESTRICTED: "AI_PLAN_RESTRICTED",
  QUOTA_EXCEEDED: "AI_QUOTA_EXCEEDED",
  OUT_OF_SCOPE: "AI_OUT_OF_SCOPE",
  MISUSE: "AI_MISUSE_DETECTED",
  INVALID_REQUEST: "AI_INVALID_REQUEST",
  OVERLOADED: "AI_OVERLOADED",
} as const;

export type AiErrorCode = (typeof AI_ERROR_CODES)[keyof typeof AI_ERROR_CODES];

export class AiPolicyError extends Error {
  constructor(
    message: string,
    readonly code: AiErrorCode,
    readonly status: number,
  ) {
    super(message);
  }
}

export function estimateTokenCount(input: string): number {
  return Math.ceil(input.length / 4);
}

export function validateChatMessage(message: string): void {
  if (!message.trim()) {
    throw new AiPolicyError("Message is required", AI_ERROR_CODES.INVALID_REQUEST, 400);
  }

  if (message.length > AI_MAX_MESSAGE_CHARS) {
    throw new AiPolicyError("Message is too long", AI_ERROR_CODES.INVALID_REQUEST, 400);
  }

  if (estimateTokenCount(message) > AI_MAX_ESTIMATED_INPUT_TOKENS) {
    throw new AiPolicyError("Message exceeds token estimate limit", AI_ERROR_CODES.INVALID_REQUEST, 400);
  }
}

export function classifyPromptMisuse(message: string): { blocked: boolean; reason: string | null } {
  const matched = INJECTION_PATTERNS.find((pattern) => pattern.test(message));
  if (!matched) {
    return { blocked: false, reason: null };
  }

  return {
    blocked: true,
    reason: "Prompt blocked for prompt-injection or exfiltration attempt.",
  };
}

export function getAllowedToolNames(context?: CopilotContext): string[] {
  if (context?.scope === "game") {
    return ["get_game_summary", "get_game_live_status", "get_game_challenges"];
  }

  if (context?.scope === "team") {
    return ["get_team_summary", "get_team_trend"];
  }

  if (context?.scope === "umpire") {
    return ["get_umpire_summary", "get_umpire_profile"];
  }

  return ["get_live_games", "get_home_challenge_moments"];
}

function truncateString(value: string, maxLength: number): string {
  return value.length <= maxLength ? value : `${value.slice(0, maxLength - 1)}…`;
}

function sanitizeValue(value: unknown): unknown {
  if (value === null || value === undefined) return value ?? null;
  if (typeof value === "string") return truncateString(value, 300);
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (Array.isArray(value)) return value.slice(0, 10).map(sanitizeValue);
  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .slice(0, 30)
        .map(([key, entry]) => [key, sanitizeValue(entry)]),
    );
  }
  return String(value);
}

export function sanitizeToolPayload(payload: unknown): unknown {
  const sanitized = sanitizeValue(payload);
  const serialized = JSON.stringify(sanitized);
  if (!serialized || serialized.length <= AI_MAX_TOOL_PAYLOAD_BYTES) {
    return sanitized;
  }

  if (Array.isArray(sanitized)) {
    return sanitized.slice(0, Math.max(1, Math.floor(sanitized.length / 2)));
  }

  if (sanitized && typeof sanitized === "object") {
    const entries = Object.entries(sanitized as Record<string, unknown>);
    return Object.fromEntries(entries.slice(0, Math.max(1, Math.floor(entries.length / 2))));
  }

  return truncateString(serialized, AI_MAX_TOOL_PAYLOAD_BYTES);
}

export function postProcessAnswer(answer: string, citations: string[]): string {
  const normalized = answer.replace(/\s+/g, " ").trim();
  const containsLeakAttempt = /(system|developer) prompt/i.test(normalized);
  const safeBase = containsLeakAttempt
    ? "I can help with baseball-related questions and AiBS analytics."
    : truncateString(normalized, AI_MAX_RESPONSE_CHARS);

  if (citations.length === 0) {
    return safeBase;
  }

  return safeBase;
}

export function estimateCostUsd(modelName: string, inputTokens: number, outputTokens: number): number {
  return estimateAiCostUsd({
    provider: "openai",
    modelName,
    inputTokens,
    outputTokens,
  });
}

export function buildAiErrorPayload(error: AiPolicyError) {
  const detail = error.message.toLowerCase();
  const messageByCode: Record<AiErrorCode, string> = {
    AI_AUTH_REQUIRED: "Sign in and set up your profile to use AiBS AI.",
    AI_VERIFIED_REQUIRED: "Verify your email before using AiBS AI.",
    AI_SUSPENDED_USER: "You’ve been ejected. Appeal via support.",
    AI_BANNED_USER: "You’ve been ejected. Appeal via support.",
    AI_PLAN_RESTRICTED: "Your current plan does not include that AI action.",
    AI_QUOTA_EXCEEDED: detail.includes("weekly chart insight")
      ? "You’ve used this week’s chart follow-up."
      : detail.includes("daily copilot")
        ? "You’ve used today’s copilot allowance."
        : "You’ve used your current AiBS AI allowance.",
    AI_OUT_OF_SCOPE: "I can help with baseball-related questions and AiBS analytics.",
    AI_MISUSE_DETECTED:
      "We detected misuse of the copilot. Your account has been timed out and flagged for review.",
    AI_INVALID_REQUEST: "That request could not be processed.",
    AI_OVERLOADED: "The stadium is packed. Please try again in a few minutes.",
  };

  return {
    error: messageByCode[error.code],
    code: error.code,
    detail: error.message,
  };
}

export function shouldQueueAiRequest(params: {
  message: string;
  context?: CopilotContext;
  delivery?: (typeof AI_DELIVERY_MODES)[number];
}): boolean {
  if (params.delivery === "async") {
    return true;
  }

  if (params.delivery === "sync") {
    return false;
  }

  if (params.context?.range === "season") {
    return true;
  }

  return HEAVY_QUERY_PATTERNS.some((pattern) => pattern.test(params.message));
}
