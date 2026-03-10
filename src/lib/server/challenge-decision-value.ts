import type { ConfidenceBand } from "@/lib/types";
import { sql } from "@/lib/db";
import { countKey } from "@/lib/server/model-state";
import { getOverturnProbabilityConfidenceBand, roundWinExpectancy } from "@/lib/server/run-environment";
import {
  getWinExpectancyFallbackRows,
  resolveWinExpectancyWithFallback,
  type WinExpectancyLookupRow,
} from "@/lib/server/win-expectancy";

export type CalledPitch = "called_strike" | "ball";
export type EdgeBucket = "edge" | "near_edge" | "clear_miss";
export type ChallengeDirection = "strike_to_ball" | "ball_to_strike";
export type OverturnProbabilityFallbackTier = "exact" | "direction_only" | "global";
export type DecisionValueMode = "win_expectancy" | "heuristic";

export type OverturnProbabilityLookupRow = {
  fallbackTier: OverturnProbabilityFallbackTier;
  challengeDirection: ChallengeDirection | null;
  edgeBucket: EdgeBucket | null;
  sampleSize: number;
  overturnsTotal: number;
  rawOverturnRate: number;
  overturnProbability: number;
  confidenceBand: ConfidenceBand;
};

export type OverturnProbabilityResolution = OverturnProbabilityLookupRow;

export type ChallengeDecisionValueRequest = {
  inning: number;
  halfInning?: "Top" | "Bottom";
  balls: number;
  strikes: number;
  outs: number;
  scoreDiffBattingTeam: number;
  runnersOnBase: number;
  calledPitch: CalledPitch;
  edgeBucket?: EdgeBucket | null;
  edgeDistance?: number | null;
  challengesRemaining: number;
};

export type ChallengeDecisionValueResponse = {
  leverageIndexApprox: number;
  estimatedOverturnProbability: number;
  overturnProbabilityConfidence: ConfidenceBand | null;
  overturnProbabilityFallbackTier: OverturnProbabilityFallbackTier | null;
  wpDeltaIfSuccess: number;
  wpDeltaIfFail: number;
  expectedWpDelta: number;
  recommendation: "challenge" | "hold" | "cannot_challenge";
  rationale: string;
  decisionValueMode: DecisionValueMode;
};

const OVERTURN_CACHE_TTL_MS = 60_000;
let cachedLookupRows: OverturnProbabilityLookupRow[] | null = null;
let cachedAt = 0;

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function leverageApprox(req: ChallengeDecisionValueRequest) {
  const inningFactor = clamp(req.inning / 9, 0.1, 1.7);
  const closeGameFactor = clamp(1.5 - Math.abs(req.scoreDiffBattingTeam) * 0.15, 0.3, 1.5);
  const countFactor = req.balls === 3 && req.strikes === 2 ? 1.2 : req.strikes === 2 ? 1.1 : 1.0;
  const baseOutFactor = req.runnersOnBase > 0 ? 1 + req.runnersOnBase * 0.12 : 0.95;
  return Number(clamp(inningFactor * closeGameFactor * countFactor * baseOutFactor, 0.2, 3.0).toFixed(3));
}

export function getChallengeDirection(calledPitch: CalledPitch): ChallengeDirection {
  return calledPitch === "called_strike" ? "strike_to_ball" : "ball_to_strike";
}

export function getEdgeBucketFromDistance(edgeDistance: number | null | undefined): EdgeBucket | null {
  if (edgeDistance === null || edgeDistance === undefined || Number.isNaN(edgeDistance)) return null;
  if (edgeDistance <= 0.25) return "edge";
  if (edgeDistance <= 0.75) return "near_edge";
  return "clear_miss";
}

function incrementBallCount(balls: number, strikes: number) {
  if (balls >= 3) return null;
  return countKey(balls + 1, strikes);
}

function incrementStrikeCount(balls: number, strikes: number) {
  if (strikes >= 2) return null;
  return countKey(balls, strikes + 1);
}

