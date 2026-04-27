import type { ConfidenceBand } from "@/lib/types";
import { sql } from "@/lib/db";
import { countRunnersOnBase } from "@/lib/challenge-context";
import { countKey } from "@/lib/server/model-state";
import { getOverturnProbabilityConfidenceBand, roundWinExpectancy } from "@/lib/server/run-environment";
import {
  getWinExpectancyFallbackRows,
  resolveWinExpectancyWithFallback,
  type WinExpectancyLookupRow,
} from "@/lib/server/win-expectancy";

export type CalledPitch = "called_strike" | "ball";
export type EdgeBucket =
  | "strong_confirm"
  | "lean_confirm"
  | "borderline"
  | "lean_overturn"
  | "strong_overturn";
export type ChallengeDirection = "strike_to_ball" | "ball_to_strike";
export type OverturnProbabilityFallbackTier = "exact" | "direction_only" | "global";
export type DecisionValueMode = "win_expectancy" | "heuristic";
export type OverturnGeometryVariant = "center_only" | "radius_adjusted";
export type InventoryCostVersion = "inventory_future_opportunity_failure_weighted_v2";

export type OverturnProbabilityLookupRow = {
  fallbackTier: OverturnProbabilityFallbackTier;
  splitPolicyVersion: string | null;
  geometryVariant: OverturnGeometryVariant;
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
  basesState: string;
  calledPitch: CalledPitch;
  edgeBucket?: EdgeBucket | null;
  edgeDistance?: number | null;
  challengesRemaining: number;
  geometryVariant?: OverturnGeometryVariant;
};

export type ChallengeDecisionValueResponse = {
  leverageIndexApprox: number;
  estimatedOverturnProbability: number;
  overturnProbabilityConfidence: ConfidenceBand | null;
  overturnProbabilityFallbackTier: OverturnProbabilityFallbackTier | null;
  overturnGeometryVariant: OverturnGeometryVariant | null;
  overturnSplitPolicyVersion: string | null;
  wpDeltaIfSuccess: number;
  wpDeltaIfFail: number;
  expectedWpDelta: number;
  successValue: number;
  failureValue: number;
  inventoryCost: number;
  inventoryCostVersion: InventoryCostVersion | null;
  expectedChallengeValue: number;
  recommendation: "challenge" | "hold" | "cannot_challenge";
  rationale: string;
  decisionValueMode: DecisionValueMode;
};

const OVERTURN_CACHE_TTL_MS = 60_000;
let cachedLookupRows: OverturnProbabilityLookupRow[] | null = null;
let cachedAt = 0;
const DEFAULT_OVERTURN_GEOMETRY_VARIANT: OverturnGeometryVariant = "radius_adjusted";
const INVENTORY_COST_VERSION: InventoryCostVersion = "inventory_future_opportunity_failure_weighted_v2";
const INVENTORY_UPPER_BOUND_REALIZATION_RATE = 0.04;
const INVENTORY_MAX_COST_BY_REMAINING: Record<1 | 2, number> = {
  1: 0.015,
  2: 0.0075,
};
const INVENTORY_UPPER_BOUND_BY_BUCKET: Record<string, number> = {
  "1|1-3|close": 0.28954352014010387,
  "1|1-3|not_close": 0.23589356435643613,
  "1|4-6|close": 0.24681330022075038,
  "1|4-6|not_close": 0.19392706919945835,
  "1|7-8|close": 0.21035421686746955,
  "1|7-8|not_close": 0.10613727729556854,
  "1|9+|close": 0.11896820388349548,
  "1|9+|not_close": 0.01721450549450547,
  "2|1-3|close": 0.21517434325744247,
  "2|1-3|not_close": 0.17001245874587342,
  "2|4-6|close": 0.17933073951434852,
  "2|4-6|not_close": 0.1295591587516967,
  "2|7-8|close": 0.134208543263965,
  "2|7-8|not_close": 0.06035564184559155,
  "2|9+|close": 0.06170121359223295,
  "2|9+|not_close": 0.007338901098901094,
};

const DEFAULT_OVERTURN_FALLBACK_ROWS: OverturnProbabilityLookupRow[] = [
  {
    fallbackTier: "global",
    splitPolicyVersion: null,
    geometryVariant: "radius_adjusted",
    challengeDirection: null,
    edgeBucket: null,
    sampleSize: 0,
    overturnsTotal: 0,
    rawOverturnRate: 0.5,
    overturnProbability: 0.5,
    confidenceBand: "low",
  },
  {
    fallbackTier: "global",
    splitPolicyVersion: null,
    geometryVariant: "center_only",
    challengeDirection: null,
    edgeBucket: null,
    sampleSize: 0,
    overturnsTotal: 0,
    rawOverturnRate: 0.5,
    overturnProbability: 0.5,
    confidenceBand: "low",
  },
];

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function leverageApprox(req: ChallengeDecisionValueRequest) {
  const runnersOnBase = countRunnersOnBase(req.basesState);
  const inningFactor = clamp(req.inning / 9, 0.1, 1.7);
  const closeGameFactor = clamp(1.5 - Math.abs(req.scoreDiffBattingTeam) * 0.15, 0.3, 1.5);
  const countFactor = req.balls === 3 && req.strikes === 2 ? 1.2 : req.strikes === 2 ? 1.1 : 1.0;
  const baseOutFactor = runnersOnBase > 0 ? 1 + runnersOnBase * 0.12 : 0.95;
  return Number(clamp(inningFactor * closeGameFactor * countFactor * baseOutFactor, 0.2, 3.0).toFixed(3));
}

