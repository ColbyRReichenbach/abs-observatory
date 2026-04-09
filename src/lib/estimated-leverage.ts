type EstimatedLeverageInput = {
  inning?: number | null;
  balls?: number | null;
  strikes?: number | null;
  outs?: number | null;
  homeScore?: number | null;
  awayScore?: number | null;
  basesState?: string | null;
  isOverturned?: boolean | null;
  impactType?: string | null;
};

export type EstimatedLeverageBucket = "low" | "medium" | "high";
export const ESTIMATED_LEVERAGE_MODEL_KIND = "heuristic_pressure_proxy";
export const ESTIMATED_LEVERAGE_MODEL_VERSION = "estimated_leverage_heuristic_v1";

function countRunnersOnBase(basesState?: string | null) {
  if (!basesState) return 0;
  const normalized = basesState.toLowerCase();
  if (normalized === "bases loaded") return 3;
  return ["1b", "2b", "3b", "first", "second", "third"].reduce((count, needle) => count + (normalized.includes(needle) ? 1 : 0), 0);
}

export function computeEstimatedLeverageIndex(input: EstimatedLeverageInput): number {
  const inning = input.inning ?? 1;
  const scoreDiff =
    input.homeScore === null || input.homeScore === undefined || input.awayScore === null || input.awayScore === undefined
      ? 0
      : Math.abs(input.homeScore - input.awayScore);
  const outs = input.outs ?? 0;
  const runnersOnBase = countRunnersOnBase(input.basesState);
  const balls = input.balls ?? 0;
  const strikes = input.strikes ?? 0;

  const inningScore = inning >= 9 ? 28 : inning >= 7 ? 22 : inning >= 5 ? 14 : 8;
  const scoreScore = scoreDiff === 0 ? 28 : scoreDiff === 1 ? 24 : scoreDiff === 2 ? 18 : scoreDiff === 3 ? 12 : 6;
  const outScore = outs >= 2 ? 14 : outs === 1 ? 9 : 5;
  const baseScore = runnersOnBase >= 3 ? 14 : runnersOnBase === 2 ? 11 : runnersOnBase === 1 ? 8 : 0;
  const countScore = balls === 3 && strikes === 2 ? 16 : strikes >= 2 ? 12 : balls >= 3 ? 10 : 5;

  return Math.max(0, Math.min(100, inningScore + scoreScore + outScore + baseScore + countScore));
}

export function getEstimatedLeverageBucket(index: number): EstimatedLeverageBucket {
  if (index >= 65) return "high";
  if (index >= 40) return "medium";
  return "low";
}

export function computeEstimatedChallengeSwing(input: EstimatedLeverageInput): number {
  const base = computeEstimatedLeverageIndex(input);
  if (!input.isOverturned) {
    return -Math.round(base * 0.35);
  }

  switch (input.impactType) {
    case "direct_ending_impact":
      return Math.round(base);
    case "direct_count_impact":
      return Math.round(base * 0.72);
    case "downstream_inferred_impact":
      return Math.round(base * 0.45);
    default:
      return Math.round(base * 0.45);
  }
}

export function summarizeEstimatedLeverage(input: EstimatedLeverageInput) {
  const estimatedLeverageIndex = computeEstimatedLeverageIndex(input);
  return {
    leverageModelKind: ESTIMATED_LEVERAGE_MODEL_KIND,
    leverageModelVersion: ESTIMATED_LEVERAGE_MODEL_VERSION,
    estimatedLeverageIndex,
    estimatedChallengeSwing: computeEstimatedChallengeSwing(input),
    leverageBucket: getEstimatedLeverageBucket(estimatedLeverageIndex),
  };
}

export function formatLeverageBucketLabel(bucket: EstimatedLeverageBucket) {
  if (bucket === "high") return "High Pressure";
  if (bucket === "medium") return "Medium Pressure";
  return "Low Pressure";
}
