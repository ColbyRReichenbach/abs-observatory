import { z } from "zod";

import { formatContextWindow } from "@/lib/copilot-context";
import { buildVisualizerPrompt } from "@/lib/server/ai/prompts/visualizer";
import type { SurfaceRunner } from "@/lib/server/ai/orchestrator";
import { resolveToolResults, type ToolResult } from "@/lib/server/ai-tools";
import type { AIVisualizerPlan } from "@/lib/types";

const visualizerPlanSchema = z.object({
  chartTitle: z.string().min(1).max(120),
  chartType: z.enum(["bar_chart", "line_chart", "scatter_plot", "heatmap", "timeline", "table"]),
  xAxis: z.string().min(1).max(160),
  yAxis: z.string().min(1).max(160),
  compareBy: z.string().min(1).max(160).nullable(),
  filters: z.array(z.string().min(1).max(160)).min(0).max(6),
  highlight: z.string().min(1).max(220),
  honorsUserChartRequest: z.boolean(),
  dataPoints: z.array(
    z.object({
      x: z.union([z.string().min(1).max(80), z.number()]),
      y: z.union([z.string().min(1).max(80), z.number()]),
      value: z.number().nullable().optional(),
      series: z.string().min(1).max(80).nullable().optional(),
      label: z.string().min(1).max(120).nullable().optional(),
    }),
  ).min(3).max(24),
});

type VisualizerPlan = z.infer<typeof visualizerPlanSchema>;

type SupportedChartType = VisualizerPlan["chartType"];
type TeamToolName =
  | "get_team_summary"
  | "get_team_trend"
  | "get_team_inning_efficiency"
  | "get_team_side_splits"
  | "get_team_aggression"
  | "get_team_challenge_scenario_matrix"
  | "get_team_challenge_value_summary"
  | "get_team_decision_value_report";

type TeamVisualizerIntent =
  | "count_state_overturn_rate"
  | "count_state_challenge_volume"
  | "inning_challenge_volume"
  | "inning_overturn_rate"
  | "offense_defense_challenge_volume"
  | "offense_defense_overturn_rate"
  | "timing_phase_challenge_volume"
  | "timing_phase_overturn_rate"
  | "home_away_challenges_per_game"
  | "home_away_overturn_rate"
  | "scenario_matrix_challenge_volume"
  | "scenario_matrix_overturn_rate"
  | "decision_surplus_by_breakdown"
  | "decision_expected_vs_realized_by_breakdown";

type ToolPayloadMap = Map<string, unknown>;

type DeterministicVisualizerResult = {
  plan: VisualizerPlan | null;
  citations: TeamToolName[];
  answer?: string;
};

type TeamBreakdownSection = {
  key: string;
  title: string;
  entries: Array<{
    label: string;
    challenges: number;
    averageExpectedChallengeValue: number;
    averageRealizedChallengeValue: number;
    decisionSurplus: number;
    modelConfidence: string;
  }>;
};

type TeamDecisionValueReport = {
  breakdownSections?: TeamBreakdownSection[];
};

function tryParseJsonObject(raw: string) {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced?.[1]?.trim() ?? trimmed;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;

  try {
    return JSON.parse(candidate.slice(start, end + 1));
  } catch {
    return null;
  }
}

function flattenStructuredPlan(plan: AIVisualizerPlan) {
  return [
    `Chart Title: ${plan.chartTitle}`,
    `Chart Type: ${plan.chartType}`,
    `X-Axis: ${plan.xAxis}`,
    `Y-Axis: ${plan.yAxis}`,
    `Compare By: ${plan.compareBy ?? "None"}`,
    `Filters: ${plan.filters.join(", ") || "None"}`,
    `Highlight: ${plan.highlight}`,
    `Data Points: ${plan.dataPoints.length}`,
  ].join("\n\n");
}

function normalizePlan(candidate: unknown): VisualizerPlan | null {
  const parsed = visualizerPlanSchema.safeParse(candidate);
  if (parsed.success) return parsed.data;
  return null;
}

