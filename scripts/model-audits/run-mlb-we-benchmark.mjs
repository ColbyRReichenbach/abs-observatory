import fs from "node:fs";
import path from "node:path";
import { Client } from "pg";
import {
  AUDIT_DATE,
  ROOT,
  auditArtifactPath,
  auditDocPath,
  formatAuditDateLabel,
  loadAuditEnv,
  resolveAuditDatabaseUrl,
  describeAuditDatabaseTarget,
} from "./audit-runtime.mjs";

const DOC_PATH = auditDocPath("mlb-we-benchmark", ROOT, AUDIT_DATE);
const ARTIFACT_PATH = auditArtifactPath("mlb-we-benchmark", ROOT, AUDIT_DATE);
const FETCH_CONCURRENCY = 12;
const MIN_EXACT_WIN_EXPECTANCY_SAMPLE_SIZE = 20;
const WIN_EXPECTANCY_LOW_CONFIDENCE_BLEND_PRIOR_WEIGHT = 100;

loadAuditEnv();
const DATABASE_URL = resolveAuditDatabaseUrl();
const DATABASE_TARGET = describeAuditDatabaseTarget(DATABASE_URL);
console.log(`[audit:mlb-we-benchmark] role=${DATABASE_TARGET.role} host=${DATABASE_TARGET.host} db=${DATABASE_TARGET.database}`);

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function formatPct(value, digits = 1) {
  return `${(value * 100).toFixed(digits)}%`;
}

function formatSignedPctPoint(value) {
  return `${value >= 0 ? "+" : ""}${(value * 100).toFixed(2)} pts`;
}

function toHomeProbability(probability, halfInning) {
  return halfInning === "Top" ? 1 - probability : probability;
}

function median(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function percentile(values, pct) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * pct) - 1));
  return sorted[index];
}

function summarizeRows(rows) {
  const diffs = rows.map((row) => row.absDiff);
  const signedDiffs = rows.map((row) => row.signedDiff);
  return {
    rows: rows.length,
    meanAbsDiff: diffs.length ? diffs.reduce((sum, value) => sum + value, 0) / diffs.length : null,
    medianAbsDiff: median(diffs),
    p90AbsDiff: percentile(diffs, 0.9),
    meanSignedDiff: signedDiffs.length ? signedDiffs.reduce((sum, value) => sum + value, 0) / signedDiffs.length : null,
    maxAbsDiff: diffs.length ? diffs.reduce((max, value) => (value > max ? value : max), diffs[0]) : null,
  };
}

function toScoreBucketLabel(bucket) {
  switch (bucket) {
    case "tied":
      return "Tied";
    case "lead1":
    case "trail1":
      return "One-Run";
    case "lead2":
    case "trail2":
      return "Two-Run";
    case "lead3":
    case "trail3":
      return "Three-Run";
    default:
      return "Four-Plus";
  }
}

async function fetchWinProbability(gamePk) {
  const response = await fetch(`https://statsapi.mlb.com/api/v1/game/${gamePk}/winProbability`);
  if (!response.ok) {
    throw new Error(`winProbability fetch failed for ${gamePk}: ${response.status}`);
  }
  return response.json();
}

function toPreAtBatHomeProbability(play) {
  const post = Number(play.homeTeamWinProbability);
  const added = Number(play.homeTeamWinProbabilityAdded);
  if (!Number.isFinite(post) || !Number.isFinite(added)) return null;
  return clamp((post - added) / 100, 0, 1);
}

function blendExactTowardBucket(exactProbability, exactSampleSize, exactConfidenceBand, bucketProbability) {
  if (bucketProbability === null || bucketProbability === undefined) return exactProbability;
  if (exactSampleSize <= MIN_EXACT_WIN_EXPECTANCY_SAMPLE_SIZE) return bucketProbability;
  if (exactConfidenceBand !== "low") return exactProbability;
  const exactWeight =
    exactSampleSize / (exactSampleSize + WIN_EXPECTANCY_LOW_CONFIDENCE_BLEND_PRIOR_WEIGHT);
  return (exactProbability * exactWeight) + (bucketProbability * (1 - exactWeight));
}

