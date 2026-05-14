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

  it("fails closed when non-team visualizer requests have no deterministic support", async () => {
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

    expect(result.structuredPlan).toBeNull();
    expect(result.answer).toMatch(/deterministic team charts/i);
  });

  it("fails closed when the non-team model returns invalid output", async () => {
    const createMock = vi.fn(async () => ({
      output_text: "Here is a vague essay instead of the requested JSON.",
      usage: {
        input_tokens: 100,
        output_tokens: 50,
      },
    }));

    const result = await runVisualizerSurface({
      openaiClient: {
        responses: {
          create: createMock,
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

    expect(result.structuredPlan).toBeNull();
    expect(result.answer).toMatch(/could not produce a truthful chart specification/i);
    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        input: [
          expect.objectContaining({ role: "developer" }),
          expect.objectContaining({ role: "user", content: expect.stringContaining("Planning request:") }),
        ],
      }),
    );
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

  it("treats explicit offense-v-defense heatmap requests as overturn-rate heatmaps on team pages", async () => {
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
      message: "Show a heatmap of offense vs defense challenge results by inning.",
      transcript: "No prior turns.",
      terminologyAppendix: "",
      context: { scope: "team", entityId: "138", range: "season" },
    });

    expect(result.structuredPlan?.chartType).toBe("heatmap");
    expect(result.structuredPlan?.chartTitle).toBe("St. Louis Cardinals Offensive vs Defensive Overturn Rate by Inning");
    expect(result.structuredPlan?.dataPoints).toEqual([
      { x: "Inning 1", y: "Offensive", value: 0.5 },
      { x: "Inning 1", y: "Defensive", value: 0.25 },
      { x: "Inning 2", y: "Offensive", value: 0.67 },
      { x: "Inning 2", y: "Defensive", value: 0.5 },
    ]);
  });

  it("builds grouped bar data for offense-v-defense challenge volume by inning", async () => {
    const inningEfficiencyPayload = Array.from({ length: 9 }, (_, index) => {
      const inning = index + 1;
      return [
        { inning, category: "Defensive", sampleSize: inning + 3, overturnRate: 0.25 },
        { inning, category: "Offensive", sampleSize: inning + 4, overturnRate: 0.5 },
      ];
    }).flat();

    resolveToolResultsMock.mockResolvedValueOnce([
      {
        toolName: "get_team_summary",
        payload: {
          teamName: "St. Louis Cardinals",
        },
      },
      {
        toolName: "get_team_inning_efficiency",
        payload: inningEfficiencyPayload,
      },
    ]);

    const result = await runVisualizerSurface({
      openaiClient: null,
      modelName: "gpt-4.1-mini",
      surface: "visualizer",
      audienceMode: "fan",
      taskFamily: "question_to_visual_plan",
      message: "Show me challenges per offense v defense by inning in a bar chart.",
      transcript: "No prior turns.",
      terminologyAppendix: "",
      context: { scope: "team", entityId: "138", range: "season" },
    });

    expect(result.structuredPlan?.chartType).toBe("bar_chart");
    expect(result.structuredPlan?.chartTitle).toBe("St. Louis Cardinals Offense vs Defense Challenge Volume by Inning");
    expect(result.structuredPlan?.dataPoints).toHaveLength(18);
    expect(result.structuredPlan?.dataPoints.at(0)).toEqual({ x: "Inning 1", y: 4, series: "Defensive" });
    expect(result.structuredPlan?.dataPoints.at(-1)).toEqual({ x: "Inning 9", y: 13, series: "Offensive" });
  });

  it("builds decision-value charts from the requested breakdown dimension", async () => {
    resolveToolResultsMock.mockResolvedValueOnce([
      {
        toolName: "get_team_summary",
        payload: {
          teamName: "Cincinnati Reds",
        },
      },
      {
        toolName: "get_team_decision_value_report",
        payload: {
          breakdownSections: [
            {
              key: "count_state",
              title: "Count State",
              entries: [
                {
                  label: "Hitter Ahead",
                  challenges: 18,
                  averageExpectedChallengeValue: -0.1728,
                  averageRealizedChallengeValue: 0.0338,
                  decisionSurplus: 0.2066,
                  modelConfidence: "low",
                },
                {
                  label: "Even Count",
                  challenges: 27,
                  averageExpectedChallengeValue: -0.1791,
                  averageRealizedChallengeValue: -0.0034,
                  decisionSurplus: 0.1757,
                  modelConfidence: "low",
                },
                {
                  label: "Pitcher Ahead",
                  challenges: 14,
                  averageExpectedChallengeValue: -0.1803,
                  averageRealizedChallengeValue: -0.0165,
                  decisionSurplus: 0.1638,
                  modelConfidence: "low",
                },
              ],
            },
          ],
        },
      },
    ]);

    const result = await runVisualizerSurface({
      openaiClient: null,
      modelName: "gpt-4.1-mini",
      surface: "visualizer",
      audienceMode: "org",
      taskFamily: "question_to_visual_plan",
      message: "Compare expected vs realized value by count state in a bar chart.",
      transcript: "No prior turns.",
      terminologyAppendix: "",
      context: { scope: "team", entityId: "113", range: "season" },
    });

    expect(result.structuredPlan?.chartTitle).toBe("Cincinnati Reds Expected vs Realized Value by Count State");
    expect(result.structuredPlan?.chartType).toBe("bar_chart");
    expect(result.structuredPlan?.dataPoints).toEqual([
      { x: "Hitter Ahead", y: -0.1728, series: "Expected" },
      { x: "Hitter Ahead", y: 0.0338, series: "Realized" },
      { x: "Even Count", y: -0.1791, series: "Expected" },
      { x: "Even Count", y: -0.0034, series: "Realized" },
      { x: "Pitcher Ahead", y: -0.1803, series: "Expected" },
      { x: "Pitcher Ahead", y: -0.0165, series: "Realized" },
    ]);
  });
});
