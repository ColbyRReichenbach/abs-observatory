import { summarizeEstimatedLeverage } from "@/lib/estimated-leverage";
import { formatBasesStateLabel, formatScoreStateLabel, getBaseOutScenarioBucket, getChallengeScenarioTags, getCountStateCategory } from "@/lib/challenge-context";
import type { ChallengeEvent } from "@/lib/types";

export type CountStateBaseline = {
  countKey: string;
  plateAppearances: number;
  battingAverage: number;
  walkRate: number;
  strikeoutRate: number;
  positiveOutcomeRate: number;
};

export type CountStateDelta = {
  heldCount: string | null;
  correctedCount: string | null;
  battingAverageDelta: number | null;
  walkRateDelta: number | null;
  strikeoutRateDelta: number | null;
  positiveOutcomeDelta: number | null;
};

export type ChallengeValueSnapshot = {
  leverage: ReturnType<typeof summarizeEstimatedLeverage>;
  countStateDelta: CountStateDelta;
  baseBucket: { key: string; label: string };
  countBucket: { key: string; label: string };
  baseStateLabel: string;
  scoreStateLabel: string;
  scenarioTags: string[];
};

export function buildCountStateBaselineMap(rows: CountStateBaseline[]) {
  const map = new Map<string, CountStateBaseline>();
  rows.forEach((row) => {
    map.set(row.countKey, row);
  });
  return map;
}

export function computeCountStateDelta(
  heldCount: string | null | undefined,
  correctedCount: string | null | undefined,
  baselineMap: Map<string, CountStateBaseline>,
): CountStateDelta {
  const held = heldCount ? baselineMap.get(heldCount) : null;
  const corrected = correctedCount ? baselineMap.get(correctedCount) : null;

  return {
    heldCount: heldCount ?? null,
    correctedCount: correctedCount ?? null,
    battingAverageDelta: held && corrected ? corrected.battingAverage - held.battingAverage : null,
    walkRateDelta: held && corrected ? corrected.walkRate - held.walkRate : null,
    strikeoutRateDelta: held && corrected ? corrected.strikeoutRate - held.strikeoutRate : null,
    positiveOutcomeDelta: held && corrected ? corrected.positiveOutcomeRate - held.positiveOutcomeRate : null,
  };
}

export function buildChallengeValueSnapshot(
  challenge: ChallengeEvent,
  baselineMap: Map<string, CountStateBaseline>,
): ChallengeValueSnapshot {
  const fallbackCount =
    challenge.countBefore ??
    challenge.umpireCount ??
    (challenge.balls !== null && challenge.strikes !== null ? `${challenge.balls}-${challenge.strikes}` : null);

  return {
    leverage: summarizeEstimatedLeverage(challenge),
    countStateDelta: computeCountStateDelta(challenge.umpireCount ?? null, challenge.countAfter ?? null, baselineMap),
    baseBucket: getBaseOutScenarioBucket(challenge.basesState, challenge.outs),
    countBucket: getCountStateCategory(fallbackCount),
    baseStateLabel: formatBasesStateLabel(challenge.basesState),
    scoreStateLabel: formatScoreStateLabel(challenge),
    scenarioTags: getChallengeScenarioTags(challenge),
  };
}
