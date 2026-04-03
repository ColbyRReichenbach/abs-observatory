import type { ChallengeEvent, ConfidenceBand } from "@/lib/types";
import { sql } from "@/lib/db";
import { buildCanonicalPitchState } from "@/lib/server/model-state";
import { getWinExpectancyConfidenceBand, roundWinExpectancy } from "@/lib/server/run-environment";

export type WinExpectancyFallbackTier =
  | "exact"
  | "drop_inning_to_bucket"
  | "drop_count_key_exact_inning"
  | "drop_count_key_bucketed_inning";

export type WinExpectancyLookupRow = {
  fallbackTier: WinExpectancyFallbackTier;
  inning: number | null;
  inningBucket: string | null;
  halfInning: string | null;
  scoreDiffBucket: string | null;
  outs: number | null;
  basesState: string | null;
  countKey: string | null;
  sampleSize: number;
  battingTeamWinProbability: number;
  confidenceBand: ConfidenceBand;
};

export type WinExpectancyResolution = WinExpectancyLookupRow;

export type ChallengeWinExpectancyDelta = {
  preWinExpectancy: number | null;
  postWinExpectancy: number | null;
  winExpectancyDelta: number | null;
  winExpectancyConfidence: ConfidenceBand | null;
  winExpectancyFallbackTier: WinExpectancyFallbackTier | null;
};

export type WinExpectancySanityCheck = {
  key: string;
  passed: boolean;
  detail: string;
  leftValue: number | null;
  rightValue: number | null;
};

const WIN_EXPECTANCY_CACHE_TTL_MS = 60_000;
let cachedLookupRows: WinExpectancyLookupRow[] | null = null;
let cachedAt = 0;
const winExpectancyIndexCache = new WeakMap<WinExpectancyLookupRow[], Map<string, WinExpectancyLookupRow>>();

function buildWinExpectancyLookupKey(input: {
  tier: WinExpectancyFallbackTier;
  inning: number | null;
  inningBucket: string | null;
  halfInning: string | null;
  scoreDiffBucket: string | null;
  outs: number | null;
  basesState: string | null;
  countKey: string | null;
}) {
  return [
    input.tier,
    input.inning ?? "",
    input.inningBucket ?? "",
    input.halfInning ?? "",
    input.scoreDiffBucket ?? "",
    input.outs ?? "",
    input.basesState ?? "",
    input.countKey ?? "",
  ].join("|");
}

function getWinExpectancyIndex(rows: WinExpectancyLookupRow[]) {
  const cached = winExpectancyIndexCache.get(rows);
  if (cached) return cached;

  const index = new Map<string, WinExpectancyLookupRow>();
  for (const row of rows) {
    index.set(
      buildWinExpectancyLookupKey({
        tier: row.fallbackTier,
        inning: row.inning,
        inningBucket: row.inningBucket,
        halfInning: row.halfInning,
        scoreDiffBucket: row.scoreDiffBucket,
        outs: row.outs,
        basesState: row.basesState,
        countKey: row.countKey,
      }),
      row,
    );
  }

  winExpectancyIndexCache.set(rows, index);
  return index;
}

export async function getWinExpectancyFallbackRows(forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh && cachedLookupRows && now - cachedAt < WIN_EXPECTANCY_CACHE_TTL_MS) {
    return cachedLookupRows;
  }

  const rawRows = await sql<{
    fallback_tier: WinExpectancyFallbackTier;
    inning: number | null;
    inning_bucket: string | null;
    half_inning: string | null;
    score_diff_bucket: string | null;
    outs: number | null;
    bases_state: string | null;
    count_key: string | null;
    sample_size: number;
    batting_team_win_probability: number;
    confidence_band: ConfidenceBand;
  }>(
    `
    SELECT
      fallback_tier,
      inning,
      inning_bucket,
      half_inning,
      score_diff_bucket,
      outs,
      bases_state,
      count_key,
      sample_size,
      batting_team_win_probability,
      confidence_band
    FROM mart_win_expectancy_fallbacks
    `,
  );

  const rows = Array.isArray(rawRows) ? rawRows : [];
  cachedLookupRows = rows.map((row) => ({
    fallbackTier: row.fallback_tier,
    inning: row.inning,
    inningBucket: row.inning_bucket,
    halfInning: row.half_inning,
    scoreDiffBucket: row.score_diff_bucket,
    outs: row.outs,
    basesState: row.bases_state,
    countKey: row.count_key,
    sampleSize: Number(row.sample_size ?? 0),
    battingTeamWinProbability: Number(row.batting_team_win_probability ?? 0),
    confidenceBand: row.confidence_band ?? getWinExpectancyConfidenceBand(row.sample_size),
  }));
  cachedAt = now;
  return cachedLookupRows;
}

