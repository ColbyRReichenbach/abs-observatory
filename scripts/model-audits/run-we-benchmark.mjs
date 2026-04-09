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
  toMarkdownTable,
} from "./shared-audit-utils.mjs";

const DOC_PATH = path.join(ROOT, `docs/models/audits/${AUDIT_DATE}-we-benchmark.md`);
const ARTIFACT_PATH = path.join(
  ROOT,
  `docs/models/audits/artifacts/${AUDIT_DATE}-we-benchmark.json`,
);

loadAuditEnv();
const DATABASE_URL = resolveAuditDatabaseUrl();
const DATABASE_TARGET = describeAuditDatabaseTarget(DATABASE_URL);

function formatPct(value, digits = 1) {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return `${(Number(value) * 100).toFixed(digits)}%`;
}

function formatSignedPctPoint(value) {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return `${value >= 0 ? "+" : ""}${(Number(value) * 100).toFixed(2)} pts`;
}

function clipProbability(value) {
  const epsilon = 1e-6;
  return Math.min(1 - epsilon, Math.max(epsilon, Number(value)));
}

function weightedSummary(rows) {
  let totalWeight = 0;
  let weightedAbs = 0;
  let weightedSq = 0;
  let weightedSigned = 0;
  let weightedLogLoss = 0;

  for (const row of rows) {
    const weight = row.sampleSize;
    const predicted = clipProbability(row.predictedWinProbability);
    const observed = row.observedWinRate;
    const wins = row.winCount;
    const losses = weight - wins;
    const signedDiff = predicted - observed;

    totalWeight += weight;
    weightedAbs += Math.abs(signedDiff) * weight;
    weightedSq += (signedDiff ** 2) * weight;
    weightedSigned += signedDiff * weight;
    weightedLogLoss += (-wins * Math.log(predicted)) + (-losses * Math.log(1 - predicted));
  }

  return {
    rows: rows.length,
    weightedRows: totalWeight,
    meanAbsDiff: totalWeight > 0 ? weightedAbs / totalWeight : null,
    brier: totalWeight > 0 ? weightedSq / totalWeight : null,
    rmse: totalWeight > 0 ? Math.sqrt(weightedSq / totalWeight) : null,
    meanSignedDiff: totalWeight > 0 ? weightedSigned / totalWeight : null,
    logLoss: totalWeight > 0 ? weightedLogLoss / totalWeight : null,
  };
}

function resolveWinExpectancyWithFallback(state, rows) {
  const lookups = [
    { tier: "exact", inning: state.inning, inningBucket: null, countKey: state.countKey ?? null },
    {
      tier: "drop_inning_to_bucket",
      inning: null,
      inningBucket: state.inningBucket ?? null,
      countKey: state.countKey ?? null,
    },
    { tier: "drop_count_key_exact_inning", inning: state.inning, inningBucket: null, countKey: null },
    {
      tier: "drop_count_key_bucketed_inning",
      inning: null,
      inningBucket: state.inningBucket ?? null,
      countKey: null,
    },
  ];

  for (const lookup of lookups) {
    const match = rows.find(
      (row) =>
        row.fallbackTier === lookup.tier &&
        row.inning === lookup.inning &&
        row.inningBucket === lookup.inningBucket &&
        row.halfInning === state.halfInning &&
        row.scoreDiffBucket === state.scoreDiffBucket &&
        row.outs === state.outs &&
        row.basesState === state.basesState &&
        row.countKey === lookup.countKey,
    );
    if (match) return match;
  }

  return null;
}

function buildCalibrationBuckets(rows) {
  const bucketMap = new Map();
  for (const row of rows) {
    const bucketFloor = Math.min(9, Math.max(0, Math.floor(row.predictedWinProbability * 10)));
    const key = `${bucketFloor / 10}-${(bucketFloor + 1) / 10}`;
    if (!bucketMap.has(key)) {
      bucketMap.set(key, {
        bucket: key,
        sampleSize: 0,
        winCount: 0,
        predictedWeight: 0,
      });
    }
    const bucket = bucketMap.get(key);
    bucket.sampleSize += row.sampleSize;
    bucket.winCount += row.winCount;
    bucket.predictedWeight += row.predictedWinProbability * row.sampleSize;
  }

  return [...bucketMap.values()]
    .map((bucket) => ({
      bucket: bucket.bucket,
      sampleSize: bucket.sampleSize,
      predictedWinProbability: bucket.sampleSize > 0 ? bucket.predictedWeight / bucket.sampleSize : null,
      observedWinRate: bucket.sampleSize > 0 ? bucket.winCount / bucket.sampleSize : null,
      absDiff:
        bucket.sampleSize > 0
          ? Math.abs((bucket.predictedWeight / bucket.sampleSize) - (bucket.winCount / bucket.sampleSize))
          : null,
    }))
    .sort((a, b) => a.bucket.localeCompare(b.bucket));
}

