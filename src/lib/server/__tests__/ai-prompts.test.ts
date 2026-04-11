import { describe, expect, it } from "vitest";

import { buildBaseSystemPrompt } from "@/lib/server/ai/prompts/base";
import { buildChartInsightPrompt } from "@/lib/server/ai/prompts/chart-insight";
import { buildCopilotPrompt } from "@/lib/server/ai/prompts/copilot";
import { buildVisualizerPrompt } from "@/lib/server/ai/prompts/visualizer";

const context = {
  audienceMode: "org" as const,
  taskFamily: "inventory_deployment" as const,
  terminologyAppendix: "Voice Pack:\n- Use challenge-value language.",
};

describe("AI prompt builders", () => {
  it("injects terminology guidance into the base system prompt", () => {
    const prompt = buildBaseSystemPrompt(context);

    expect(prompt).toContain("You are AiBS");
    expect(prompt).toContain("Task family: inventory_deployment.");
    expect(prompt).toContain("Terminology guidance:");
    expect(prompt).toContain("challenge-value language");
  });

  it("assembles surface prompts on top of the base instructions", () => {
    const copilotPrompt = buildCopilotPrompt(context, "Answer this question.");
    const chartPrompt = buildChartInsightPrompt(context, "Interpret this chart.");
    const visualizerPrompt = buildVisualizerPrompt(context, "Plan this chart.");

    expect(copilotPrompt).toContain("Lead with the answer");
    expect(chartPrompt).toContain("Return structured chart interpretation");
    expect(visualizerPrompt).toContain("planning a baseball chart");
  });
});
