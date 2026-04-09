import { describe, expect, it } from "vitest";

import * as decision from "@/lib/server/challenge-decision-value";

describe("challenge decision value", () => {
  it("resolves overturn probability with exact, then direction, then global fallback", () => {
    const rows: decision.OverturnProbabilityLookupRow[] = [
      {
        fallbackTier: "exact",
        splitPolicyVersion: "called_pitch_decisions_phase_time_v1",
        geometryVariant: "center_only",
        challengeDirection: "strike_to_ball",
        edgeBucket: "borderline",
        sampleSize: 140,
        overturnsTotal: 82,
        rawOverturnRate: 0.586,
        overturnProbability: 0.58,
        confidenceBand: "high",
      },
      {
        fallbackTier: "direction_only",
        splitPolicyVersion: "called_pitch_decisions_phase_time_v1",
        geometryVariant: "center_only",
        challengeDirection: "strike_to_ball",
        edgeBucket: null,
        sampleSize: 220,
        overturnsTotal: 118,
        rawOverturnRate: 0.536,
        overturnProbability: 0.54,
        confidenceBand: "high",
      },
      {
        fallbackTier: "global",
        splitPolicyVersion: "called_pitch_decisions_phase_time_v1",
        geometryVariant: "center_only",
        challengeDirection: null,
        edgeBucket: null,
        sampleSize: 400,
        overturnsTotal: 204,
        rawOverturnRate: 0.51,
        overturnProbability: 0.51,
        confidenceBand: "high",
      },
    ];

    expect(
      decision.resolveOverturnProbabilityWithFallback({ calledPitch: "called_strike", edgeBucket: "borderline" }, rows)?.fallbackTier,
    ).toBe("exact");
    expect(
      decision.resolveOverturnProbabilityWithFallback({ calledPitch: "called_strike", edgeBucket: "lean_confirm" }, rows)?.fallbackTier,
    ).toBe("direction_only");
    expect(
      decision.resolveOverturnProbabilityWithFallback({ calledPitch: "ball", edgeBucket: "borderline" }, rows)?.fallbackTier,
    ).toBe("global");
  });

  it("returns cannot_challenge when no challenges remain", async () => {
    const result = await decision.estimateChallengeDecisionValue({
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

  it("recommends challenge in a strong historical overturn spot", async () => {
    const probabilityRows: decision.OverturnProbabilityLookupRow[] = [
      {
        fallbackTier: "exact",
        splitPolicyVersion: "called_pitch_decisions_phase_time_v1",
        geometryVariant: "center_only",
        challengeDirection: "strike_to_ball",
        edgeBucket: "borderline",
        sampleSize: 180,
        overturnsTotal: 110,
        rawOverturnRate: 0.6111,
        overturnProbability: 0.61,
        confidenceBand: "high",
      },
      {
        fallbackTier: "direction_only",
        splitPolicyVersion: "called_pitch_decisions_phase_time_v1",
        geometryVariant: "center_only",
        challengeDirection: "strike_to_ball",
        edgeBucket: null,
        sampleSize: 260,
        overturnsTotal: 145,
        rawOverturnRate: 0.5577,
        overturnProbability: 0.56,
        confidenceBand: "high",
      },
      {
        fallbackTier: "global",
        splitPolicyVersion: "called_pitch_decisions_phase_time_v1",
        geometryVariant: "center_only",
        challengeDirection: null,
        edgeBucket: null,
        sampleSize: 400,
        overturnsTotal: 204,
        rawOverturnRate: 0.51,
        overturnProbability: 0.51,
        confidenceBand: "high",
      },
    ];
    const winRows = [
      {
        fallbackTier: "exact",
        inning: 9,
        inningBucket: null,
        halfInning: "Top",
        scoreDiffBucket: "tied",
        outs: 2,
        basesState: "110",
        countKey: "3-1",
        sampleSize: 2500,
        battingTeamWinProbability: 0.8,
        confidenceBand: "high",
      },
      {
        fallbackTier: "exact",
        inning: 9,
        inningBucket: null,
        halfInning: "Top",
        scoreDiffBucket: "tied",
        outs: 2,
        basesState: "110",
        countKey: "2-2",
        sampleSize: 2600,
        battingTeamWinProbability: 0.5,
        confidenceBand: "high",
      },
    ] as const;

    const result = await decision.estimateChallengeDecisionValue({
      inning: 9,
      halfInning: "Top",
      balls: 2,
      strikes: 1,
      outs: 2,
      scoreDiffBattingTeam: 0,
      basesState: "110",
      calledPitch: "called_strike",
      edgeBucket: "borderline",
      challengesRemaining: 2,
    }, { probabilityRows, winRows: [...winRows] });

    expect(result.recommendation).toBe("challenge");
    expect(result.decisionValueMode).toBe("win_expectancy");
    expect(result.estimatedOverturnProbability).toBeCloseTo(0.61, 4);
    expect(result.overturnGeometryVariant).toBe("center_only");
    expect(result.expectedWpDelta).toBeGreaterThan(0);
  });

  it("treats called-ball success value from the challenging team perspective", async () => {
    const probabilityRows: decision.OverturnProbabilityLookupRow[] = [
      {
        fallbackTier: "exact",
        splitPolicyVersion: "called_pitch_decisions_phase_time_v1",
        geometryVariant: "center_only",
        challengeDirection: "ball_to_strike",
        edgeBucket: "borderline",
        sampleSize: 190,
        overturnsTotal: 99,
        rawOverturnRate: 0.5211,
        overturnProbability: 0.52,
        confidenceBand: "high",
      },
      {
        fallbackTier: "direction_only",
        splitPolicyVersion: "called_pitch_decisions_phase_time_v1",
        geometryVariant: "center_only",
        challengeDirection: "ball_to_strike",
        edgeBucket: null,
        sampleSize: 330,
        overturnsTotal: 170,
        rawOverturnRate: 0.5152,
        overturnProbability: 0.51,
        confidenceBand: "high",
      },
      {
        fallbackTier: "global",
        splitPolicyVersion: "called_pitch_decisions_phase_time_v1",
        geometryVariant: "center_only",
        challengeDirection: null,
        edgeBucket: null,
        sampleSize: 400,
        overturnsTotal: 204,
        rawOverturnRate: 0.51,
        overturnProbability: 0.51,
        confidenceBand: "high",
      },
    ];
    const winRows = [
      {
        fallbackTier: "exact",
        inning: 9,
        inningBucket: null,
        halfInning: "Top",
        scoreDiffBucket: "lead3",
        outs: 1,
        basesState: "010",
        countKey: "3-1",
        sampleSize: 2100,
        battingTeamWinProbability: 0.8,
        confidenceBand: "high",
      },
      {
        fallbackTier: "exact",
        inning: 9,
        inningBucket: null,
        halfInning: "Top",
        scoreDiffBucket: "lead3",
        outs: 1,
        basesState: "010",
        countKey: "2-2",
        sampleSize: 2100,
        battingTeamWinProbability: 0.2,
        confidenceBand: "high",
      },
    ] as const;

    const result = await decision.estimateChallengeDecisionValue(
      {
        inning: 9,
        halfInning: "Top",
        balls: 2,
        strikes: 1,
        outs: 1,
        scoreDiffBattingTeam: 3,
        basesState: "010",
        calledPitch: "ball",
        edgeBucket: "borderline",
        challengesRemaining: 2,
      },
      { probabilityRows, winRows: [...winRows] },
    );

    expect(result.wpDeltaIfSuccess).toBeGreaterThan(0);
    expect(result.expectedChallengeValue).toBeGreaterThan(0);
    expect(result.recommendation).toBe("challenge");
  });
});
