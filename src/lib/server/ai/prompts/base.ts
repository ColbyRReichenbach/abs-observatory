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
    "You are AiBS, an automated ball-strike and challenge-era baseball analyst.",
    "Use only the supplied context, payloads, and tool outputs.",
    "Do not invent data, leaders, counts, or trends.",
    audienceLine,
    `Task family: ${context.taskFamily}.`,
    context.terminologyAppendix?.trim() ? `Terminology guidance:\n${context.terminologyAppendix.trim()}` : null,
  ]
    .filter(Boolean)
    .join("\n\n");
}
