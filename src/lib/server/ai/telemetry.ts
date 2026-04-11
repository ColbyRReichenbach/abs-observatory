import type { ChartInsightPayload } from "@/lib/chart-insight-payload";

import type { AiChatSurface } from "./request-schema";
import type { SurfaceTaskFamily } from "./task-family";

export type AiTerminologyTelemetry = {
  stylePackSlug: string | null;
  selectedCardSlugs: string[];
  appendixChars: number;
};

export type AiSurfaceExecutionTelemetry = {
  surface: AiChatSurface;
  taskFamily: SurfaceTaskFamily;
  promptVersion: string;
  terminology: AiTerminologyTelemetry;
  estimatedPromptChars: number;
  hasTerminology: boolean;
  metadataComplete: boolean;
};

export type AiSurfaceExecutionTelemetryInput = {
  surface: AiChatSurface;
  taskFamily: SurfaceTaskFamily;
  promptVersion: string;
  terminology?: AiTerminologyTelemetry | null;
  estimatedPromptChars?: number | null;
};

export type AiPromptEstimateInput = {
  surface: AiChatSurface;
  message: string;
  transcript?: string | null;
  terminologyAppendix?: string | null;
  contextWindow?: string | null;
  chartContext?: ChartInsightPayload | null;
};

export const EMPTY_TERMINOLOGY_TELEMETRY: AiTerminologyTelemetry = {
  stylePackSlug: null,
  selectedCardSlugs: [],
  appendixChars: 0,
};

export function estimateAiPromptChars(input: AiPromptEstimateInput) {
  const chartPayloadPreview = input.chartContext
    ? JSON.stringify(input.chartContext.payload).slice(0, 18_000)
    : "";

  const segments = [
    input.surface,
    input.message,
    input.transcript ?? "",
    input.terminologyAppendix ?? "",
    input.contextWindow ?? "",
    input.chartContext?.chartType ?? "",
    input.chartContext?.chartTitle ?? "",
    input.chartContext?.baseballQuestion ?? "",
    input.chartContext?.chartSummary ?? "",
    chartPayloadPreview,
  ];

  return segments.reduce((sum, segment) => sum + segment.length, 0);
}

export function buildAiExecutionTelemetry(input: AiSurfaceExecutionTelemetryInput): AiSurfaceExecutionTelemetry {
  const terminology = input.terminology
    ? {
        stylePackSlug: input.terminology.stylePackSlug ?? null,
        selectedCardSlugs: [...input.terminology.selectedCardSlugs].sort(),
        appendixChars: Math.max(0, input.terminology.appendixChars ?? 0),
      }
    : EMPTY_TERMINOLOGY_TELEMETRY;
  const estimatedPromptChars = Math.max(
    input.estimatedPromptChars ?? terminology.appendixChars ?? 0,
    terminology.appendixChars,
  );

  return {
    surface: input.surface,
    taskFamily: input.taskFamily,
    promptVersion: input.promptVersion,
    terminology,
    estimatedPromptChars,
    hasTerminology: Boolean(terminology.stylePackSlug || terminology.selectedCardSlugs.length),
    metadataComplete: Boolean(input.surface && input.taskFamily && input.promptVersion),
  };
}