function getToolPayload<T>(toolResults: ToolResult[] | ToolPayloadMap, toolName: string): T | null {
  if (toolResults instanceof Map) {
    return (toolResults.get(toolName) as T | undefined) ?? null;
  }
  const entry = toolResults.find((tool) => tool.toolName === toolName);
  return (entry?.payload as T | undefined) ?? null;
}

function normalizeMessage(message: string) {
  return message.toLowerCase();
}

function getRequestedChartType(message: string): SupportedChartType | null {
  const normalized = normalizeMessage(message);
  if (/\bheatmap\b/.test(normalized)) return "heatmap";
  if (/\bscatter(?:\s+plot)?\b/.test(normalized)) return "scatter_plot";
  if (/\btimeline\b/.test(normalized)) return "timeline";
  if (/\btable\b/.test(normalized)) return "table";
  if (/\bline(?:\s+chart|\s+graph|\s+plot)?\b/.test(normalized)) return "line_chart";
  if (/\bbar(?:\s+chart|\s+graph)?\b|\bbars\b/.test(normalized)) return "bar_chart";
  return null;
}

function pickChartType(
  requested: SupportedChartType | null,
  supported: SupportedChartType[],
  fallback: SupportedChartType,
) {
  if (requested && supported.includes(requested)) {
    return { chartType: requested, honorsUserChartRequest: true };
  }
  return { chartType: fallback, honorsUserChartRequest: requested === null };
}

function buildUnsupportedTeamAnswer() {
  return [
    "AiBS can currently build deterministic team charts for:",
    "- overturn rate by count state",
    "- challenge volume by count state or inning",
    "- offense vs defense by inning",
    "- timing phase / early-middle-late challenge profile",
    "- home vs away split comparison",
    "- scenario-matrix heatmaps",
    "- expected vs realized or surplus value by count state, inning phase, or base-out state",
    "Try a request like: Compare overturn rate by count state, Show challenges by inning, Map offense vs defense by inning, or Compare expected vs realized value by count state.",
  ].join("\n");
}

function normalizeInningLabel(inning: number) {
  return inning > 9 ? "10+" : String(inning);
}

function getTeamName(payloadMap: ToolPayloadMap) {
  const summary = getToolPayload<{ teamName?: string }>(payloadMap, "get_team_summary");
  return summary?.teamName ?? "Current Team";
}

function getTeamFilters(teamName: string) {
  return [`team: ${teamName}`, "range: season"];
}

function getScenarioCountStateBuckets(
  scenarioMatrix: Array<{ colLabel: string; challenges: number; overturned: number }>,
) {
  const preferredOrder = ["Pitcher Ahead", "Even Count", "Hitter Ahead", "Full Count"];
  const buckets = new Map<string, { challenges: number; overturned: number }>();

  for (const row of scenarioMatrix) {
    const current = buckets.get(row.colLabel) ?? { challenges: 0, overturned: 0 };
    current.challenges += Number(row.challenges ?? 0);
    current.overturned += Number(row.overturned ?? 0);
    buckets.set(row.colLabel, current);
  }

  return preferredOrder
    .filter((label) => buckets.has(label))
    .map((label) => ({
      label,
      challenges: buckets.get(label)?.challenges ?? 0,
      overturnRate:
        (buckets.get(label)?.challenges ?? 0) > 0
          ? (buckets.get(label)?.overturned ?? 0) / (buckets.get(label)?.challenges ?? 1)
          : 0,
    }));
}

function getBreakdownKey(message: string) {
  const normalized = normalizeMessage(message);
  if (/\bcount state\b|\bcount states\b|\bfull count\b|\bhitter ahead\b|\beven count\b|\bpitcher ahead\b/.test(normalized)) {
    return "count_state";
  }
  if (/\binning phase\b|\bearly\b|\bmiddle\b|\blate\b|\bextras\b/.test(normalized)) {
    return "inning_phase";
  }
  if (/\bbase\/out\b|\bbase out\b|\bbases empty\b|\brunner on\b|\brisp\b|\bbases loaded\b/.test(normalized)) {
    return "base_out_state";
  }
  return "count_state";
}

