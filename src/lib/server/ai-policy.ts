import type { CopilotContext } from "@/lib/copilot-context";
import { COPILOT_RANGES } from "@/lib/copilot-context";
import { estimateAiCostUsd } from "./ai-pricing";

export const AI_MAX_MESSAGE_CHARS = 1200;
export const AI_MAX_ESTIMATED_INPUT_TOKENS = 600;
export const AI_MAX_RESPONSE_CHARS = 900;
export const AI_MAX_TOOL_PAYLOAD_BYTES = 12_000;
export const AI_ALLOWED_RANGES = COPILOT_RANGES;
export const AI_DELIVERY_MODES = ["auto", "sync", "async"] as const;

type SanitizeToolPayloadOptions = {
  maxArrayItems?: number;
};

const HEAVY_QUERY_PATTERNS = [
  /\bhistor/i,
  /\bsince\s+20\d{2}\b/i,
  /\bseason\b/i,
  /\bcompare\b/i,
  /\btrend/i,
  /\bweek(?:ly)?\b/i,
  /\blast year\b/i,
] as const;

export type PromptMisuseCategory =
  | "allowed"
  | "instruction_override"
  | "prompt_leak"
  | "policy_bypass"
  | "tool_exfiltration"
  | "sql_or_secret_probe";

export type PromptMisuseClassification = {
  blocked: boolean;
  reason: string | null;
  category: PromptMisuseCategory;
  matchedSignals: string[];
};

export type AnswerLeakClassification = {
  blocked: boolean;
  reason: string | null;
  matchedSignals: string[];
};

type PromptMisuseSignal = {
  id: string;
  category: Exclude<PromptMisuseCategory, "allowed">;
  patterns?: RegExp[];
  compactPatterns?: RegExp[];
};

const PROMPT_MISUSE_REASON = "Prompt blocked for prompt-injection or exfiltration attempt.";
const ANSWER_LEAK_REASON = "AI response blocked by output safety filter.";

const PROMPT_POLICY_WORD_REPLACEMENTS: Array<[RegExp, string]> = [
  [/\bpreviosu\b/g, "previous"],
  [/\bpreviuos\b/g, "previous"],
  [/\bprevoius\b/g, "previous"],
  [/\bprevous\b/g, "previous"],
  [/\bprevius\b/g, "previous"],
  [/\bsistem\b/g, "system"],
  [/\bsystm\b/g, "system"],
  [/\bsysten\b/g, "system"],
  [/\bpromt\b/g, "prompt"],
  [/\bprmpt\b/g, "prompt"],
  [/\bdevloper\b/g, "developer"],
  [/\bgurdrails?\b/g, "guardrails"],
];

