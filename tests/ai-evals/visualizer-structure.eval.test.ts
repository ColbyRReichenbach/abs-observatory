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

    expect(result.structuredPlan?.chartType).toBe("grouped comparison bar chart");
    expect(result.structuredPlan?.signalsToWatch.length).toBeGreaterThanOrEqual(2);
    expect(result.answer).toContain("Grouping:");
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

    expect(result.structuredPlan?.chartType).toBe("inning-phase leverage heatmap");
    expect(result.structuredPlan?.filters[0]).toMatch(/leverage/i);
    expect(result.answer).toContain("Signals To Watch:");
  });
});
