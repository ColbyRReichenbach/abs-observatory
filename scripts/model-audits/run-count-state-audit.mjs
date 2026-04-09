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
  formatPct,
  toMarkdownTable,
} from "./shared-audit-utils.mjs";

const DOC_PATH = path.join(ROOT, `docs/models/audits/${AUDIT_DATE}-count-state-audit.md`);
const ARTIFACT_PATH = path.join(
  ROOT,
  `docs/models/audits/artifacts/${AUDIT_DATE}-count-state-audit.json`,
);

loadAuditEnv();
const DATABASE_URL = resolveAuditDatabaseUrl();
const DATABASE_TARGET = describeAuditDatabaseTarget(DATABASE_URL);

function mean(values) {
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function normalApproxInterval(successes, total) {
  if (!Number.isFinite(successes) || !Number.isFinite(total) || total <= 0) return { low: null, high: null };
  const p = successes / total;
  const se = Math.sqrt((p * (1 - p)) / total);
  return {
    low: Math.max(0, p - 1.96 * se),
    high: Math.min(1, p + 1.96 * se),
  };
}

function weightedMetric(rows, key) {
  const weightedAbsErrors = [];
  const weightedSquaredErrors = [];
  let totalWeight = 0;
  let signedErrorSum = 0;

  for (const row of rows) {
    if (row.predicted?.[key] == null || row.observed?.[key] == null || !Number.isFinite(row.weight) || row.weight <= 0) {
      continue;
    }
    const error = row.observed[key] - row.predicted[key];
    totalWeight += row.weight;
    signedErrorSum += error * row.weight;
    weightedAbsErrors.push(Math.abs(error) * row.weight);
    weightedSquaredErrors.push(error * error * row.weight);
  }

  if (totalWeight === 0) {
    return { mae: null, rmse: null, bias: null };
  }

  return {
    mae: weightedAbsErrors.reduce((sum, value) => sum + value, 0) / totalWeight,
    rmse: Math.sqrt(weightedSquaredErrors.reduce((sum, value) => sum + value, 0) / totalWeight),
    bias: signedErrorSum / totalWeight,
  };
}

function buildPitchFamily(code) {
  const normalized = String(code ?? "").toUpperCase();
  if (["FF", "FA", "FT", "FC", "SI", "FSI"].includes(normalized)) return "fastball";
  if (["SL", "CU", "KC", "KN", "SV", "SC"].includes(normalized)) return "breaking";
  if (["CH", "FS", "FO", "EP"].includes(normalized)) return "offspeed";
  return "other";
}

function buildMarkdown(report) {
  return `# Count-State Audit

Date: ${formatAuditDateLabel()}

## Scope

- Source table: \`historical_pitch_states\`
- Split view: \`mart_historical_pitch_states_split\`
- Training view: \`mart_count_state_outcome_baselines_train\`
- Serving fit view: \`mart_count_state_outcome_baselines_train_validation\`
- Split policy: \`${report.splitPolicyVersion}\`

## Overview

- Train terminal PA rows: ${report.splitRowCounts.train ?? 0}
- Validation terminal PA rows: ${report.splitRowCounts.validation ?? 0}
- Test terminal PA rows: ${report.splitRowCounts.test ?? 0}
- Distinct train count states: ${report.trainCountStates}
- Distinct validation count states: ${report.validationCountStates}
- Distinct test count states: ${report.testCountStates}

## Held-Out Weighted Error

${toMarkdownTable(report.errorSummary, [
    { label: "Split", render: (row) => row.splitSet },
    { label: "Metric", render: (row) => row.metric },
    { label: "Weighted MAE", render: (row) => formatPct(row.mae, 2) },
    { label: "Weighted RMSE", render: (row) => formatPct(row.rmse, 2) },
    { label: "Weighted Bias", render: (row) => formatPct(row.bias, 2) },
  ])}

## Test Count-Level Calibration

${toMarkdownTable(report.testCalibration, [
    { label: "Count", render: (row) => row.countKey },
    { label: "Sample", render: (row) => row.sampleSize },
    { label: "Pred Pos", render: (row) => formatPct(row.predictedPositiveOutcomeRate, 2) },
    { label: "Obs Pos", render: (row) => formatPct(row.observedPositiveOutcomeRate, 2) },
    { label: "Obs Pos 95% CI", render: (row) => `${formatPct(row.observedPositiveOutcomeRateCiLow, 2)} to ${formatPct(row.observedPositiveOutcomeRateCiHigh, 2)}` },
    { label: "Pred Walk", render: (row) => formatPct(row.predictedWalkRate, 2) },
    { label: "Obs Walk", render: (row) => formatPct(row.observedWalkRate, 2) },
    { label: "Pred K", render: (row) => formatPct(row.predictedStrikeoutRate, 2) },
    { label: "Obs K", render: (row) => formatPct(row.observedStrikeoutRate, 2) },
  ])}

## Held-Out Subgroup Stability

### Batter/Pitcher Handedness

${toMarkdownTable(report.handednessStability, [
    { label: "Split", render: (row) => row.splitSet },
    { label: "Matchup", render: (row) => row.subgroup },
    { label: "Rows", render: (row) => row.rows },
    { label: "Weighted Pos MAE", render: (row) => formatPct(row.weightedPositiveOutcomeMae, 2) },
    { label: "Avg Observed Pos", render: (row) => formatPct(row.avgObservedPositiveOutcomeRate, 2) },
  ])}

### Pitch Family

${toMarkdownTable(report.pitchFamilyStability, [
    { label: "Split", render: (row) => row.splitSet },
    { label: "Family", render: (row) => row.subgroup },
    { label: "Rows", render: (row) => row.rows },
    { label: "Weighted Pos MAE", render: (row) => formatPct(row.weightedPositiveOutcomeMae, 2) },
    { label: "Avg Observed Pos", render: (row) => formatPct(row.avgObservedPositiveOutcomeRate, 2) },
  ])}

## Notes

- Count-state training uses only the \`train\` split.
- Held-out rows are compared against frozen train baselines; no \`validation\` or \`test\` rows are used to fit the audit baseline.
- Serving should publish from \`mart_count_state_outcome_baselines_train_validation\` only after audits are accepted.
`;
}

async function main() {
  console.log(
    `[count-state-audit] database_role=${DATABASE_TARGET.role} host=${DATABASE_TARGET.host} db=${DATABASE_TARGET.database}`,
  );
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();

  try {
    const splitRowCountsResult = await client.query(`
          SELECT
            split_set,
            COUNT(*)::INTEGER AS terminal_pa_rows
          FROM mart_historical_pitch_states_split
          WHERE split_set IN ('train', 'validation', 'test')
            AND is_last_pitch_of_pa = TRUE
            AND count_key IS NOT NULL
          GROUP BY split_set
        `);
    const trainBaselinesResult = await client.query(`
          SELECT
            split_policy_version,
            count_key,
            sample_size,
            hit_count,
            walk_count,
            strikeout_count,
            positive_outcome_count,
            official_at_bat_count,
            batting_average,
            walk_rate,
            strikeout_rate,
            positive_outcome_rate
          FROM mart_count_state_outcome_baselines_train
        `);
    const splitBaselinesResult = await client.query(`
          SELECT
            split_set,
            split_policy_version,
            count_key,
            sample_size,
            hit_count,
            walk_count,
            strikeout_count,
            positive_outcome_count,
            official_at_bat_count,
            batting_average,
            walk_rate,
            strikeout_rate,
            positive_outcome_rate
          FROM mart_count_state_outcome_baselines_split
          WHERE split_set IN ('validation', 'test')
        `);
    const handednessResult = await client.query(`
          SELECT
            split_set,
            CONCAT(stand, '/', p_throws) AS subgroup,
            count_key,
            COUNT(*)::INTEGER AS sample_size,
            COUNT(*) FILTER (WHERE positive_outcome = TRUE)::INTEGER AS positive_outcome_count,
            AVG(CASE WHEN positive_outcome THEN 1.0 ELSE 0.0 END)::NUMERIC AS positive_outcome_rate
          FROM mart_historical_pitch_states_split
          WHERE split_set IN ('validation', 'test')
            AND is_last_pitch_of_pa = TRUE
            AND count_key IS NOT NULL
            AND stand IN ('L', 'R')
            AND p_throws IN ('L', 'R')
          GROUP BY split_set, subgroup, count_key
          HAVING COUNT(*) >= 100
        `);
    const pitchFamilyResult = await client.query(`
          SELECT
            split_set,
            CASE
              WHEN UPPER(COALESCE(pitch_type, '')) IN ('FF', 'FA', 'FT', 'FC', 'SI', 'FSI') THEN 'fastball'
              WHEN UPPER(COALESCE(pitch_type, '')) IN ('SL', 'CU', 'KC', 'KN', 'SV', 'SC') THEN 'breaking'
              WHEN UPPER(COALESCE(pitch_type, '')) IN ('CH', 'FS', 'FO', 'EP') THEN 'offspeed'
              ELSE 'other'
            END AS subgroup,
            count_key,
            COUNT(*)::INTEGER AS sample_size,
            COUNT(*) FILTER (WHERE positive_outcome = TRUE)::INTEGER AS positive_outcome_count,
            AVG(CASE WHEN positive_outcome THEN 1.0 ELSE 0.0 END)::NUMERIC AS positive_outcome_rate
          FROM mart_historical_pitch_states_split
          WHERE split_set IN ('validation', 'test')
            AND is_last_pitch_of_pa = TRUE
            AND count_key IS NOT NULL
          GROUP BY split_set, subgroup, count_key
          HAVING COUNT(*) >= 100
        `);

    const splitRowCounts = Object.fromEntries(
      splitRowCountsResult.rows.map((row) => [row.split_set, Number(row.terminal_pa_rows)]),
    );

    const trainBaselineMap = new Map(
      trainBaselinesResult.rows.map((row) => [
        row.count_key,
        {
          sampleSize: Number(row.sample_size),
          battingAverage: Number(row.batting_average),
          walkRate: Number(row.walk_rate),
          strikeoutRate: Number(row.strikeout_rate),
          positiveOutcomeRate: Number(row.positive_outcome_rate),
        },
      ]),
    );

    const splitPolicyVersion = trainBaselinesResult.rows[0]?.split_policy_version ?? "unknown";

    const heldoutRows = splitBaselinesResult.rows.map((row) => {
      const predicted = trainBaselineMap.get(row.count_key) ?? null;
      return {
        splitSet: row.split_set,
        countKey: row.count_key,
        sampleSize: Number(row.sample_size),
        hitCount: Number(row.hit_count),
        walkCount: Number(row.walk_count),
        strikeoutCount: Number(row.strikeout_count),
        positiveOutcomeCount: Number(row.positive_outcome_count),
        officialAtBatCount: Number(row.official_at_bat_count),
        observed: {
          battingAverage: Number(row.batting_average),
          walkRate: Number(row.walk_rate),
          strikeoutRate: Number(row.strikeout_rate),
          positiveOutcomeRate: Number(row.positive_outcome_rate),
        },
        predicted,
        weight: Number(row.sample_size),
      };
    });

    const errorSummary = [];
    for (const splitSet of ["validation", "test"]) {
      const rows = heldoutRows.filter((row) => row.splitSet === splitSet && row.predicted);
      for (const [metric, label] of [
        ["battingAverage", "batting_average"],
        ["walkRate", "walk_rate"],
        ["strikeoutRate", "strikeout_rate"],
        ["positiveOutcomeRate", "positive_outcome_rate"],
      ]) {
        const summary = weightedMetric(rows, metric);
        errorSummary.push({
          splitSet,
          metric: label,
          ...summary,
        });
      }
    }

    const testCalibration = heldoutRows
      .filter((row) => row.splitSet === "test" && row.predicted)
      .sort((a, b) => a.countKey.localeCompare(b.countKey))
      .map((row) => {
        const positiveCi = normalApproxInterval(row.positiveOutcomeCount, row.sampleSize);
        return {
          countKey: row.countKey,
          sampleSize: row.sampleSize,
          predictedPositiveOutcomeRate: row.predicted.positiveOutcomeRate,
          observedPositiveOutcomeRate: row.observed.positiveOutcomeRate,
          observedPositiveOutcomeRateCiLow: positiveCi.low,
          observedPositiveOutcomeRateCiHigh: positiveCi.high,
          predictedWalkRate: row.predicted.walkRate,
          observedWalkRate: row.observed.walkRate,
          predictedStrikeoutRate: row.predicted.strikeoutRate,
          observedStrikeoutRate: row.observed.strikeoutRate,
        };
      });

    function summarizeSubgroup(rows) {
      const groups = new Map();
      for (const row of rows) {
        const key = `${row.split_set}::${row.subgroup}`;
        const group = groups.get(key) ?? [];
        group.push(row);
        groups.set(key, group);
      }
      return [...groups.entries()].map(([key, group]) => {
        const [splitSet, subgroup] = key.split("::");
        let weightedError = 0;
        let totalWeight = 0;
        for (const row of group) {
          const predicted = trainBaselineMap.get(row.count_key);
          if (!predicted) continue;
          const sampleSize = Number(row.sample_size);
          const observedRate = Number(row.positive_outcome_rate);
          weightedError += Math.abs(observedRate - predicted.positiveOutcomeRate) * sampleSize;
          totalWeight += sampleSize;
        }
        return {
          splitSet,
          subgroup,
          rows: group.length,
          weightedPositiveOutcomeMae: totalWeight > 0 ? weightedError / totalWeight : null,
          avgObservedPositiveOutcomeRate: mean(group.map((row) => Number(row.positive_outcome_rate))),
        };
      }).sort((a, b) => a.splitSet.localeCompare(b.splitSet) || a.subgroup.localeCompare(b.subgroup));
    }

    const handednessStability = summarizeSubgroup(handednessResult.rows);
    const pitchFamilyStability = summarizeSubgroup(pitchFamilyResult.rows);

    const report = {
      generatedAt: new Date().toISOString(),
      databaseTarget: DATABASE_TARGET,
      splitPolicyVersion,
      splitRowCounts,
      trainCountStates: trainBaselinesResult.rows.length,
      validationCountStates: heldoutRows.filter((row) => row.splitSet === "validation").length,
      testCountStates: heldoutRows.filter((row) => row.splitSet === "test").length,
      errorSummary,
      testCalibration,
      handednessStability,
      pitchFamilyStability,
      sourceViews: {
        split: "mart_historical_pitch_states_split",
        train: "mart_count_state_outcome_baselines_train",
        trainValidation: "mart_count_state_outcome_baselines_train_validation",
      },
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
