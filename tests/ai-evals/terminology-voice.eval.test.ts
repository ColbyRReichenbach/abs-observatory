import { describe, expect, it } from "vitest";

import { compileTerminologyAppendix, deriveSemanticTags, selectTerminologyBundle } from "@/lib/server/ai/terminology";

describe("AI terminology voice evals", () => {
  it("keeps fan copilot voice grounded in ABS-native terms", () => {
    const compiled = compileTerminologyAppendix(
      selectTerminologyBundle({
        surfaceKey: "copilot",
        audienceMode: "fan",
        taskFamily: "general_abs_explanation",
        semanticTags: deriveSemanticTags({
          message: "Explain ABS and what an overturned call means.",
          taskFamily: "general_abs_explanation",
        }),
      }),
    );

    expect(compiled.appendix).toContain("Voice Pack:");
    expect(compiled.appendix.toLowerCase()).toContain("challenged call");
    expect(compiled.appendix.toLowerCase()).toContain("baseball-native");
  });

  it("keeps org chart insight terminology centered on challenge value language", () => {
    const compiled = compileTerminologyAppendix(
      selectTerminologyBundle({
        surfaceKey: "chart_insight",
        audienceMode: "org",
        taskFamily: "inventory_deployment",
        semanticTags: deriveSemanticTags({
          message: "Where is the modeled challenge value actually showing up by inning phase?",
          taskFamily: "inventory_deployment",
          chartContext: {
            chartType: "team_inventory_deployment",
            chartKey: "team-inventory-deployment",
            chartTitle: "Usage vs Modeled Value Share",
            baseballQuestion: "Where is value showing up?",
            chartSummary: "Inning-phase deployment chart.",
            payload: {},
          },
        }),
      }),
    );

    expect(compiled.appendix.toLowerCase()).toContain("challenge value");
    expect(compiled.selectedCardSlugs).toContain("inventory-deployment");
    expect(compiled.selectedCardSlugs).toContain("challenge-value");
  });
});