export function getChallengeDirection(calledPitch: CalledPitch): ChallengeDirection {
  return calledPitch === "called_strike" ? "strike_to_ball" : "ball_to_strike";
}

function getChallengeTeamValueMultiplier(calledPitch: CalledPitch) {
  return calledPitch === "called_strike" ? 1 : -1;
}

export function getEdgeBucketFromDistance(edgeDistance: number | null | undefined): EdgeBucket | null {
  if (edgeDistance === null || edgeDistance === undefined || Number.isNaN(edgeDistance)) return null;
  if (edgeDistance <= -0.15) return "strong_confirm";
  if (edgeDistance <= -0.03) return "lean_confirm";
  if (edgeDistance < 0.03) return "borderline";
  if (edgeDistance < 0.15) return "lean_overturn";
  return "strong_overturn";
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

function inventoryCostApprox(req: ChallengeDecisionValueRequest, leverageIndex: number) {
  void leverageIndex;
  const remainingChallenges: 1 | 2 = req.challengesRemaining >= 2 ? 2 : 1;
  const inningKey = req.inning >= 9 ? "9+" : req.inning >= 7 ? "7-8" : req.inning >= 4 ? "4-6" : "1-3";
  const closeKey = Math.abs(req.scoreDiffBattingTeam) <= 1 ? "close" : "not_close";
  const bucketKey = `${remainingChallenges}|${inningKey}|${closeKey}`;
  const upperBound = INVENTORY_UPPER_BOUND_BY_BUCKET[bucketKey] ?? 0;
  const boundedCost = Math.min(
    upperBound * INVENTORY_UPPER_BOUND_REALIZATION_RATE,
    INVENTORY_MAX_COST_BY_REMAINING[remainingChallenges],
  );
  return Number(boundedCost.toFixed(4));
}

export async function getOverturnProbabilityFallbackRows(forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh && cachedLookupRows && now - cachedAt < OVERTURN_CACHE_TTL_MS) {
    return cachedLookupRows;
  }

  const selectColumns = `
    SELECT
      fallback_tier,
      split_policy_version,
      geometry_variant,
      challenge_direction,
      edge_bucket,
      sample_size,
      overturns_total,
      raw_overturn_rate,
      overturn_probability,
      confidence_band
  `;
  const sources = [
    "serving_abs_overturn_probability_fallbacks",
    "mart_modeled_abs_overturn_probability_fallbacks",
  ];

  let rawRows: Array<{
    fallback_tier: OverturnProbabilityFallbackTier;
    split_policy_version: string | null;
    geometry_variant: OverturnGeometryVariant;
    challenge_direction: ChallengeDirection | null;
    edge_bucket: EdgeBucket | null;
    sample_size: number;
    overturns_total: number;
    raw_overturn_rate: number;
    overturn_probability: number;
    confidence_band: ConfidenceBand;
  }> = [];

  for (const source of sources) {
    try {
      rawRows = await sql<{
        fallback_tier: OverturnProbabilityFallbackTier;
        split_policy_version: string | null;
        geometry_variant: OverturnGeometryVariant;
        challenge_direction: ChallengeDirection | null;
        edge_bucket: EdgeBucket | null;
        sample_size: number;
        overturns_total: number;
        raw_overturn_rate: number;
        overturn_probability: number;
        confidence_band: ConfidenceBand;
      }>(`
        ${selectColumns}
        FROM ${source}
        ORDER BY
          CASE
            WHEN geometry_variant = 'radius_adjusted' THEN 0
            WHEN geometry_variant = 'center_only' THEN 1
            ELSE 2
          END,
          sample_size DESC,
          split_policy_version DESC NULLS LAST
      `);
      if (rawRows.length > 0) break;
    } catch {
      rawRows = [];
    }
  }

  const rows = Array.isArray(rawRows) ? rawRows : [];
  const dedupedRows = new Map<string, (typeof rows)[number]>();
  for (const row of rows) {
    const key = [
      row.fallback_tier,
      row.geometry_variant,
      row.challenge_direction ?? "global",
      row.edge_bucket ?? "all",
    ].join("::");
    if (!dedupedRows.has(key)) dedupedRows.set(key, row);
  }

  cachedLookupRows = dedupedRows.size > 0 ? [...dedupedRows.values()].map((row) => ({
    fallbackTier: row.fallback_tier,
    splitPolicyVersion: row.split_policy_version ?? null,
    geometryVariant: row.geometry_variant,
    challengeDirection: row.challenge_direction,
    edgeBucket: row.edge_bucket,
    sampleSize: Number(row.sample_size ?? 0),
    overturnsTotal: Number(row.overturns_total ?? 0),
    rawOverturnRate: Number(row.raw_overturn_rate ?? 0),
    overturnProbability: Number(row.overturn_probability ?? 0.5),
    confidenceBand: row.confidence_band ?? getOverturnProbabilityConfidenceBand(row.sample_size),
  })) : DEFAULT_OVERTURN_FALLBACK_ROWS;
  cachedAt = now;
  return cachedLookupRows;
}

