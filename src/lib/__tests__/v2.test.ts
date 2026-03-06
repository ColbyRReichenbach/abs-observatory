import { describe, expect, it } from "vitest";

import { estimateChallengeValue } from "../v2";

describe("challenge value stub", () => {
  it("returns cannot_challenge when no challenges remain", () => {
    const result = estimateChallengeValue({
      inning: 8,
      balls: 3,
      strikes: 2,
      outs: 1,
      scoreDiffBattingTeam: 0,
      runnersOnBase: 2,
      estimatedOverturnProbability: 0.6,
      challengesRemaining: 0,
    });
    expect(result.recommendation).toBe("cannot_challenge");
    expect(result.expectedWpDelta).toBe(0);
  });

  it("recommends challenge in high leverage with high overturn probability", () => {
    const result = estimateChallengeValue({
      inning: 9,
      balls: 3,
      strikes: 2,
      outs: 2,
      scoreDiffBattingTeam: 0,
      runnersOnBase: 2,
      estimatedOverturnProbability: 0.85,
      challengesRemaining: 1,
    });
    expect(result.recommendation).toBe("challenge");
    expect(result.expectedWpDelta).toBeGreaterThan(0);
  });
});
