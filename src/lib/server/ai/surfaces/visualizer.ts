import { z } from "zod";

import { formatContextWindow } from "@/lib/copilot-context";
import { buildVisualizerPrompt } from "@/lib/server/ai/prompts/visualizer";
import type { SurfaceRunner } from "@/lib/server/ai/orchestrator";
import { resolveToolResults } from "@/lib/server/ai-tools";
import type { AIVisualizerPlan } from "@/lib/types";

const visualizerPlanSchema = z.object({
  chartType: z.string().min(1).max(120),
  whyThisChart: z.string().min(1).max(500),
  xAxis: z.string().min(1).max(160),
  yAxis: z.string().min(1).max(160),
  grouping: z.string().min(1).max(160),
  filters: z.array(z.string().min(1).max(160)).min(0).max(6),
  signalsToWatch: z.array(z.string().min(1).max(220)).min(2).max(6),
  caveats: z.array(z.string().min(1).max(220)).min(1).max(5),
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
    `Chart Type: ${plan.chartType}`,
    `Why: ${plan.whyThisChart}`,
    `X-Axis: ${plan.xAxis}`,
    `Y-Axis: ${plan.yAxis}`,
    `Grouping: ${plan.grouping}`,
    `Filters: ${plan.filters.join(", ") || "None"}`,
    `Signals To Watch: ${plan.signalsToWatch.join("; ")}`,
    `Caveats: ${plan.caveats.join("; ")}`,
  ].join("\n\n");
}

function buildFallbackPlan(message: string, taskFamily: string): VisualizerPlan {
  const normalizedMessage = message.trim() || "the current ABS question";

  if (taskFamily === "compare_entities_visual_plan") {
    return {
      chartType: "grouped comparison bar chart",
      whyThisChart: `A grouped comparison bar chart is the clearest fallback for comparing entities on ${normalizedMessage}.`,
      xAxis: "Compared team, umpire, or game split",
      yAxis: "Primary ABS metric or modeled value gap",
      grouping: "Entity category or comparison cohort",
      filters: ["Keep the sample window consistent across compared entities"],
      signalsToWatch: ["Largest gap between entities", "Whether the leader also has stable sample size"],
      caveats: ["Fallback plan is generic because live visual planning was unavailable."],
    };
  }

  if (taskFamily === "timing_and_leverage_visual_plan") {
    return {
      chartType: "inning-phase leverage heatmap",
      whyThisChart: `A leverage heatmap is the clearest fallback for showing when challenge value concentrates around ${normalizedMessage}.`,
      xAxis: "Inning phase or game state bucket",
      yAxis: "Leverage or expected challenge value band",
      grouping: "Late/close versus all other windows",
      filters: ["Focus on leverage-aware challenge windows"],
      signalsToWatch: ["Where modeled value clusters late", "Whether usage aligns with leverage"],
      caveats: ["Fallback plan is generic because live visual planning was unavailable."],
    };
  }

  return {
    chartType: "comparison table",
    whyThisChart: `A comparison table is the safest fallback for planning around ${normalizedMessage} when live visualization planning is unavailable.`,
    xAxis: "Entity or split bucket",
    yAxis: "Key ABS metric",
    grouping: "Primary comparison group",
    filters: ["Current context only"],
    signalsToWatch: ["Biggest separation between groups", "Sample stability"],
    caveats: ["Fallback plan is generic because live visual planning is unavailable."],
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
  "chartType": "specific chart or table recommendation",
  "whyThisChart": "why this is the best fit for the question",
  "xAxis": "x-axis definition",
  "yAxis": "y-axis definition",
  "grouping": "grouping or split dimension",
  "filters": ["filter 1", "filter 2"],
  "signalsToWatch": ["signal 1", "signal 2"],
  "caveats": ["caveat 1"]
}

Use only AiBS-supported or clearly implementable baseball/ABS chart forms.

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
