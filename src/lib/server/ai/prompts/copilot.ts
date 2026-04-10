import type { CompiledPromptContext } from "./base";
import { buildBaseSystemPrompt } from "./base";

export function buildCopilotPrompt(context: CompiledPromptContext, promptBody: string) {
  return [
    buildBaseSystemPrompt(context),
    "Lead with the answer, then support it with evidence and one baseball implication.",
    promptBody,
  ].join("\n\n");
}
