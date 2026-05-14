import { describe, expect, it, vi } from "vitest";

import { runChartInsightSurface } from "@/lib/server/ai/surfaces/chart-insight";

const chartContext = {
  chartType: "team_inventory_deployment",
  chartKey: "team-inventory-deployment",
  chartTitle: "Usage vs Modeled Value Share",
  baseballQuestion: "Where is challenge value showing up by inning phase?",
  chartSummary: "Late innings are carrying a disproportionate share of modeled challenge value.",
  payload: {
    buckets: [
      { inningBucket: "1-3", reviewShare: 0.18, valueShare: 0.1 },
      { inningBucket: "7-9", reviewShare: 0.31, valueShare: 0.47 },
    ],
  },
} as const;

describe("runChartInsightSurface", () => {
  it("returns a structured fallback when OpenAI is unavailable", async () => {
    const result = await runChartInsightSurface({
      openaiClient: null,
      modelName: "gpt-4.1-mini",
      surface: "chart_insight",
      audienceMode: "org",
      taskFamily: "inventory_deployment",
      message: "What does this say about deployment discipline?",
      transcript: "No prior turns.",
      terminologyAppendix: "",
      chartContext,
    });

    expect(result.structuredInsight?.headline).toBe(chartContext.chartSummary);
    expect(result.structuredInsight?.sections.length).toBeGreaterThanOrEqual(2);
    expect(result.citations).toEqual([chartContext.chartType]);
  });

  it("coerces invalid model output into a safe structured chart insight", async () => {
    const createMock = vi.fn(async () => ({
      output_text: "This is an unstructured answer that ignored the JSON contract.",
      usage: {
        input_tokens: 140,
        output_tokens: 80,
      },
    }));

    const result = await runChartInsightSurface({
      openaiClient: {
        responses: {
          create: createMock,
        },
      } as never,
      modelName: "gpt-4.1-mini",
      surface: "chart_insight",
      audienceMode: "org",
      taskFamily: "inventory_deployment",
      message: "What should a front office take from this chart?",
      transcript: "No prior turns.",
      terminologyAppendix: "",
      chartContext,
    });

    expect(result.structuredInsight?.sections.length).toBeGreaterThanOrEqual(2);
    expect(result.answer).toContain("How to use it");
    expect(result.citations).toEqual([chartContext.chartType]);
    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        input: [
          expect.objectContaining({ role: "developer" }),
          expect.objectContaining({ role: "user", content: expect.stringContaining("LATEST USER REQUEST:") }),
        ],
      }),
    );
  });
});
