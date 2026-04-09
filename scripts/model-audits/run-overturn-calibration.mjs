import fs from "node:fs";
import path from "node:path";
import { Client } from "pg";
import {
  AUDIT_DATE,
  ROOT,
  formatAuditDateLabel,
  loadAuditEnv,
  resolveAuditDatabaseUrl,
  describeAuditDatabaseTarget,
} from "./audit-runtime.mjs";

const DOC_PATH = path.join(ROOT, `docs/models/audits/${AUDIT_DATE}-overturn-calibration.md`);
const ARTIFACT_PATH = path.join(
  ROOT,
  `docs/models/audits/artifacts/${AUDIT_DATE}-overturn-calibration.json`,
);

const GEOMETRIES = [
  {
    key: "center_only",
    label: "Center Only",
    outcomeColumn: "abs_zone_outcome_center_only",
    marginColumn: "min_edge_distance_center_only",
  },
  {
    key: "radius_adjusted",
    label: "Radius Adjusted",
    outcomeColumn: "abs_zone_outcome_radius_adjusted",
    marginColumn: "min_edge_distance_radius_adjusted",
  },
];

loadAuditEnv();
const DATABASE_URL = resolveAuditDatabaseUrl();
const DATABASE_TARGET = describeAuditDatabaseTarget(DATABASE_URL);
console.log(
  `[audit:overturn-calibration] role=${DATABASE_TARGET.role} host=${DATABASE_TARGET.host} db=${DATABASE_TARGET.database}`,
);

