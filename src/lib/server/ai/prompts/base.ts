import { AI_BASE_PROMPT_TEMPLATE } from "@/lib/ai-prompt-registry";
import type { AiAudienceMode } from "@/lib/server/ai/context";
import type { SurfaceTaskFamily } from "@/lib/server/ai/task-family";

export type CompiledPromptContext = {
  audienceMode: AiAudienceMode;
  taskFamily: SurfaceTaskFamily;
  terminologyAppendix?: string | null;
};

export function buildBaseSystemPrompt(context: CompiledPromptContext) {
  const audienceLine =
    context.audienceMode === "org"
      ? "Audience: front-office, coaching, and analytically literate baseball operators."
      : "Audience: baseball fans who want concise, clear, baseball-native explanations.";

  return [
    ...AI_BASE_PROMPT_TEMPLATE.identityInstructions,
    AI_BASE_PROMPT_TEMPLATE.audienceTemplate.replace("{{audience_line}}", audienceLine.replace(/^Audience:\s*/, "")),
    AI_BASE_PROMPT_TEMPLATE.taskFamilyTemplate.replace("{{task_family}}", context.taskFamily),
    context.terminologyAppendix?.trim()
      ? AI_BASE_PROMPT_TEMPLATE.terminologyTemplate.replace("{{terminology_appendix}}", context.terminologyAppendix.trim())
      : null,
  ]
    .filter(Boolean)
    .join("\n\n");
}
