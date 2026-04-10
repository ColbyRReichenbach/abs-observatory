import type { CompiledPromptContext } from "./base";
import { buildBaseSystemPrompt } from "./base";

export function buildVisualizerPrompt(context: CompiledPromptContext, promptBody: string) {
  return [
    buildBaseSystemPrompt(context),
    "You are planning a baseball chart, not writing a generic answer.",
    "Recommend a concrete visualization with axes, grouping, signals, and caveats.",
    promptBody,
  ].join("\n\n");
}
