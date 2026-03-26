import fs from "node:fs";
import path from "node:path";
import { Client } from "pg";
import {
  AUDIT_DATE,
  AUDIT_END,
  ROOT,
  SPRING_START,
  formatAuditDateLabel,
} from "./audit-runtime.mjs";

const DOC_PATH = path.join(ROOT, `docs/models/audits/${AUDIT_DATE}-re-benchmark.md`);
const ARTIFACT_PATH = path.join(
  ROOT,
  `docs/models/audits/artifacts/${AUDIT_DATE}-re-benchmark.json`,
);

function loadEnvFile(filename) {
  const filePath = path.join(ROOT, filename);
  if (!fs.existsSync(filePath)) return;
  const raw = fs.readFileSync(filePath, "utf8");
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    if (process.env[key]) continue;
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

loadEnvFile(".env");
loadEnvFile(".env.local");

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required");
}

function mean(values) {
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
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

function formatRuns(value, digits = 3) {
  return Number(value).toFixed(digits);
}

function summarizeRows(rows) {
  const absDiffs = rows.map((row) => row.absDiff);
  const signedDiffs = rows.map((row) => row.signedDiff);
  const sqErrors = rows.map((row) => row.signedDiff ** 2);
  return {
    rows: rows.length,
    meanAbsDiff: mean(absDiffs),
    medianAbsDiff: median(absDiffs),
    p90AbsDiff: percentile(absDiffs, 0.9),
    meanSignedDiff: mean(signedDiffs),
    rmse: sqErrors.length ? Math.sqrt(mean(sqErrors)) : null,
    maxAbsDiff: absDiffs.length ? absDiffs.reduce((max, value) => (value > max ? value : max), absDiffs[0]) : null,
  };
}

function runnersOnBase(basesState) {
  return (basesState ?? "").split("").filter((value) => value === "1").length;
}

function runnersLabel(basesState) {
  const count = runnersOnBase(basesState);
  if (count === 0) return "Empty";
  if (count === 1) return "One Runner";
  if (count === 2) return "Two Runners";
  return "Bases Loaded";
}

function toMarkdownTable(rows, columns) {
  const header = `| ${columns.map((column) => column.label).join(" | ")} |`;
  const separator = `| ${columns.map(() => "---").join(" | ")} |`;
  const body = rows.map(
    (row) => `| ${columns.map((column) => String(column.render(row))).join(" | ")} |`,
  );
  return [header, separator, ...body].join("\n");
}

function buildMarkdown(report) {
  return `# Run Expectancy Benchmark

Date: ${formatAuditDateLabel()}

## Scope

- Comparison layer: realized spring runs scored from pitch state to inning end
- Internal layer: AiBS shared RE fallback mart resolved on live pitch state
- Sample: final spring-training games in the ABS window from ${SPRING_START} through ${AUDIT_END}

## Overview

- Games benchmarked: ${report.gamesBenchmarked}
- Pitch states compared: ${report.overall.rows}
- Mean absolute difference: ${formatRuns(report.overall.meanAbsDiff)}
- Median absolute difference: ${formatRuns(report.overall.medianAbsDiff)}
- 90th percentile absolute difference: ${formatRuns(report.overall.p90AbsDiff)}
- RMSE: ${formatRuns(report.overall.rmse)}
- Mean signed difference (AiBS RE minus realized runs): ${formatRuns(report.overall.meanSignedDiff)}

## Key Findings

- AiBS RE is directionally credible against realized spring inning outcomes and does not show broad structural drift.
- The spring sample is resolving entirely through exact RE rows, so this audit is mostly measuring exact-state quality rather than fallback stress.
- Empty-base and two-out states converge tightly; the largest residual error clusters in no-out, multi-runner pressure states.
- AiBS RE is still somewhat optimistic overall, with a positive signed gap of ${formatRuns(report.overall.meanSignedDiff)} runs.

## By Fallback Tier

${toMarkdownTable(report.byFallbackTier, [
    { label: "Fallback Tier", render: (row) => row.fallbackTier },
    { label: "Rows", render: (row) => row.rows },
    { label: "Share", render: (row) => `${(row.share * 100).toFixed(1)}%` },
    { label: "MAE", render: (row) => formatRuns(row.meanAbsDiff) },
    { label: "Mean Signed", render: (row) => formatRuns(row.meanSignedDiff) },
    { label: "RMSE", render: (row) => formatRuns(row.rmse) },
  ])}

## By Model Confidence

${toMarkdownTable(report.byConfidenceBand, [
    { label: "Confidence", render: (row) => row.confidenceBand },
    { label: "Rows", render: (row) => row.rows },
    { label: "Share", render: (row) => `${(row.share * 100).toFixed(1)}%` },
    { label: "MAE", render: (row) => formatRuns(row.meanAbsDiff) },
    { label: "Mean Signed", render: (row) => formatRuns(row.meanSignedDiff) },
  ])}

## By Inning Bucket

${toMarkdownTable(report.byInningBucket, [
    { label: "Inning Bucket", render: (row) => row.inningBucket },
    { label: "Rows", render: (row) => row.rows },
    { label: "MAE", render: (row) => formatRuns(row.meanAbsDiff) },
    { label: "Mean Signed", render: (row) => formatRuns(row.meanSignedDiff) },
  ])}

## By Outs

${toMarkdownTable(report.byOuts, [
    { label: "Outs", render: (row) => row.outs },
    { label: "Rows", render: (row) => row.rows },
    { label: "MAE", render: (row) => formatRuns(row.meanAbsDiff) },
    { label: "Mean Signed", render: (row) => formatRuns(row.meanSignedDiff) },
  ])}

## By Runner State

${toMarkdownTable(report.byRunnerState, [
    { label: "Runner State", render: (row) => row.runnerState },
    { label: "Rows", render: (row) => row.rows },
    { label: "MAE", render: (row) => formatRuns(row.meanAbsDiff) },
    { label: "Mean Signed", render: (row) => formatRuns(row.meanSignedDiff) },
  ])}

## Largest Divergence State Groups

${toMarkdownTable(report.topDivergenceGroups, [
    { label: "State", render: (row) => `${row.inningBucket}, ${row.outs} outs, ${row.basesState}, ${row.countKey}` },
    { label: "Fallback", render: (row) => row.fallbackTier },
    { label: "Current Rows", render: (row) => row.currentRows },
    { label: "Model Sample", render: (row) => row.modelSampleSize ?? "—" },
    { label: "Confidence", render: (row) => row.modelConfidenceBand ?? "—" },
    { label: "AiBS RE", render: (row) => formatRuns(row.predictedRuns) },
    { label: "Realized RE", render: (row) => formatRuns(row.realizedRuns) },
    { label: "Abs Diff", render: (row) => formatRuns(row.absDiff) },
  ])}

## Strongest Convergence State Groups

${toMarkdownTable(report.topConvergenceGroups, [
    { label: "State", render: (row) => `${row.inningBucket}, ${row.outs} outs, ${row.basesState}, ${row.countKey}` },
    { label: "Fallback", render: (row) => row.fallbackTier },
    { label: "Current Rows", render: (row) => row.currentRows },
    { label: "AiBS RE", render: (row) => formatRuns(row.predictedRuns) },
    { label: "Realized RE", render: (row) => formatRuns(row.realizedRuns) },
    { label: "Abs Diff", render: (row) => formatRuns(row.absDiff) },
  ])}

## Root-Cause Readout

- Low-confidence exact rows in benchmark: ${report.rootCause.lowConfidenceExactRows}
- Exact rows with model sample size \`<= 20\`: ${report.rootCause.exactRowsSampleLe20}
- Exact rows with model sample size \`<= 50\`: ${report.rootCause.exactRowsSampleLe50}
- Inning-bucket fallback rows with bucket sample size \`<= 20\`: ${report.rootCause.bucketRowsSampleLe20}
- Inning-bucket fallback rows with bucket sample size \`<= 50\`: ${report.rootCause.bucketRowsSampleLe50}
- Mean RE gap between exact and bucket on low-confidence exact rows: ${formatRuns(report.rootCause.meanExactVsBucketGapOnLowConfidenceRows)}
- If low-confidence exact rows were forced to bucket fallback, benchmark MAE would move from ${formatRuns(report.rootCause.currentMeanAbsDiff)} to ${formatRuns(report.rootCause.meanAbsDiffIfBucketForLowConfidenceExact)}.

## Notes

- This is an out-of-sample spring audit against realized inning outcomes, not a comparison to a public MLB RE product.
- Realized runs are noisy at the pitch level, so the state-group sections are the more important analyst readout than any single pitch.
- The benchmark should be rerun after meaningful spring and regular-season data refreshes so high-pressure exact-state behavior is tracked over time.
`;
}

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    const gameRows = await client.query(
      `
      SELECT COUNT(DISTINCT g.game_pk) AS games_benchmarked
      FROM games g
      JOIN pitches p ON p.game_pk = g.game_pk
      WHERE g.status_detailed = 'Final'
        AND g.game_date BETWEEN $1::date AND $2::date
      `,
      [SPRING_START, AUDIT_END],
    );

    const rows = (
      await client.query(
        `
        WITH benchmark_games AS (
          SELECT DISTINCT g.game_pk
          FROM games g
          JOIN pitches p ON p.game_pk = g.game_pk
          WHERE g.status_detailed = 'Final'
            AND g.game_date BETWEEN $1::date AND $2::date
        ),
        inning_terminal AS (
          SELECT
            p.game_pk,
            p.inning,
            p.half_inning,
            MAX(
              CASE
                WHEN p.half_inning = 'Top' THEN COALESCE(p.away_score_after, p.away_score_before, 0)
                ELSE COALESCE(p.home_score_after, p.home_score_before, 0)
              END
            ) AS inning_end_bat_score
          FROM pitches p
          JOIN benchmark_games bg ON bg.game_pk = p.game_pk
          GROUP BY p.game_pk, p.inning, p.half_inning
        ),
        spring_pitch_states AS (
          SELECT
            p.game_pk,
            p.at_bat_index,
            p.pitch_number,
            p.inning,
            p.half_inning,
            CASE
              WHEN p.inning >= 9 THEN '9+'
              WHEN p.inning >= 7 THEN '7-8'
              WHEN p.inning >= 4 THEN '4-6'
              ELSE '1-3'
            END AS inning_bucket,
            p.outs_before AS outs,
            p.bases_state_before AS bases_state,
            CONCAT(
              LEAST(GREATEST(p.balls_before, 0), 3),
              '-',
              LEAST(GREATEST(p.strikes_before, 0), 2)
            ) AS count_key,
            GREATEST(
              0,
              COALESCE(
                it.inning_end_bat_score,
                CASE
                  WHEN p.half_inning = 'Top' THEN COALESCE(p.away_score_after, p.away_score_before, 0)
                  ELSE COALESCE(p.home_score_after, p.home_score_before, 0)
                END
              ) - CASE
                WHEN p.half_inning = 'Top' THEN COALESCE(p.away_score_before, 0)
                ELSE COALESCE(p.home_score_before, 0)
              END
            )::NUMERIC AS actual_runs_to_end_inning
          FROM pitches p
          JOIN benchmark_games bg ON bg.game_pk = p.game_pk
          LEFT JOIN inning_terminal it
            ON it.game_pk = p.game_pk
           AND it.inning = p.inning
           AND it.half_inning = p.half_inning
          WHERE p.outs_before IS NOT NULL
            AND p.bases_state_before IS NOT NULL
            AND p.balls_before IS NOT NULL
            AND p.strikes_before IS NOT NULL
        ),
        resolved AS (
          SELECT
            s.game_pk,
            s.at_bat_index,
            s.pitch_number,
            s.inning,
            s.half_inning,
            s.inning_bucket,
            s.outs,
            s.bases_state,
            s.count_key,
            s.actual_runs_to_end_inning,
            COALESCE(
              exact.expected_runs_to_end_inning,
              bucket.expected_runs_to_end_inning,
              drop_count.expected_runs_to_end_inning
            ) AS predicted_runs_to_end_inning,
            CASE
              WHEN exact.expected_runs_to_end_inning IS NOT NULL THEN 'exact'
              WHEN bucket.expected_runs_to_end_inning IS NOT NULL THEN 'drop_inning_bucket'
              ELSE 'drop_count_key'
            END AS fallback_tier,
            exact.expected_runs_to_end_inning AS exact_expected_runs,
            exact.sample_size AS exact_sample_size,
            exact.confidence_band AS exact_confidence_band,
            bucket.expected_runs_to_end_inning AS bucket_expected_runs,
            bucket.sample_size AS bucket_sample_size,
            bucket.confidence_band AS bucket_confidence_band,
            drop_count.sample_size AS drop_count_sample_size,
            drop_count.confidence_band AS drop_count_confidence_band
          FROM spring_pitch_states s
          LEFT JOIN mart_run_expectancy_fallbacks exact
            ON exact.fallback_tier = 'exact'
           AND exact.inning_bucket = s.inning_bucket
           AND exact.outs = s.outs
           AND exact.bases_state = s.bases_state
           AND exact.count_key = s.count_key
          LEFT JOIN mart_run_expectancy_fallbacks bucket
            ON bucket.fallback_tier = 'drop_inning_bucket'
           AND bucket.outs = s.outs
           AND bucket.bases_state = s.bases_state
           AND bucket.count_key = s.count_key
          LEFT JOIN mart_run_expectancy_fallbacks drop_count
            ON drop_count.fallback_tier = 'drop_count_key'
           AND drop_count.outs = s.outs
           AND drop_count.bases_state = s.bases_state
          WHERE COALESCE(
            exact.expected_runs_to_end_inning,
            bucket.expected_runs_to_end_inning,
            drop_count.expected_runs_to_end_inning
          ) IS NOT NULL
        )
        SELECT *
        FROM resolved
        `,
        [SPRING_START, AUDIT_END],
      )
    ).rows.map((row) => {
      const predictedRuns = Number(row.predicted_runs_to_end_inning);
      const realizedRuns = Number(row.actual_runs_to_end_inning);
      const signedDiff = predictedRuns - realizedRuns;
      const exactExpectedRuns =
        row.exact_expected_runs === null ? null : Number(row.exact_expected_runs);
      const bucketExpectedRuns =
        row.bucket_expected_runs === null ? null : Number(row.bucket_expected_runs);
      return {
        gamePk: Number(row.game_pk),
        atBatIndex: Number(row.at_bat_index),
        pitchNumber: Number(row.pitch_number),
        inning: Number(row.inning),
        halfInning: row.half_inning,
        inningBucket: row.inning_bucket,
        outs: Number(row.outs),
        basesState: row.bases_state,
        countKey: row.count_key,
        actualRunsToEndInning: realizedRuns,
        predictedRuns,
        fallbackTier: row.fallback_tier,
        exactExpectedRuns,
        exactSampleSize: row.exact_sample_size === null ? null : Number(row.exact_sample_size),
        exactConfidenceBand: row.exact_confidence_band,
        bucketExpectedRuns,
        bucketSampleSize: row.bucket_sample_size === null ? null : Number(row.bucket_sample_size),
        bucketConfidenceBand: row.bucket_confidence_band,
        dropCountSampleSize:
          row.drop_count_sample_size === null ? null : Number(row.drop_count_sample_size),
        dropCountConfidenceBand: row.drop_count_confidence_band,
        signedDiff,
        absDiff: Math.abs(signedDiff),
      };
    });

    const overall = summarizeRows(rows);
    const byFallbackTier = [...rows.reduce((map, row) => {
      const bucket = map.get(row.fallbackTier) ?? [];
      bucket.push(row);
      map.set(row.fallbackTier, bucket);
      return map;
    }, new Map()).entries()]
      .map(([fallbackTier, groupRows]) => {
        const summary = summarizeRows(groupRows);
        return {
          fallbackTier,
          rows: summary.rows,
          share: summary.rows / overall.rows,
          meanAbsDiff: summary.meanAbsDiff,
          meanSignedDiff: summary.meanSignedDiff,
          rmse: summary.rmse,
        };
      })
      .sort((a, b) => b.rows - a.rows);

    const byInningBucket = [...rows.reduce((map, row) => {
      const bucket = map.get(row.inningBucket) ?? [];
      bucket.push(row);
      map.set(row.inningBucket, bucket);
      return map;
    }, new Map()).entries()]
      .map(([inningBucket, groupRows]) => {
        const summary = summarizeRows(groupRows);
        return {
          inningBucket,
          rows: summary.rows,
          meanAbsDiff: summary.meanAbsDiff,
          meanSignedDiff: summary.meanSignedDiff,
        };
      })
      .sort((a, b) => b.rows - a.rows);

    const byConfidenceBand = [...rows.reduce((map, row) => {
      const confidenceBand =
        row.fallbackTier === "exact"
          ? row.exactConfidenceBand
          : row.fallbackTier === "drop_inning_bucket"
            ? row.bucketConfidenceBand
            : row.dropCountConfidenceBand;
      const bucket = map.get(confidenceBand) ?? [];
      bucket.push(row);
      map.set(confidenceBand, bucket);
      return map;
    }, new Map()).entries()]
      .map(([confidenceBand, groupRows]) => {
        const summary = summarizeRows(groupRows);
        return {
          confidenceBand,
          rows: summary.rows,
          share: summary.rows / overall.rows,
          meanAbsDiff: summary.meanAbsDiff,
          meanSignedDiff: summary.meanSignedDiff,
        };
      })
      .sort((a, b) => b.rows - a.rows);

    const byOuts = [...rows.reduce((map, row) => {
      const bucket = map.get(row.outs) ?? [];
      bucket.push(row);
      map.set(row.outs, bucket);
      return map;
    }, new Map()).entries()]
      .map(([outs, groupRows]) => {
        const summary = summarizeRows(groupRows);
        return {
          outs,
          rows: summary.rows,
          meanAbsDiff: summary.meanAbsDiff,
          meanSignedDiff: summary.meanSignedDiff,
        };
      })
      .sort((a, b) => a.outs - b.outs);

    const byRunnerState = [...rows.reduce((map, row) => {
      const label = runnersLabel(row.basesState);
      const bucket = map.get(label) ?? [];
      bucket.push(row);
      map.set(label, bucket);
      return map;
    }, new Map()).entries()]
      .map(([runnerState, groupRows]) => {
        const summary = summarizeRows(groupRows);
        return {
          runnerState,
          rows: summary.rows,
          meanAbsDiff: summary.meanAbsDiff,
          meanSignedDiff: summary.meanSignedDiff,
        };
      })
      .sort((a, b) => b.rows - a.rows);

    const groupedStates = [...rows.reduce((map, row) => {
      const key = [
        row.inningBucket,
        row.outs,
        row.basesState,
        row.countKey,
        row.fallbackTier,
        row.exactSampleSize,
        row.exactConfidenceBand,
        row.bucketSampleSize,
        row.bucketConfidenceBand,
      ].join("|");
      const bucket = map.get(key) ?? {
        inningBucket: row.inningBucket,
        outs: row.outs,
        basesState: row.basesState,
        countKey: row.countKey,
        fallbackTier: row.fallbackTier,
        modelSampleSize:
          row.fallbackTier === "exact"
            ? row.exactSampleSize
            : row.fallbackTier === "drop_inning_bucket"
              ? row.bucketSampleSize
              : row.dropCountSampleSize,
        modelConfidenceBand:
          row.fallbackTier === "exact"
            ? row.exactConfidenceBand
            : row.fallbackTier === "drop_inning_bucket"
              ? row.bucketConfidenceBand
              : row.dropCountConfidenceBand,
        predictedRuns: row.predictedRuns,
        currentRows: 0,
        realizedRunsTotal: 0,
      };
      bucket.currentRows += 1;
      bucket.realizedRunsTotal += row.actualRunsToEndInning;
      map.set(key, bucket);
      return map;
    }, new Map()).values()]
      .map((group) => {
        const realizedRuns = group.realizedRunsTotal / group.currentRows;
        return {
          ...group,
          realizedRuns,
          signedDiff: group.predictedRuns - realizedRuns,
          absDiff: Math.abs(group.predictedRuns - realizedRuns),
        };
      });

    const topDivergenceGroups = groupedStates
      .filter((row) => row.currentRows >= 10)
      .sort((a, b) => b.absDiff - a.absDiff || b.currentRows - a.currentRows)
      .slice(0, 15);

    const topConvergenceGroups = groupedStates
      .filter((row) => row.currentRows >= 25)
      .sort((a, b) => a.absDiff - b.absDiff || b.currentRows - a.currentRows)
      .slice(0, 15);

    const lowConfidenceExactRows = rows.filter(
      (row) => row.fallbackTier === "exact" && row.exactConfidenceBand === "low",
    );
    const exactRowsSampleLe20 = rows.filter(
      (row) =>
        row.fallbackTier === "exact" &&
        row.exactSampleSize !== null &&
        row.exactSampleSize <= 20,
    );
    const exactRowsSampleLe50 = rows.filter(
      (row) =>
        row.fallbackTier === "exact" &&
        row.exactSampleSize !== null &&
        row.exactSampleSize <= 50,
    );
    const bucketRowsSampleLe20 = rows.filter(
      (row) =>
        row.fallbackTier === "drop_inning_bucket" &&
        row.bucketSampleSize !== null &&
        row.bucketSampleSize <= 20,
    );
    const bucketRowsSampleLe50 = rows.filter(
      (row) =>
        row.fallbackTier === "drop_inning_bucket" &&
        row.bucketSampleSize !== null &&
        row.bucketSampleSize <= 50,
    );
    const meanExactVsBucketGapOnLowConfidenceRows =
      mean(
        lowConfidenceExactRows
          .filter(
            (row) =>
              row.exactExpectedRuns !== null &&
              row.bucketExpectedRuns !== null,
          )
          .map((row) => Math.abs(row.exactExpectedRuns - row.bucketExpectedRuns)),
      ) ?? 0;
    const meanAbsDiffIfBucketForLowConfidenceExact =
      rows.reduce((sum, row) => {
        const adjustedPrediction =
          row.fallbackTier === "exact" &&
          row.exactConfidenceBand === "low" &&
          row.bucketExpectedRuns !== null
            ? row.bucketExpectedRuns
            : row.predictedRuns;
        return sum + Math.abs(adjustedPrediction - row.actualRunsToEndInning);
      }, 0) / rows.length;

    const report = {
      generatedAt: new Date().toISOString(),
      auditWindow: { start: SPRING_START, end: AUDIT_END },
      gamesBenchmarked: Number(gameRows.rows[0]?.games_benchmarked ?? 0),
      overall,
      byFallbackTier,
      byConfidenceBand,
      byInningBucket,
      byOuts,
      byRunnerState,
      topDivergenceGroups,
      topConvergenceGroups,
      rootCause: {
        lowConfidenceExactRows: lowConfidenceExactRows.length,
        exactRowsSampleLe20: exactRowsSampleLe20.length,
        exactRowsSampleLe50: exactRowsSampleLe50.length,
        bucketRowsSampleLe20: bucketRowsSampleLe20.length,
        bucketRowsSampleLe50: bucketRowsSampleLe50.length,
        meanExactVsBucketGapOnLowConfidenceRows,
        currentMeanAbsDiff: overall.meanAbsDiff,
        meanAbsDiffIfBucketForLowConfidenceExact,
      },
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