function getDecisionMetric(message: string) {
  const normalized = normalizeMessage(message);
  if (/\bexpected\s+vs\s+realized\b|\bcompare expected\b|\bcompare realized\b/.test(normalized)) {
    return "expected_vs_realized";
  }
  if (/\bsurplus\b|\bleak\b|\bdecision value\b|\bvalue leak\b/.test(normalized)) {
    return "surplus";
  }
  if (/\brealized\b/.test(normalized)) return "realized";
  if (/\bexpected\b/.test(normalized)) return "expected";
  return "surplus";
}

function inferTeamVisualizerIntent(message: string): TeamVisualizerIntent | null {
  const normalized = normalizeMessage(message);
  const wantsCountState =
    /\bcount state\b|\bcount states\b|\bhitter ahead\b|\beven count\b|\bpitcher ahead\b|\bfull count\b/.test(
      normalized,
    );
  const wantsOffenseDefense =
    /(offense|offensive)\s*(?:vs|v|versus|and|\/)\s*(defense|defensive)|(defense|defensive)\s*(?:vs|v|versus|and|\/)\s*(offense|offensive)/.test(
      normalized,
    );
  const wantsInning = /\binning\b|\binnings\b|\b1-9\b|\b1 to 9\b/.test(normalized);
  const wantsChallengeVolume =
    /\bchallenge(?:s|d)?\b|\breviews?\b|\bvolume\b|\bcount\b|\btraffic\b|\bper game\b|\busage\b/.test(normalized);
  const wantsOverturnRate = /\boverturn\b|\brate\b|\bsuccess\b|\bconvert\b|\bresults?\b/.test(normalized);
  const wantsTimingPhase = /\baggression\b|\btiming\b|\bearly\b|\bmiddle\b|\blate\b|\bextras\b|\bphase\b/.test(normalized);
  const wantsHomeAway =
    /\bhome\b.*\baway\b|\baway\b.*\bhome\b|\broad\b|\bsplit\b|\bhome\/away\b/.test(normalized);
  const wantsDecisionValue =
    /\bexpected\b|\brealized\b|\bsurplus\b|\bmodeled value\b|\bvalue leak\b|\bdecision value\b/.test(normalized);
  const wantsScenarioMatrix =
    /\bscenario\b|\bmatrix\b|\bbases empty\b|\brunner on\b|\brisp\b|\bbases loaded\b|\bbase\/out\b|\bbase out\b/.test(
      normalized,
    );

  if (wantsDecisionValue) {
    return getDecisionMetric(message) === "expected_vs_realized"
      ? "decision_expected_vs_realized_by_breakdown"
      : "decision_surplus_by_breakdown";
  }

  if (wantsScenarioMatrix) {
    return wantsOverturnRate ? "scenario_matrix_overturn_rate" : "scenario_matrix_challenge_volume";
  }

  if (wantsOffenseDefense) {
    return wantsOverturnRate ? "offense_defense_overturn_rate" : "offense_defense_challenge_volume";
  }

  if (wantsCountState) {
    return wantsOverturnRate ? "count_state_overturn_rate" : "count_state_challenge_volume";
  }

  if (wantsHomeAway) {
    return wantsOverturnRate ? "home_away_overturn_rate" : "home_away_challenges_per_game";
  }

  if (wantsTimingPhase) {
    return wantsOverturnRate ? "timing_phase_overturn_rate" : "timing_phase_challenge_volume";
  }

  if (wantsInning || wantsChallengeVolume || wantsOverturnRate) {
    return wantsOverturnRate ? "inning_overturn_rate" : "inning_challenge_volume";
  }

  return null;
}