export function resolveWinExpectancyWithFallback(
  state: {
    inning?: number | null;
    halfInning?: string | null;
    outs?: number | null;
    basesState?: string | null;
    countKey?: string | null;
    homeScore?: number | null;
    awayScore?: number | null;
  },
  rows: WinExpectancyLookupRow[],
): WinExpectancyResolution | null {
  const canonical = buildCanonicalPitchState({
    inning: state.inning,
    halfInning: state.halfInning,
    outs: state.outs,
    basesState: state.basesState,
    homeScore: state.homeScore,
    awayScore: state.awayScore,
  });

  if (
    canonical.inning === null ||
    canonical.inningBucket === null ||
    canonical.halfInning === null ||
    canonical.scoreDiffBucket === null ||
    canonical.outs === null ||
    canonical.basesState === null
  ) {
    return null;
  }

  const index = getWinExpectancyIndex(rows);

  const lookups: Array<{
    tier: WinExpectancyFallbackTier;
    inning: number | null;
    inningBucket: string | null;
    countKey: string | null;
  }> = [
    {
      tier: "exact",
      inning: canonical.inning,
      inningBucket: null,
      countKey: state.countKey ?? null,
    },
    {
      tier: "drop_inning_to_bucket",
      inning: null,
      inningBucket: canonical.inningBucket,
      countKey: state.countKey ?? null,
    },
    {
      tier: "drop_count_key_exact_inning",
      inning: canonical.inning,
      inningBucket: null,
      countKey: null,
    },
    {
      tier: "drop_count_key_bucketed_inning",
      inning: null,
      inningBucket: canonical.inningBucket,
      countKey: null,
    },
  ];

  for (const lookup of lookups) {
    const match = index.get(
      buildWinExpectancyLookupKey({
        tier: lookup.tier,
        inning: lookup.inning,
        inningBucket: lookup.inningBucket,
        halfInning: canonical.halfInning,
        scoreDiffBucket: canonical.scoreDiffBucket,
        outs: canonical.outs,
        basesState: canonical.basesState,
        countKey: lookup.countKey,
      }),
    );
    if (match) return match;
  }

  return null;
}

export async function getWinExpectancy(state: {
  inning?: number | null;
  halfInning?: string | null;
  outs?: number | null;
  basesState?: string | null;
  countKey?: string | null;
  homeScore?: number | null;
  awayScore?: number | null;
}) {
  const rows = await getWinExpectancyFallbackRows();
  return resolveWinExpectancyWithFallback(state, rows);
}

export function getWinExpectancyCountSwing(
  state: {
    inning?: number | null;
    halfInning?: string | null;
    outs?: number | null;
    basesState?: string | null;
    homeScore?: number | null;
    awayScore?: number | null;
  },
  heldCountKey: string,
  correctedCountKey: string,
  rows: WinExpectancyLookupRow[],
) {
  const held = resolveWinExpectancyWithFallback(
    {
      ...state,
      countKey: heldCountKey,
    },
    rows,
  );
  const corrected = resolveWinExpectancyWithFallback(
    {
      ...state,
      countKey: correctedCountKey,
    },
    rows,
  );

  if (!held || !corrected) return null;
  return roundWinExpectancy(corrected.battingTeamWinProbability - held.battingTeamWinProbability);
}

