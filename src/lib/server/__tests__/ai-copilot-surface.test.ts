import { beforeEach, describe, expect, it, vi } from "vitest";

const resolveToolResultsMock = vi.fn();
const openAiResponsesCreateMock = vi.fn();

vi.mock("@/lib/server/ai-tools", () => ({
  resolveToolResults: resolveToolResultsMock,
}));

describe("copilot surface", () => {
  beforeEach(() => {
    resolveToolResultsMock.mockReset();
    openAiResponsesCreateMock.mockReset();
    openAiResponsesCreateMock.mockResolvedValue({
      id: "response-1",
      status: "completed",
      output_text: "The Yankees lead this season.",
      usage: {
        input_tokens: 100,
        output_tokens: 12,
      },
    });
  });

  it("narrows global team-leader asks to the team leaderboard payload", async () => {
    resolveToolResultsMock.mockResolvedValueOnce([
      { toolName: "get_home_team_leaderboard", payload: { leadersByTotalChallenges: [] } },
    ]);
    const { runCopilotSurface } = await import("@/lib/server/ai/surfaces/copilot");

    const result = await runCopilotSurface({
      openaiClient: { responses: { create: openAiResponsesCreateMock } } as never,
      modelName: "gpt-test",
      surface: "copilot",
      audienceMode: "org",
      taskFamily: "general_abs_explanation",
      message: "what team has the most challenges",
      transcript: "",
      terminologyAppendix: "",
      context: { scope: "global" },
    });

    expect(resolveToolResultsMock).toHaveBeenCalledWith(
      { scope: "global" },
      { preferredToolNames: ["get_home_team_leaderboard"] },
    );
    expect(result.answer).toBe("The Yankees lead this season.");
    expect(result.citations).toEqual(["get_home_team_leaderboard"]);
  });
});
