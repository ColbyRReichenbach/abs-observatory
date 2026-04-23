import { describe, expect, it } from "vitest";

import { getBarPreviewLayout } from "@/components/analytics/ai-bs-visualizer-chat";
import type { AIVisualizerPlan } from "@/lib/types";

describe("getBarPreviewLayout", () => {
  it("anchors all-positive bars from the chart baseline instead of the top edge", () => {
    const plan: AIVisualizerPlan = {
      chartTitle: "Challenge Swings by Inning",
      chartType: "bar_chart",
      xAxis: "Inning",
      yAxis: "Number of Challenges",
      compareBy: null,
      filters: ["team: Cardinals"],
      highlight: "Show where challenge traffic concentrates.",
      honorsUserChartRequest: true,
      dataPoints: [
        { x: "1", y: 6 },
        { x: "2", y: 4 },
        { x: "3", y: 12 },
      ],
    };

    const layout = getBarPreviewLayout(plan);

    expect(layout.zeroPosition).toBe(0);
    expect(layout.bars.every((bar) => bar.bottomPercent === 0)).toBe(true);
    expect(layout.bars.every((bar) => bar.heightPercent > 0)).toBe(true);
  });

  it("keeps a mixed-sign chart centered around the true zero line", () => {
    const plan: AIVisualizerPlan = {
      chartTitle: "Value Delta by Window",
      chartType: "bar_chart",
      xAxis: "Window",
      yAxis: "Win Expectancy Delta",
      compareBy: null,
      filters: ["team: Cardinals"],
      highlight: "Compare positive and negative swings.",
      honorsUserChartRequest: true,
      dataPoints: [
        { x: "Early", y: -0.02 },
        { x: "Late", y: 0.05 },
        { x: "Extras", y: 0.01 },
      ],
    };

    const layout = getBarPreviewLayout(plan);

    expect(layout.zeroPosition).toBeGreaterThan(0);
    expect(layout.zeroPosition).toBeLessThan(100);
    expect(layout.bars.some((bar) => bar.topPercent !== null)).toBe(true);
    expect(layout.bars.some((bar) => bar.bottomPercent !== null)).toBe(true);
  });
});
