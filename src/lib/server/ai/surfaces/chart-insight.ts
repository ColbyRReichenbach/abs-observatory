import { z } from "zod";

import type { StructuredChartInsight } from "@/lib/chart-insight-payload";
import { buildChartInsightPrompt } from "@/lib/server/ai/prompts/chart-insight";
import type { SurfaceRunner } from "@/lib/server/ai/orchestrator";

const structuredInsightSchema = z.object({
  headline: z.string().min(1).max(320),
  sections: z
    .array(
      z.object({
        label: z.string().min(1).max(120),
        body: z.string().min(1).max(1200),
      }),
    )
    .min(2)
    .max(4),
});

function flattenStructuredInsight(insight: StructuredChartInsight) {
  return [insight.headline, ...insight.sections.map((section) => `${section.label}: ${section.body}`)].join("\n\n");
}

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

export const runChartInsightSurface: SurfaceRunner = async (params) => {
  if (!params.chartContext) {
    throw new Error("Chart insight surface requires chartContext.");
  }

  const hasPriorTurns = Boolean(
    params.transcript && params.transcript.trim() && params.transcript.trim() !== "No prior turns.",
  );
  const responseShape = hasPriorTurns
    ? `Return strict JSON with this shape:
{
  "headline": "one concise direct answer",
  "sections": [
    {"label": "Direct answer", "body": "..."},
    {"label": "Data behind it", "body": "..."},
    {"label": "Baseball implication", "body": "..."}
  ]
}`
    : `Return strict JSON with this shape:
{
  "headline": "one concise chart thesis",
  "sections": [
    {"label": "What the chart shows", "body": "..."},
    {"label": "Baseball meaning", "body": "..."},
    {"label": "How to use it", "body": "..."}
  ]
}`;

  const objective = hasPriorTurns
    ? `This is a follow-up question about the same chart.

Answer the user's actual question first. Assume the reader can already see the chart and already has the initial explanation.
Do not repeat a generic chart overview unless it is necessary to answer the follow-up.
Go deeper into the numbers, buckets, and baseball decision logic that are visible in the supplied payload and prior turns.
If the sample is thin or directional, say so plainly.`
    : `The goal is to explain:
1. what the visual is measuring,
2. what the actual signal is,
3. what the baseball implication is.`;

  const prompt = buildChartInsightPrompt(
    {
      audienceMode: params.audienceMode,
      taskFamily: params.taskFamily,
      terminologyAppendix: params.terminologyAppendix,
    },
    `${responseShape}

${objective}

Baseball rules you must obey:
- If the payload says the final count has 3 strikes, call it a Strikeout, not just a pitcher-friendly count.
- If the payload says the final count has 4 balls, call it a Walk, not just a hitter-friendly count.
- Never change the count shown in the payload. If the visible baseball meaning is unusual, explain it from the payload rather than inventing a different count.
- If the payload provides explicit labels like beforeLabel, afterLabel, transitionLabel, terminalOutcome, or countAdvantageLabel, prefer those labels over your own wording.
- If a metric is missing, say it is unavailable. Do not backfill with guesses.

CHART TYPE: ${params.chartContext.chartType}
CHART TITLE: ${params.chartContext.chartTitle}
BASEBALL QUESTION: ${params.chartContext.baseballQuestion}
CHART SUMMARY: ${params.chartContext.chartSummary}
CHART PAYLOAD JSON: ${JSON.stringify(params.chartContext.payload).slice(0, 18000)}

RECENT CONVERSATION:
${params.transcript || "No prior turns."}

LATEST USER REQUEST:
${params.message}`,
  );

  if (!params.openaiClient) {
    const fallback: StructuredChartInsight = {
      headline: params.chartContext.chartSummary,
      sections: [
        {
          label: hasPriorTurns ? "Direct answer" : "What the chart shows",
          body: hasPriorTurns
            ? `Live AI follow-up is unavailable, so this fallback cannot answer the specific question "${params.message}" beyond the supplied chart summary.`
            : params.chartContext.baseballQuestion,
        },
        {
          label: hasPriorTurns ? "Data note" : "How to use it",
          body: "Live AI synthesis is unavailable because OPENAI_API_KEY is not configured. The chart payload is available, but this explanation is using the local fallback path.",
        },
      ],
    };

    return {
      answer: flattenStructuredInsight(fallback),
      confidence: "medium",
      citations: [params.chartContext.chartType],
      structuredInsight: fallback,
      toolResults: [{ toolName: params.chartContext.chartType, payload: params.chartContext.payload }],
      usage: {
        inputTokens: Math.ceil(params.message.length / 4),
        outputTokens: Math.ceil(flattenStructuredInsight(fallback).length / 4),
      },
    };
  }

  const response = await params.openaiClient.responses.create({
    model: params.modelName,
    temperature: 0.2,
    input: prompt,
  });

  const raw = response.output_text?.trim() || "";
  const parsed = tryParseJsonObject(raw);
  const structuredInsight = structuredInsightSchema.safeParse(parsed);

  if (structuredInsight.success) {
    return {
      answer: flattenStructuredInsight(structuredInsight.data),
      confidence: "medium",
      citations: [params.chartContext.chartType],
      structuredInsight: structuredInsight.data,
      toolResults: [{ toolName: params.chartContext.chartType, payload: params.chartContext.payload }],
      usage: {
        inputTokens: response.usage?.input_tokens,
        outputTokens: response.usage?.output_tokens,
      },
    };
  }

  const fallback: StructuredChartInsight = {
    headline: raw || params.chartContext.chartSummary,
    sections: [
      {
        label: "What the chart shows",
        body: raw || "The model did not return structured chart output.",
      },
      {
        label: "How to use it",
        body: "Treat this response cautiously and cross-check it against the visible chart and underlying sample.",
      },
    ],
  };

  return {
    answer: flattenStructuredInsight(fallback),
    confidence: "low",
    citations: [params.chartContext.chartType],
    structuredInsight: fallback,
    toolResults: [{ toolName: params.chartContext.chartType, payload: params.chartContext.payload }],
    usage: {
      inputTokens: response.usage?.input_tokens,
      outputTokens: response.usage?.output_tokens,
    },
  };
};
