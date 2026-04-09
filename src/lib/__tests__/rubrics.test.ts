import { describe, expect, it } from "vitest";

import {
  computeOrgWatchRisk,
  computeTeamChallengeStyle,
  computeUmpireReportCard,
  scoreControversyMoment,
} from "@/lib/rubrics";

describe("rubric helpers", () => {
  it("regresses small umpire samples toward the middle", () => {
    const smallSample = computeUmpireReportCard({
      challengedCalls: 2,
      overturnedCalls: 2,
      leagueOverturnRate: 0.42,
      leagueOverturnRateStdDev: 0.08,
      umpireVariance: 0.05,
      leagueVarianceMean: 0.06,
      leagueVarianceStdDev: 0.02,
      recentOverturnRate: 1,
    });

    const largerSample = computeUmpireReportCard({
      challengedCalls: 40,
      overturnedCalls: 40,
      leagueOverturnRate: 0.42,
      leagueOverturnRateStdDev: 0.08,
      umpireVariance: 0.05,
      leagueVarianceMean: 0.06,
      leagueVarianceStdDev: 0.02,
      recentOverturnRate: 1,
    });

    expect(smallSample.score).toBeGreaterThan(largerSample.score);
    expect(smallSample.confidence).toBe("low");
    expect(largerSample.confidence).toBe("high");
  });

  it("uses variance only as a modest tiebreaker for umpire grades", () => {
    const steady = computeUmpireReportCard({
      challengedCalls: 30,
      overturnedCalls: 12,
      leagueOverturnRate: 0.42,
      leagueOverturnRateStdDev: 0.08,
      umpireVariance: 0.03,
      leagueVarianceMean: 0.06,
      leagueVarianceStdDev: 0.02,
      recentOverturnRate: 0.4,
    });

    const volatile = computeUmpireReportCard({
      challengedCalls: 30,
      overturnedCalls: 12,
      leagueOverturnRate: 0.42,
      leagueOverturnRateStdDev: 0.08,
      umpireVariance: 0.11,
      leagueVarianceMean: 0.06,
      leagueVarianceStdDev: 0.02,
      recentOverturnRate: 0.4,
    });

    expect(steady.score).toBeGreaterThan(volatile.score);
    expect(steady.score - volatile.score).toBeLessThan(20);
  });

  it("assigns high-impact when the style race is close but late-game identity wins", () => {
    const result = computeTeamChallengeStyle({
      sampleSize: 20,
      challengeRatePerGame: 2.1,
      leagueChallengeRatePerGame: 1.9,
      lateLeverageShare: 0.58,
      leagueLateLeverageShare: 0.36,
      earlyLowLeverageShare: 0.16,
      leagueEarlyLowLeverageShare: 0.18,
      averageChallengesRemaining: 0.9,
      leagueAverageChallengesRemaining: 0.8,
      overturnRate: 0.46,
      leagueOverturnRate: 0.42,
    });

    expect(result.style).toBe("High-Impact");
    expect(result.orgLabel).toBe("Timely");
  });

  it("assigns balanced when no strong team-style identity separates", () => {
    const result = computeTeamChallengeStyle({
      sampleSize: 18,
      challengeRatePerGame: 1.95,
      leagueChallengeRatePerGame: 1.9,
      lateLeverageShare: 0.37,
      leagueLateLeverageShare: 0.36,
      earlyLowLeverageShare: 0.17,
      leagueEarlyLowLeverageShare: 0.18,
      averageChallengesRemaining: 0.82,
      leagueAverageChallengesRemaining: 0.8,
      overturnRate: 0.43,
      leagueOverturnRate: 0.42,
    });

    expect(result.style).toBe("Balanced");
    expect(result.orgLabel).toBe("Mixed profile");
  });

  it("penalizes confirmed calls in controversy scoring", () => {
    const overturned = scoreControversyMoment({
      inning: 8,
      homeScore: 3,
      awayScore: 2,
      outs: 2,
      basesState: "110",
      balls: 3,
      strikes: 2,
      isOverturned: true,
      impactType: "direct_ending_impact",
      missDistance: 0.35,
      slateProgress: 0.85,
    });

    const confirmed = scoreControversyMoment({
      inning: 8,
      homeScore: 3,
      awayScore: 2,
      outs: 2,
      basesState: "110",
      balls: 3,
      strikes: 2,
      isOverturned: false,
      impactType: "direct_ending_impact",
      missDistance: 0.35,
      slateProgress: 0.85,
    });

    expect(overturned.score).toBeGreaterThan(confirmed.score);
    expect(overturned.chips).toContain("Overturned");
    expect(confirmed.chips).toContain("Confirmed");
  });

  it("uses a neutral miss-severity fallback when location is missing", () => {
    const result = scoreControversyMoment({
      inning: 6,
      homeScore: 4,
      awayScore: 4,
      outs: 1,
      basesState: "010",
      balls: 2,
      strikes: 2,
      isOverturned: true,
      impactType: "direct_count_impact",
      missDistance: null,
      slateProgress: 0.5,
    });

    expect(result.missSeverityScore).toBe(40);
  });

  it("rewards strong modeled value in controversy scoring", () => {
    const baseline = scoreControversyMoment({
      inning: 8,
      homeScore: 3,
      awayScore: 3,
      outs: 2,
      basesState: "110",
      balls: 3,
      strikes: 2,
      isOverturned: true,
      impactType: "direct_count_impact",
      missDistance: 0.2,
      slateProgress: 0.85,
      expectedChallengeValue: 0,
      decisionValueMode: "win_expectancy",
    });

    const valued = scoreControversyMoment({
      inning: 8,
      homeScore: 3,
      awayScore: 3,
      outs: 2,
      basesState: "110",
      balls: 3,
      strikes: 2,
      isOverturned: true,
      impactType: "direct_count_impact",
      missDistance: 0.2,
      slateProgress: 0.85,
      expectedChallengeValue: 0.025,
      decisionValueMode: "win_expectancy",
    });

    expect(valued.modeledValueScore).toBeGreaterThan(baseline.modeledValueScore);
    expect(valued.score).toBeGreaterThan(baseline.score);
  });

  it("maps org watch risk into tiers", () => {
    const result = computeOrgWatchRisk({
      umpireScore: 32,
      directionalBiasSeverity: 70,
      zoneConcentrationSeverity: 68,
      recentTrendRisk: 75,
      countHotspotVolatility: 55,
      matchupHistoryModifier: 4,
    });

    expect(result.riskScore).toBeGreaterThan(55);
    expect(["Elevated", "High"]).toContain(result.tier);
  });

  it("softens low-confidence umpire and risk extremes", () => {
    const umpire = computeUmpireReportCard({
      challengedCalls: 2,
      overturnedCalls: 2,
      leagueOverturnRate: 0.42,
      leagueOverturnRateStdDev: 0.08,
      umpireVariance: 0.02,
      leagueVarianceMean: 0.06,
      leagueVarianceStdDev: 0.02,
      recentOverturnRate: 1,
    });

    const risk = computeOrgWatchRisk({
      umpireScore: 20,
      directionalBiasSeverity: 85,
      zoneConcentrationSeverity: 80,
      recentTrendRisk: 88,
      countHotspotVolatility: 75,
      confidence: umpire.confidence,
    });

    expect(umpire.confidence).toBe("low");
    expect(umpire.grade).not.toBe("A");
    expect(risk.tier).not.toBe("High");
  });
});
