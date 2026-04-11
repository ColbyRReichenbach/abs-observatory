import type { ChartInsightPayload } from "@/lib/chart-insight-payload";
import type { SurfaceTaskFamily } from "@/lib/server/ai/task-family";

type DeriveSemanticTagsParams = {
  message: string;
  taskFamily: SurfaceTaskFamily;
  chartContext?: ChartInsightPayload;
};

const TASK_FAMILY_TAGS: Partial<Record<SurfaceTaskFamily, string[]>> = {
  game_summary: ["high_leverage"],
  general_abs_explanation: ["challenged_call", "overturned_call", "confirmed_call", "challenge_value"],
  anomaly_diagnosis: ["zone_vulnerability", "challenge_traffic", "review_exposure"],
  comparison: ["challenge_value"],
  challenge_decision_brief: ["challenge_value", "review_worthiness"],
  challenge_value_timeline: ["challenge_value", "inventory_deployment", "challenge_management"],
  umpire_rhythm: ["challenge_rhythm", "challenge_traffic"],
  zone_map: ["zone_vulnerability", "overturn_lane"],
  scenario_matrix: ["challenge_value", "review_worthiness"],
  inventory_deployment: ["inventory_deployment", "challenge_value", "challenge_management"],
  question_to_visual_plan: ["challenge_value", "inventory_deployment"],
  compare_entities_visual_plan: ["challenge_value", "challenge_management"],
  timing_and_leverage_visual_plan: ["high_leverage", "inventory_deployment", "challenge_management"],
};

export function deriveSemanticTags(params: DeriveSemanticTagsParams) {
  const tags = new Set<string>(TASK_FAMILY_TAGS[params.taskFamily] ?? []);
  const message = params.message.toLowerCase();
  const chartType = params.chartContext?.chartType ?? "";

  if (message.includes("full count") || message.includes("3-2")) tags.add("full_count");
  if (message.includes("risp") || message.includes("scoring position")) tags.add("risp");
  if (message.includes("bases loaded")) tags.add("bases_loaded");
  if (message.includes("walk-off")) tags.add("walk_off");
  if (message.includes("extra innings")) tags.add("extra_innings");
  if (message.includes("leverage")) tags.add("high_leverage");
  if (message.includes("overturn")) tags.add("overturned_call");
  if (message.includes("confirm")) tags.add("confirmed_call");
  if (message.includes("challenge")) tags.add("challenged_call");
  if (message.includes("zone")) tags.add("zone_vulnerability");

  if (chartType === "team_inventory_deployment") {
    tags.add("inventory_deployment");
    tags.add("challenge_value");
  }
  if (chartType === "team_decision_value_scatter" || chartType === "team_challenge_value_matrix") {
    tags.add("challenge_value");
    tags.add("review_worthiness");
  }
  if (chartType === "umpire_rhythm") {
    tags.add("challenge_rhythm");
  }
  if (chartType === "umpire_zone_map") {
    tags.add("zone_vulnerability");
    tags.add("overturn_lane");
  }

  return [...tags].sort();
}
