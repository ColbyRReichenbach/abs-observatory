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
  terminology: AiTerminologyTelemetry | null;
  estimatedPromptChars: number | null;
};

export function buildAiExecutionTelemetry(input: AiSurfaceExecutionTelemetry): AiSurfaceExecutionTelemetry {
  return input;
}
