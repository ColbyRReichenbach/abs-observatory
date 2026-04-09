import fs from "node:fs";
import path from "node:path";
import { Client } from "pg";
import {
  describeAuditDatabaseTarget,
  loadAuditEnv,
  resolveAuditDatabaseUrl,
} from "./audit-runtime.mjs";
import {
  AUDIT_DATE,
  ROOT,
  formatAuditDateLabel,
  formatMaybeNumber,
  toMarkdownTable,
} from "./shared-audit-utils.mjs";

const DOC_PATH = path.join(ROOT, `docs/models/audits/${AUDIT_DATE}-re-benchmark.md`);
const ARTIFACT_PATH = path.join(
  ROOT,
  `docs/models/audits/artifacts/${AUDIT_DATE}-re-benchmark.json`,
);

loadAuditEnv();
const DATABASE_URL = resolveAuditDatabaseUrl();
const DATABASE_TARGET = describeAuditDatabaseTarget(DATABASE_URL);

function mean(values) {
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function formatRuns(value, digits = 3) {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return Number(value).toFixed(digits);
}

function weightedSummary(rows) {
  let totalWeight = 0;
  let weightedAbs = 0;
  let weightedSq = 0;
  let weightedSigned = 0;
  for (const row of rows) {
    const weight = row.sampleSize;
    totalWeight += weight;
    weightedAbs += row.absDiff * weight;
    weightedSq += (row.signedDiff ** 2) * weight;
    weightedSigned += row.signedDiff * weight;
  }
  return {
    rows: rows.length,
    weightedRows: totalWeight,
    meanAbsDiff: totalWeight > 0 ? weightedAbs / totalWeight : null,
    rmse: totalWeight > 0 ? Math.sqrt(weightedSq / totalWeight) : null,
    meanSignedDiff: totalWeight > 0 ? weightedSigned / totalWeight : null,
  };
}

function resolveRunExpectancyWithFallback(state, rows) {
  const inningBucket = state.inningBucket ?? null;
  const lookups = [
    { tier: "exact", inningBucket, countKey: state.countKey ?? null },
    { tier: "drop_inning_bucket", inningBucket: null, countKey: state.countKey ?? null },
    { tier: "drop_count_key", inningBucket: null, countKey: null },
  ];

  for (const lookup of lookups) {
    const match = rows.find(
      (row) =>
        row.fallbackTier === lookup.tier &&
        row.inningBucket === lookup.inningBucket &&
        row.outs === state.outs &&
        row.basesState === state.basesState &&
        row.countKey === lookup.countKey,
    );
    if (match) return match;
  }

  return null;
}

function buildMarkdown(report) {
  return `# Run Expectancy Benchmark

Date: ${formatAuditDateLabel()}

## Scope

- Source table: \`historical_pitch_states\`
- Split view: \`mart_historical_pitch_states_split\`
- Training fallback view: \`mart_run_expectancy_fallbacks_train\`
- Serving fit view: \`mart_run_expectancy_fallbacks\`
- Split policy: \`${report.splitPolicyVersion}\`

## Overview

- Validation rows: ${report.validationRows}
- Test rows: ${report.testRows}
- Distinct test state groups: ${report.testStateGroups}

## Held-Out Error Summary

${toMarkdownTable(report.summaryBySplit, [
    { label: "Split", render: (row) => row.splitSet },
    { label: "Weighted Rows", render: (row) => row.weightedRows },
    { label: "MAE", render: (row) => formatRuns(row.meanAbsDiff) },
    { label: "RMSE", render: (row) => formatRuns(row.rmse) },
    { label: "Mean Signed", render: (row) => formatRuns(row.meanSignedDiff) },
  ])}

## Held-Out Error By Fallback Tier

${toMarkdownTable(report.byFallbackTier, [
    { label: "Split", render: (row) => row.splitSet },
    { label: "Fallback", render: (row) => row.fallbackTier },
    { label: "Weighted Rows", render: (row) => row.weightedRows },
    { label: "MAE", render: (row) => formatRuns(row.meanAbsDiff) },
    { label: "Mean Signed", render: (row) => formatRuns(row.meanSignedDiff) },
  ])}

## Test State Calibration

${toMarkdownTable(report.testCalibrationTop, [
    { label: "State", render: (row) => `${row.inningBucket}, ${row.outs} outs, ${row.basesState}, ${row.countKey}` },
    { label: "Fallback", render: (row) => row.fallbackTier },
    { label: "Rows", render: (row) => row.sampleSize },
    { label: "Train Sample", render: (row) => row.modelSampleSize },
    { label: "Confidence", render: (row) => row.confidenceBand },
    { label: "Pred RE", render: (row) => formatRuns(row.predictedRuns) },
    { label: "Obs RE", render: (row) => formatRuns(row.observedRuns) },
    { label: "Abs Diff", render: (row) => formatRuns(row.absDiff) },
  ])}

## Largest Test Divergence Groups

${toMarkdownTable(report.topDivergenceGroups, [
    { label: "State", render: (row) => `${row.inningBucket}, ${row.outs} outs, ${row.basesState}, ${row.countKey}` },
    { label: "Fallback", render: (row) => row.fallbackTier },
    { label: "Rows", render: (row) => row.sampleSize },
    { label: "Pred RE", render: (row) => formatRuns(row.predictedRuns) },
    { label: "Obs RE", render: (row) => formatRuns(row.observedRuns) },
    { label: "Abs Diff", render: (row) => formatRuns(row.absDiff) },
  ])}

## Notes

- RE training for this audit uses only the \`train\` split through \`mart_run_expectancy_fallbacks_train\`.
- Held-out rows come from \`validation\` and \`test\` only.
- Serving should continue publishing from \`mart_run_expectancy_fallbacks\`, which now fits on \`train + validation\`.
`;
}

async function main() {
  console.log(`[audit:re-benchmark] role=${DATABASE_TARGET.role} host=${DATABASE_TARGET.host} db=${DATABASE_TARGET.database}`);
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();

  try {
    const trainingRowsResult = await client.query(`
      SELECT
        fallback_tier,
        inning_bucket,
        outs,
        bases_state,
        count_key,
        sample_size,
        expected_runs_to_end_inning,
        confidence_band
      FROM mart_run_expectancy_fallbacks_train
    `);

    const heldoutStatesResult = await client.query(`
      SELECT
        split_set,
        split_policy_version,
        inning_bucket,
        outs,
        bases_state,
        count_key,
        COUNT(*)::INTEGER AS sample_size,
        AVG(COALESCE(runs_to_inning_end, 0))::NUMERIC AS observed_runs
      FROM mart_historical_pitch_states_split
      WHERE split_set IN ('validation', 'test')
      GROUP BY split_set, split_policy_version, inning_bucket, outs, bases_state, count_key
    `);

    const trainingRows = trainingRowsResult.rows.map((row) => ({
      fallbackTier: row.fallback_tier,
      inningBucket: row.inning_bucket,
      outs: Number(row.outs),
      basesState: row.bases_state,
      countKey: row.count_key,
      sampleSize: Number(row.sample_size),
      expectedRunsToEndInning: Number(row.expected_runs_to_end_inning),
      confidenceBand: row.confidence_band,
    }));

    const heldoutRows = heldoutStatesResult.rows
      .map((row) => {
        const resolution = resolveRunExpectancyWithFallback(
          {
            inningBucket: row.inning_bucket,
            outs: Number(row.outs),
            basesState: row.bases_state,
            countKey: row.count_key,
          },
          trainingRows,
        );
        if (!resolution) return null;
        const observedRuns = Number(row.observed_runs);
        const predictedRuns = Number(resolution.expectedRunsToEndInning);
        return {
          splitSet: row.split_set,
          splitPolicyVersion: row.split_policy_version,
          inningBucket: row.inning_bucket,
          outs: Number(row.outs),
          basesState: row.bases_state,
          countKey: row.count_key,
          sampleSize: Number(row.sample_size),
          observedRuns,
          predictedRuns,
          signedDiff: predictedRuns - observedRuns,
          absDiff: Math.abs(predictedRuns - observedRuns),
          fallbackTier: resolution.fallbackTier,
          modelSampleSize: resolution.sampleSize,
          confidenceBand: resolution.confidenceBand,
        };
      })
      .filter(Boolean);

    const splitPolicyVersion = heldoutRows[0]?.splitPolicyVersion ?? "historical_pitch_states_season_holdout_v1";
    const summaryBySplit = ["validation", "test"].map((splitSet) => ({
      splitSet,
      ...weightedSummary(heldoutRows.filter((row) => row.splitSet === splitSet)),
    }));

    const byFallbackTier = [];
    for (const splitSet of ["validation", "test"]) {
      for (const fallbackTier of ["exact", "drop_inning_bucket", "drop_count_key"]) {
        const rows = heldoutRows.filter((row) => row.splitSet === splitSet && row.fallbackTier === fallbackTier);
        if (!rows.length) continue;
        byFallbackTier.push({
          splitSet,
          fallbackTier,
          ...weightedSummary(rows),
        });
      }
    }

    const testRows = heldoutRows.filter((row) => row.splitSet === "test");
    const testCalibrationTop = [...testRows]
      .sort((a, b) => a.countKey.localeCompare(b.countKey) || a.inningBucket.localeCompare(b.inningBucket))
      .slice(0, 12);
    const topDivergenceGroups = [...testRows].sort((a, b) => b.absDiff - a.absDiff).slice(0, 10);

    const report = {
      generatedAt: new Date().toISOString(),
      databaseTarget: DATABASE_TARGET,
      splitPolicyVersion,
      validationRows: summaryBySplit.find((row) => row.splitSet === "validation")?.weightedRows ?? 0,
      testRows: summaryBySplit.find((row) => row.splitSet === "test")?.weightedRows ?? 0,
      testStateGroups: testRows.length,
      summaryBySplit,
      byFallbackTier,
      testCalibrationTop,
      topDivergenceGroups,
    };

    fs.mkdirSync(path.dirname(DOC_PATH), { recursive: true });
    fs.mkdirSync(path.dirname(ARTIFACT_PATH), { recursive: true });
    fs.writeFileSync(DOC_PATH, buildMarkdown(report));
    fs.writeFileSync(ARTIFACT_PATH, JSON.stringify(report, null, 2));

    console.log(`Wrote ${DOC_PATH}`);
    console.log(`Wrote ${ARTIFACT_PATH}`);
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