function buildMarkdown(report) {
  return `# Win Expectancy Benchmark

Date: ${formatAuditDateLabel()}

## Scope

- Source table: \`historical_pitch_states\`
- Split view: \`mart_historical_pitch_states_split\`
- Training fallback view: \`mart_win_expectancy_fallbacks_train\`
- Serving fit view: \`mart_win_expectancy_fallbacks\`
- Split policy: \`${report.splitPolicyVersion}\`
- External MLB benchmark remains separate and secondary; this report is the primary held-out validation

## Overview

- Validation rows: ${report.validationRows}
- Test rows: ${report.testRows}
- Distinct test state groups: ${report.testStateGroups}

## Held-Out Error Summary

${toMarkdownTable(report.summaryBySplit, [
    { label: "Split", render: (row) => row.splitSet },
    { label: "Weighted Rows", render: (row) => row.weightedRows },
    { label: "MAE", render: (row) => formatPct(row.meanAbsDiff) },
    { label: "Brier", render: (row) => formatPct(row.brier) },
    { label: "RMSE", render: (row) => formatPct(row.rmse) },
    { label: "Log Loss", render: (row) => row.logLoss === null ? "—" : Number(row.logLoss).toFixed(4) },
    { label: "Mean Signed", render: (row) => formatSignedPctPoint(row.meanSignedDiff) },
  ])}

## Held-Out Error By Fallback Tier

${toMarkdownTable(report.byFallbackTier, [
    { label: "Split", render: (row) => row.splitSet },
    { label: "Fallback", render: (row) => row.fallbackTier },
    { label: "Weighted Rows", render: (row) => row.weightedRows },
    { label: "MAE", render: (row) => formatPct(row.meanAbsDiff) },
    { label: "Brier", render: (row) => formatPct(row.brier) },
    { label: "Log Loss", render: (row) => row.logLoss === null ? "—" : Number(row.logLoss).toFixed(4) },
    { label: "Mean Signed", render: (row) => formatSignedPctPoint(row.meanSignedDiff) },
  ])}

## Test Calibration By Probability Bucket

${toMarkdownTable(report.testCalibrationBuckets, [
    { label: "Pred Bucket", render: (row) => row.bucket },
    { label: "Rows", render: (row) => row.sampleSize },
    { label: "Pred WE", render: (row) => formatPct(row.predictedWinProbability) },
    { label: "Obs WE", render: (row) => formatPct(row.observedWinRate) },
    { label: "Abs Diff", render: (row) => formatPct(row.absDiff) },
  ])}

## Test State Calibration

${toMarkdownTable(report.testCalibrationTop, [
    {
      label: "State",
      render: (row) =>
        `${row.inning} ${row.halfInning}, ${row.outs} outs, ${row.basesState}, ${row.scoreDiffBucket}, ${row.countKey}`,
    },
    { label: "Fallback", render: (row) => row.fallbackTier },
    { label: "Rows", render: (row) => row.sampleSize },
    { label: "Train Sample", render: (row) => row.modelSampleSize },
    { label: "Confidence", render: (row) => row.confidenceBand },
    { label: "Pred WE", render: (row) => formatPct(row.predictedWinProbability) },
    { label: "Obs WE", render: (row) => formatPct(row.observedWinRate) },
    { label: "Abs Diff", render: (row) => formatPct(row.absDiff) },
  ])}

## Largest Test Divergence Groups

${toMarkdownTable(report.topDivergenceGroups, [
    {
      label: "State",
      render: (row) =>
        `${row.inning} ${row.halfInning}, ${row.outs} outs, ${row.basesState}, ${row.scoreDiffBucket}, ${row.countKey}`,
    },
    { label: "Fallback", render: (row) => row.fallbackTier },
    { label: "Rows", render: (row) => row.sampleSize },
    { label: "Pred WE", render: (row) => formatPct(row.predictedWinProbability) },
    { label: "Obs WE", render: (row) => formatPct(row.observedWinRate) },
    { label: "Abs Diff", render: (row) => formatPct(row.absDiff) },
  ])}

## Notes

- WE training for this audit uses only the \`train\` split through \`mart_win_expectancy_fallbacks_train\`.
- Held-out rows come from \`validation\` and \`test\` only.
- Serving should continue publishing from \`mart_win_expectancy_fallbacks\`, which now fits on \`train + validation\`.
- MLB public WE should be retained as secondary external shape validation, not primary evidence.
`;
}

