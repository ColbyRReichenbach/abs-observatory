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
});

type VisualizerPlan = z.infer<typeof visualizerPlanSchema>;

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

export const runVisualizerSurface: SurfaceRunner = async (params) => {
  const toolResults = await resolveToolResults(params.context);
  const confidence = toolResults.length >= 2 ? "medium" : "low";
  const fallbackPlan = buildFallbackPlan(params.message, params.taskFamily);

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
  "honorsUserChartRequest": true
}

Rules:
- Return JSON only. No markdown. No prose outside the JSON object.
- The output will be rendered directly as a chart preview, so do not write essay-style explanation.
- If the user names a chart type and it is implementable, honor it.
- If the user does not name a chart type, choose the best chart form from the allowed set.
- Use only AiBS-supported baseball/ABS views and labels.

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
  const structuredPlan = normalizePlan(parsed, fallbackPlan);

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
