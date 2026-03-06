import type { ChallengeEvent } from "@/lib/types";

export type ExplorerFilters = {
  pitchType: string;
  batter: string;
  pitcher: string;
};

export function applyExplorerFilters(challenges: ChallengeEvent[], filters: ExplorerFilters): ChallengeEvent[] {
  return challenges.filter((challenge) => {
    if (filters.pitchType !== "all" && challenge.pitchType !== filters.pitchType) return false;
    if (filters.batter !== "all" && challenge.batterName !== filters.batter) return false;
    if (filters.pitcher !== "all" && challenge.pitcherName !== filters.pitcher) return false;
    return true;
  });
}

export function resolveSelection(previousSelectedId: string | null, filtered: ChallengeEvent[]): string | null {
  if (!filtered.length) return null;
  if (previousSelectedId && filtered.some((challenge) => challenge.challengeId === previousSelectedId)) {
    return previousSelectedId;
  }
  return filtered[0].challengeId;
}

