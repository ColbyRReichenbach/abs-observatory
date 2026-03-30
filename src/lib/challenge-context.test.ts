import { describe, expect, it } from "vitest";

import { formatCountStateLabel, formatCountTransitionLabel, getChallengeCountState } from "@/lib/challenge-context";

describe("challenge-context baseball labels", () => {
  it("renders terminal count states as baseball outcomes", () => {
    expect(formatCountStateLabel("4-2")).toBe("Walk");
    expect(formatCountStateLabel("3-3")).toBe("Strikeout");
  });

  it("preserves terminal outcomes in transitions", () => {
    expect(formatCountTransitionLabel("3-2", "4-2")).toBe("3-2 → Walk");
    expect(formatCountTransitionLabel("1-2", "1-3")).toBe("1-2 → Strikeout");
  });

  it("derives challenge count state labels with terminal outcomes", () => {
    expect(getChallengeCountState("3-2", "3-2", "4-2")).toMatchObject({
      beforeLabel: "3-2",
      afterLabel: "Walk",
      transitionLabel: "3-2 → Walk",
      terminalOutcome: "Walk",
      countAdvantageLabel: "Walk",
    });
  });
});