const PROMPT_MISUSE_SIGNALS: PromptMisuseSignal[] = [
  {
    id: "instruction-override",
    category: "instruction_override",
    patterns: [
      /\b(ignore|disregard|forget|override|bypass|skip|disable)\b.{0,100}\b(previous|prior|above|earlier|system|developer|instructions?|rules?|guardrails?|policy|prompt)\b/,
      /\b(previous|prior|above|earlier|system|developer)\b.{0,70}\b(instructions?|rules?|prompt)\b.{0,70}\b(ignore|disregard|forget|override|bypass|skip|disable)\b/,
      /\bdo not follow\b.{0,80}\b(instructions?|rules?|policy|guardrails?)\b/,
      /\bstop following\b.{0,80}\b(instructions?|rules?|policy|guardrails?)\b/,
      /\bact as\b.{0,80}\b(unrestricted|uncensored|developer mode|no rules)\b/,
      /\bjailbreak\b/,
    ],
    compactPatterns: [/ignore(?:all|any|the)?previousinstructions?/, /forget(?:all|any|the)?previousinstructions?/],
  },
  {
    id: "prompt-leak",
    category: "prompt_leak",
    patterns: [
      /\b(system|developer|hidden|secret|internal)\s+(prompt|instructions?|message|policy|rules?)\b/,
      /\b(prompt|instructions?|message|policy|rules?)\s+(from|for|of)\s+(the\s+)?(system|developer|hidden|secret|internal)\b/,
      /\b(show|reveal|print|return|display|repeat|dump|leak|exfiltrate|give|tell)\b.{0,80}\b(system|developer|hidden|secret|internal)\b.{0,60}\b(prompt|instructions?|message|policy|rules?)\b/,
      /\bwhat\s+(are|is)\b.{0,50}\b(hidden|system|developer|internal)\b.{0,40}\b(instructions?|prompt|message|rules?)\b/,
      /\bdeveloper message\b/,
      /\bsystem prompt\b/,
      /\bhidden instructions?\b/,
      /\bsecret instructions?\b/,
    ],
    compactPatterns: [
      /returnsystemprompt/,
      /showsystemprompt/,
      /revealsystemprompt/,
      /printsystemprompt/,
      /showhiddeninstructions?/,
      /revealhiddeninstructions?/,
      /developermessage/,
    ],
  },
  {
    id: "policy-bypass",
    category: "policy_bypass",
    patterns: [
      /\bbypass\b.{0,80}\b(guardrails?|filters?|policy|safety|moderation|restrictions?)\b/,
      /\bdisable\b.{0,80}\b(safety|policy|filters?|moderation|guardrails?)\b/,
      /\bwithout\b.{0,40}\b(safety|policy|rules?|filters?|guardrails?|restrictions?)\b/,
    ],
  },
  {
    id: "tool-exfiltration",
    category: "tool_exfiltration",
    patterns: [
      /\b(show|reveal|print|return|display|dump|list|tell|give)\b.{0,80}\braw\s+(tool|function|schema|api|payload|context)\b/,
      /\b(show|reveal|print|return|display|dump|list|tell|give)\b.{0,80}\binternal\s+(tool|function|schema|api|payload|context)\b/,
      /\b(show|reveal|print|return|display|dump|list|tell|give)\b.{0,80}\b(tool|function|api)\s+(outputs?|calls?|schemas?|payloads?)\b/,
      /\b(tool|function|api)\s+(outputs?|calls?|schemas?|payloads?)\b.{0,80}\b(show|reveal|print|return|display|dump|list|tell|give)\b/,
      /\braw tool\b.{0,40}\b(output|payload|call)\b/,
    ],
  },
  {
    id: "sql-or-secret-probe",
    category: "sql_or_secret_probe",
    patterns: [
      /\b(drop|truncate|alter)\s+table\b/,
      /\bunion\s+select\b/,
      /\bselect\s+\*(?:\s+from\b)?/,
      /\b(show|reveal|print|return|display|dump|list)\b.{0,80}\b(env|environment variables?|api keys?|secrets?|tokens?|credentials?)\b/,
      /\b(process\.env|openai_api_key|clerk_secret_key|database_url)\b/,
    ],
  },
];

const OUTPUT_LEAK_PATTERNS = [
  /\bsystem prompt\b/,
  /\bdeveloper prompt\b/,
  /\bdeveloper instructions?\b/,
  /\bhidden instructions?\b/,
  /\binternal (policy|instructions?|prompt|rules?)\b/,
  /\byou are aibs[, ]+an automated ball-strike/,
  /\buse only the supplied context\b/,
  /\bdo not invent data\b/,
  /\blead with the answer, then support it\b/,
  /\btask family:\s*[a-z_]+\b/,
  /\baudience: analytically literate baseball readers\b/,
  /\bterminology guidance:\b/,
  /\bai_base_prompt_template\b/,
  /\bprompt registry\b/,
  /\bidentity instructions?\b/,
  /\bi was instructed to\b/,
  /\bmy instructions are\b/,
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
  RESPONSE_BLOCKED: "AI_RESPONSE_BLOCKED",
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

export function normalizePromptForPolicy(input: string): string {
  const normalized = input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .toLowerCase()
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[0]/g, "o")
    .replace(/[1!|]/g, "i")
    .replace(/[3]/g, "e")
    .replace(/[4@]/g, "a")
    .replace(/[5$]/g, "s")
    .replace(/[7]/g, "t")
    .replace(/\s+/g, " ")
    .trim();

  return PROMPT_POLICY_WORD_REPLACEMENTS.reduce(
    (current, [pattern, replacement]) => current.replace(pattern, replacement),
    normalized,
  );
}