function deriveCountKeys(req: ChallengeDecisionValueRequest) {
  const heldCountKey = req.calledPitch === "called_strike" ? incrementStrikeCount(req.balls, req.strikes) : incrementBallCount(req.balls, req.strikes);
  const correctedCountKey = req.calledPitch === "called_strike" ? incrementBallCount(req.balls, req.strikes) : incrementStrikeCount(req.balls, req.strikes);
  return { heldCountKey, correctedCountKey };
}

function synthesizeScores(scoreDiffBattingTeam: number, halfInning: "Top" | "Bottom") {
  if (halfInning === "Top") {
    const homeScore = scoreDiffBattingTeam >= 0 ? 0 : Math.abs(scoreDiffBattingTeam);
    const awayScore = homeScore + scoreDiffBattingTeam;
    return { homeScore, awayScore };
  }

  const awayScore = scoreDiffBattingTeam >= 0 ? 0 : Math.abs(scoreDiffBattingTeam);
  const homeScore = awayScore + scoreDiffBattingTeam;
  return { homeScore, awayScore };
}

export async function getOverturnProbabilityFallbackRows(forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh && cachedLookupRows && now - cachedAt < OVERTURN_CACHE_TTL_MS) {
    return cachedLookupRows;
  }

  const rawRows = await sql<{
    fallback_tier: OverturnProbabilityFallbackTier;
    challenge_direction: ChallengeDirection | null;
    edge_bucket: EdgeBucket | null;
    sample_size: number;
    overturns_total: number;
    raw_overturn_rate: number;
    overturn_probability: number;
    confidence_band: ConfidenceBand;
  }>(
    `
    SELECT
      fallback_tier,
      challenge_direction,
      edge_bucket,
      sample_size,
      overturns_total,
      raw_overturn_rate,
      overturn_probability,
      confidence_band
    FROM mart_historical_abs_overturn_probability_fallbacks
    `,
  );

  const rows = Array.isArray(rawRows) ? rawRows : [];
  cachedLookupRows = rows.map((row) => ({
    fallbackTier: row.fallback_tier,
    challengeDirection: row.challenge_direction,
    edgeBucket: row.edge_bucket,
    sampleSize: Number(row.sample_size ?? 0),
    overturnsTotal: Number(row.overturns_total ?? 0),
    rawOverturnRate: Number(row.raw_overturn_rate ?? 0),
    overturnProbability: Number(row.overturn_probability ?? 0.5),
    confidenceBand: row.confidence_band ?? getOverturnProbabilityConfidenceBand(row.sample_size),
  }));
  cachedAt = now;
  return cachedLookupRows;
}

export function resolveOverturnProbabilityWithFallback(
  input: {
    calledPitch: CalledPitch;
    edgeBucket?: EdgeBucket | null;
    edgeDistance?: number | null;
  },
  rows: OverturnProbabilityLookupRow[],
): OverturnProbabilityResolution | null {
  const challengeDirection = getChallengeDirection(input.calledPitch);
  const resolvedEdgeBucket = input.edgeBucket ?? getEdgeBucketFromDistance(input.edgeDistance);

  const lookups: Array<{
    tier: OverturnProbabilityFallbackTier;
    challengeDirection: ChallengeDirection | null;
    edgeBucket: EdgeBucket | null;
  }> = [
    { tier: "exact", challengeDirection, edgeBucket: resolvedEdgeBucket ?? null },
    { tier: "direction_only", challengeDirection, edgeBucket: null },
    { tier: "global", challengeDirection: null, edgeBucket: null },
  ];

  for (const lookup of lookups) {
    const match = rows.find(
      (row) =>
        row.fallbackTier === lookup.tier &&
        row.challengeDirection === lookup.challengeDirection &&
        row.edgeBucket === lookup.edgeBucket,
    );
    if (match) return match;
  }

  return null;
}

