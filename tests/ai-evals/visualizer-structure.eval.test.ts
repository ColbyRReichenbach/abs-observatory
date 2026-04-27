import { describe, expect, it, vi } from "vitest";

const { resolveToolResultsMock } = vi.hoisted(() => ({
  resolveToolResultsMock: vi.fn(),
}));

vi.mock("@/lib/server/ai-tools", () => ({
  resolveToolResults: resolveToolResultsMock,
}));

import { runVisualizerSurface } from "@/lib/server/ai/surfaces/visualizer";

describe("AI visualizer structure evals", () => {
  it("returns a comparison-oriented deterministic plan for count-state requests", async () => {
    resolveToolResultsMock.mockResolvedValueOnce([
      {
        toolName: "get_team_summary",
        payload: { teamName: "St. Louis Cardinals" },
      },
      {
        toolName: "get_team_challenge_scenario_matrix",
        payload: [
          { colLabel: "Pitcher Ahead", challenges: 10, overturned: 6, overturnRate: 0.6 },
          { colLabel: "Even Count", challenges: 12, overturned: 8, overturnRate: 0.6667 },
          { colLabel: "Hitter Ahead", challenges: 8, overturned: 6, overturnRate: 0.75 },
          { colLabel: "Full Count", challenges: 4, overturned: 2, overturnRate: 0.5 },
        ],
      },
    ]);

    const result = await runVisualizerSurface({
      openaiClient: null,
      modelName: "gpt-4.1-mini",
      surface: "visualizer",
      audienceMode: "org",
      taskFamily: "compare_entities_visual_plan",
      message: "Compare overturn rate by count state in a bar chart.",
      transcript: "No prior turns.",
      terminologyAppendix: "",
      context: { scope: "team", entityId: "138", range: "season" },
    });

    expect(result.structuredPlan?.chartType).toBe("bar_chart");
    expect(result.structuredPlan?.chartTitle).toMatch(/Count State/);
    expect(result.structuredPlan?.dataPoints.length).toBeGreaterThanOrEqual(3);
    expect(result.structuredPlan?.filters.length).toBeGreaterThanOrEqual(1);
    expect(result.answer).toContain("Chart Type: bar_chart");
  });

  it("returns a heatmap plan for explicit offense-v-defense heatmap asks", async () => {
    resolveToolResultsMock.mockResolvedValueOnce([
      {
        toolName: "get_team_summary",
        payload: { teamName: "St. Louis Cardinals" },
      },
      {
        toolName: "get_team_inning_efficiency",
        payload: [
          { inning: 1, category: "Offensive", sampleSize: 6, overturnRate: 0.5 },
          { inning: 1, category: "Defensive", sampleSize: 4, overturnRate: 0.25 },
          { inning: 2, category: "Offensive", sampleSize: 3, overturnRate: 0.67 },
          { inning: 2, category: "Defensive", sampleSize: 2, overturnRate: 0.5 },
        ],
      },
    ]);

    const result = await runVisualizerSurface({
      openaiClient: null,
      modelName: "gpt-4.1-mini",
      surface: "visualizer",
      audienceMode: "org",
      taskFamily: "timing_and_leverage_visual_plan",
      message: "Show a heatmap of offense vs defense challenge results by inning.",
      transcript: "No prior turns.",
      terminologyAppendix: "",
      context: { scope: "team", entityId: "138", range: "season" },
    });

    expect(result.structuredPlan?.chartType).toBe("heatmap");
    expect(result.structuredPlan?.filters[0]).toMatch(/team/i);
    expect(result.structuredPlan?.dataPoints.length).toBeGreaterThanOrEqual(4);
    expect(result.answer).toContain("Chart Type: heatmap");
  });
});
