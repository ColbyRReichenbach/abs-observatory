import { describe, expect, it } from "vitest";

import { compileTerminologyAppendix, deriveSemanticTags, loadTerminologySeedBundle, selectTerminologyBundle } from "@/lib/server/ai/terminology";

describe("AI terminology runtime", () => {
  it("loads the full seed bundle", () => {
    const bundle = loadTerminologySeedBundle();

    expect(bundle.cards).toHaveLength(61);
    expect(bundle.stylePacks).toHaveLength(6);
    expect(bundle.surfaceRules).toHaveLength(16);
  });

  it("selects required and preferred cards deterministically for chart insight org inventory deployment", () => {
    const semanticTags = deriveSemanticTags({
      message: "Where is the modeled challenge value actually showing up by inning phase?",
      taskFamily: "inventory_deployment",
      chartContext: {
        chartType: "team_inventory_deployment",
        chartKey: "team-inventory-deployment",
        chartTitle: "Usage vs Modeled Value Share",
        baseballQuestion: "Where is the value actually showing up?",
        chartSummary: "Inning-phase deployment chart.",
        payload: {},
      },
    });

    const selection = selectTerminologyBundle({
      surfaceKey: "chart_insight",
      audienceMode: "org",
      taskFamily: "inventory_deployment",
      semanticTags,
    });

    expect(selection.stylePack?.slug).toBe("chart-insight-org-v1");
    expect(selection.cards.map((card) => card.slug)).toContain("challenge-value");
    expect(selection.cards.map((card) => card.slug)).toContain("inventory-deployment");
    expect(selection.cards.length).toBeLessThanOrEqual(7);
  });

  it("compiles a concise appendix with metadata", () => {
    const selection = selectTerminologyBundle({
      surfaceKey: "copilot",
      audienceMode: "fan",
      taskFamily: "general_abs_explanation",
      semanticTags: ["challenged_call", "overturned_call", "challenge_value"],
    });

    const compiled = compileTerminologyAppendix(selection);

    expect(compiled.stylePackSlug).toBe("copilot-fan-v1");
    expect(compiled.selectedCardSlugs).toContain("challenged-call");
    expect(compiled.appendix).toContain("Voice Pack:");
    expect(compiled.appendix).toContain("Preferred Terms:");
    expect(compiled.appendixChars).toBeGreaterThan(0);
  });

  it("keeps terminology selection and compilation deterministic across repeated runs", () => {
    const input = {
      surfaceKey: "chart_insight" as const,
      audienceMode: "org" as const,
      taskFamily: "inventory_deployment" as const,
      semanticTags: ["challenge_value", "inventory_deployment", "late_close"] as const,
    };

    const first = compileTerminologyAppendix(selectTerminologyBundle(input));
    const second = compileTerminologyAppendix(selectTerminologyBundle(input));

    expect(first).toEqual(second);
    expect(first.appendixChars).toBeLessThanOrEqual(2500);
  });
});
