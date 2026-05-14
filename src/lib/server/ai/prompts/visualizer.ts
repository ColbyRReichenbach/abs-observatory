import { getAiPromptDefinition } from "@/lib/ai-prompt-registry";

import type { CompiledPromptContext } from "./base";
import { buildSurfacePromptMessages, flattenPromptMessages } from "./base";

export function buildVisualizerPromptMessages(context: CompiledPromptContext, promptBody: string) {
  const definition = getAiPromptDefinition("visualizer");
  return buildSurfacePromptMessages(context, definition.instructionBlocks, promptBody);
}

export function buildVisualizerPrompt(context: CompiledPromptContext, promptBody: string) {
  return flattenPromptMessages(buildVisualizerPromptMessages(context, promptBody));
}
