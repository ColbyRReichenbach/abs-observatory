import { getAiPromptDefinition } from "@/lib/ai-prompt-registry";

import type { CompiledPromptContext } from "./base";
import { buildSurfacePromptMessages, flattenPromptMessages } from "./base";

export function buildCopilotPromptMessages(context: CompiledPromptContext, promptBody: string) {
  const definition = getAiPromptDefinition("copilot");
  return buildSurfacePromptMessages(context, definition.instructionBlocks, promptBody);
}

export function buildCopilotPrompt(context: CompiledPromptContext, promptBody: string) {
  return flattenPromptMessages(buildCopilotPromptMessages(context, promptBody));
}
