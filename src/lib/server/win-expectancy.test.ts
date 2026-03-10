import { describe, expect, it } from "vitest";

import {
  getChallengeWinExpectancyDelta,
  getWinExpectancyCountSwing,
  resolveWinExpectancyWithFallback,
  runWinExpectancySanityChecks,
  type WinExpectancyLookupRow,
} from "@/lib/server/win-expectancy";

const rows: WinExpectancyLookupRow[] = [
  {
    fallbackTier: "exact",
    inning: 8,
    inningBucket: null,
    halfInning: "Top",
    scoreDiffBucket: "trail1",
    outs: 1,
    basesState: "010",
    countKey: "1-1",
    sampleSize: 2800,
    battingTeamWinProbability: 0.3124,
    confidenceBand: "high",
  },
  {
    fallbackTier: "drop_inning_to_bucket",
    inning: null,
    inningBucket: "7-8",
    halfInning: "Top",
    scoreDiffBucket: "trail1",
    outs: 1,
    basesState: "010",
    countKey: "1-2",
    sampleSize: 1250,
    battingTeamWinProbability: 0.2812,
    confidenceBand: "medium",
  },
  {
    fallbackTier: "drop_count_key_exact_inning",
    inning: 8,
    inningBucket: null,
    halfInning: "Top",
    scoreDiffBucket: "trail1",
    outs: 1,
    basesState: "010",
    countKey: null,
    sampleSize: 3900,
    battingTeamWinProbability: 0.2988,
    confidenceBand: "high",
  },
  {
    fallbackTier: "exact",
    inning: 9,
    inningBucket: null,
    halfInning: "Top",
    scoreDiffBucket: "tied",
    outs: 1,
    basesState: "010",
    countKey: "2-2",
    sampleSize: 2600,
    battingTeamWinProbability: 0.432,
    confidenceBand: "high",
  },
  {
    fallbackTier: "exact",
    inning: 9,
    inningBucket: null,
    halfInning: "Top",
    scoreDiffBucket: "tied",
    outs: 1,
    basesState: "010",
    countKey: "3-1",
    sampleSize: 2500,
    battingTeamWinProbability: 0.478,
    confidenceBand: "high",
  },
  {
    fallbackTier: "exact",
    inning: 2,
    inningBucket: null,
    halfInning: "Top",
    scoreDiffBucket: "tied",
    outs: 1,
    basesState: "010",
    countKey: "2-2",
    sampleSize: 4200,
    battingTeamWinProbability: 0.489,
    confidenceBand: "high",
  },
  {
    fallbackTier: "exact",
    inning: 2,
    inningBucket: null,
    halfInning: "Top",
    scoreDiffBucket: "tied",
    outs: 1,
    basesState: "010",
    countKey: "3-1",
    sampleSize: 4300,
    battingTeamWinProbability: 0.503,
    confidenceBand: "high",
  },
  {
    fallbackTier: "exact",
    inning: 8,
    inningBucket: null,
    halfInning: "Top",
    scoreDiffBucket: "trail1",
    outs: 1,
    basesState: "010",
    countKey: "2-2",
    sampleSize: 2800,
    battingTeamWinProbability: 0.271,
    confidenceBand: "high",
  },
  {
    fallbackTier: "exact",
    inning: 8,
    inningBucket: null,
    halfInning: "Top",
    scoreDiffBucket: "trail1",
    outs: 1,
    basesState: "010",
    countKey: "3-1",
    sampleSize: 2750,
    battingTeamWinProbability: 0.319,
    confidenceBand: "high",
  },
  {
    fallbackTier: "exact",
    inning: 2,
    inningBucket: null,
    halfInning: "Top",
    scoreDiffBucket: "trail4plus",
    outs: 1,
    basesState: "010",
    countKey: "2-2",
    sampleSize: 4400,
    battingTeamWinProbability: 0.212,
    confidenceBand: "high",
  },
  {
    fallbackTier: "exact",
    inning: 2,
    inningBucket: null,
    halfInning: "Top",
    scoreDiffBucket: "trail4plus",
    outs: 1,
    basesState: "010",
    countKey: "3-1",
    sampleSize: 4450,
    battingTeamWinProbability: 0.226,
    confidenceBand: "high",
  },
];

describe("resolveWinExpectancyWithFallback", () => {
  it("resolves an exact state match", () => {
    const result = resolveWinExpectancyWithFallback(
      { inning: 8, halfInning: "Top", outs: 1, basesState: "010", countKey: "1-1", homeScore: 3, awayScore: 2 },
      rows,
    );

    expect(result?.fallbackTier).toBe("exact");
    expect(result?.battingTeamWinProbability).toBe(0.3124);
  });

  it("falls back to inning bucket when exact inning is missing", () => {
    const result = resolveWinExpectancyWithFallback(
      { inning: 8, halfInning: "Top", outs: 1, basesState: "010", countKey: "1-2", homeScore: 3, awayScore: 2 },
      rows,
    );

    expect(result?.fallbackTier).toBe("drop_inning_to_bucket");
    expect(result?.confidenceBand).toBe("medium");
  });

  it("falls back by dropping count key when needed", () => {
    const result = resolveWinExpectancyWithFallback(
      { inning: 8, halfInning: "Top", outs: 1, basesState: "010", countKey: "3-2", homeScore: 3, awayScore: 2 },
      rows,
    );

    expect(result?.fallbackTier).toBe("drop_count_key_exact_inning");
    expect(result?.battingTeamWinProbability).toBe(0.2988);
  });
});

describe("getChallengeWinExpectancyDelta", () => {
  it("calculates win expectancy swing from held to corrected count", () => {
    const result = getChallengeWinExpectancyDelta(
      {
        inning: 8,
        halfInning: "Top",
        outs: 1,
        basesState: "010",
        homeScore: 3,
        awayScore: 2,
        umpireCount: "1-2",
        countAfter: "1-1",
      },
      rows,
    );

    expect(result.preWinExpectancy).toBe(0.2812);
    expect(result.postWinExpectancy).toBe(0.3124);
    expect(result.winExpectancyDelta).toBe(0.0312);
    expect(result.winExpectancyConfidence).toBe("medium");
  });
});

describe("win expectancy sanity checks", () => {
  it("measures a stronger late tied swing than an early tied swing", () => {
    const lateSwing = getWinExpectancyCountSwing(
      { inning: 9, halfInning: "Top", outs: 1, basesState: "010", homeScore: 4, awayScore: 4 },
      "2-2",
      "3-1",
      rows,
    );
    const earlySwing = getWinExpectancyCountSwing(
      { inning: 2, halfInning: "Top", outs: 1, basesState: "010", homeScore: 0, awayScore: 0 },
      "2-2",
      "3-1",
      rows,
    );

    expect(lateSwing).toBe(0.046);
    expect(earlySwing).toBe(0.014);
  });

  it("passes the packaged WE sanity checks", () => {
    const checks = runWinExpectancySanityChecks(rows);

    expect(checks).toHaveLength(3);
    expect(checks.every((check) => check.passed)).toBe(true);
  });
});