function getTeamIntentTools(intent: TeamVisualizerIntent): TeamToolName[] {
  switch (intent) {
    case "count_state_overturn_rate":
    case "count_state_challenge_volume":
    case "scenario_matrix_challenge_volume":
    case "scenario_matrix_overturn_rate":
      return ["get_team_summary", "get_team_challenge_scenario_matrix"];
    case "inning_challenge_volume":
    case "inning_overturn_rate":
    case "offense_defense_challenge_volume":
    case "offense_defense_overturn_rate":
      return ["get_team_summary", "get_team_inning_efficiency"];
    case "timing_phase_challenge_volume":
    case "timing_phase_overturn_rate":
      return ["get_team_summary", "get_team_aggression"];
    case "home_away_challenges_per_game":
    case "home_away_overturn_rate":
      return ["get_team_summary", "get_team_side_splits"];
    case "decision_surplus_by_breakdown":
    case "decision_expected_vs_realized_by_breakdown":
      return ["get_team_summary", "get_team_decision_value_report"];
  }
}

function buildCountStatePlan(
  payloadMap: ToolPayloadMap,
  message: string,
  mode: "overturn_rate" | "challenge_volume",
): VisualizerPlan | null {
  const teamName = getTeamName(payloadMap);
  const scenarioMatrix = getToolPayload<
    Array<{ colLabel: string; challenges: number; overturned: number }>
  >(payloadMap, "get_team_challenge_scenario_matrix");
  if (!scenarioMatrix?.length) return null;

  const buckets = getScenarioCountStateBuckets(scenarioMatrix);
  if (buckets.length < 3) return null;

  const requested = getRequestedChartType(message);
  const { chartType, honorsUserChartRequest } = pickChartType(requested, ["bar_chart", "table"], "bar_chart");

  return {
    chartTitle:
      mode === "overturn_rate"
        ? `${teamName} Overturn Rate by Count State`
        : `${teamName} Challenges by Count State`,
    chartType,
    xAxis: "Count State",
    yAxis: mode === "overturn_rate" ? "Overturn Rate" : "Challenges",
    compareBy: null,
    filters: getTeamFilters(teamName),
    highlight:
      mode === "overturn_rate"
        ? "Compare overturn success by count state."
        : "Compare review volume by count state.",
    honorsUserChartRequest,
    dataPoints: buckets.map((bucket) => ({
      x: bucket.label,
      y: mode === "overturn_rate" ? bucket.overturnRate : bucket.challenges,
    })),
  };
}

function buildInningPlan(
  payloadMap: ToolPayloadMap,
  message: string,
  mode: "challenge_volume" | "overturn_rate",
): VisualizerPlan | null {
  const teamName = getTeamName(payloadMap);
  const inningEfficiency = getToolPayload<
    Array<{ inning: number; category: string; sampleSize: number; overturnRate: number }>
  >(payloadMap, "get_team_inning_efficiency");
  if (!inningEfficiency?.length) return null;

  const buckets = new Map<string, { challenges: number; overturned: number }>();
  for (const row of inningEfficiency) {
    const key = normalizeInningLabel(Number(row.inning));
    const current = buckets.get(key) ?? { challenges: 0, overturned: 0 };
    current.challenges += Number(row.sampleSize ?? 0);
    current.overturned += Number(row.sampleSize ?? 0) * Number(row.overturnRate ?? 0);
    buckets.set(key, current);
  }

  const sorted = Array.from(buckets.entries()).sort((a, b) => Number(a[0].replace("+", "")) - Number(b[0].replace("+", "")));
  if (sorted.length < 3) return null;

  const requested = getRequestedChartType(message);
  const { chartType, honorsUserChartRequest } = pickChartType(requested, ["bar_chart", "line_chart", "table"], "line_chart");

  return {
    chartTitle:
      mode === "challenge_volume"
        ? `${teamName} Challenge Volume by Inning`
        : `${teamName} Overturn Rate by Inning`,
    chartType,
    xAxis: "Inning",
    yAxis: mode === "challenge_volume" ? "Challenges" : "Overturn Rate",
    compareBy: null,
    filters: getTeamFilters(teamName),
    highlight:
      mode === "challenge_volume"
        ? "Show where challenge traffic concentrates across innings."
        : "Show where overturn success changes across innings.",
    honorsUserChartRequest,
    dataPoints: sorted.map(([inning, bucket]) => ({
      x: inning,
      y: mode === "challenge_volume" ? bucket.challenges : bucket.challenges > 0 ? bucket.overturned / bucket.challenges : 0,
    })),
  };
}

