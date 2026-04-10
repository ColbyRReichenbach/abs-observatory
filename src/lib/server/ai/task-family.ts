import type { ChartInsightPayload } from "@/lib/chart-insight-payload";
import type { CopilotContext } from "@/lib/copilot-context";

import type { AiAudienceMode } from "./context";
import type { AiChatSurface } from "./request-schema";

export type CopilotTaskFamily =
  | "game_summary"
  | "general_abs_explanation"
  | "anomaly_diagnosis"
  | "team_profile_explanation"
  | "umpire_profile_explanation"
  | "comparison";

export type ChartInsightTaskFamily =
  | "challenge_decision_brief"
  | "challenge_value_timeline"
  | "umpire_rhythm"
  | "zone_map"
  | "scenario_matrix"
  | "inventory_deployment";

export type VisualizerTaskFamily =
  | "question_to_visual_plan"
  | "compare_entities_visual_plan"
  | "timing_and_leverage_visual_plan";

export type SurfaceTaskFamily = CopilotTaskFamily | ChartInsightTaskFamily | VisualizerTaskFamily;

type ResolveTaskFamilyParams = {
  surface: AiChatSurface;
  message: string;
  audienceMode: AiAudienceMode;
  context?: CopilotContext;
  chartContext?: ChartInsightPayload;
};

const CHART_TASK_FAMILY_BY_TYPE: Record<string, ChartInsightTaskFamily> = {
  team_decision_value_scatter: "challenge_decision_brief",
  team_inventory_deployment: "inventory_deployment",
  team_challenge_value_matrix: "scenario_matrix",
  umpire_rhythm: "umpire_rhythm",
  umpire_zone_map: "zone_map",
};

export function resolveTaskFamily(params: ResolveTaskFamilyParams): SurfaceTaskFamily {
  const message = params.message.toLowerCase();

  if (params.surface === "chart_insight") {
    const chartType = params.chartContext?.chartType;
    if (chartType && chartType in CHART_TASK_FAMILY_BY_TYPE) {
      return CHART_TASK_FAMILY_BY_TYPE[chartType];
    }

    if (message.includes("timeline")) return "challenge_value_timeline";
    if (message.includes("zone")) return "zone_map";
    return "challenge_decision_brief";
  }

  if (params.surface === "visualizer") {
    if (message.includes("compare") || message.includes("vs")) {
      return "compare_entities_visual_plan";
    }
    if (message.includes("leverage") || message.includes("timing")) {
      return "timing_and_leverage_visual_plan";
    }
    return "question_to_visual_plan";
  }

  if (params.context?.scope === "game") return "game_summary";
  if (params.context?.scope === "team") return "team_profile_explanation";
  if (params.context?.scope === "umpire") return "umpire_profile_explanation";
  if (message.includes("compare") || message.includes("versus") || message.includes("vs")) return "comparison";
  if (message.includes("why") || message.includes("explain abs") || message.includes("what is abs")) {
    return "general_abs_explanation";
  }
  if (message.includes("wrong") || message.includes("weird") || message.includes("anomaly")) {
    return "anomaly_diagnosis";
  }

  return params.audienceMode === "org" ? "general_abs_explanation" : "game_summary";
}
