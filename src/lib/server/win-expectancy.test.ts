import { describe, expect, it } from "vitest";

import {
  getChallengeWinExpectancyDelta,
  resolveWinExpectancyWithFallback,
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