function buildOffenseDefensePlan(
  payloadMap: ToolPayloadMap,
  message: string,
  mode: "challenge_volume" | "overturn_rate",
): VisualizerPlan | null {
  const teamName = getTeamName(payloadMap);
  const inningEfficiency = getToolPayload<
    Array<{ inning: number; category: string; sampleSize: number; overturnRate: number }>
  >(payloadMap, "get_team_inning_efficiency");
  if (!inningEfficiency?.length) return null;

  const requested = getRequestedChartType(message);
  const supportedChartTypes: SupportedChartType[] =
    mode === "challenge_volume" ? ["bar_chart", "table", "heatmap"] : ["heatmap", "bar_chart", "table"];
  const { chartType, honorsUserChartRequest } = pickChartType(
    requested,
    supportedChartTypes,
    mode === "challenge_volume" ? "bar_chart" : "heatmap",
  );

  const groupedData = inningEfficiency
    .slice()
    .sort((a, b) => Number(a.inning) - Number(b.inning))
    .map((entry) => ({
      x: `Inning ${normalizeInningLabel(Number(entry.inning))}`,
      category: entry.category,
      value: mode === "challenge_volume" ? Number(entry.sampleSize ?? 0) : Number(entry.overturnRate ?? 0),
    }));

  if (groupedData.length < 4) return null;

  return {
    chartTitle:
      mode === "challenge_volume"
        ? `${teamName} Offense vs Defense Challenge Volume by Inning`
        : `${teamName} Offensive vs Defensive Overturn Rate by Inning`,
    chartType,
    xAxis: "Inning",
    yAxis: mode === "challenge_volume" ? "Challenges" : "Overturn Rate",
    compareBy: "Offense vs Defense",
    filters: getTeamFilters(teamName),
    highlight:
      mode === "challenge_volume"
        ? "Compare offensive and defensive challenge volume inning by inning."
        : "Compare offensive and defensive overturn success inning by inning.",
    honorsUserChartRequest,
    dataPoints:
      chartType === "heatmap"
        ? groupedData.map((entry) => ({ x: entry.x, y: entry.category, value: entry.value }))
        : groupedData.map((entry) => ({ x: entry.x, y: entry.value, series: entry.category })),
  };
}

function buildTimingPhasePlan(
  payloadMap: ToolPayloadMap,
  message: string,
  mode: "challenge_volume" | "overturn_rate",
): VisualizerPlan | null {
  const teamName = getTeamName(payloadMap);
  const aggression = getToolPayload<Array<{ category: string; count: number; rate: number }>>(payloadMap, "get_team_aggression");
  if (!aggression?.length) return null;

  const requested = getRequestedChartType(message);
  const { chartType, honorsUserChartRequest } = pickChartType(requested, ["bar_chart", "line_chart", "table"], "bar_chart");

  return {
    chartTitle:
      mode === "challenge_volume"
        ? `${teamName} Challenge Volume by Timing Phase`
        : `${teamName} Overturn Rate by Timing Phase`,
    chartType,
    xAxis: "Timing Phase",
    yAxis: mode === "challenge_volume" ? "Challenges" : "Overturn Rate",
    compareBy: null,
    filters: getTeamFilters(teamName),
    highlight:
      mode === "challenge_volume"
        ? "Show how challenge usage is split across early, middle, late, and extras."
        : "Show where overturn success changes across challenge timing phases.",
    honorsUserChartRequest,
    dataPoints: aggression.map((entry) => ({
      x: entry.category,
      y: mode === "challenge_volume" ? Number(entry.count ?? 0) : Number(entry.rate ?? 0),
    })),
  };
}