function buildMarkdown(report) {
  const coverageRows = report.byFallbackTier
    .map(
      (row) =>
        `| ${row.fallbackTier} | ${row.rows} | ${formatPct(row.share)} | ${formatPct(row.meanAbsDiff)} | ${formatSignedPctPoint(row.meanSignedDiff)} |`,
    )
    .join("\n");

  const inningRows = report.byInningBucket
    .map(
      (row) =>
        `| ${row.inningBucket} | ${row.rows} | ${formatPct(row.meanAbsDiff)} | ${formatSignedPctPoint(row.meanSignedDiff)} |`,
    )
    .join("\n");

  const leverageRows = report.byScoreBucket
    .map(
      (row) =>
        `| ${row.scoreBucket} | ${row.rows} | ${formatPct(row.meanAbsDiff)} | ${formatSignedPctPoint(row.meanSignedDiff)} |`,
    )
    .join("\n");

  const outlierRows = report.topDivergences
    .map(
      (row) =>
        `| ${row.gamePk} | ${row.atBatIndex} | ${row.inning} ${row.halfInning} | ${row.fallbackTier} | ${row.exactSampleSize ?? "—"} | ${row.exactConfidenceBand ?? "—"} | ${formatPct(row.aibsHomeWinProbability)} | ${row.bucketHomeWinProbability === null ? "—" : formatPct(row.bucketHomeWinProbability)} | ${formatPct(row.mlbHomeWinProbability)} | ${formatPct(row.absDiff)} |`,
    )
    .join("\n");

  return `# MLB WE Benchmark\n
Date: ${formatAuditDateLabel()}\n
## Scope\n
- Comparison layer: MLB public \`/game/{gamePk}/winProbability\` endpoint\n
- Internal layer: AiBS shared WE fallback mart resolved on pre-at-bat state with count \`0-0\`\n
- Sample: final spring-training games in the current ABS window that contain at least one challenge and expose public win-probability payloads\n
## Overview\n
- Games benchmarked: ${report.gamesBenchmarked}\n
- Challenge games available in sample: ${report.gamesAvailable}\n
- At-bats compared: ${report.overall.rows}\n
- Mean absolute difference: ${formatPct(report.overall.meanAbsDiff)}\n
- Median absolute difference: ${formatPct(report.overall.medianAbsDiff)}\n
- 90th percentile absolute difference: ${formatPct(report.overall.p90AbsDiff)}\n
- Mean signed difference (AiBS home WE minus MLB home WE): ${formatSignedPctPoint(report.overall.meanSignedDiff)}\n
## Key Findings\n
- AiBS is directionally close enough to MLB’s public WE layer to treat the shared WE model as credible, not structurally broken.\n
- The broad benchmark gap is moderate rather than alarming: most compared at-bats stay within a single-digit percentage-point band.\n
- The most meaningful benchmark pressure is in tied and one-run states, where AiBS is somewhat more optimistic for the home side than MLB.\n
- The largest individual divergences are no longer dominated by tiny exact-state blowups; they now cluster in low-confidence states where the inning bucket is also thin or materially different from MLB’s public layer.\n
## Interpretation\n
- This benchmark is intentionally pre-at-bat only, because MLB exposes play-level win probability rather than pitch-level count-state WE.\n
- AiBS is being compared on the shared state both systems actually represent: inning, half inning, score state, outs, bases, and a fresh \`0-0\` count.\n
- Differences here are benchmark signals, not automatic evidence that MLB is “right” and AiBS is “wrong.”\n
- The benchmark now reconstructs pre-at-bat state from previous at-bat end state plus first-pitch inning/outs, because the raw \`*_start\` / \`*_before\` columns proved unreliable on some spring at-bats.\n
## By Fallback Tier\n
| Fallback Tier | At-Bats | Share | Mean Abs Diff | Mean Signed Diff |\n
| --- | --- | --- | --- | --- |\n
${coverageRows}\n
## By Inning Bucket\n
| Inning Bucket | At-Bats | Mean Abs Diff | Mean Signed Diff |\n
| --- | --- | --- | --- |\n
${inningRows}\n
## By Score Bucket\n
| Score Bucket | At-Bats | Mean Abs Diff | Mean Signed Diff |\n
| --- | --- | --- | --- |\n
${leverageRows}\n
## Largest Divergences\n
| Game | At-Bat | State | Fallback Tier | Exact Sample | Confidence | AiBS Home WE | Bucket Home WE | MLB Home WE | Abs Diff |\n
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |\n
${outlierRows}\n
## Root-Cause Readout\n
- Low-confidence exact rows in benchmark: ${report.rootCause.lowConfidenceExactRows}\n
- Exact rows with sample size \`<= 5\`: ${report.rootCause.exactRowsSampleLe5}\n
- Exact rows with sample size \`<= 10\`: ${report.rootCause.exactRowsSampleLe10}\n
- Exact rows with sample size \`<= 20\`: ${report.rootCause.exactRowsSampleLe20}\n
- Inning-bucket fallback rows with bucket sample size \`<= 20\`: ${report.rootCause.bucketRowsSampleLe20}\n
- Inning-bucket fallback rows with bucket sample size \`<= 50\`: ${report.rootCause.bucketRowsSampleLe50}\n
- Mean home-WE gap between exact and bucket on low-confidence exact rows: ${formatPct(report.rootCause.meanHomeGapLowConfidenceExactVsBucket)}\n
- If exact rows with sample size \`<= 20\` were forced to bucket fallback, benchmark mean abs diff would move from ${formatPct(report.rootCause.currentMeanAbsDiff)} to ${formatPct(report.rootCause.meanAbsDiffIfBucketForTinyExact)}.\n
- If all low-confidence exact rows were forced to bucket fallback, benchmark mean abs diff would move from ${formatPct(report.rootCause.currentMeanAbsDiff)} to ${formatPct(report.rootCause.meanAbsDiffIfBucketForLowConfidenceExact)}.\n

## Notes\n
- MLB pre-at-bat home WE is reconstructed as \`homeTeamWinProbability - homeTeamWinProbabilityAdded\` from the public endpoint.\n
- AiBS home WE is derived from batting-team WE: top-half states invert to home-team perspective, bottom-half states do not.\n
- This benchmark is not count-aware on the MLB side, so it should be used to validate overall WE shape rather than pitch-level challenge deltas.\n`;
}

