import type OpenAI from "openai";

import type { ChartInsightPayload, StructuredChartInsight } from "@/lib/chart-insight-payload";
import type { CopilotContext } from "@/lib/copilot-context";
import type { AIVisualizerPlan } from "@/lib/types";

import type { AiAudienceMode } from "./context";
import type { AiChatSurface } from "./request-schema";
import type { SurfaceTaskFamily } from "./task-family";

export type SurfaceRunnerResult = {
  answer: string;
  confidence: "low" | "medium" | "high";
  citations: string[];
  structuredInsight?: StructuredChartInsight | null;
  structuredPlan?: AIVisualizerPlan | null;
  toolResults?: Array<{ toolName: string; payload: unknown }>;
  modelName?: string;
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
  };
};

export type SurfaceRunnerParams = {
  openaiClient: OpenAI | null;
  modelName: string;
  surface: AiChatSurface;
  audienceMode: AiAudienceMode;
  taskFamily: SurfaceTaskFamily;
  message: string;
  transcript: string;
  terminologyAppendix?: string | null;
  context?: CopilotContext;
  chartContext?: ChartInsightPayload;
};

export type SurfaceRunner = (params: SurfaceRunnerParams) => Promise<SurfaceRunnerResult>;

export type SurfaceRunnerRegistry = Record<AiChatSurface, SurfaceRunner>;

export function createSurfaceRunnerRegistry(registry: SurfaceRunnerRegistry) {
  return registry;
}