function buildHomeAwayPlan(
  payloadMap: ToolPayloadMap,
  message: string,
  mode: "challenges_per_game" | "overturn_rate",
): VisualizerPlan | null {
  const teamName = getTeamName(payloadMap);
  const sideSplits = getToolPayload<
    Array<{ side: string; games: number; challengesTotal: number; overturnRate: number }>
  >(payloadMap, "get_team_side_splits");
  if (!sideSplits?.length) return null;

  const requested = getRequestedChartType(message);
  const { chartType, honorsUserChartRequest } = pickChartType(requested, ["bar_chart", "table"], "bar_chart");

  return {
    chartTitle:
      mode === "challenges_per_game"
        ? `${teamName} Home vs Away Challenges per Game`
        : `${teamName} Home vs Away Overturn Rate`,
    chartType,
    xAxis: "Split",
    yAxis: mode === "challenges_per_game" ? "Challenges per Game" : "Overturn Rate",
    compareBy: null,
    filters: getTeamFilters(teamName),
    highlight:
      mode === "challenges_per_game"
        ? "Compare challenge volume per game at home versus away."
        : "Compare overturn success at home versus away.",
    honorsUserChartRequest,
    dataPoints: sideSplits.map((entry) => ({
      x: entry.side === "home" ? "Home" : entry.side === "away" ? "Away" : entry.side,
      y:
        mode === "challenges_per_game"
          ? Number(entry.games ?? 0) > 0
            ? Number(entry.challengesTotal ?? 0) / Number(entry.games ?? 1)
            : 0
          : Number(entry.overturnRate ?? 0),
    })),
  };
}

function buildScenarioMatrixPlan(
  payloadMap: ToolPayloadMap,
  message: string,
  mode: "challenge_volume" | "overturn_rate",
): VisualizerPlan | null {
  const teamName = getTeamName(payloadMap);
  const scenarioMatrix = getToolPayload<
    Array<{ rowLabel: string; colLabel: string; challenges: number; overturnRate: number }>
  >(payloadMap, "get_team_challenge_scenario_matrix");
  if (!scenarioMatrix?.length) return null;

  const requested = getRequestedChartType(message);
  const { chartType, honorsUserChartRequest } = pickChartType(requested, ["heatmap", "table"], "heatmap");

  return {
    chartTitle:
      mode === "challenge_volume"
        ? `${teamName} Scenario Matrix by Challenge Volume`
        : `${teamName} Scenario Matrix by Overturn Rate`,
    chartType,
    xAxis: "Base / Out State",
    yAxis: "Count State",
    compareBy: "Scenario bucket",
    filters: getTeamFilters(teamName),
    highlight:
      mode === "challenge_volume"
        ? "Show where challenge traffic clusters across scenario states."
        : "Show where overturn success is strongest across scenario states.",
    honorsUserChartRequest,
    dataPoints: scenarioMatrix.map((entry) => ({
      x: entry.rowLabel,
      y: entry.colLabel,
      value: mode === "challenge_volume" ? Number(entry.challenges ?? 0) : Number(entry.overturnRate ?? 0),
    })),
  };
}

function buildDecisionBreakdownPlan(
  payloadMap: ToolPayloadMap,
  message: string,
  mode: "surplus" | "expected_vs_realized",
): VisualizerPlan | null {
  const teamName = getTeamName(payloadMap);
  const report = getToolPayload<TeamDecisionValueReport>(payloadMap, "get_team_decision_value_report");
  const section = report?.breakdownSections?.find((entry) => entry.key === getBreakdownKey(message));
  if (!section?.entries?.length) return null;

  const requested = getRequestedChartType(message);
  const { chartType, honorsUserChartRequest } = pickChartType(requested, ["bar_chart", "table"], "bar_chart");

  return {
    chartTitle:
      mode === "surplus"
        ? `${teamName} Decision Surplus by ${section.title}`
        : `${teamName} Expected vs Realized Value by ${section.title}`,
    chartType,
    xAxis: section.title,
    yAxis: mode === "surplus" ? "Decision Surplus" : "Expected vs Realized Challenge Value",
    compareBy: mode === "surplus" ? null : "Expected vs Realized",
    filters: [...getTeamFilters(teamName), `breakdown: ${section.title}`],
    highlight:
      mode === "surplus"
        ? `Compare decision surplus across ${section.title.toLowerCase()}.`
        : `Compare expected and realized value across ${section.title.toLowerCase()}.`,
    honorsUserChartRequest,
    dataPoints:
      mode === "surplus"
        ? section.entries.map((entry) => ({ x: entry.label, y: Number(entry.decisionSurplus ?? 0) }))
        : section.entries.flatMap((entry) => [
            { x: entry.label, y: Number(entry.averageExpectedChallengeValue ?? 0), series: "Expected" },
            { x: entry.label, y: Number(entry.averageRealizedChallengeValue ?? 0), series: "Realized" },
          ]),
  };
}

