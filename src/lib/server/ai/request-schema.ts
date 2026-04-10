import { z } from "zod";

import { AI_ALLOWED_RANGES, AI_DELIVERY_MODES } from "@/lib/server/ai-policy";

export const AI_CHAT_SURFACES = ["copilot", "visualizer", "chart_insight"] as const;

export const AI_CHAT_CONTEXT_SCHEMA = z
  .object({
    scope: z.enum(["global", "game", "team", "umpire"]).default("global"),
    entityId: z.string().optional(),
    range: z.enum(AI_ALLOWED_RANGES).optional(),
    gameStatus: z.string().optional(),
  })
  .optional();

export const AI_CHAT_CHART_CONTEXT_SCHEMA = z
  .object({
    chartType: z.string().min(1).max(120),
    chartKey: z.string().min(1).max(160),
    chartTitle: z.string().min(1).max(160),
    baseballQuestion: z.string().min(1).max(300),
    chartSummary: z.string().min(1).max(600),
    payload: z.record(z.string(), z.unknown()),
  })
  .optional();

export const CHAT_REQUEST_SCHEMA = z.object({
  conversationId: z.string().uuid().optional(),
  message: z.string().min(4).max(2000),
  surface: z.enum(AI_CHAT_SURFACES).optional().default("copilot"),
  delivery: z.enum(AI_DELIVERY_MODES).optional().default("auto"),
  context: AI_CHAT_CONTEXT_SCHEMA,
  chartContext: AI_CHAT_CHART_CONTEXT_SCHEMA,
});

export type AiChatSurface = (typeof AI_CHAT_SURFACES)[number];
export type AiChatRequestBody = z.infer<typeof CHAT_REQUEST_SCHEMA>;
export type AiChatContextInput = z.infer<typeof AI_CHAT_CONTEXT_SCHEMA>;
export type AiChatChartContextInput = z.infer<typeof AI_CHAT_CHART_CONTEXT_SCHEMA>;
