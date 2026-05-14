import { getAiPromptDefinition } from "@/lib/ai-prompt-registry";

import type { CompiledPromptContext } from "./base";
import { buildSurfacePromptMessages, flattenPromptMessages } from "./base";

export function buildChartInsightPromptMessages(context: CompiledPromptContext, promptBody: string) {
  const definition = getAiPromptDefinition("chart_insight");
  return buildSurfacePromptMessages(context, definition.instructionBlocks, promptBody);
}

export function buildChartInsightPrompt(context: CompiledPromptContext, promptBody: string) {
  return flattenPromptMessages(buildChartInsightPromptMessages(context, promptBody));
}
