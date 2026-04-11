import { describe, expect, it } from "vitest";

import { AI_BASE_PROMPT_TEMPLATE, buildAiPromptRegistrySnapshot, getAiPromptDefinition } from "@/lib/ai-prompt-registry";
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

    expect(copilotPrompt).toContain(getAiPromptDefinition("copilot").instructionBlocks[0]);
    expect(chartPrompt).toContain(getAiPromptDefinition("chart_insight").instructionBlocks[0]);
    expect(visualizerPrompt).toContain(getAiPromptDefinition("visualizer").instructionBlocks[0]);
  });

  it("exposes prompt registry snapshots for admin and generation metadata", () => {
    const snapshot = buildAiPromptRegistrySnapshot("chart_insight");

    expect(snapshot.version).toBe(getAiPromptDefinition("chart_insight").version);
    expect(snapshot.baseTemplateVersion).toBe(AI_BASE_PROMPT_TEMPLATE.version);
    expect(snapshot.surfaceInstructionBlocks).toContain("If the sample is thin or directional, say so plainly.");
    expect(snapshot.terminologyMode).toBe("deterministic_seed_bundle_v1");
  });
});
