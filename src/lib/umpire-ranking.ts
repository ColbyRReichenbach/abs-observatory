import type { RangeKey, UmpireLeaderboardEntry } from "@/lib/types";

export type UmpireSampleTier = "qualified" | "building" | "sparse" | "none";

type UmpireRankingInput = Pick<
  UmpireLeaderboardEntry,
  | "challengedCalls"
  | "overturnRate"
  | "overturnRateVariance"
  | "recentOverturnRate"
  | "averageRunExpectancyDelta"
  | "averageWinExpectancyDelta"
  | "reportCardScore"
  | "gamesWorked"
>;

export function getUmpireSampleTier(challengedCalls: number, range: RangeKey): UmpireSampleTier {
  if (challengedCalls <= 0) return "none";

  if (range === "7d") {
    if (challengedCalls >= 5) return "qualified";
    if (challengedCalls >= 3) return "building";
    return "sparse";
  }

  if (range === "30d") {
    if (challengedCalls >= 15) return "qualified";
    if (challengedCalls >= 6) return "building";
    return "sparse";
  }

  if (challengedCalls >= 20) return "qualified";
  if (challengedCalls >= 8) return "building";
  return "sparse";
}

export function getUmpireSampleTierRank(challengedCalls: number, range: RangeKey) {
  const tier = getUmpireSampleTier(challengedCalls, range);
  if (tier === "qualified") return 0;
  if (tier === "building") return 1;
  if (tier === "sparse") return 2;
  return 3;
}

export function getUmpireSampleTierLabel(challengedCalls: number, range: RangeKey) {
  const tier = getUmpireSampleTier(challengedCalls, range);
  if (tier === "qualified") return "Qualified";
  if (tier === "building") return "Building";
  if (tier === "sparse") return "Sparse";
  return "No sample";
}

export function getUmpireRecentDrift(umpire: Pick<UmpireRankingInput, "recentOverturnRate" | "overturnRate">) {
  return typeof umpire.recentOverturnRate === "number" ? umpire.recentOverturnRate - umpire.overturnRate : 0;
}

export function getUmpireOrgWatchPriority(umpire: UmpireRankingInput) {
  const drift = Math.abs(getUmpireRecentDrift(umpire));
  return (
    Math.abs(umpire.averageWinExpectancyDelta ?? 0) * 100 +
    Math.abs(umpire.averageRunExpectancyDelta ?? 0) * 10 +
    umpire.overturnRateVariance * 100 +
    drift * 100
  );
}

export function compareUmpiresForDefaultSort(
  left: UmpireRankingInput,
  right: UmpireRankingInput,
  range: RangeKey,
  viewMode: "fan" | "org",
) {
  const leftTier = getUmpireSampleTierRank(left.challengedCalls, range);
  const rightTier = getUmpireSampleTierRank(right.challengedCalls, range);
  if (leftTier !== rightTier) return leftTier - rightTier;

  if (right.challengedCalls !== left.challengedCalls) {
    return right.challengedCalls - left.challengedCalls;
  }

  if (viewMode === "org") {
    const priorityGap = getUmpireOrgWatchPriority(right) - getUmpireOrgWatchPriority(left);
    if (priorityGap !== 0) return priorityGap;
  } else if (right.reportCardScore !== left.reportCardScore) {
    return right.reportCardScore - left.reportCardScore;
  }

  if (right.overturnRateVariance !== left.overturnRateVariance) {
    return right.overturnRateVariance - left.overturnRateVariance;
  }

  return right.gamesWorked - left.gamesWorked;
}
