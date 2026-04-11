import { getAiPromptDefinition } from "@/lib/ai-prompt-registry";

import type { CompiledPromptContext } from "./base";
import { buildBaseSystemPrompt } from "./base";

export function buildVisualizerPrompt(context: CompiledPromptContext, promptBody: string) {
  const definition = getAiPromptDefinition("visualizer");
  return [
    buildBaseSystemPrompt(context),
    ...definition.instructionBlocks,
    promptBody,
  ].join("\n\n");
}