export function classifyPromptMisuse(message: string): PromptMisuseClassification {
  const normalized = normalizePromptForPolicy(message);
  const compacted = normalized.replace(/[^a-z0-9]+/g, "");

  for (const signal of PROMPT_MISUSE_SIGNALS) {
    const matchesPattern = signal.patterns?.some((pattern) => pattern.test(normalized)) ?? false;
    const matchesCompactPattern = signal.compactPatterns?.some((pattern) => pattern.test(compacted)) ?? false;
    if (matchesPattern || matchesCompactPattern) {
      return {
        blocked: true,
        reason: PROMPT_MISUSE_REASON,
        category: signal.category,
        matchedSignals: [signal.id],
      };
    }
  }

  return {
    blocked: false,
    reason: null,
    category: "allowed",
    matchedSignals: [],
  };
}

export function classifyAnswerLeak(answer: string): AnswerLeakClassification {
  const normalized = normalizePromptForPolicy(answer.replace(/\s+/g, " ").trim());
  const matchedSignals = OUTPUT_LEAK_PATTERNS
    .map((pattern) => pattern.source)
    .filter((source, index) => OUTPUT_LEAK_PATTERNS[index].test(normalized));

  if (matchedSignals.length === 0) {
    return {
      blocked: false,
      reason: null,
      matchedSignals: [],
    };
  }

  return {
    blocked: true,
    reason: ANSWER_LEAK_REASON,
    matchedSignals,
  };
}

export function getAllowedToolNames(context?: CopilotContext): string[] {
  if (context?.scope === "game") {
    return ["get_game_summary", "get_game_live_status", "get_game_challenges"];
  }

  if (context?.scope === "team") {
    return [
      "get_team_summary",
      "get_team_trend",
      "get_team_inning_efficiency",
      "get_team_side_splits",
      "get_team_aggression",
      "get_team_challenge_scenario_matrix",
      "get_team_challenge_value_summary",
      "get_team_decision_value_report",
    ];
  }

  if (context?.scope === "umpire") {
    return ["get_umpire_summary", "get_umpire_profile"];
  }

  return ["get_live_games", "get_home_challenge_moments"];
}

function truncateString(value: string, maxLength: number): string {
  return value.length <= maxLength ? value : `${value.slice(0, maxLength - 1)}…`;
}

function sanitizeValue(value: unknown, options: Required<SanitizeToolPayloadOptions>): unknown {
  if (value === null || value === undefined) return value ?? null;
  if (typeof value === "string") return truncateString(value, 300);
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (Array.isArray(value)) return value.slice(0, options.maxArrayItems).map((entry) => sanitizeValue(entry, options));
  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .slice(0, 30)
        .map(([key, entry]) => [key, sanitizeValue(entry, options)]),
    );
  }
  return String(value);
}

export function sanitizeToolPayload(payload: unknown, options?: SanitizeToolPayloadOptions): unknown {
  const resolvedOptions = { maxArrayItems: options?.maxArrayItems ?? 10 };
  const sanitized = sanitizeValue(payload, resolvedOptions);
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
  const safeBase = truncateString(normalized, AI_MAX_RESPONSE_CHARS);

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
    AI_RESPONSE_BLOCKED: "AiBS can only answer baseball-related analytics questions.",
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
