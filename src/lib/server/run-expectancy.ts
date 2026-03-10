import type { ChallengeEvent, ConfidenceBand } from "@/lib/types";
import { sql } from "@/lib/db";
import { buildCanonicalPitchState } from "@/lib/server/model-state";
import { getRunEnvironmentConfidenceBand, roundRunExpectancy } from "@/lib/server/run-environment";

export type RunExpectancyFallbackTier = "exact" | "drop_inning_bucket" | "drop_count_key";

export type RunExpectancyLookupRow = {
  fallbackTier: RunExpectancyFallbackTier;
  inningBucket: string | null;
  outs: number | null;
  basesState: string | null;
  countKey: string | null;
  sampleSize: number;
  expectedRunsToEndInning: number;
  confidenceBand: ConfidenceBand;
};

export type RunExpectancyResolution = {
  fallbackTier: RunExpectancyFallbackTier;
  inningBucket: string | null;
  outs: number | null;
  basesState: string | null;
  countKey: string | null;
  sampleSize: number;
  expectedRunsToEndInning: number;
  confidenceBand: ConfidenceBand;
};

export type ChallengeRunExpectancyDelta = {
  preRunExpectancy: number | null;
  postRunExpectancy: number | null;
  runExpectancyDelta: number | null;
  runExpectancyConfidence: ConfidenceBand | null;
  runExpectancyFallbackTier: RunExpectancyFallbackTier | null;
};

const RUN_EXPECTANCY_CACHE_TTL_MS = 60_000;
let cachedLookupRows: RunExpectancyLookupRow[] | null = null;
let cachedAt = 0;

export async function getRunExpectancyFallbackRows(forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh && cachedLookupRows && now - cachedAt < RUN_EXPECTANCY_CACHE_TTL_MS) {
    return cachedLookupRows;
  }

  const rawRows = await sql<{
    fallback_tier: RunExpectancyFallbackTier;
    inning_bucket: string | null;
    outs: number | null;
    bases_state: string | null;
    count_key: string | null;
    sample_size: number;
    expected_runs_to_end_inning: number;
    confidence_band: ConfidenceBand;
  }>(
    `
    SELECT
      fallback_tier,
      inning_bucket,
      outs,
      bases_state,
      count_key,
      sample_size,
      expected_runs_to_end_inning,
      confidence_band
    FROM mart_run_expectancy_fallbacks
    `,
  );

  const rows = Array.isArray(rawRows) ? rawRows : [];

  cachedLookupRows = rows.map((row) => ({
    fallbackTier: row.fallback_tier,
    inningBucket: row.inning_bucket,
    outs: row.outs,
    basesState: row.bases_state,
    countKey: row.count_key,
    sampleSize: Number(row.sample_size ?? 0),
    expectedRunsToEndInning: Number(row.expected_runs_to_end_inning ?? 0),
    confidenceBand: row.confidence_band ?? getRunEnvironmentConfidenceBand(row.sample_size),
  }));
  cachedAt = now;
  return cachedLookupRows;
}

export function resolveRunExpectancyWithFallback(
  state: {
    inning?: number | null;
    halfInning?: string | null;
    outs?: number | null;
    basesState?: string | null;
    countKey?: string | null;
    homeScore?: number | null;
    awayScore?: number | null;
  },
  rows: RunExpectancyLookupRow[],
): RunExpectancyResolution | null {
  const canonical = buildCanonicalPitchState({
    inning: state.inning,
    halfInning: state.halfInning,
    outs: state.outs,
    basesState: state.basesState,
    homeScore: state.homeScore,
    awayScore: state.awayScore,
  });

  if (canonical.outs === null || canonical.basesState === null) return null;

  const lookups: Array<{
    tier: RunExpectancyFallbackTier;
    inningBucket: string | null;
    countKey: string | null;
  }> = [
    { tier: "exact", inningBucket: canonical.inningBucket, countKey: state.countKey ?? null },
    { tier: "drop_inning_bucket", inningBucket: null, countKey: state.countKey ?? null },
    { tier: "drop_count_key", inningBucket: null, countKey: null },
  ];

  for (const lookup of lookups) {
    const match = rows.find(
      (row) =>
        row.fallbackTier === lookup.tier &&
        row.inningBucket === lookup.inningBucket &&
        row.outs === canonical.outs &&
        row.basesState === canonical.basesState &&
        row.countKey === lookup.countKey,
    );
    if (match) return match;
  }

  return null;
}

export async function getRunExpectancy(state: {
  inning?: number | null;
  halfInning?: string | null;
  outs?: number | null;
  basesState?: string | null;
  countKey?: string | null;
  homeScore?: number | null;
  awayScore?: number | null;
}) {
  const rows = await getRunExpectancyFallbackRows();
  return resolveRunExpectancyWithFallback(state, rows);
}

export function getChallengeRunExpectancyDelta(
  challenge: Pick<ChallengeEvent, "inning" | "halfInning" | "outs" | "basesState" | "homeScore" | "awayScore" | "umpireCount" | "countAfter">,
  rows: RunExpectancyLookupRow[],
): ChallengeRunExpectancyDelta {
  const heldCountKey = challenge.umpireCount ?? null;
  const correctedCountKey = challenge.countAfter ?? null;

  const pre = resolveRunExpectancyWithFallback(
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
  const post = resolveRunExpectancyWithFallback(
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

  const preRunExpectancy = roundRunExpectancy(pre?.expectedRunsToEndInning ?? null);
  const postRunExpectancy = roundRunExpectancy(post?.expectedRunsToEndInning ?? null);
  const runExpectancyDelta =
    preRunExpectancy === null || postRunExpectancy === null ? null : roundRunExpectancy(postRunExpectancy - preRunExpectancy);
  const confidenceBands = [pre?.confidenceBand, post?.confidenceBand].filter(Boolean) as ConfidenceBand[];

  return {
    preRunExpectancy,
    postRunExpectancy,
    runExpectancyDelta,
    runExpectancyConfidence:
      confidenceBands.length === 0
        ? null
        : confidenceBands.includes("low")
          ? "low"
          : confidenceBands.includes("medium")
            ? "medium"
            : "high",
    runExpectancyFallbackTier: pre?.fallbackTier ?? post?.fallbackTier ?? null,
  };
}
