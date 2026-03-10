import { describe, expect, it } from "vitest";

import { basesState, buildCanonicalPitchState, countKey, inningBucket, resolveBattingSide, scoreDiffBucket } from "@/lib/server/model-state";
import { getChallengeRunExpectancyDelta, resolveRunExpectancyWithFallback, type RunExpectancyLookupRow } from "@/lib/server/run-expectancy";

const lookupRows: RunExpectancyLookupRow[] = [
  {
    fallbackTier: "exact",
    inningBucket: "7-8",
    outs: 1,
    basesState: "010",
    countKey: "2-1",
    sampleSize: 640,
    expectedRunsToEndInning: 0.91,
    confidenceBand: "high",
  },
  {
    fallbackTier: "exact",
    inningBucket: "7-8",
    outs: 1,
    basesState: "010",
    countKey: "3-1",
    sampleSize: 620,
    expectedRunsToEndInning: 1.17,
    confidenceBand: "high",
  },
  {
    fallbackTier: "drop_inning_bucket",
    inningBucket: null,
    outs: 1,
    basesState: "010",
    countKey: "1-2",
    sampleSize: 220,
    expectedRunsToEndInning: 0.63,
    confidenceBand: "medium",
  },
  {
    fallbackTier: "drop_count_key",
    inningBucket: null,
    outs: 2,
    basesState: "111",
    countKey: null,
    sampleSize: 90,
    expectedRunsToEndInning: 0.74,
    confidenceBand: "low",
  },
];

describe("model-state helpers", () => {
  it("normalizes count and base state keys", () => {
    expect(countKey(4, 3)).toBe("3-2");
    expect(basesState(1, null, "44")).toBe("101");
  });

  it("resolves inning and score buckets", () => {
    expect(inningBucket(8)).toBe("7-8");
    expect(resolveBattingSide("Top")).toBe("away");
    expect(scoreDiffBucket(-3)).toBe("trail3");
    expect(
      buildCanonicalPitchState({
        inning: 8,
        halfInning: "Bottom",
        outs: 1,
        basesState: "010",
        balls: 2,
        strikes: 1,
        homeScore: 3,
        awayScore: 2,
      }),
    ).toMatchObject({
      inningBucket: "7-8",
      battingSide: "home",
      countKey: "2-1",
      scoreDiffBatting: 1,
      scoreDiffBucket: "lead1",
    });
  });
});

describe("run expectancy resolution", () => {
  it("uses exact state matches before fallbacks", () => {
    const resolved = resolveRunExpectancyWithFallback(
      {
        inning: 8,
        halfInning: "Bottom",
        outs: 1,
        basesState: "010",
        countKey: "2-1",
      },
      lookupRows,
    );

    expect(resolved?.fallbackTier).toBe("exact");
    expect(resolved?.expectedRunsToEndInning).toBe(0.91);
  });

  it("falls back when inning bucket match is unavailable", () => {
    const resolved = resolveRunExpectancyWithFallback(
      {
        inning: 2,
        halfInning: "Top",
        outs: 1,
        basesState: "010",
        countKey: "1-2",
      },
      lookupRows,
    );

    expect(resolved?.fallbackTier).toBe("drop_inning_bucket");
    expect(resolved?.confidenceBand).toBe("medium");
  });

  it("computes challenge RE delta from held and corrected counts", () => {
    const delta = getChallengeRunExpectancyDelta(
      {
        inning: 8,
        halfInning: "Bottom",
        outs: 1,
        basesState: "010",
        homeScore: 3,
        awayScore: 2,
        umpireCount: "2-1",
        countAfter: "3-1",
      },
      lookupRows,
    );

    expect(delta.preRunExpectancy).toBe(0.91);
    expect(delta.postRunExpectancy).toBe(1.17);
    expect(delta.runExpectancyDelta).toBe(0.26);
    expect(delta.runExpectancyConfidence).toBe("high");
  });
});
