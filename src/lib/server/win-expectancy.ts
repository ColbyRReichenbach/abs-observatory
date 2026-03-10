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

const WIN_EXPECTANCY_CACHE_TTL_MS = 60_000;
let cachedLookupRows: WinExpectancyLookupRow[] | null = null;
let cachedAt = 0;

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
    const match = rows.find(
      (row) =>
        row.fallbackTier === lookup.tier &&
        row.inning === lookup.inning &&
        row.inningBucket === lookup.inningBucket &&
        row.halfInning === canonical.halfInning &&
        row.scoreDiffBucket === canonical.scoreDiffBucket &&
        row.outs === canonical.outs &&
        row.basesState === canonical.basesState &&
        row.countKey === lookup.countKey,
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