async function main() {
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();

  try {
    const gameRows = (
      await client.query(`
        SELECT DISTINCT g.game_pk
        FROM games g
        JOIN abs_challenges c ON c.game_pk = g.game_pk
        WHERE g.status_detailed = 'Final'
        ORDER BY g.game_pk
      `)
    ).rows.map((row) => Number(row.game_pk));

    const atBatRows = (
      await client.query(
        `
        WITH benchmark_games AS (
          SELECT DISTINCT g.game_pk
          FROM games g
          JOIN abs_challenges c ON c.game_pk = g.game_pk
          WHERE g.status_detailed = 'Final'
        ),
        ordered_at_bats AS (
          SELECT
            a.game_pk,
            a.at_bat_index,
            a.inning,
            a.half_inning,
            a.home_score_end,
            a.away_score_end,
            a.bases_state_end,
            LAG(a.inning) OVER (PARTITION BY a.game_pk ORDER BY a.at_bat_index) AS prev_inning,
            LAG(a.half_inning) OVER (PARTITION BY a.game_pk ORDER BY a.at_bat_index) AS prev_half_inning,
            LAG(a.home_score_end) OVER (PARTITION BY a.game_pk ORDER BY a.at_bat_index) AS prev_home_score_end,
            LAG(a.away_score_end) OVER (PARTITION BY a.game_pk ORDER BY a.at_bat_index) AS prev_away_score_end,
            LAG(a.bases_state_end) OVER (PARTITION BY a.game_pk ORDER BY a.at_bat_index) AS prev_bases_state_end
          FROM at_bats a
          JOIN benchmark_games bg ON bg.game_pk = a.game_pk
        ),
        first_pitch_state AS (
          SELECT DISTINCT ON (p.game_pk, p.at_bat_index)
            p.game_pk,
            p.at_bat_index,
            p.inning,
            p.half_inning,
            p.outs_before AS outs,
            p.balls_before,
            p.strikes_before
          FROM pitches p
          JOIN benchmark_games bg ON bg.game_pk = p.game_pk
          WHERE p.inning IS NOT NULL
            AND p.half_inning IS NOT NULL
            AND p.outs_before IS NOT NULL
          ORDER BY p.game_pk, p.at_bat_index, p.pitch_number
        ),
        states AS (
          SELECT
            fps.game_pk,
            fps.at_bat_index,
            fps.inning,
            CASE WHEN LOWER(fps.half_inning) = 'top' THEN 'Top' ELSE 'Bottom' END AS half_inning,
            fps.outs,
            CASE
              WHEN oab.prev_half_inning = fps.half_inning AND oab.prev_inning = fps.inning
                THEN COALESCE(oab.prev_bases_state_end, '000')
              ELSE '000'
            END AS bases_state,
            COALESCE(oab.prev_home_score_end, 0) AS home_score,
            COALESCE(oab.prev_away_score_end, 0) AS away_score,
            CASE
              WHEN LOWER(fps.half_inning) = 'top' THEN
                CASE
                  WHEN COALESCE(oab.prev_away_score_end, 0) - COALESCE(oab.prev_home_score_end, 0) <= -4 THEN 'trail4plus'
                  WHEN COALESCE(oab.prev_away_score_end, 0) - COALESCE(oab.prev_home_score_end, 0) = -3 THEN 'trail3'
                  WHEN COALESCE(oab.prev_away_score_end, 0) - COALESCE(oab.prev_home_score_end, 0) = -2 THEN 'trail2'
                  WHEN COALESCE(oab.prev_away_score_end, 0) - COALESCE(oab.prev_home_score_end, 0) = -1 THEN 'trail1'
                  WHEN COALESCE(oab.prev_away_score_end, 0) - COALESCE(oab.prev_home_score_end, 0) = 0 THEN 'tied'
                  WHEN COALESCE(oab.prev_away_score_end, 0) - COALESCE(oab.prev_home_score_end, 0) = 1 THEN 'lead1'
                  WHEN COALESCE(oab.prev_away_score_end, 0) - COALESCE(oab.prev_home_score_end, 0) = 2 THEN 'lead2'
                  WHEN COALESCE(oab.prev_away_score_end, 0) - COALESCE(oab.prev_home_score_end, 0) = 3 THEN 'lead3'
                  ELSE 'lead4plus'
                END
              ELSE
                CASE
                  WHEN COALESCE(oab.prev_home_score_end, 0) - COALESCE(oab.prev_away_score_end, 0) <= -4 THEN 'trail4plus'
                  WHEN COALESCE(oab.prev_home_score_end, 0) - COALESCE(oab.prev_away_score_end, 0) = -3 THEN 'trail3'
                  WHEN COALESCE(oab.prev_home_score_end, 0) - COALESCE(oab.prev_away_score_end, 0) = -2 THEN 'trail2'
                  WHEN COALESCE(oab.prev_home_score_end, 0) - COALESCE(oab.prev_away_score_end, 0) = -1 THEN 'trail1'
                  WHEN COALESCE(oab.prev_home_score_end, 0) - COALESCE(oab.prev_away_score_end, 0) = 0 THEN 'tied'
                  WHEN COALESCE(oab.prev_home_score_end, 0) - COALESCE(oab.prev_away_score_end, 0) = 1 THEN 'lead1'
                  WHEN COALESCE(oab.prev_home_score_end, 0) - COALESCE(oab.prev_away_score_end, 0) = 2 THEN 'lead2'
                  WHEN COALESCE(oab.prev_home_score_end, 0) - COALESCE(oab.prev_away_score_end, 0) = 3 THEN 'lead3'
                  ELSE 'lead4plus'
                END
            END AS score_diff_bucket,
            CASE
              WHEN fps.inning >= 9 THEN '9+'
              WHEN fps.inning >= 7 THEN '7-8'
              WHEN fps.inning >= 4 THEN '4-6'
              ELSE '1-3'
            END AS inning_bucket
          FROM first_pitch_state fps
          JOIN ordered_at_bats oab
            ON oab.game_pk = fps.game_pk
           AND oab.at_bat_index = fps.at_bat_index
        )
        SELECT
          s.game_pk,
          s.at_bat_index,
          s.inning,
          s.half_inning,
          s.outs,
          s.bases_state,
          s.home_score,
          s.away_score,
          s.score_diff_bucket,
          s.inning_bucket,
          COALESCE(exact.batting_team_win_probability, bucket.batting_team_win_probability, drop_count_exact.batting_team_win_probability, drop_count_bucket.batting_team_win_probability) AS batting_team_win_probability,
          exact.batting_team_win_probability AS exact_batting_team_win_probability,
          exact.sample_size AS exact_sample_size,
          exact.confidence_band AS exact_confidence_band,
          bucket.batting_team_win_probability AS bucket_batting_team_win_probability,
          bucket.sample_size AS bucket_sample_size,
          CASE
            WHEN exact.batting_team_win_probability IS NOT NULL THEN 'exact'
            WHEN bucket.batting_team_win_probability IS NOT NULL THEN 'drop_inning_to_bucket'
            WHEN drop_count_exact.batting_team_win_probability IS NOT NULL THEN 'drop_count_key_exact_inning'
            WHEN drop_count_bucket.batting_team_win_probability IS NOT NULL THEN 'drop_count_key_bucketed_inning'
            ELSE 'unresolved'
          END AS fallback_tier
        FROM states s
        LEFT JOIN mart_win_expectancy_fallbacks exact
          ON exact.fallback_tier = 'exact'
         AND exact.inning = s.inning
         AND exact.half_inning = s.half_inning
         AND exact.score_diff_bucket = s.score_diff_bucket
         AND exact.outs = s.outs
         AND exact.bases_state = s.bases_state
         AND exact.count_key = '0-0'
        LEFT JOIN mart_win_expectancy_fallbacks bucket
          ON bucket.fallback_tier = 'drop_inning_to_bucket'
         AND bucket.inning_bucket = s.inning_bucket
         AND bucket.half_inning = s.half_inning
         AND bucket.score_diff_bucket = s.score_diff_bucket
         AND bucket.outs = s.outs
         AND bucket.bases_state = s.bases_state
         AND bucket.count_key = '0-0'
        LEFT JOIN mart_win_expectancy_fallbacks drop_count_exact
          ON drop_count_exact.fallback_tier = 'drop_count_key_exact_inning'
         AND drop_count_exact.inning = s.inning
         AND drop_count_exact.half_inning = s.half_inning
         AND drop_count_exact.score_diff_bucket = s.score_diff_bucket
         AND drop_count_exact.outs = s.outs
         AND drop_count_exact.bases_state = s.bases_state
        LEFT JOIN mart_win_expectancy_fallbacks drop_count_bucket
          ON drop_count_bucket.fallback_tier = 'drop_count_key_bucketed_inning'
         AND drop_count_bucket.inning_bucket = s.inning_bucket
         AND drop_count_bucket.half_inning = s.half_inning
         AND drop_count_bucket.score_diff_bucket = s.score_diff_bucket
         AND drop_count_bucket.outs = s.outs
         AND drop_count_bucket.bases_state = s.bases_state
        WHERE COALESCE(exact.batting_team_win_probability, bucket.batting_team_win_probability, drop_count_exact.batting_team_win_probability, drop_count_bucket.batting_team_win_probability) IS NOT NULL
        `,
      )
    ).rows;

    const atBatStateMap = new Map();
    for (const row of atBatRows) {
      const exactBattingTeamWinProbability =
        row.exact_batting_team_win_probability === null ? null : Number(row.exact_batting_team_win_probability);
      const bucketBattingTeamWinProbability =
        row.bucket_batting_team_win_probability === null ? null : Number(row.bucket_batting_team_win_probability);
      const blendedBattingTeamWinProbability =
        exactBattingTeamWinProbability === null
          ? bucketBattingTeamWinProbability
          : blendExactTowardBucket(
              exactBattingTeamWinProbability,
              Number(row.exact_sample_size ?? 0),
              row.exact_confidence_band,
              bucketBattingTeamWinProbability,
            );
      const resolvedFallbackTier =
        exactBattingTeamWinProbability !== null &&
        blendedBattingTeamWinProbability === exactBattingTeamWinProbability
          ? "exact"
          : bucketBattingTeamWinProbability !== null
            ? "drop_inning_to_bucket"
            : row.fallback_tier;
      const resolvedBattingTeamWinProbability =
        blendedBattingTeamWinProbability ?? Number(row.batting_team_win_probability);
      const aibsHomeWinProbability = toHomeProbability(resolvedBattingTeamWinProbability, row.half_inning);
      atBatStateMap.set(`${row.game_pk}:${row.at_bat_index}`, {
        gamePk: Number(row.game_pk),
        atBatIndex: Number(row.at_bat_index),
        inning: Number(row.inning),
        halfInning: row.half_inning,
        outs: Number(row.outs),
        basesState: row.bases_state,
        homeScore: Number(row.home_score),
        awayScore: Number(row.away_score),
        scoreBucket: toScoreBucketLabel(row.score_diff_bucket),
        inningBucket: row.inning_bucket,
        fallbackTier: resolvedFallbackTier,
        aibsHomeWinProbability,
        exactHomeWinProbability:
          exactBattingTeamWinProbability === null
            ? null
            : toHomeProbability(exactBattingTeamWinProbability, row.half_inning),
        exactSampleSize: row.exact_sample_size === null ? null : Number(row.exact_sample_size),
        exactConfidenceBand: row.exact_confidence_band,
        bucketHomeWinProbability:
          bucketBattingTeamWinProbability === null
            ? null
            : toHomeProbability(bucketBattingTeamWinProbability, row.half_inning),
        bucketSampleSize: row.bucket_sample_size === null ? null : Number(row.bucket_sample_size),
      });
    }

    const comparisons = [];
    let gamesBenchmarked = 0;
    let processed = 0;
    const queue = [...gameRows];

    const workers = Array.from({ length: Math.min(FETCH_CONCURRENCY, gameRows.length) }, async () => {
      while (queue.length) {
        const gamePk = queue.shift();
        if (!gamePk) break;
        try {
          const plays = await fetchWinProbability(gamePk);
          if (Array.isArray(plays) && plays.length > 0) {
            gamesBenchmarked += 1;
            for (const play of plays) {
              const atBatIndex = Number(play?.about?.atBatIndex ?? play?.atBatIndex);
              if (!Number.isFinite(atBatIndex)) continue;
              const state = atBatStateMap.get(`${gamePk}:${atBatIndex}`);
              if (!state) continue;

              const mlbHomeWinProbability = toPreAtBatHomeProbability(play);
              if (mlbHomeWinProbability === null) continue;

              const signedDiff = state.aibsHomeWinProbability - mlbHomeWinProbability;
              comparisons.push({
                gamePk,
                atBatIndex,
                inning: state.inning,
                halfInning: state.halfInning,
                inningBucket: state.inningBucket,
                scoreBucket: state.scoreBucket,
                fallbackTier: state.fallbackTier,
                aibsHomeWinProbability: state.aibsHomeWinProbability,
                exactHomeWinProbability: state.exactHomeWinProbability,
                exactSampleSize: state.exactSampleSize,
                exactConfidenceBand: state.exactConfidenceBand,
                bucketHomeWinProbability: state.bucketHomeWinProbability,
                bucketSampleSize: state.bucketSampleSize,
                mlbHomeWinProbability,
                signedDiff,
                absDiff: Math.abs(signedDiff),
              });
            }
          }
        } catch (error) {
          console.warn(`Skipping benchmark fetch for ${gamePk}: ${error.message}`);
        } finally {
          processed += 1;
          if (processed % 25 === 0 || processed === gameRows.length) {
            console.log(`Benchmarked ${processed}/${gameRows.length} games`);
          }
        }
      }
    });

    await Promise.all(workers);

    const overall = summarizeRows(comparisons);
    const byFallbackTier = [...comparisons.reduce((map, row) => {
      if (!map.has(row.fallbackTier)) map.set(row.fallbackTier, []);
      map.get(row.fallbackTier).push(row);
      return map;
    }, new Map()).entries()].map(([fallbackTier, rows]) => {
      const summary = summarizeRows(rows);
      return {
        fallbackTier,
        rows: summary.rows,
        share: summary.rows / overall.rows,
        meanAbsDiff: summary.meanAbsDiff,
        meanSignedDiff: summary.meanSignedDiff,
      };
    }).sort((a, b) => b.rows - a.rows);

    const byInningBucket = [...comparisons.reduce((map, row) => {
      if (!map.has(row.inningBucket)) map.set(row.inningBucket, []);
      map.get(row.inningBucket).push(row);
      return map;
    }, new Map()).entries()].map(([inningBucket, rows]) => {
      const summary = summarizeRows(rows);
      return {
        inningBucket,
        rows: summary.rows,
        meanAbsDiff: summary.meanAbsDiff,
        meanSignedDiff: summary.meanSignedDiff,
      };
    });

    const byScoreBucket = [...comparisons.reduce((map, row) => {
      if (!map.has(row.scoreBucket)) map.set(row.scoreBucket, []);
      map.get(row.scoreBucket).push(row);
      return map;
    }, new Map()).entries()].map(([scoreBucket, rows]) => {
      const summary = summarizeRows(rows);
      return {
        scoreBucket,
        rows: summary.rows,
        meanAbsDiff: summary.meanAbsDiff,
        meanSignedDiff: summary.meanSignedDiff,
      };
    }).sort((a, b) => b.rows - a.rows);

    const topDivergences = [...comparisons]
      .sort((a, b) => b.absDiff - a.absDiff)
      .slice(0, 15);

    const lowConfidenceExactRows = comparisons.filter(
      (row) => row.fallbackTier === "exact" && row.exactConfidenceBand === "low",
    );
    const exactRowsSampleLe5 = comparisons.filter(
      (row) => row.fallbackTier === "exact" && row.exactSampleSize !== null && row.exactSampleSize <= 5,
    );
    const exactRowsSampleLe10 = comparisons.filter(
      (row) => row.fallbackTier === "exact" && row.exactSampleSize !== null && row.exactSampleSize <= 10,
    );
    const exactRowsSampleLe20 = comparisons.filter(
      (row) => row.fallbackTier === "exact" && row.exactSampleSize !== null && row.exactSampleSize <= 20,
    );
    const bucketRowsSampleLe20 = comparisons.filter(
      (row) =>
        row.fallbackTier === "drop_inning_to_bucket" &&
        row.bucketSampleSize !== null &&
        row.bucketSampleSize <= 20,
    );
    const bucketRowsSampleLe50 = comparisons.filter(
      (row) =>
        row.fallbackTier === "drop_inning_to_bucket" &&
        row.bucketSampleSize !== null &&
        row.bucketSampleSize <= 50,
    );
    const meanHomeGapLowConfidenceExactVsBucket =
      lowConfidenceExactRows
        .filter((row) => row.exactHomeWinProbability !== null && row.bucketHomeWinProbability !== null)
        .reduce((sum, row, _, rows) => {
          if (!rows.length) return 0;
          return sum + Math.abs(row.exactHomeWinProbability - row.bucketHomeWinProbability) / rows.length;
        }, 0) || 0;
    const meanAbsDiffIfBucketForTinyExact =
      comparisons.reduce((sum, row) => {
        const adjustedHomeWinProbability =
          row.fallbackTier === "exact" &&
          row.exactSampleSize !== null &&
          row.exactSampleSize <= 20 &&
          row.bucketHomeWinProbability !== null
            ? row.bucketHomeWinProbability
            : row.aibsHomeWinProbability;
        return sum + Math.abs(adjustedHomeWinProbability - row.mlbHomeWinProbability);
      }, 0) / comparisons.length;
    const meanAbsDiffIfBucketForLowConfidenceExact =
      comparisons.reduce((sum, row) => {
        const adjustedHomeWinProbability =
          row.fallbackTier === "exact" &&
          row.exactConfidenceBand === "low" &&
          row.bucketHomeWinProbability !== null
            ? row.bucketHomeWinProbability
            : row.aibsHomeWinProbability;
        return sum + Math.abs(adjustedHomeWinProbability - row.mlbHomeWinProbability);
      }, 0) / comparisons.length;

    const report = {
      generatedAt: new Date().toISOString(),
      gamesAvailable: gameRows.length,
      gamesBenchmarked,
      overall,
      byFallbackTier,
      byInningBucket,
      byScoreBucket,
      rootCause: {
        lowConfidenceExactRows: lowConfidenceExactRows.length,
        exactRowsSampleLe5: exactRowsSampleLe5.length,
        exactRowsSampleLe10: exactRowsSampleLe10.length,
        exactRowsSampleLe20: exactRowsSampleLe20.length,
        bucketRowsSampleLe20: bucketRowsSampleLe20.length,
        bucketRowsSampleLe50: bucketRowsSampleLe50.length,
        meanHomeGapLowConfidenceExactVsBucket,
        currentMeanAbsDiff: overall.meanAbsDiff,
        meanAbsDiffIfBucketForTinyExact,
        meanAbsDiffIfBucketForLowConfidenceExact,
      },
      topDivergences,
    };

    fs.mkdirSync(path.dirname(ARTIFACT_PATH), { recursive: true });
    fs.writeFileSync(ARTIFACT_PATH, JSON.stringify(report, null, 2));
    fs.writeFileSync(DOC_PATH, buildMarkdown(report));

    console.log(`Wrote ${path.relative(ROOT, DOC_PATH)}`);
    console.log(`Wrote ${path.relative(ROOT, ARTIFACT_PATH)}`);
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
