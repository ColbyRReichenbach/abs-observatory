import { z } from "zod";

import { formatContextWindow } from "@/lib/copilot-context";
import { buildVisualizerPrompt } from "@/lib/server/ai/prompts/visualizer";
import type { SurfaceRunner } from "@/lib/server/ai/orchestrator";
import { resolveToolResults } from "@/lib/server/ai-tools";
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
  ).min(3).max(16),
});

type VisualizerPlan = z.infer<typeof visualizerPlanSchema>;

type ToolResult = {
  toolName: string;
  payload: unknown;
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

function buildFallbackPlan(message: string, taskFamily: string): VisualizerPlan {
  const normalizedMessage = message.trim() || "the current ABS question";

  if (taskFamily === "compare_entities_visual_plan") {
    return {
      chartTitle: "Comparison Snapshot",
      chartType: "bar_chart",
      xAxis: "Compared team, umpire, or game split",
      yAxis: "Primary ABS metric or modeled value gap",
      compareBy: "Entity category or comparison cohort",
      filters: ["Keep the sample window consistent across compared entities"],
      highlight: `Compare entities directly around ${normalizedMessage}.`,
      honorsUserChartRequest: false,
      dataPoints: [
        { x: "Team A", y: 14 },
        { x: "Team B", y: 11 },
        { x: "Team C", y: 9 },
        { x: "Team D", y: 7 },
      ],
    };
  }

  if (taskFamily === "timing_and_leverage_visual_plan") {
    return {
      chartTitle: "Timing And Leverage Map",
      chartType: "heatmap",
      xAxis: "Inning phase or game state bucket",
      yAxis: "Leverage or expected challenge value band",
      compareBy: "Late/close versus all other windows",
      filters: ["Focus on leverage-aware challenge windows"],
      highlight: `Show where challenge value concentrates around ${normalizedMessage}.`,
      honorsUserChartRequest: false,
      dataPoints: [
        { x: "Early", y: "Low", value: 2 },
        { x: "Middle", y: "Medium", value: 6 },
        { x: "Late", y: "High", value: 12 },
        { x: "Extras", y: "High", value: 4 },
      ],
    };
  }

  return {
    chartTitle: "ABS Comparison Table",
    chartType: "table",
    xAxis: "Entity or split bucket",
    yAxis: "Key ABS metric",
    compareBy: "Primary comparison group",
    filters: ["Current context only"],
    highlight: `Surface the cleanest comparison for ${normalizedMessage}.`,
    honorsUserChartRequest: false,
    dataPoints: [
      { x: "Split A", y: 12, label: "Primary" },
      { x: "Split B", y: 9, label: "Secondary" },
      { x: "Split C", y: 6, label: "Context" },
    ],
  };
}

function normalizePlan(
  candidate: unknown,
  fallbackPlan: VisualizerPlan,
): VisualizerPlan {
  const parsed = visualizerPlanSchema.safeParse(candidate);
  if (parsed.success) return parsed.data;
  return fallbackPlan;
}

function getToolPayload<T>(toolResults: ToolResult[], toolName: string): T | null {
  const entry = toolResults.find((tool) => tool.toolName === toolName);
  return (entry?.payload as T | undefined) ?? null;
}

function normalizeMessage(message: string) {
  return message.toLowerCase();
}

function buildTeamDeterministicPlan(message: string, toolResults: ToolResult[]): VisualizerPlan | null {
  const normalizedMessage = normalizeMessage(message);
  const summary = getToolPayload<{ teamName?: string }>(toolResults, "get_team_summary");
  const teamName = summary?.teamName ?? "Current Team";
  const scenarioMatrix = getToolPayload<
    Array<{
      colLabel: string;
      challenges: number;
      overturned: number;
      overturnRate: number;
    }>
  >(toolResults, "get_team_challenge_scenario_matrix");
  const inningEfficiency = getToolPayload<
    Array<{
      inning: number;
      category: string;
      sampleSize: number;
      overturnRate: number;
    }>
  >(toolResults, "get_team_inning_efficiency");

  const wantsCountState = /count state|count states|count\b/.test(normalizedMessage);
  const wantsOverturnRate = /overturn rate|overturn\b/.test(normalizedMessage);
  const wantsInning = /inning/.test(normalizedMessage);
  const wantsChallengeCount = /challenge swings|challenge count|challenge usage|review count|review volume|count of challenge/.test(
    normalizedMessage,
  );
  const wantsOffenseDefense = /offense vs defense|offensive vs defensive|offense and defense|offensive and defensive/.test(
    normalizedMessage,
  );

  if (scenarioMatrix?.length && wantsCountState) {
    const buckets = new Map<string, { challenges: number; overturned: number }>();
    for (const row of scenarioMatrix) {
      const current = buckets.get(row.colLabel) ?? { challenges: 0, overturned: 0 };
      current.challenges += Number(row.challenges ?? 0);
      current.overturned += Number(row.overturned ?? 0);
      buckets.set(row.colLabel, current);
    }

    const dataPoints = Array.from(buckets.entries())
      .map(([label, bucket]) => ({
        x: label,
        y: bucket.challenges > 0 ? bucket.overturned / bucket.challenges : 0,
      }))
      .filter((point) => Number.isFinite(Number(point.y)));

    if (dataPoints.length >= 3) {
      return {
        chartTitle: `${teamName} Overturn Rate by Count State`,
        chartType: "bar_chart",
        xAxis: "Count State",
        yAxis: "Overturn Rate",
        compareBy: null,
        filters: [`team: ${teamName}`, "season: current"],
        highlight: wantsOverturnRate
          ? "Compare overturn rate by count state."
          : "Show where reviewed count states are landing most often.",
        honorsUserChartRequest: true,
        dataPoints,
      };
    }
  }

  if (inningEfficiency?.length && wantsInning && wantsOffenseDefense) {
    const dataPoints = inningEfficiency.map((entry) => ({
      x: `Inning ${entry.inning}`,
      y: entry.category,
      value: entry.overturnRate,
    }));
    if (dataPoints.length >= 4) {
      return {
        chartTitle: `${teamName} Offensive vs Defensive Review Results by Inning`,
        chartType: "heatmap",
        xAxis: "Inning",
        yAxis: "Challenge Side",
        compareBy: "Offensive vs Defensive",
        filters: [`team: ${teamName}`, "season: current"],
        highlight: "Show where offensive and defensive challenges are converting by inning.",
        honorsUserChartRequest: true,
        dataPoints,
      };
    }
  }

  if (inningEfficiency?.length && wantsInning) {
    const buckets = new Map<number, number>();
    for (const row of inningEfficiency) {
      buckets.set(row.inning, (buckets.get(row.inning) ?? 0) + Number(row.sampleSize ?? 0));
    }
    const dataPoints = Array.from(buckets.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([inning, count]) => ({
        x: inning >= 9 ? "9+" : String(inning),
        y: count,
      }));

    if (dataPoints.length >= 3) {
      return {
        chartTitle: `${teamName} Challenge Swings by Inning`,
        chartType: wantsChallengeCount ? "bar_chart" : "line_chart",
        xAxis: "Inning",
        yAxis: "Challenge Swings",
        compareBy: null,
        filters: [`team: ${teamName}`, "season: current"],
        highlight: "Show where challenge traffic is concentrating across innings.",
        honorsUserChartRequest: true,
        dataPoints,
      };
    }
  }

  return null;
}

export const runVisualizerSurface: SurfaceRunner = async (params) => {
  const toolResults = await resolveToolResults(params.context);
  const confidence = toolResults.length >= 2 ? "medium" : "low";
  const deterministicPlan =
    params.context?.scope === "team" ? buildTeamDeterministicPlan(params.message, toolResults) : null;
  const fallbackPlan = deterministicPlan ?? buildFallbackPlan(params.message, params.taskFamily);

  if (!params.openaiClient) {
    const answer = flattenStructuredPlan(fallbackPlan);
    return {
      answer,
      confidence,
      structuredPlan: fallbackPlan,
      citations: toolResults.map((tool) => tool.toolName),
      toolResults,
      usage: {
        inputTokens: Math.ceil(params.message.length / 4),
        outputTokens: Math.ceil(answer.length / 4),
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
- The output will be rendered directly as a chart preview, so do not write essay-style explanation.
- If the user names a chart type and it is implementable, honor it.
- If the user does not name a chart type, choose the best chart form from the allowed set.
- Use only AiBS-supported baseball/ABS views and labels.
- If the request arrives from a team, umpire, or game page, treat that page context as the default entity unless the user explicitly asks to compare or switch scope.
- Use the supplied tool results as the source of truth for plotted values and labels.
- Always include actual plotted data in dataPoints.
- Scale the chart to the real values you provide. Do not use placeholders or fake normalized percentages unless the question itself asks for a rate.
- Keep dataPoints compact and readable: usually 4 to 12 marks.
- For heatmaps, use x and y as category labels and value as the numeric cell intensity.
- For scatter plots, use numeric x and numeric y.

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
  const structuredPlan = deterministicPlan ?? normalizePlan(parsed, fallbackPlan);

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
