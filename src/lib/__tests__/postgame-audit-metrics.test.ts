import { describe, expect, it } from "vitest";

import {
  hasTrustedActualWinValue,
  resolveComparableExpectedWinValue,
  resolveDisplayedExpectedWinValue,
  resolvePostgameValueMode,
} from "@/lib/postgame-audit-metrics";

describe("postgame audit metrics", () => {
  it("only treats expected win value as comparable when the actual win layer is trusted", () => {
    expect(
      resolveComparableExpectedWinValue({
        winExpectancyDelta: 0,
        winExpectancyConfidence: "high",
        expectedChallengeValue: -0.294,
        decisionValueMode: "win_expectancy",
      }),
    ).toBe(-0.294);

    expect(
      resolveComparableExpectedWinValue({
        winExpectancyDelta: -0.0353,
        winExpectancyConfidence: "low",
        expectedChallengeValue: -0.0529,
        decisionValueMode: "win_expectancy",
      }),
    ).toBeNull();

    expect(
      resolveComparableExpectedWinValue({
        winExpectancyDelta: 0.01,
        winExpectancyConfidence: "high",
        expectedChallengeValue: -0.1013,
        decisionValueMode: "heuristic",
      }),
    ).toBeNull();
  });

  it("detects trusted actual win coverage correctly", () => {
    expect(hasTrustedActualWinValue({ winExpectancyDelta: 0, winExpectancyConfidence: "medium" })).toBe(true);
    expect(hasTrustedActualWinValue({ winExpectancyDelta: 0.01, winExpectancyConfidence: "low" })).toBe(false);
    expect(hasTrustedActualWinValue({ winExpectancyDelta: null, winExpectancyConfidence: "high" })).toBe(false);
  });

  it("falls back to run mode when win coverage is partial across teams", () => {
    expect(
      resolvePostgameValueMode(
        {
          totalChallenges: 4,
          totalWinValue: null,
          totalRunValue: 0.02,
          expectedValueSum: null,
        },
        {
          totalChallenges: 1,
          totalWinValue: 0,
          totalRunValue: 0,
          expectedValueSum: -0.294,
        },
      ),
    ).toBe("run");
  });

  it("keeps win mode only when both sides have comparable win coverage", () => {
    expect(
      resolvePostgameValueMode(
        {
          totalChallenges: 2,
          totalWinValue: 0.0112,
          totalRunValue: 0.08,
          expectedValueSum: 0.007,
        },
        {
          totalChallenges: 2,
          totalWinValue: 0.0043,
          totalRunValue: 0.02,
          expectedValueSum: 0.0053,
        },
      ),
    ).toBe("win");
  });

  it("hides expected WE from display when the audit falls back to run or estimated mode", () => {
    expect(resolveDisplayedExpectedWinValue("run", -0.294)).toBeNull();
    expect(resolveDisplayedExpectedWinValue("estimated", -0.294)).toBeNull();
    expect(resolveDisplayedExpectedWinValue("win", -0.294)).toBe(-0.294);
  });
});