function mean(values) {
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function formatPct(value, digits = 1) {
  if (value == null || Number.isNaN(value)) return "n/a";
  return `${(value * 100).toFixed(digits)}%`;
}

function formatSignedPctPoint(value) {
  if (value == null || Number.isNaN(value)) return "n/a";
  return `${value >= 0 ? "+" : ""}${(value * 100).toFixed(2)} pts`;
}

function formatNumber(value, digits = 4) {
  if (value == null || Number.isNaN(value)) return "n/a";
  return value.toFixed(digits);
}

function wilsonInterval(successes, trials, z = 1.96) {
  if (!trials) return { low: null, high: null };
  const pHat = successes / trials;
  const denominator = 1 + (z * z) / trials;
  const center = (pHat + (z * z) / (2 * trials)) / denominator;
  const margin =
    (z *
      Math.sqrt((pHat * (1 - pHat)) / trials + (z * z) / (4 * trials * trials))) /
    denominator;
  return {
    low: Math.max(0, center - margin),
    high: Math.min(1, center + margin),
  };
}

function formatPctInterval(low, high, digits = 1) {
  if (low == null || high == null || Number.isNaN(low) || Number.isNaN(high)) return "n/a";
  return `${(low * 100).toFixed(digits)}% to ${(high * 100).toFixed(digits)}%`;
}

function toBucketLabel(probability) {
  if (probability == null || Number.isNaN(probability)) return "unresolved";
  const lower = Math.min(90, Math.floor(probability * 10) * 10);
  const upper = lower + 9;
  return `${String(lower).padStart(2, "0")}-${String(upper).padStart(2, "0")}%`;
}

function toMarkdownTable(rows, columns) {
  const header = `| ${columns.map((column) => column.label).join(" | ")} |`;
  const separator = `| ${columns.map(() => "---").join(" | ")} |`;
  const body = rows.map(
    (row) => `| ${columns.map((column) => String(column.render(row))).join(" | ")} |`,
  );
  return [header, separator, ...body].join("\n");
}

function outcomeToBinary(outcome) {
  return outcome === "overturned" ? 1 : 0;
}

function challengeDirectionFromObservedCall(observedCall) {
  if (observedCall === "strike") return "strike_to_ball";
  if (observedCall === "ball") return "ball_to_strike";
  return null;
}

function toChallengeAlignedMargin(direction, rawMargin) {
  if (rawMargin == null || direction == null) return null;
  if (direction === "ball_to_strike") return rawMargin;
  if (direction === "strike_to_ball") return -rawMargin;
  return null;
}

function toEdgeBucket(alignedMargin) {
  if (alignedMargin == null || Number.isNaN(alignedMargin)) return "unknown";
  if (alignedMargin <= -0.15) return "strong_confirm";
  if (alignedMargin <= -0.03) return "lean_confirm";
  if (alignedMargin < 0.03) return "borderline";
  if (alignedMargin < 0.15) return "lean_overturn";
  return "strong_overturn";
}

function confidenceBand(sampleSize, exact = false) {
  if (exact) {
    if (sampleSize >= 150) return "high";
    if (sampleSize >= 40) return "medium";
    return "low";
  }
  if (sampleSize >= 300) return "high";
  if (sampleSize >= 100) return "medium";
  return "low";
}

function buildProbabilityModel(rows) {
  const validRows = rows.filter((row) => row.challengeDirection && row.edgeBucket);
  const globalSampleSize = validRows.length;
  const globalOverturns = validRows.reduce((sum, row) => sum + row.actual, 0);
  const globalProbability =
    globalSampleSize > 0 ? globalOverturns / globalSampleSize : null;

  const directionStats = new Map();
  for (const row of validRows) {
    const existing = directionStats.get(row.challengeDirection) ?? { sampleSize: 0, overturns: 0 };
    existing.sampleSize += 1;
    existing.overturns += row.actual;
    directionStats.set(row.challengeDirection, existing);
  }

  const exactStats = new Map();
  for (const row of validRows) {
    const key = `${row.challengeDirection}|${row.edgeBucket}`;
    const existing = exactStats.get(key) ?? { sampleSize: 0, overturns: 0 };
    existing.sampleSize += 1;
    existing.overturns += row.actual;
    exactStats.set(key, existing);
  }

  return {
    global: {
      sampleSize: globalSampleSize,
      overturns: globalOverturns,
      overturnProbability: globalProbability,
      confidenceBand: confidenceBand(globalSampleSize),
    },
    direction: directionStats,
    exact: exactStats,
  };
}

function scoreRow(model, row) {
  const globalProbability = model.global.overturnProbability;
  const globalSummary = {
    fallbackTier: "global",
    confidenceBand: model.global.confidenceBand,
    sampleSize: model.global.sampleSize,
    overturnProbability: globalProbability,
  };

  if (!row.challengeDirection || !row.edgeBucket) {
    return globalSummary;
  }

  const directionStats = model.direction.get(row.challengeDirection);
  const directionProbability =
    directionStats && model.global.sampleSize > 0
      ? (directionStats.overturns + globalProbability * 40) / (directionStats.sampleSize + 40)
      : globalProbability;
  const directionSummary = {
    fallbackTier: "direction_only",
    confidenceBand: directionStats ? confidenceBand(directionStats.sampleSize) : model.global.confidenceBand,
    sampleSize: directionStats?.sampleSize ?? model.global.sampleSize,
    overturnProbability: directionProbability,
  };

  const exactKey = `${row.challengeDirection}|${row.edgeBucket}`;
  const exactStats = model.exact.get(exactKey);
  if (!exactStats || directionProbability == null) {
    return directionSummary;
  }

  return {
    fallbackTier: "exact",
    confidenceBand: confidenceBand(exactStats.sampleSize, true),
    sampleSize: exactStats.sampleSize,
    overturnProbability:
      (exactStats.overturns + directionProbability * 20) / (exactStats.sampleSize + 20),
  };
}

function logLoss(rows) {
  if (!rows.length) return null;
  return (
    rows.reduce((sum, row) => {
      const p = clamp(row.overturnProbability, 1e-6, 1 - 1e-6);
      return sum - (row.actual * Math.log(p) + (1 - row.actual) * Math.log(1 - p));
    }, 0) / rows.length
  );
}

function summarizeScoredRows(rows) {
  const avgPredictedOverturn = mean(rows.map((row) => row.overturnProbability));
  const realizedOverturnRate = mean(rows.map((row) => row.actual));
  const byPredictedBucket = [...rows.reduce((map, row) => {
    const bucket = toBucketLabel(row.overturnProbability);
    const existing = map.get(bucket) ?? [];
    existing.push(row);
    map.set(bucket, existing);
    return map;
  }, new Map()).entries()]
    .map(([predictedBucket, bucketRows]) => {
      const bucketPred = mean(bucketRows.map((row) => row.overturnProbability)) ?? 0;
      const bucketActual = mean(bucketRows.map((row) => row.actual)) ?? 0;
      const realizedInterval = wilsonInterval(
        bucketRows.reduce((sum, row) => sum + row.actual, 0),
        bucketRows.length,
      );
      return {
        predictedBucket,
        challenges: bucketRows.length,
        avgPredictedOverturn: bucketPred,
        realizedOverturnRate: bucketActual,
        realizedCiLow: realizedInterval.low,
        realizedCiHigh: realizedInterval.high,
        absGap: Math.abs(bucketActual - bucketPred),
      };
    })
    .sort((a, b) => a.predictedBucket.localeCompare(b.predictedBucket));

  const byFallbackTier = [...rows.reduce((map, row) => {
    const key = `${row.fallbackTier}|${row.confidenceBand}`;
    const existing = map.get(key) ?? [];
    existing.push(row);
    map.set(key, existing);
    return map;
  }, new Map()).entries()]
    .map(([key, groupRows]) => {
      const [fallbackTier, confidenceBand] = key.split("|");
      const realizedInterval = wilsonInterval(
        groupRows.reduce((sum, row) => sum + row.actual, 0),
        groupRows.length,
      );
      return {
        fallbackTier,
        confidenceBand,
        challenges: groupRows.length,
        avgPredictedOverturn: mean(groupRows.map((row) => row.overturnProbability)) ?? 0,
        realizedOverturnRate: mean(groupRows.map((row) => row.actual)) ?? 0,
        realizedCiLow: realizedInterval.low,
        realizedCiHigh: realizedInterval.high,
      };
    })
    .sort((a, b) => b.challenges - a.challenges);

  const byDirection = [...rows.reduce((map, row) => {
    const existing = map.get(row.challengeDirection) ?? [];
    existing.push(row);
    map.set(row.challengeDirection, existing);
    return map;
  }, new Map()).entries()]
    .map(([challengeDirection, groupRows]) => {
      const realizedInterval = wilsonInterval(
        groupRows.reduce((sum, row) => sum + row.actual, 0),
        groupRows.length,
      );
      return {
        challengeDirection,
        challenges: groupRows.length,
        avgPredictedOverturn: mean(groupRows.map((row) => row.overturnProbability)) ?? 0,
        realizedOverturnRate: mean(groupRows.map((row) => row.actual)) ?? 0,
        realizedCiLow: realizedInterval.low,
        realizedCiHigh: realizedInterval.high,
        brierScore: mean(groupRows.map((row) => row.brier)) ?? 0,
      };
    })
    .sort((a, b) => b.challenges - a.challenges);

  const byEdgeBucket = [...rows.reduce((map, row) => {
    const existing = map.get(row.edgeBucket) ?? [];
    existing.push(row);
    map.set(row.edgeBucket, existing);
    return map;
  }, new Map()).entries()]
    .map(([edgeBucket, groupRows]) => {
      const realizedInterval = wilsonInterval(
        groupRows.reduce((sum, row) => sum + row.actual, 0),
        groupRows.length,
      );
      return {
        edgeBucket,
        challenges: groupRows.length,
        avgPredictedOverturn: mean(groupRows.map((row) => row.overturnProbability)) ?? 0,
        realizedOverturnRate: mean(groupRows.map((row) => row.actual)) ?? 0,
        realizedCiLow: realizedInterval.low,
        realizedCiHigh: realizedInterval.high,
      };
    })
    .sort((a, b) => b.challenges - a.challenges);

  const byPhase = [...rows.reduce((map, row) => {
    const existing = map.get(row.competitionPhase) ?? [];
    existing.push(row);
    map.set(row.competitionPhase, existing);
    return map;
  }, new Map()).entries()]
    .map(([competitionPhase, groupRows]) => {
      const realizedInterval = wilsonInterval(
        groupRows.reduce((sum, row) => sum + row.actual, 0),
        groupRows.length,
      );
      return {
        competitionPhase,
        challenges: groupRows.length,
        avgPredictedOverturn: mean(groupRows.map((row) => row.overturnProbability)) ?? 0,
        realizedOverturnRate: mean(groupRows.map((row) => row.actual)) ?? 0,
        realizedCiLow: realizedInterval.low,
        realizedCiHigh: realizedInterval.high,
        brierScore: mean(groupRows.map((row) => row.brier)) ?? 0,
      };
    })
    .sort((a, b) => b.challenges - a.challenges);

  const topGapGroups = [...rows.reduce((map, row) => {
    const key = `${row.fallbackTier}|${row.challengeDirection}|${row.edgeBucket}`;
    const existing = map.get(key) ?? [];
    existing.push(row);
    map.set(key, existing);
    return map;
  }, new Map()).entries()]
    .map(([key, groupRows]) => {
      const [fallbackTier, challengeDirection, edgeBucket] = key.split("|");
      const avgPred = mean(groupRows.map((row) => row.overturnProbability)) ?? 0;
      const actual = mean(groupRows.map((row) => row.actual)) ?? 0;
      return {
        fallbackTier,
        challengeDirection,
        edgeBucket,
        challenges: groupRows.length,
        avgPredictedOverturn: avgPred,
        realizedOverturnRate: actual,
        realizedCiLow: wilsonInterval(
          groupRows.reduce((sum, row) => sum + row.actual, 0),
          groupRows.length,
        ).low,
        realizedCiHigh: wilsonInterval(
          groupRows.reduce((sum, row) => sum + row.actual, 0),
          groupRows.length,
        ).high,
        absGap: Math.abs(actual - avgPred),
      };
    })
    .filter((row) => row.challenges >= 10)
    .sort((a, b) => b.absGap - a.absGap || b.challenges - a.challenges)
    .slice(0, 12);

  return {
    challenges: rows.length,
    avgPredictedOverturn,
    realizedOverturnRate,
    meanAbsBucketGap: mean(byPredictedBucket.map((row) => row.absGap)),
    meanSignedBucketGap: mean(
      byPredictedBucket.map((row) => row.realizedOverturnRate - row.avgPredictedOverturn),
    ),
    brierScore: mean(rows.map((row) => row.brier)),
    logLoss: logLoss(rows),
    byPredictedBucket,
    byFallbackTier,
    byDirection,
    byEdgeBucket,
    byPhase,
    topGapGroups,
  };
}

function buildMarkdown(report) {
  const winner = report.geometrySelection.validationWinner;
  const testSummary = report.geometries[winner]?.test;
  return `# Overturn Probability Calibration

Date: ${formatAuditDateLabel()}

## Scope

- Source table: \`modeling.called_pitch_decisions\`
- Population: challenged rows only
- Training split: \`train\`
- Geometry-selection split: \`validation\`
- Held-out readout: \`test\`
- Fallback hierarchy: \`direction + edge bucket -> direction only -> global\`

## Overview

- Challenged rows available: ${report.dataset.challengedRows}
- Train / validation / test rows: ${report.dataset.trainRows} / ${report.dataset.validationRows} / ${report.dataset.testRows}
- Split policy: \`${report.dataset.splitPolicyVersion}\`
- Validation geometry winner: \`${winner}\`
- Validation winner Brier score: ${formatNumber(report.geometries[winner]?.validation?.brierScore)}
- Held-out test Brier score (${winner}): ${formatNumber(testSummary?.brierScore)}
- Held-out test log loss (${winner}): ${formatNumber(testSummary?.logLoss)}
- Held-out mean absolute bucket gap (${winner}): ${formatPct(testSummary?.meanAbsBucketGap)}

## Geometry Comparison

${toMarkdownTable(report.geometryComparison, [
    { label: "Geometry", render: (row) => row.geometryLabel },
    { label: "Validation Rows", render: (row) => row.validationChallenges },
    { label: "Validation Brier", render: (row) => formatNumber(row.validationBrier) },
    { label: "Validation Log Loss", render: (row) => formatNumber(row.validationLogLoss) },
    { label: "Test Rows", render: (row) => row.testChallenges },
    { label: "Test Brier", render: (row) => formatNumber(row.testBrier) },
    { label: "Test Log Loss", render: (row) => formatNumber(row.testLogLoss) },
  ])}

## Held-Out Test Calibration By Predicted Bucket (${winner})

${toMarkdownTable(testSummary?.byPredictedBucket ?? [], [
    { label: "Predicted Bucket", render: (row) => row.predictedBucket },
    { label: "Challenges", render: (row) => row.challenges },
    { label: "Avg Predicted", render: (row) => formatPct(row.avgPredictedOverturn) },
    { label: "Realized", render: (row) => formatPct(row.realizedOverturnRate) },
    { label: "Realized 95% CI", render: (row) => formatPctInterval(row.realizedCiLow, row.realizedCiHigh) },
    { label: "Gap", render: (row) => formatSignedPctPoint(row.realizedOverturnRate - row.avgPredictedOverturn) },
  ])}

## Held-Out Test Calibration By Fallback Tier (${winner})

${toMarkdownTable(testSummary?.byFallbackTier ?? [], [
    { label: "Fallback Tier", render: (row) => row.fallbackTier },
    { label: "Confidence", render: (row) => row.confidenceBand },
    { label: "Challenges", render: (row) => row.challenges },
    { label: "Avg Predicted", render: (row) => formatPct(row.avgPredictedOverturn) },
    { label: "Realized", render: (row) => formatPct(row.realizedOverturnRate) },
    { label: "Realized 95% CI", render: (row) => formatPctInterval(row.realizedCiLow, row.realizedCiHigh) },
  ])}

## Held-Out Test Calibration By Direction (${winner})

${toMarkdownTable(testSummary?.byDirection ?? [], [
    { label: "Direction", render: (row) => row.challengeDirection },
    { label: "Challenges", render: (row) => row.challenges },
    { label: "Avg Predicted", render: (row) => formatPct(row.avgPredictedOverturn) },
    { label: "Realized", render: (row) => formatPct(row.realizedOverturnRate) },
    { label: "Realized 95% CI", render: (row) => formatPctInterval(row.realizedCiLow, row.realizedCiHigh) },
    { label: "Brier", render: (row) => formatNumber(row.brierScore) },
  ])}

## Held-Out Test Calibration By Edge Bucket (${winner})

${toMarkdownTable(testSummary?.byEdgeBucket ?? [], [
    { label: "Edge Bucket", render: (row) => row.edgeBucket },
    { label: "Challenges", render: (row) => row.challenges },
    { label: "Avg Predicted", render: (row) => formatPct(row.avgPredictedOverturn) },
    { label: "Realized", render: (row) => formatPct(row.realizedOverturnRate) },
    { label: "Realized 95% CI", render: (row) => formatPctInterval(row.realizedCiLow, row.realizedCiHigh) },
  ])}

## Held-Out Test Calibration By Competition Phase (${winner})

${toMarkdownTable(testSummary?.byPhase ?? [], [
    { label: "Phase", render: (row) => row.competitionPhase },
    { label: "Challenges", render: (row) => row.challenges },
    { label: "Avg Predicted", render: (row) => formatPct(row.avgPredictedOverturn) },
    { label: "Realized", render: (row) => formatPct(row.realizedOverturnRate) },
    { label: "Realized 95% CI", render: (row) => formatPctInterval(row.realizedCiLow, row.realizedCiHigh) },
    { label: "Brier", render: (row) => formatNumber(row.brierScore) },
  ])}

## Largest Held-Out Calibration Gaps (${winner})

${toMarkdownTable(testSummary?.topGapGroups ?? [], [
    { label: "Group", render: (row) => `${row.fallbackTier} / ${row.challengeDirection} / ${row.edgeBucket}` },
    { label: "Challenges", render: (row) => row.challenges },
    { label: "Avg Predicted", render: (row) => formatPct(row.avgPredictedOverturn) },
    { label: "Realized", render: (row) => formatPct(row.realizedOverturnRate) },
    { label: "Realized 95% CI", render: (row) => formatPctInterval(row.realizedCiLow, row.realizedCiHigh) },
    { label: "Abs Gap", render: (row) => formatPct(row.absGap) },
  ])}

## Notes

- This is a held-out calibration audit. No probabilities in the validation or test sections are fit on those same rows.
- The geometry winner is chosen by validation Brier score only. That choice remains provisional because the 2026 sample is still early.
- The current audit is intentionally empirical and challenge-time-only. It does not use post-result fields or future game information.
`;
}

async function main() {
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();

  try {
    const { rows } = await client.query(`
      SELECT
        game_pk,
        game_date,
        competition_phase,
        split_set,
        split_policy_version,
        observed_call,
        challenge_outcome,
        abs_zone_outcome_center_only,
        abs_zone_outcome_radius_adjusted,
        min_edge_distance_center_only,
        min_edge_distance_radius_adjusted
      FROM modeling.called_pitch_decisions
      WHERE was_challenged = TRUE
        AND challenge_outcome IN ('overturned', 'confirmed')
        AND split_set IN ('train', 'validation', 'test')
        AND observed_call IN ('ball', 'strike')
    `);

    const normalizedRows = rows.map((row) => ({
      gamePk: Number(row.game_pk),
      gameDate: row.game_date,
      competitionPhase: row.competition_phase ?? "unknown",
      splitSet: row.split_set,
      splitPolicyVersion: row.split_policy_version ?? "unknown",
      observedCall: row.observed_call,
      challengeOutcome: row.challenge_outcome,
      actual: outcomeToBinary(row.challenge_outcome),
      challengeDirection: challengeDirectionFromObservedCall(row.observed_call),
      absZoneOutcomeCenterOnly: row.abs_zone_outcome_center_only,
      absZoneOutcomeRadiusAdjusted: row.abs_zone_outcome_radius_adjusted,
      minEdgeDistanceCenterOnly:
        row.min_edge_distance_center_only == null
          ? null
          : Number(row.min_edge_distance_center_only),
      minEdgeDistanceRadiusAdjusted:
        row.min_edge_distance_radius_adjusted == null
          ? null
          : Number(row.min_edge_distance_radius_adjusted),
    }));

    const splitPolicyVersion =
      normalizedRows.find((row) => row.splitPolicyVersion && row.splitPolicyVersion !== "unknown")
        ?.splitPolicyVersion ?? "unknown";

    const report = {
      generatedAt: new Date().toISOString(),
      databaseTarget: DATABASE_TARGET,
      dataset: {
        challengedRows: normalizedRows.length,
        trainRows: normalizedRows.filter((row) => row.splitSet === "train").length,
        validationRows: normalizedRows.filter((row) => row.splitSet === "validation").length,
        testRows: normalizedRows.filter((row) => row.splitSet === "test").length,
        splitPolicyVersion,
      },
      geometries: {},
      geometryComparison: [],
      geometrySelection: {},
    };

    for (const geometry of GEOMETRIES) {
      const preparedRows = normalizedRows
        .map((row) => {
          const rawMargin = geometry.marginColumn === "min_edge_distance_center_only"
            ? row.minEdgeDistanceCenterOnly
            : row.minEdgeDistanceRadiusAdjusted;
          const alignedMargin = toChallengeAlignedMargin(row.challengeDirection, rawMargin);
          return {
            ...row,
            geometryKey: geometry.key,
            geometryLabel: geometry.label,
            modeledAbsOutcome:
              geometry.outcomeColumn === "abs_zone_outcome_center_only"
                ? row.absZoneOutcomeCenterOnly
                : row.absZoneOutcomeRadiusAdjusted,
            alignedMargin,
            edgeBucket: toEdgeBucket(alignedMargin),
          };
        })
        .filter((row) => row.modeledAbsOutcome != null);

      const trainRows = preparedRows.filter((row) => row.splitSet === "train");
      const validationRows = preparedRows.filter((row) => row.splitSet === "validation");
      const testRows = preparedRows.filter((row) => row.splitSet === "test");
      const model = buildProbabilityModel(trainRows);

      const scoreRows = (candidateRows) =>
        candidateRows.map((row) => {
          const scored = scoreRow(model, row);
          return {
            ...row,
            ...scored,
            brier: (scored.overturnProbability - row.actual) ** 2,
          };
        });

      const validationScored = scoreRows(validationRows);
      const testScored = scoreRows(testRows);

      report.geometries[geometry.key] = {
        geometryLabel: geometry.label,
        train: {
          challenges: trainRows.length,
          globalSampleSize: model.global.sampleSize,
          globalOverturnProbability: model.global.overturnProbability,
          exactCells: model.exact.size,
          directionCells: model.direction.size,
        },
        validation: summarizeScoredRows(validationScored),
        test: summarizeScoredRows(testScored),
      };

      report.geometryComparison.push({
        geometryKey: geometry.key,
        geometryLabel: geometry.label,
        validationChallenges: validationScored.length,
        validationBrier: report.geometries[geometry.key].validation.brierScore,
        validationLogLoss: report.geometries[geometry.key].validation.logLoss,
        testChallenges: testScored.length,
        testBrier: report.geometries[geometry.key].test.brierScore,
        testLogLoss: report.geometries[geometry.key].test.logLoss,
      });
    }

    report.geometryComparison.sort(
      (a, b) =>
        (a.validationBrier ?? Number.POSITIVE_INFINITY) -
          (b.validationBrier ?? Number.POSITIVE_INFINITY) ||
        a.geometryLabel.localeCompare(b.geometryLabel),
    );

    const validationWinner = report.geometryComparison[0]?.geometryKey ?? GEOMETRIES[0].key;
    report.geometrySelection = {
      validationWinner,
      selectionMetric: "validation_brier_score",
    };

    fs.mkdirSync(path.dirname(ARTIFACT_PATH), { recursive: true });
    fs.writeFileSync(ARTIFACT_PATH, JSON.stringify(report, null, 2));
    fs.writeFileSync(DOC_PATH, buildMarkdown(report));

    console.log(`Validation winner: ${validationWinner}`);
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
