import type { ChartInsightPayload, StructuredChartInsight } from "@/lib/chart-insight-payload";
import type { CopilotContext } from "@/lib/copilot-context";

import type { AiAudienceMode } from "./context";
import type { AiChatSurface } from "./request-schema";
import type { SurfaceTaskFamily } from "./task-family";

export type SurfaceRunnerResult = {
  answer: string;
  confidence: "low" | "medium" | "high";
  citations: string[];
  structuredInsight?: StructuredChartInsight | null;
  toolResults?: Array<{ toolName: string; payload: unknown }>;
  modelName?: string;
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
  };
};

export type SurfaceRunnerParams = {
  surface: AiChatSurface;
  audienceMode: AiAudienceMode;
  taskFamily: SurfaceTaskFamily;
  message: string;
  transcript: string;
  context?: CopilotContext;
  chartContext?: ChartInsightPayload;
};

export type SurfaceRunner = (params: SurfaceRunnerParams) => Promise<SurfaceRunnerResult>;

export type SurfaceRunnerRegistry = Record<AiChatSurface, SurfaceRunner>;

export function createSurfaceRunnerRegistry(registry: SurfaceRunnerRegistry) {
  return registry;
}
