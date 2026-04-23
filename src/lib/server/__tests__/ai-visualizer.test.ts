import { beforeEach, describe, expect, it, vi } from "vitest";

const { resolveToolResultsMock } = vi.hoisted(() => ({
  resolveToolResultsMock: vi.fn(),
}));

vi.mock("@/lib/server/ai-tools", () => ({
  resolveToolResults: resolveToolResultsMock,
}));

import { runVisualizerSurface } from "@/lib/server/ai/surfaces/visualizer";

describe("runVisualizerSurface", () => {
  beforeEach(() => {
    resolveToolResultsMock.mockReset();
    resolveToolResultsMock.mockResolvedValue([]);
  });

  it("returns a structured fallback plan when OpenAI is unavailable", async () => {
    const result = await runVisualizerSurface({
      openaiClient: null,
      modelName: "gpt-4.1-mini",
      surface: "visualizer",
      audienceMode: "fan",
      taskFamily: "question_to_visual_plan",
      message: "Show me the best chart for challenge timing.",
      transcript: "No prior turns.",
      terminologyAppendix: "",
      context: { scope: "global" },
    });

    expect(result.structuredPlan?.chartType).toBeTruthy();
    expect(result.answer).toContain("Chart Type:");
  });

  it("falls back to a valid structured plan when the model returns invalid output", async () => {
    const result = await runVisualizerSurface({
      openaiClient: {
        responses: {
          create: async () => ({
            output_text: "Here is a vague essay instead of the requested JSON.",
            usage: {
              input_tokens: 100,
              output_tokens: 50,
            },
          }),
        },
      } as never,
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
    expect(result.structuredPlan?.chartTitle).toBe("Timing And Leverage Map");
    expect(result.structuredPlan?.highlight).toMatch(/challenge value/i);
    expect(result.answer).toContain("Chart Title:");
    expect(result.answer).not.toContain("vague essay");
  });

  it("builds a deterministic team count-state plan from page-scoped tool data", async () => {
    resolveToolResultsMock.mockResolvedValueOnce([
      {
        toolName: "get_team_summary",
        payload: {
          teamName: "St. Louis Cardinals",
        },
      },
      {
        toolName: "get_team_challenge_scenario_matrix",
        payload: [
          {
            colLabel: "Pitcher Ahead",
            challenges: 10,
            overturned: 6,
            overturnRate: 0.6,
          },
          {
            colLabel: "Even Count",
            challenges: 12,
            overturned: 9,
            overturnRate: 0.75,
          },
          {
            colLabel: "Hitter Ahead",
            challenges: 8,
            overturned: 5,
            overturnRate: 0.625,
          },
          {
            colLabel: "Full Count",
            challenges: 4,
            overturned: 2,
            overturnRate: 0.5,
          },
        ],
      },
    ]);

    const result = await runVisualizerSurface({
      openaiClient: null,
      modelName: "gpt-4.1-mini",
      surface: "visualizer",
      audienceMode: "fan",
      taskFamily: "question_to_visual_plan",
      message: "Compare overturn rate by count state.",
      transcript: "No prior turns.",
      terminologyAppendix: "",
      context: { scope: "team", entityId: "138", range: "season" },
    });

    expect(result.structuredPlan?.chartTitle).toBe("St. Louis Cardinals Overturn Rate by Count State");
    expect(result.structuredPlan?.dataPoints).toEqual([
      { x: "Pitcher Ahead", y: 0.6 },
      { x: "Even Count", y: 0.75 },
      { x: "Hitter Ahead", y: 0.625 },
      { x: "Full Count", y: 0.5 },
    ]);
  });

  it("treats offense-v-defense shorthand as a deterministic heatmap request on team pages", async () => {
    resolveToolResultsMock.mockResolvedValueOnce([
      {
        toolName: "get_team_summary",
        payload: {
          teamName: "St. Louis Cardinals",
        },
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
      audienceMode: "fan",
      taskFamily: "question_to_visual_plan",
      message: "Show me challenges per offense v defense.",
      transcript: "No prior turns.",
      terminologyAppendix: "",
      context: { scope: "team", entityId: "138", range: "season" },
    });

    expect(result.structuredPlan?.chartType).toBe("heatmap");
    expect(result.structuredPlan?.chartTitle).toBe("St. Louis Cardinals Offensive vs Defensive Review Results by Inning");
    expect(result.structuredPlan?.dataPoints).toEqual([
      { x: "Inning 1", y: "Offensive", value: 0.5 },
      { x: "Inning 1", y: "Defensive", value: 0.25 },
      { x: "Inning 2", y: "Offensive", value: 0.67 },
      { x: "Inning 2", y: "Defensive", value: 0.5 },
    ]);
  });
});