function buildDeterministicTeamPlan(message: string, payloadMap: ToolPayloadMap): DeterministicVisualizerResult {
  const intent = inferTeamVisualizerIntent(message);
  if (!intent) {
    return {
      plan: null,
      citations: [],
      answer: buildUnsupportedTeamAnswer(),
    };
  }

  const builders: Record<TeamVisualizerIntent, (payloadMap: ToolPayloadMap, message: string) => VisualizerPlan | null> = {
    count_state_overturn_rate: (map, query) => buildCountStatePlan(map, query, "overturn_rate"),
    count_state_challenge_volume: (map, query) => buildCountStatePlan(map, query, "challenge_volume"),
    inning_challenge_volume: (map, query) => buildInningPlan(map, query, "challenge_volume"),
    inning_overturn_rate: (map, query) => buildInningPlan(map, query, "overturn_rate"),
    offense_defense_challenge_volume: (map, query) => buildOffenseDefensePlan(map, query, "challenge_volume"),
    offense_defense_overturn_rate: (map, query) => buildOffenseDefensePlan(map, query, "overturn_rate"),
    timing_phase_challenge_volume: (map, query) => buildTimingPhasePlan(map, query, "challenge_volume"),
    timing_phase_overturn_rate: (map, query) => buildTimingPhasePlan(map, query, "overturn_rate"),
    home_away_challenges_per_game: (map, query) => buildHomeAwayPlan(map, query, "challenges_per_game"),
    home_away_overturn_rate: (map, query) => buildHomeAwayPlan(map, query, "overturn_rate"),
    scenario_matrix_challenge_volume: (map, query) => buildScenarioMatrixPlan(map, query, "challenge_volume"),
    scenario_matrix_overturn_rate: (map, query) => buildScenarioMatrixPlan(map, query, "overturn_rate"),
    decision_surplus_by_breakdown: (map, query) => buildDecisionBreakdownPlan(map, query, "surplus"),
    decision_expected_vs_realized_by_breakdown: (map, query) => buildDecisionBreakdownPlan(map, query, "expected_vs_realized"),
  };

  const plan = builders[intent](payloadMap, message);
  if (!plan) {
    return {
      plan: null,
      citations: getTeamIntentTools(intent),
      answer: "AiBS found the right team data source for that chart request, but there was not enough plotted data in the current sample window to render a truthful chart.",
    };
  }

  return {
    plan,
    citations: getTeamIntentTools(intent),
  };
}

