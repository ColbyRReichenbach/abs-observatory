import { describe, expect, it } from "vitest";

import { resolveTaskFamily } from "@/lib/server/ai/task-family";

describe("resolveTaskFamily", () => {
  it("maps known chart types to chart insight families", () => {
    expect(
      resolveTaskFamily({
        surface: "chart_insight",
        message: "What stands out here?",
        audienceMode: "org",
        chartContext: {
          chartType: "team_inventory_deployment",
          chartKey: "team-inventory-deployment",
          chartTitle: "Usage vs Modeled Value Share",
          baseballQuestion: "Where is the value actually showing up?",
          chartSummary: "Inning-phase deployment chart.",
          payload: {},
        },
      }),
    ).toBe("inventory_deployment");
  });

  it("routes visualizer comparisons to compare_entities_visual_plan", () => {
    expect(
      resolveTaskFamily({
        surface: "visualizer",
        message: "Compare the Yankees and Twins challenge timing profiles.",
        audienceMode: "org",
      }),
    ).toBe("compare_entities_visual_plan");
  });

  it("routes scoped game copilot asks to game_summary", () => {
    expect(
      resolveTaskFamily({
        surface: "copilot",
        message: "What happened in this game?",
        audienceMode: "fan",
        context: { scope: "game", entityId: "12345" },
      }),
    ).toBe("game_summary");
  });

  it("routes global ABS explainers to general_abs_explanation", () => {
    expect(
      resolveTaskFamily({
        surface: "copilot",
        message: "Explain ABS and what an overturned call means.",
        audienceMode: "fan",
        context: { scope: "global" },
      }),
    ).toBe("general_abs_explanation");
  });
});