function calculateSuccessWinDelta(
  req: ChallengeDecisionValueRequest,
  winRows: WinExpectancyLookupRow[],
) {
  const { heldCountKey, correctedCountKey } = deriveCountKeys(req);
  if (!heldCountKey || !correctedCountKey) return null;

  const { homeScore, awayScore } = synthesizeScores(req.scoreDiffBattingTeam, req.halfInning ?? "Top");
  const basesState = `${req.runnersOnBase >= 1 ? "1" : "0"}${req.runnersOnBase >= 2 ? "1" : "0"}${req.runnersOnBase >= 3 ? "1" : "0"}`;

  const held = resolveWinExpectancyWithFallback(
    {
      inning: req.inning,
      halfInning: req.halfInning ?? "Top",
      outs: req.outs,
      basesState,
      countKey: heldCountKey,
      homeScore,
      awayScore,
    },
    winRows,
  );
  const corrected = resolveWinExpectancyWithFallback(
    {
      inning: req.inning,
      halfInning: req.halfInning ?? "Top",
      outs: req.outs,
      basesState,
      countKey: correctedCountKey,
      homeScore,
      awayScore,
    },
    winRows,
  );

  if (!held || !corrected) return null;
  return roundWinExpectancy(corrected.battingTeamWinProbability - held.battingTeamWinProbability);
}

export async function estimateChallengeDecisionValue(
  req: ChallengeDecisionValueRequest,
  dependencies?: {
    probabilityRows?: OverturnProbabilityLookupRow[];
    winRows?: WinExpectancyLookupRow[];
  },
): Promise<ChallengeDecisionValueResponse> {
  const li = leverageApprox(req);

  if (req.challengesRemaining <= 0) {
    return {
      leverageIndexApprox: li,
      estimatedOverturnProbability: 0,
      overturnProbabilityConfidence: null,
      overturnProbabilityFallbackTier: null,
      wpDeltaIfSuccess: 0,
      wpDeltaIfFail: 0,
      expectedWpDelta: 0,
      recommendation: "cannot_challenge",
      rationale: "No ABS challenges remaining.",
      decisionValueMode: "heuristic",
    };
  }

  const probabilityRows = dependencies?.probabilityRows ?? (await getOverturnProbabilityFallbackRows());
  const winRows = dependencies?.winRows ?? (await getWinExpectancyFallbackRows());
  const overturn = resolveOverturnProbabilityWithFallback(req, probabilityRows);
  const estimatedOverturnProbability = overturn?.overturnProbability ?? 0.5;

  const winDelta = calculateSuccessWinDelta(req, winRows);
  const baseSwing = 0.012;
  const heuristicSuccess = Number((baseSwing * li).toFixed(4));
  const successDelta = winDelta ?? heuristicSuccess;
  const failureCost = Number((-0.0025 * li).toFixed(4));
  const expected = estimatedOverturnProbability * successDelta + (1 - estimatedOverturnProbability) * failureCost;

  const buffer = req.challengesRemaining === 1 ? 0.0015 : 0.0005;
  const recommendation = expected > buffer ? "challenge" : "hold";
  const rationaleParts = [
    overturn
      ? `${Math.round(estimatedOverturnProbability * 100)}% empirical overturn probability (${overturn.fallbackTier.replace("_", " ")} lookup).`
      : "Using global overturn-rate fallback due to limited historical match coverage.",
    winDelta !== null
      ? "Success value uses historical win-expectancy count swing for this game state."
      : "Success value falls back to heuristic leverage because the challenged call leads to a terminal or sparse count state.",
    recommendation === "challenge"
      ? "Expected challenge value is positive after inventory cost."
      : "Expected challenge value does not clear the challenge-use threshold after inventory cost.",
  ];

  return {
    leverageIndexApprox: li,
    estimatedOverturnProbability: Math.round(estimatedOverturnProbability * 10000) / 10000,
    overturnProbabilityConfidence: overturn?.confidenceBand ?? null,
    overturnProbabilityFallbackTier: overturn?.fallbackTier ?? null,
    wpDeltaIfSuccess: successDelta,
    wpDeltaIfFail: failureCost,
    expectedWpDelta: Number(expected.toFixed(4)),
    recommendation,
    rationale: rationaleParts.join(" "),
    decisionValueMode: winDelta !== null ? "win_expectancy" : "heuristic",
  };
}