async function main() {
  console.log(`[audit:we-benchmark] role=${DATABASE_TARGET.role} host=${DATABASE_TARGET.host} db=${DATABASE_TARGET.database}`);
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();

  try {
    const trainingRowsResult = await client.query(`
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
      FROM mart_win_expectancy_fallbacks_train
    `);

    const heldoutStatesResult = await client.query(`
      SELECT
        split_set,
        split_policy_version,
        inning,
        inning_bucket,
        half_inning,
        CASE
          WHEN score_diff_batting <= -4 THEN 'trail4plus'
          WHEN score_diff_batting = -3 THEN 'trail3'
          WHEN score_diff_batting = -2 THEN 'trail2'
          WHEN score_diff_batting = -1 THEN 'trail1'
          WHEN score_diff_batting = 0 THEN 'tied'
          WHEN score_diff_batting = 1 THEN 'lead1'
          WHEN score_diff_batting = 2 THEN 'lead2'
          WHEN score_diff_batting = 3 THEN 'lead3'
          ELSE 'lead4plus'
        END AS score_diff_bucket,
        outs,
        bases_state,
        count_key,
        COUNT(*)::INTEGER AS sample_size,
        COUNT(*) FILTER (WHERE batting_team_won = TRUE)::INTEGER AS win_count,
        AVG(CASE WHEN batting_team_won THEN 1 ELSE 0 END)::NUMERIC AS observed_win_rate
      FROM mart_historical_pitch_states_split
      WHERE split_set IN ('validation', 'test')
        AND batting_team_won IS NOT NULL
        AND inning IS NOT NULL
        AND inning_bucket IS NOT NULL
        AND half_inning IS NOT NULL
        AND outs IS NOT NULL
        AND bases_state IS NOT NULL
        AND count_key IS NOT NULL
        AND score_diff_batting IS NOT NULL
      GROUP BY
        split_set,
        split_policy_version,
        inning,
        inning_bucket,
        half_inning,
        score_diff_bucket,
        outs,
        bases_state,
        count_key
    `);

    const trainingRows = trainingRowsResult.rows.map((row) => ({
      fallbackTier: row.fallback_tier,
      inning: row.inning === null ? null : Number(row.inning),
      inningBucket: row.inning_bucket,
      halfInning: row.half_inning,
      scoreDiffBucket: row.score_diff_bucket,
      outs: Number(row.outs),
      basesState: row.bases_state,
      countKey: row.count_key,
      sampleSize: Number(row.sample_size),
      battingTeamWinProbability: Number(row.batting_team_win_probability),
      confidenceBand: row.confidence_band,
    }));

    const heldoutRows = heldoutStatesResult.rows
      .map((row) => {
        const resolution = resolveWinExpectancyWithFallback(
          {
            inning: Number(row.inning),
            inningBucket: row.inning_bucket,
            halfInning: row.half_inning,
            scoreDiffBucket: row.score_diff_bucket,
            outs: Number(row.outs),
            basesState: row.bases_state,
            countKey: row.count_key,
          },
          trainingRows,
        );
        if (!resolution) return null;

        const observedWinRate = Number(row.observed_win_rate);
        const predictedWinProbability = Number(resolution.battingTeamWinProbability);
        return {
          splitSet: row.split_set,
          splitPolicyVersion: row.split_policy_version,
          inning: Number(row.inning),
          inningBucket: row.inning_bucket,
          halfInning: row.half_inning,
          scoreDiffBucket: row.score_diff_bucket,
          outs: Number(row.outs),
          basesState: row.bases_state,
          countKey: row.count_key,
          sampleSize: Number(row.sample_size),
          winCount: Number(row.win_count),
          observedWinRate,
          predictedWinProbability,
          signedDiff: predictedWinProbability - observedWinRate,
          absDiff: Math.abs(predictedWinProbability - observedWinRate),
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
      for (const fallbackTier of [
        "exact",
        "drop_inning_to_bucket",
        "drop_count_key_exact_inning",
        "drop_count_key_bucketed_inning",
      ]) {
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
    const testCalibrationBuckets = buildCalibrationBuckets(testRows);
    const testCalibrationTop = [...testRows]
      .sort((a, b) => a.inning - b.inning || a.outs - b.outs || a.countKey.localeCompare(b.countKey))
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
      testCalibrationBuckets,
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