export const runVisualizerSurface: SurfaceRunner = async (params) => {
  const confidence = params.context?.scope === "team" ? "high" : "low";

  if (params.context?.scope === "team") {
    const intent = inferTeamVisualizerIntent(params.message);
    if (!intent) {
      return {
        answer: buildUnsupportedTeamAnswer(),
        confidence: "low",
        structuredPlan: null,
        citations: [],
        toolResults: [],
        usage: {
          inputTokens: Math.ceil(params.message.length / 4),
          outputTokens: 0,
        },
      };
    }

    const citations = getTeamIntentTools(intent);
    const toolResults = await resolveToolResults(params.context, { preferredToolNames: citations, maxArrayItems: 30 });
    const payloadMap = new Map(toolResults.map((tool) => [tool.toolName, tool.payload]));
    const deterministic = buildDeterministicTeamPlan(params.message, payloadMap);

    if (!deterministic.plan) {
      return {
        answer: deterministic.answer ?? buildUnsupportedTeamAnswer(),
        confidence: "low",
        structuredPlan: null,
        citations: deterministic.citations,
        toolResults,
        usage: {
          inputTokens: Math.ceil(params.message.length / 4),
          outputTokens: deterministic.answer ? Math.ceil(deterministic.answer.length / 4) : 0,
        },
      };
    }

    const answer = flattenStructuredPlan(deterministic.plan);
    return {
      answer,
      confidence,
      structuredPlan: deterministic.plan,
      citations: deterministic.citations,
      toolResults,
      usage: {
        inputTokens: Math.ceil(params.message.length / 4),
        outputTokens: Math.ceil(answer.length / 4),
      },
    };
  }

  const toolResults = await resolveToolResults(params.context);

  if (!params.openaiClient) {
    return {
      answer:
        "Visualizer planning currently supports deterministic team charts in AiBS. For other scopes, use a team page or ask a more specific baseball question once broader deterministic support is added.",
      confidence: "low",
      structuredPlan: null,
      citations: toolResults.map((tool) => tool.toolName),
      toolResults,
      usage: {
        inputTokens: Math.ceil(params.message.length / 4),
        outputTokens: 0,
      },
    };
  }

  const prompt = buildVisualizerPrompt(
    {
      audienceMode: params.audienceMode,
      taskFamily: params.taskFamily,
      terminologyAppendix: params.terminologyAppendix,
    },
    `Return strict JSON with this shape:
{
  "chartTitle": "short chart title",
  "chartType": "bar_chart | line_chart | scatter_plot | heatmap | timeline | table",
  "xAxis": "x-axis definition",
  "yAxis": "y-axis definition",
  "compareBy": "grouping or split dimension, or null",
  "filters": ["filter 1", "filter 2"],
  "highlight": "single-sentence rendering goal",
  "honorsUserChartRequest": true,
  "dataPoints": [
    { "x": "bucket 1", "y": 12 },
    { "x": "bucket 2", "y": 19 },
    { "x": "bucket 3", "y": 7 }
  ]
}

Rules:
- Return JSON only. No markdown. No prose outside the JSON object.
- Do not invent placeholder or fallback data.
- If the available tool outputs do not support a truthful chart, return an empty JSON object.
- Use only the supplied tool results as the source of truth for plotted values and labels.
- Always include actual plotted data in dataPoints when returning a chart.

Context: ${formatContextWindow(params.context)}
Recent conversation:
${params.transcript || "No prior turns."}
Planning request: ${params.message}
Tool results: ${JSON.stringify(toolResults).slice(0, 18000)}`,
  );

  const response = await params.openaiClient.responses.create({
    model: params.modelName,
    temperature: 0.2,
    input: prompt,
  });

  const raw = response.output_text?.trim() || "";
  const parsed = tryParseJsonObject(raw);
  const structuredPlan = normalizePlan(parsed);

  if (!structuredPlan) {
    return {
      answer:
        "AiBS could not produce a truthful chart specification from the available data for that request. Try a team page request with a clearer baseball split such as count state, inning, offense vs defense, or decision value.",
      confidence: "low",
      structuredPlan: null,
      citations: toolResults.map((tool) => tool.toolName),
      toolResults,
      usage: {
        inputTokens: response.usage?.input_tokens,
        outputTokens: response.usage?.output_tokens,
      },
    };
  }

  return {
    answer: flattenStructuredPlan(structuredPlan),
    confidence,
    structuredPlan,
    citations: toolResults.map((tool) => tool.toolName),
    toolResults,
    usage: {
      inputTokens: response.usage?.input_tokens,
      outputTokens: response.usage?.output_tokens,
    },
  };
};
