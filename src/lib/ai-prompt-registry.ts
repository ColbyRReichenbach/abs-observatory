import type { AiChatSurface } from "@/lib/server/ai/request-schema";

export type AiBasePromptTemplate = {
  version: string;
  label: string;
  summary: string;
  identityInstructions: string[];
  audienceTemplate: string;
  taskFamilyTemplate: string;
  terminologyTemplate: string;
};

export type AiSurfacePromptDefinition = {
  surface: AiChatSurface;
  version: string;
  label: string;
  summary: string;
  terminologyMode: "deterministic_seed_bundle_v1";
  promptBodyRole: "question_answer" | "chart_interpretation" | "visual_plan";
  instructionBlocks: string[];
};

export type AiPromptRegistrySnapshot = {
  surface: AiChatSurface;
  version: string;
  label: string;
  summary: string;
  terminologyMode: "deterministic_seed_bundle_v1";
  promptBodyRole: "question_answer" | "chart_interpretation" | "visual_plan";
  baseTemplateVersion: string;
  baseTemplateLabel: string;
  baseIdentityInstructions: string[];
  audienceTemplate: string;
  taskFamilyTemplate: string;
  terminologyTemplate: string;
  surfaceInstructionBlocks: string[];
};

export const AI_BASE_PROMPT_TEMPLATE: AiBasePromptTemplate = {
  version: "aibs_base_system_v1",
  label: "AiBS Base System Prompt",
  summary: "Core identity and anti-hallucination frame shared across all AiBS request surfaces.",
  identityInstructions: [
    "You are AiBS, an automated ball-strike and challenge-era baseball analyst.",
    "Use only the supplied context, payloads, and tool outputs.",
    "Do not invent data, leaders, counts, or trends.",
  ],
  audienceTemplate: "Audience: {{audience_line}}",
  taskFamilyTemplate: "Task family: {{task_family}}.",
  terminologyTemplate: "Terminology guidance:\n{{terminology_appendix}}",
};

const AI_SURFACE_PROMPT_REGISTRY: Record<AiChatSurface, AiSurfacePromptDefinition> = {
  copilot: {
    surface: "copilot",
    version: "copilot_v3",
    label: "Copilot Answer Prompt",
    summary: "Direct baseball-native Q&A for fan and org chat requests.",
    terminologyMode: "deterministic_seed_bundle_v1",
    promptBodyRole: "question_answer",
    instructionBlocks: [
      "Return one concise answer by default: 2-4 sentences in one paragraph unless the user asks for a list, table, or deeper breakdown.",
      "Lead with the answer, metric, and range; then add only the most relevant supporting datapoint or caveat.",
      "Do not use labels such as Evidence or Implication unless the user asks for that format.",
      "For global team-leader questions, prefer get_home_team_leaderboard. Use get_live_games only for today's slate, live-game, or current-game questions; its gameChallengeCount is game-level, not team-owned.",
      "Do not use these words in copilot answers: strategy, strategic, intent, philosophy, emphasis, approach. Use usage profile, result profile, data signal, or decision window instead.",
    ],
  },
  chart_insight: {
    surface: "chart_insight",
    version: "chart_insight_v3",
    label: "Chart Insight Prompt",
    summary: "Structured chart interpretation grounded in supplied ABS chart payloads.",
    terminologyMode: "deterministic_seed_bundle_v1",
    promptBodyRole: "chart_interpretation",
    instructionBlocks: [
      "Return structured chart interpretation grounded only in the provided chart payload.",
      "If the sample is thin or directional, say so plainly.",
    ],
  },
  visualizer: {
    surface: "visualizer",
    version: "visualizer_v1",
    label: "Visualizer Planning Prompt",
    summary: "Structured baseball chart specification with a strict visual output contract.",
    terminologyMode: "deterministic_seed_bundle_v1",
    promptBodyRole: "visual_plan",
    instructionBlocks: [
      "You are returning a baseball chart specification, not a generic answer.",
      "Honor an explicit user chart request when it is implementable; otherwise choose the best supported chart type for the question.",
      "Treat the current page context as the default entity and sample window unless the user explicitly asks to compare or switch scope.",
      "Use the supplied page-scoped tool outputs as the source of truth for plotted values and labels.",
    ],
  },
};

export function getAiPromptDefinition(surface: AiChatSurface): AiSurfacePromptDefinition {
  return AI_SURFACE_PROMPT_REGISTRY[surface];
}

export function listAiPromptDefinitions(): AiSurfacePromptDefinition[] {
  return Object.values(AI_SURFACE_PROMPT_REGISTRY);
}

export function buildAiPromptRegistrySnapshot(surface: AiChatSurface): AiPromptRegistrySnapshot {
  const definition = getAiPromptDefinition(surface);
  return {
    surface: definition.surface,
    version: definition.version,
    label: definition.label,
    summary: definition.summary,
    terminologyMode: definition.terminologyMode,
    promptBodyRole: definition.promptBodyRole,
    baseTemplateVersion: AI_BASE_PROMPT_TEMPLATE.version,
    baseTemplateLabel: AI_BASE_PROMPT_TEMPLATE.label,
    baseIdentityInstructions: [...AI_BASE_PROMPT_TEMPLATE.identityInstructions],
    audienceTemplate: AI_BASE_PROMPT_TEMPLATE.audienceTemplate,
    taskFamilyTemplate: AI_BASE_PROMPT_TEMPLATE.taskFamilyTemplate,
    terminologyTemplate: AI_BASE_PROMPT_TEMPLATE.terminologyTemplate,
    surfaceInstructionBlocks: [...definition.instructionBlocks],
  };
}