export function runWinExpectancySanityChecks(rows: WinExpectancyLookupRow[]): WinExpectancySanityCheck[] {
  const lateTiedSwing = getWinExpectancyCountSwing(
    { inning: 9, halfInning: "Top", outs: 1, basesState: "010", homeScore: 4, awayScore: 4 },
    "2-2",
    "3-1",
    rows,
  );
  const earlyTiedSwing = getWinExpectancyCountSwing(
    { inning: 2, halfInning: "Top", outs: 1, basesState: "010", homeScore: 0, awayScore: 0 },
    "2-2",
    "3-1",
    rows,
  );
  const lateCloseSwing = getWinExpectancyCountSwing(
    { inning: 8, halfInning: "Top", outs: 1, basesState: "010", homeScore: 4, awayScore: 3 },
    "2-2",
    "3-1",
    rows,
  );
  const earlyBlowoutSwing = getWinExpectancyCountSwing(
    { inning: 2, halfInning: "Top", outs: 1, basesState: "010", homeScore: 5, awayScore: 1 },
    "2-2",
    "3-1",
    rows,
  );
  const hitterAhead = resolveWinExpectancyWithFallback(
    { inning: 8, halfInning: "Top", outs: 1, basesState: "010", countKey: "3-1", homeScore: 3, awayScore: 2 },
    rows,
  );
  const pitcherAhead = resolveWinExpectancyWithFallback(
    { inning: 8, halfInning: "Top", outs: 1, basesState: "010", countKey: "2-2", homeScore: 3, awayScore: 2 },
    rows,
  );

  return [
    {
      key: "late_tied_swing_exceeds_early_tied",
      passed:
        lateTiedSwing !== null &&
        earlyTiedSwing !== null &&
        Math.abs(lateTiedSwing) > Math.abs(earlyTiedSwing),
      detail: "A 3-1 vs 2-2 count swing in a tied ninth should matter more than the same swing in a tied second.",
      leftValue: lateTiedSwing,
      rightValue: earlyTiedSwing,
    },
    {
      key: "late_close_swing_exceeds_early_blowout",
      passed:
        lateCloseSwing !== null &&
        earlyBlowoutSwing !== null &&
        Math.abs(lateCloseSwing) > Math.abs(earlyBlowoutSwing),
      detail: "A count swing in a late one-run game should outweigh the same swing in an early four-run game.",
      leftValue: lateCloseSwing,
      rightValue: earlyBlowoutSwing,
    },
    {
      key: "hitter_ahead_exceeds_pitcher_ahead",
      passed:
        hitterAhead !== null &&
        pitcherAhead !== null &&
        hitterAhead.battingTeamWinProbability > pitcherAhead.battingTeamWinProbability,
      detail: "Within the same late state, a 3-1 count should favor the batting team more than a 2-2 count.",
      leftValue: hitterAhead?.battingTeamWinProbability ?? null,
      rightValue: pitcherAhead?.battingTeamWinProbability ?? null,
    },
  ];
}

export function getChallengeWinExpectancyDelta(
  challenge: Pick<
    ChallengeEvent,
    "inning" | "halfInning" | "outs" | "basesState" | "homeScore" | "awayScore" | "umpireCount" | "countAfter"
  >,
  rows: WinExpectancyLookupRow[],
): ChallengeWinExpectancyDelta {
  const heldCountKey = challenge.umpireCount ?? null;
  const correctedCountKey = challenge.countAfter ?? null;

  const pre = resolveWinExpectancyWithFallback(
    {
      inning: challenge.inning,
      halfInning: challenge.halfInning,
      outs: challenge.outs,
      basesState: challenge.basesState,
      countKey: heldCountKey,
      homeScore: challenge.homeScore,
      awayScore: challenge.awayScore,
    },
    rows,
  );
  const post = resolveWinExpectancyWithFallback(
    {
      inning: challenge.inning,
      halfInning: challenge.halfInning,
      outs: challenge.outs,
      basesState: challenge.basesState,
      countKey: correctedCountKey,
      homeScore: challenge.homeScore,
      awayScore: challenge.awayScore,
    },
    rows,
  );

  const preWinExpectancy = roundWinExpectancy(pre?.battingTeamWinProbability ?? null);
  const postWinExpectancy = roundWinExpectancy(post?.battingTeamWinProbability ?? null);
  const winExpectancyDelta =
    preWinExpectancy === null || postWinExpectancy === null ? null : roundWinExpectancy(postWinExpectancy - preWinExpectancy);
  const confidenceBands = [pre?.confidenceBand, post?.confidenceBand].filter(Boolean) as ConfidenceBand[];

  return {
    preWinExpectancy,
    postWinExpectancy,
    winExpectancyDelta,
    winExpectancyConfidence:
      confidenceBands.length === 0
        ? null
        : confidenceBands.includes("low")
          ? "low"
          : confidenceBands.includes("medium")
            ? "medium"
            : "high",
    winExpectancyFallbackTier: pre?.fallbackTier ?? post?.fallbackTier ?? null,
  };
}
