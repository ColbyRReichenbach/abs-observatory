import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/server/ai-tools", () => ({
  resolveToolResults: vi.fn().mockResolvedValue([]),
}));

import { runVisualizerSurface } from "@/lib/server/ai/surfaces/visualizer";

describe("AI visualizer structure evals", () => {
  it("returns a comparison-oriented plan for compare requests", async () => {
    const result = await runVisualizerSurface({
      openaiClient: null,
      modelName: "gpt-4.1-mini",
      surface: "visualizer",
      audienceMode: "org",
      taskFamily: "compare_entities_visual_plan",
      message: "Compare the Yankees and Twins challenge timing profiles.",
      transcript: "No prior turns.",
      terminologyAppendix: "",
      context: { scope: "global" },
    });

    expect(result.structuredPlan?.chartType).toBe("bar_chart");
    expect(result.structuredPlan?.compareBy).toBeTruthy();
    expect(result.structuredPlan?.dataPoints.length).toBeGreaterThanOrEqual(3);
    expect(result.structuredPlan?.filters.length).toBeGreaterThanOrEqual(1);
    expect(result.answer).toContain("Chart Type: bar_chart");
  });

  it("returns a leverage-oriented plan for timing and leverage asks", async () => {
    const result = await runVisualizerSurface({
      openaiClient: null,
      modelName: "gpt-4.1-mini",
      surface: "visualizer",
      audienceMode: "org",
      taskFamily: "timing_and_leverage_visual_plan",
      message: "Show me where late leverage creates challenge value.",
      transcript: "No prior turns.",
      terminologyAppendix: "",
      context: { scope: "global" },
    });

    expect(result.structuredPlan?.chartType).toBe("heatmap");
    expect(result.structuredPlan?.filters[0]).toMatch(/leverage/i);
    expect(result.structuredPlan?.dataPoints.length).toBeGreaterThanOrEqual(3);
    expect(result.answer).toContain("Chart Type: heatmap");
  });
});