export function resolveOverturnProbabilityWithFallback(
  input: {
    calledPitch: CalledPitch;
    edgeBucket?: EdgeBucket | null;
    edgeDistance?: number | null;
    geometryVariant?: OverturnGeometryVariant;
  },
  rows: OverturnProbabilityLookupRow[],
): OverturnProbabilityResolution | null {
  const challengeDirection = getChallengeDirection(input.calledPitch);
  const resolvedEdgeBucket = input.edgeBucket ?? getEdgeBucketFromDistance(input.edgeDistance);
  const preferredGeometry = input.geometryVariant ?? DEFAULT_OVERTURN_GEOMETRY_VARIANT;
  const geometryCandidates = [
    preferredGeometry,
    preferredGeometry === "radius_adjusted" ? "center_only" : "radius_adjusted",
  ] satisfies OverturnGeometryVariant[];

  const lookups: Array<{
    tier: OverturnProbabilityFallbackTier;
    challengeDirection: ChallengeDirection | null;
    edgeBucket: EdgeBucket | null;
  }> = [
    { tier: "exact", challengeDirection, edgeBucket: resolvedEdgeBucket ?? null },
    { tier: "direction_only", challengeDirection, edgeBucket: null },
    { tier: "global", challengeDirection: null, edgeBucket: null },
  ];

  for (const geometryVariant of geometryCandidates) {
    for (const lookup of lookups) {
      const match = rows.find(
        (row) =>
          row.fallbackTier === lookup.tier &&
          row.geometryVariant === geometryVariant &&
          row.challengeDirection === lookup.challengeDirection &&
          row.edgeBucket === lookup.edgeBucket,
      );
      if (match) return match;
    }
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
  const basesState = req.basesState;

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
      overturnGeometryVariant: null,
      overturnSplitPolicyVersion: null,
      wpDeltaIfSuccess: 0,
      wpDeltaIfFail: 0,
      expectedWpDelta: 0,
      successValue: 0,
      failureValue: 0,
      inventoryCost: 0,
      inventoryCostVersion: null,
      expectedChallengeValue: 0,
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
  const challengeTeamValueMultiplier = getChallengeTeamValueMultiplier(req.calledPitch);
  const successDelta =
    winDelta !== null
      ? Number((winDelta * challengeTeamValueMultiplier).toFixed(4))
      : heuristicSuccess;
  const failureCost = Number((-0.0025 * li).toFixed(4));
  const inventoryCost = inventoryCostApprox(req, li);
  const failureDelta = Number((failureCost - inventoryCost).toFixed(4));
  const expected =
    estimatedOverturnProbability * successDelta +
    (1 - estimatedOverturnProbability) * failureDelta;

  const recommendation = expected > 0 ? "challenge" : "hold";
  const rationaleParts = [
    overturn
      ? `${Math.round(estimatedOverturnProbability * 100)}% empirical overturn probability (${overturn.fallbackTier.replace("_", " ")} lookup, ${overturn.geometryVariant.replace("_", " ")} geometry).`
      : "Using global overturn-rate fallback due to limited historical match coverage.",
    winDelta !== null
      ? "Success value uses historical win-expectancy count swing for the challenging team in this game state."
      : "Success value falls back to heuristic leverage because the challenged call leads to a terminal or sparse count state.",
    `Inventory cost is ${inventoryCost.toFixed(4)} expected WP and is applied only on the failed-challenge branch.`,
    recommendation === "challenge"
      ? "Expected challenge value is positive after inventory cost."
      : "Expected challenge value is negative after inventory cost.",
  ];

  return {
    leverageIndexApprox: li,
    estimatedOverturnProbability: Math.round(estimatedOverturnProbability * 10000) / 10000,
    overturnProbabilityConfidence: overturn?.confidenceBand ?? null,
    overturnProbabilityFallbackTier: overturn?.fallbackTier ?? null,
    overturnGeometryVariant: overturn?.geometryVariant ?? null,
    overturnSplitPolicyVersion: overturn?.splitPolicyVersion ?? null,
    wpDeltaIfSuccess: successDelta,
    wpDeltaIfFail: failureDelta,
    expectedWpDelta: Number(expected.toFixed(4)),
    successValue: successDelta,
    failureValue: failureDelta,
    inventoryCost,
    inventoryCostVersion: INVENTORY_COST_VERSION,
    expectedChallengeValue: Number(expected.toFixed(4)),
    recommendation,
    rationale: rationaleParts.join(" "),
    decisionValueMode: winDelta !== null ? "win_expectancy" : "heuristic",
  };
}
