import { describe, expect, it } from "vitest";

import {
  buildAiExecutionTelemetry,
  EMPTY_TERMINOLOGY_TELEMETRY,
  estimateAiPromptChars,
} from "@/lib/server/ai/telemetry";

describe("AI telemetry helpers", () => {
  it("normalizes missing terminology metadata into safe defaults", () => {
    const telemetry = buildAiExecutionTelemetry({
      surface: "copilot",
      taskFamily: "general_abs_explanation",
      promptVersion: "ai_chat_v1",
      terminology: null,
      estimatedPromptChars: null,
    });

    expect(telemetry.terminology).toEqual(EMPTY_TERMINOLOGY_TELEMETRY);
    expect(telemetry.estimatedPromptChars).toBe(0);
    expect(telemetry.hasTerminology).toBe(false);
    expect(telemetry.metadataComplete).toBe(true);
  });

  it("estimates prompt size from chart, conversation, and terminology inputs", () => {
    const estimatedChars = estimateAiPromptChars({
      surface: "chart_insight",
      message: "What stands out?",
      transcript: "USER: What stands out?\nASSISTANT: Looking at the chart...",
      terminologyAppendix: "Voice Pack:\n- Use ABS-native language.",
      contextWindow: "team context",
      chartContext: {
        chartType: "team_inventory_deployment",
        chartKey: "team-inventory-deployment",
        chartTitle: "Usage vs Modeled Value Share",
        baseballQuestion: "Where is challenge value showing up?",
        chartSummary: "Inning-phase deployment view.",
        payload: { buckets: [{ inningBucket: "late", share: 0.24 }] },
      },
    });

    expect(estimatedChars).toBeGreaterThan(150);
  });
});
