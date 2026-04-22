import { hasTrustedModelConfidenceBand } from "@/lib/server/run-environment";
import type { ConfidenceBand } from "@/lib/types";

type ComparableWinValueEntry = {
  winExpectancyDelta?: number | null;
  winExpectancyConfidence?: ConfidenceBand | null;
  expectedChallengeValue?: number | null;
  decisionValueMode?: "win_expectancy" | "heuristic" | null;
};

type PostgameValueModeSide = {
  totalChallenges: number;
  totalWinValue: number | null;
  totalRunValue: number | null;
  expectedValueSum: number | null;
};

export function hasTrustedActualWinValue(entry: Pick<ComparableWinValueEntry, "winExpectancyDelta" | "winExpectancyConfidence">) {
  return typeof entry.winExpectancyDelta === "number" && hasTrustedModelConfidenceBand(entry.winExpectancyConfidence);
}

export function resolveComparableExpectedWinValue(entry: ComparableWinValueEntry): number | null {
  if (entry.decisionValueMode !== "win_expectancy") return null;
  if (typeof entry.expectedChallengeValue !== "number" || !Number.isFinite(entry.expectedChallengeValue)) return null;
  return hasTrustedActualWinValue(entry) ? entry.expectedChallengeValue : null;
}

export function resolvePostgameValueMode(
  home: PostgameValueModeSide,
  away: PostgameValueModeSide,
): "win" | "run" | "estimated" {
  const hasComparableWinCoverage = (side: PostgameValueModeSide) =>
    side.totalChallenges === 0 || (side.totalWinValue !== null && side.expectedValueSum !== null);
  const hasRunCoverage = (side: PostgameValueModeSide) => side.totalChallenges === 0 || side.totalRunValue !== null;

  if (hasComparableWinCoverage(home) && hasComparableWinCoverage(away)) return "win";
  if (hasRunCoverage(home) && hasRunCoverage(away)) return "run";
  return "estimated";
}

export function resolveDisplayedExpectedWinValue(
  valueMode: "win" | "run" | "estimated",
  expectedValue: number | null,
) {
  return valueMode === "win" ? expectedValue : null;
}
