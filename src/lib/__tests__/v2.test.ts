import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/server/challenge-decision-value", () => ({
  estimateChallengeDecisionValue: vi.fn(async (req: { challengesRemaining: number }) => ({
    leverageIndexApprox: 1.24,
    estimatedOverturnProbability: req.challengesRemaining > 0 ? 0.58 : 0,
    overturnProbabilityConfidence: req.challengesRemaining > 0 ? "high" : null,
    overturnProbabilityFallbackTier: req.challengesRemaining > 0 ? "exact" : null,
    wpDeltaIfSuccess: req.challengesRemaining > 0 ? 0.032 : 0,
    wpDeltaIfFail: req.challengesRemaining > 0 ? -0.003 : 0,
    expectedWpDelta: req.challengesRemaining > 0 ? 0.018 : 0,
    overturnGeometryVariant: req.challengesRemaining > 0 ? "radius_adjusted" : null,
    overturnSplitPolicyVersion: req.challengesRemaining > 0 ? "called_pitch_decisions_phase_time_v1" : null,
    successValue: req.challengesRemaining > 0 ? 0.032 : 0,
    failureValue: req.challengesRemaining > 0 ? -0.003 : 0,
    inventoryCost: req.challengesRemaining > 0 ? 0.001 : 0,
    inventoryCostVersion: req.challengesRemaining > 0 ? "inventory_future_opportunity_failure_weighted_v2" : null,
    expectedChallengeValue: req.challengesRemaining > 0 ? 0.018 : 0,
    recommendation: req.challengesRemaining > 0 ? "challenge" : "cannot_challenge",
    rationale: "mocked",
    decisionValueMode: req.challengesRemaining > 0 ? "win_expectancy" : "heuristic",
  })),
}));

import { estimateChallengeValue } from "../v2";

describe("challenge value api model", () => {
  it("returns cannot_challenge when no challenges remain", async () => {
    const result = await estimateChallengeValue({
      inning: 8,
      halfInning: "Top",
      balls: 3,
      strikes: 2,
      outs: 1,
      scoreDiffBattingTeam: 0,
      basesState: "110",
      calledPitch: "called_strike",
      edgeBucket: "borderline",
      challengesRemaining: 0,
    });
    expect(result.recommendation).toBe("cannot_challenge");
    expect(result.expectedWpDelta).toBe(0);
  });

  it("returns a modeled empirical challenge recommendation", async () => {
    const result = await estimateChallengeValue({
      inning: 9,
      halfInning: "Top",
      balls: 2,
      strikes: 2,
      outs: 2,
      scoreDiffBattingTeam: 0,
      basesState: "110",
      calledPitch: "called_strike",
      edgeBucket: "borderline",
      challengesRemaining: 1,
    });
    expect(result.estimatedOverturnProbability).toBeGreaterThan(0);
    expect(result.recommendation).toBe("challenge");
    expect(result.decisionValueMode).toBe("win_expectancy");
  });
});
