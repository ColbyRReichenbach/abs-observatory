import { describe, expect, it } from "vitest";

import { formatContextWindow, inferCopilotContext, withContextPrompt } from "@/lib/copilot-context";

describe("copilot context", () => {
  it("infers route scopes correctly", () => {
    expect(inferCopilotContext("/")).toEqual({ scope: "global", range: undefined });
    expect(inferCopilotContext("/game/123")).toEqual({ scope: "game", entityId: "123", range: undefined });
    expect(inferCopilotContext("/teams/111", { range: "30d" })).toEqual({ scope: "team", entityId: "111", range: "30d" });
    expect(inferCopilotContext("/umpires/77", { range: "all" })).toEqual({
      scope: "umpire",
      entityId: "77",
      range: undefined,
    });
  });

  it("formats context window and injects scoped prompt", () => {
    const context = inferCopilotContext("/teams/111", { range: "season" });
    const windowText = formatContextWindow(context);
    const prompt = withContextPrompt("What is the overturn rate?", context);

    expect(windowText).toContain("Team 111");
    expect(prompt).toContain("[Context:");
    expect(prompt).toContain("What is the overturn rate?");
  });
});
