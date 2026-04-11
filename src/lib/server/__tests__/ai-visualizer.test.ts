import { describe, expect, it } from "vitest";

import { runVisualizerSurface } from "@/lib/server/ai/surfaces/visualizer";

describe("runVisualizerSurface", () => {
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

    expect(result.structuredPlan?.chartType).toBe("inning-phase leverage heatmap");
    expect(result.structuredPlan?.caveats[0]).toMatch(/Fallback plan/i);
    expect(result.answer).toContain("Chart Type:");
    expect(result.answer).not.toContain("vague essay");
  });
});
