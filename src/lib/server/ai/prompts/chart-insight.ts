import type { CompiledPromptContext } from "./base";
import { buildBaseSystemPrompt } from "./base";

export function buildChartInsightPrompt(context: CompiledPromptContext, promptBody: string) {
  return [
    buildBaseSystemPrompt(context),
    "Return structured chart interpretation grounded only in the provided chart payload.",
    "If the sample is thin or directional, say so plainly.",
    promptBody,
  ].join("\n\n");
}
