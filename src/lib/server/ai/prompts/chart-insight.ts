import { getAiPromptDefinition } from "@/lib/ai-prompt-registry";

import type { CompiledPromptContext } from "./base";
import { buildBaseSystemPrompt } from "./base";

export function buildChartInsightPrompt(context: CompiledPromptContext, promptBody: string) {
  const definition = getAiPromptDefinition("chart_insight");
  return [
    buildBaseSystemPrompt(context),
    ...definition.instructionBlocks,
    promptBody,
  ].join("\n\n");
}
