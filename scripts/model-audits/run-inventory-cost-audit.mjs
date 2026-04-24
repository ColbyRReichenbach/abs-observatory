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
  getWinExpectancyCountSwing,
  mean,
  toMarkdownTable,
} from "./shared-audit-utils.mjs";

const DOC_PATH = path.join(ROOT, `docs/models/audits/${AUDIT_DATE}-inventory-cost-audit.md`);
const ARTIFACT_PATH = path.join(
  ROOT,
  `docs/models/audits/artifacts/${AUDIT_DATE}-inventory-cost-audit.json`,
);

const CURRENT_GEOMETRY_VARIANT = "radius_adjusted";
const HEURISTIC_SUCCESS_PER_LI = 0.012;
const HEURISTIC_FAILURE_COST_PER_LI = 0.0025;

loadAuditEnv();
const DATABASE_URL = resolveAuditDatabaseUrl();
const DATABASE_TARGET = describeAuditDatabaseTarget(DATABASE_URL);

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function calledPitchFromObservedCall(observedCall) {
  if (observedCall === "strike") return "called_strike";
  if (observedCall === "ball") return "ball";
  return null;
}

function challengeDirectionFromObservedCall(observedCall) {
  if (observedCall === "strike") return "strike_to_ball";
  if (observedCall === "ball") return "ball_to_strike";
  return null;
}

function challengeSideFromState(row) {
  const battingSide = row.halfInning === "Top" ? "away" : "home";
  const fieldingSide = battingSide === "away" ? "home" : "away";
  return row.calledPitch === "called_strike" ? battingSide : fieldingSide;
}

function getChallengeTeamValueMultiplier(calledPitch) {
  return calledPitch === "called_strike" ? 1 : -1;
}

function toChallengeAlignedMargin(direction, rawMargin) {
  if (rawMargin == null || direction == null) return null;
  if (direction === "ball_to_strike") return rawMargin;
  if (direction === "strike_to_ball") return -rawMargin;
  return null;
}

function toEdgeBucket(alignedMargin) {
  if (alignedMargin == null || Number.isNaN(alignedMargin)) return null;
  if (alignedMargin <= -0.15) return "strong_confirm";
  if (alignedMargin <= -0.03) return "lean_confirm";
  if (alignedMargin < 0.03) return "borderline";
  if (alignedMargin < 0.15) return "lean_overturn";
  return "strong_overturn";
}

function inningBucket(inning) {
  if (inning >= 9) return "9+";
  if (inning >= 7) return "7-8";
  if (inning >= 4) return "4-6";
  return "1-3";
}

function isCloseGame(scoreDiffBattingTeam) {
  return Math.abs(scoreDiffBattingTeam) <= 1;
}

function leverageApprox(req) {
  const runnersOnBase = (req.basesState ?? "").split("").filter((value) => value === "1").length;
  const inningFactor = clamp(req.inning / 9, 0.1, 1.7);
  const closeGameFactor = clamp(1.5 - Math.abs(req.scoreDiffBattingTeam) * 0.15, 0.3, 1.5);
  const countFactor = req.balls === 3 && req.strikes === 2 ? 1.2 : req.strikes === 2 ? 1.1 : 1.0;
  const baseOutFactor = runnersOnBase > 0 ? 1 + runnersOnBase * 0.12 : 0.95;
  return Number(clamp(inningFactor * closeGameFactor * countFactor * baseOutFactor, 0.2, 3.0).toFixed(3));
}

function incrementBallCount(balls, strikes) {
  if (balls >= 3) return null;
  return `${balls + 1}-${strikes}`;
}

function incrementStrikeCount(balls, strikes) {
  if (strikes >= 2) return null;
  return `${balls}-${strikes + 1}`;
}

function deriveCountKeys(req) {
  return req.calledPitch === "called_strike"
    ? {
        heldCountKey: incrementStrikeCount(req.balls, req.strikes),
        correctedCountKey: incrementBallCount(req.balls, req.strikes),
      }
    : {
        heldCountKey: incrementBallCount(req.balls, req.strikes),
        correctedCountKey: incrementStrikeCount(req.balls, req.strikes),
      };
}

function resolveOverturnProbabilityWithFallback(input, rows) {
  const lookups = [
    {
      tier: "exact",
      challengeDirection: input.challengeDirection,
      edgeBucket: input.edgeBucket,
    },
    {
      tier: "direction_only",
      challengeDirection: input.challengeDirection,
      edgeBucket: null,
    },
    {
      tier: "global",
      challengeDirection: null,
      edgeBucket: null,
    },
  ];

  for (const lookup of lookups) {
    const match = rows.find(
      (row) =>
        row.fallbackTier === lookup.tier &&
        row.challengeDirection === lookup.challengeDirection &&
        row.edgeBucket === lookup.edgeBucket,
    );
    if (match) return match;
  }
  return null;
}

function calculateSuccessWinDelta(req, winRows) {
  const { heldCountKey, correctedCountKey } = deriveCountKeys(req);
  if (!heldCountKey || !correctedCountKey) return null;
  return getWinExpectancyCountSwing(
    {
      inning: req.inning,
      halfInning: req.halfInning,
      outs: req.outs,
      basesState: req.basesState,
      homeScore: req.homeScore,
      awayScore: req.awayScore,
    },
    heldCountKey,
    correctedCountKey,
    winRows,
  );
}

function makeModelKey(modelType, row, challengesRemaining) {
  if (modelType === "global") return `${challengesRemaining}`;
  if (modelType === "inning_bucket") return `${challengesRemaining}|${row.inningBucket}`;
  return `${challengesRemaining}|${row.inningBucket}|${row.closeGameBucket}`;
}

function buildCostTable(rows, modelType, challengesRemaining) {
  const groups = new Map();
  for (const row of rows) {
    const key = makeModelKey(modelType, row, challengesRemaining);
    const target = challengesRemaining === 1 ? row.futureTop1Value : row.futureTop2Value;
    const existing = groups.get(key) ?? [];
    existing.push(target);
    groups.set(key, existing);
  }

  const fallbackGlobal =
    mean(rows.map((row) => (challengesRemaining === 1 ? row.futureTop1Value : row.futureTop2Value))) ?? 0;
  const table = new Map();
  for (const [key, values] of groups.entries()) {
    table.set(key, {
      key,
      sampleSize: values.length,
      meanCost: mean(values) ?? fallbackGlobal,
    });
  }

  return { table, fallbackGlobal };
}

function scoreCostTable(rows, modelType, builtTable, challengesRemaining) {
  return rows.map((row) => {
    const key = makeModelKey(modelType, row, challengesRemaining);
    const matched = builtTable.table.get(key);
    const predictedCost = matched?.meanCost ?? builtTable.fallbackGlobal;
    const actualCost = challengesRemaining === 1 ? row.futureTop1Value : row.futureTop2Value;
    return {
      ...row,
      predictedCost,
      actualCost,
      absError: Math.abs(predictedCost - actualCost),
      signedError: predictedCost - actualCost,
      adjustedExpectedValue: row.immediateExpectedValue - predictedCost,
      adjustedRecommendation: row.immediateExpectedValue - predictedCost > 0 ? "challenge" : "hold",
    };
  });
}

function buildMarkdown(report) {
  const winning = report.selection;
  const winningValidation = report.validation[winning.modelType][String(winning.challengesRemaining)];
  const winningTest = report.test[winning.modelType][String(winning.challengesRemaining)];

  return `# Inventory Cost Audit

Date: ${formatAuditDateLabel()}

## Scope

- Source table: \`modeling.called_pitch_decisions\`
- Geometry variant: \`${report.dataset.geometryVariant}\`
- Goal: estimate future opportunity cost of burning a challenge now
- Candidate target:
  - 1 remaining: future top-1 positive immediate opportunity value
  - 2 remaining: future top-2 positive immediate opportunity value

## Overview

- Train / validation / test rows: ${report.dataset.trainRows} / ${report.dataset.validationRows} / ${report.dataset.testRows}
- Selected inventory model: \`${winning.modelType}\`
- Selected remaining-challenges target: ${winning.challengesRemaining}
- Validation MAE: ${formatMaybeNumber(winningValidation.mae, 4)}
- Test MAE: ${formatMaybeNumber(winningTest.mae, 4)}
- Current policy test recommendation share (no empirical inventory replacement): ${formatPct(report.baseline.testRecommendationShare)}
- Selected model test recommendation share: ${formatPct(winningTest.recommendationShare)}

## Candidate Model Comparison On Validation

${toMarkdownTable(report.modelComparison, [
    { label: "Model", render: (row) => `${row.modelType} / ${row.challengesRemaining} remaining` },
    { label: "Validation MAE", render: (row) => formatMaybeNumber(row.validationMae, 4) },
    { label: "Validation Bias", render: (row) => formatMaybeNumber(row.validationBias, 4) },
    { label: "Validation Challenge Share", render: (row) => formatPct(row.validationRecommendationShare) },
    { label: "Test MAE", render: (row) => formatMaybeNumber(row.testMae, 4) },
    { label: "Test Challenge Share", render: (row) => formatPct(row.testRecommendationShare) },
  ])}

## Selected Model Buckets (${winning.modelType}, ${winning.challengesRemaining} remaining)

${toMarkdownTable(report.selectedBuckets, [
    { label: "Bucket", render: (row) => row.bucket },
    { label: "Sample", render: (row) => row.sampleSize },
    { label: "Mean Cost", render: (row) => formatPct(row.meanCost, 2) },
  ])}

## Notes

- Immediate opportunity value here is computed before inventory cost.
- The future opportunity target is derived from later positive-value opportunities for the same challenge side in the same game.
- This is still a provisional option-value model, but it is much closer to baseball strategy than a fixed scalar penalty.
`;
}

async function main() {
  console.info(
    `[inventory-cost-audit] database_role=${DATABASE_TARGET.role} host=${DATABASE_TARGET.host} db=${DATABASE_TARGET.database}`,
  );
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();

  try {
    const winRows = (
      await client.query(`
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
      `)
    ).rows.map((row) => ({
      fallbackTier: row.fallback_tier,
      inning: row.inning === null ? null : Number(row.inning),
      inningBucket: row.inning_bucket,
      halfInning: row.half_inning,
      scoreDiffBucket: row.score_diff_bucket,
      outs: row.outs === null ? null : Number(row.outs),
      basesState: row.bases_state,
      countKey: row.count_key,
      sampleSize: Number(row.sample_size ?? 0),
      battingTeamWinProbability: Number(row.batting_team_win_probability ?? 0),
      confidenceBand: row.confidence_band,
    }));

    const overturnRows = (
      await client.query(
        `
        SELECT
          fallback_tier,
          split_policy_version,
          geometry_variant,
          challenge_direction,
          edge_bucket,
          sample_size,
          overturn_probability,
          confidence_band
        FROM mart_modeled_abs_overturn_probability_fallbacks
        WHERE geometry_variant = $1
        `,
        [CURRENT_GEOMETRY_VARIANT],
      )
    ).rows.map((row) => ({
      fallbackTier: row.fallback_tier,
      splitPolicyVersion: row.split_policy_version,
      geometryVariant: row.geometry_variant,
      challengeDirection: row.challenge_direction,
      edgeBucket: row.edge_bucket,
      sampleSize: Number(row.sample_size ?? 0),
      overturnProbability: Number(row.overturn_probability ?? 0.5),
      confidenceBand: row.confidence_band,
    }));

    const rows = (
      await client.query(`
        SELECT
          game_pk,
          split_set,
          competition_phase,
          inning,
          half_inning,
          at_bat_number,
          pitch_number,
          balls,
          strikes,
          outs,
          bases_state,
          home_score,
          away_score,
          score_diff_batting,
          observed_call,
          min_edge_distance_radius_adjusted
        FROM modeling.called_pitch_decisions
        WHERE split_set IN ('train', 'validation', 'test')
          AND is_challenge_eligible = TRUE
          AND observed_call IN ('ball', 'strike')
        ORDER BY game_pk, inning, CASE WHEN half_inning = 'top' THEN 0 ELSE 1 END, at_bat_number, pitch_number
      `)
    ).rows.map((row) => {
      const calledPitch = calledPitchFromObservedCall(row.observed_call);
      const challengeDirection = challengeDirectionFromObservedCall(row.observed_call);
      const rawMargin =
        row.min_edge_distance_radius_adjusted == null ? null : Number(row.min_edge_distance_radius_adjusted);
      const alignedMargin = toChallengeAlignedMargin(challengeDirection, rawMargin);
      const edgeBucket = toEdgeBucket(alignedMargin);
      const base = {
        gamePk: Number(row.game_pk),
        splitSet: row.split_set,
        competitionPhase: row.competition_phase ?? "unknown",
        inning: Number(row.inning ?? 0),
        inningBucket: inningBucket(Number(row.inning ?? 0)),
        halfInning: String(row.half_inning).toLowerCase() === "bottom" ? "Bottom" : "Top",
        atBatNumber: Number(row.at_bat_number ?? 0),
        pitchNumber: Number(row.pitch_number ?? 0),
        balls: Number(row.balls ?? 0),
        strikes: Number(row.strikes ?? 0),
        outs: Number(row.outs ?? 0),
        basesState: row.bases_state ?? "000",
        homeScore: row.home_score === null ? null : Number(row.home_score),
        awayScore: row.away_score === null ? null : Number(row.away_score),
        scoreDiffBattingTeam: Number(row.score_diff_batting ?? 0),
        closeGameBucket: isCloseGame(Number(row.score_diff_batting ?? 0)) ? "close" : "not_close",
        observedCall: row.observed_call,
        calledPitch,
        challengeDirection,
        edgeBucket,
      };

      const overturn = resolveOverturnProbabilityWithFallback(
        {
          challengeDirection: base.challengeDirection,
          edgeBucket: base.edgeBucket,
        },
        overturnRows,
      );

      const leverageIndex = leverageApprox(base);
      const winDelta = calculateSuccessWinDelta(
        {
          inning: base.inning,
          halfInning: base.halfInning,
          balls: base.balls,
          strikes: base.strikes,
          outs: base.outs,
          basesState: base.basesState,
          homeScore: base.homeScore,
          awayScore: base.awayScore,
          calledPitch: base.calledPitch,
        },
        winRows,
      );

      const successValue =
        winDelta
          ? Number((winDelta.swing * getChallengeTeamValueMultiplier(base.calledPitch)).toFixed(4))
          : Number((HEURISTIC_SUCCESS_PER_LI * leverageIndex).toFixed(4));
      const failureValue = Number((-HEURISTIC_FAILURE_COST_PER_LI * leverageIndex).toFixed(4));
      const overturnProbability = overturn?.overturnProbability ?? 0.5;
      const immediateExpectedValue =
        overturnProbability * successValue + (1 - overturnProbability) * failureValue;

      return {
        ...base,
        challengeSide: challengeSideFromState(base),
        overturnProbability,
        successValue,
        failureValue,
        immediateExpectedValue: Number(immediateExpectedValue.toFixed(4)),
      };
    });

    const grouped = new Map();
    for (const row of rows) {
      const key = `${row.gamePk}|${row.challengeSide}`;
      const existing = grouped.get(key) ?? [];
      existing.push(row);
      grouped.set(key, existing);
    }

    const enrichedRows = [];
    for (const groupRows of grouped.values()) {
      let top1 = 0;
      let top2 = 0;
      for (let index = groupRows.length - 1; index >= 0; index -= 1) {
        const row = groupRows[index];
        enrichedRows.unshift({
          ...row,
          futureTop1Value: top1,
          futureTop2Value: top2,
        });

        const candidate = Math.max(0, row.immediateExpectedValue);
        if (candidate >= top1) {
          top2 = top1;
          top1 = candidate;
        } else if (candidate > top2) {
          top2 = candidate;
        }
      }
    }

    const trainRows = enrichedRows.filter((row) => row.splitSet === "train");
    const validationRows = enrichedRows.filter((row) => row.splitSet === "validation");
    const testRows = enrichedRows.filter((row) => row.splitSet === "test");

    const modelTypes = ["global", "inning_bucket", "inning_bucket_close"];
    const modelComparison = [];
    const builtModels = {};

    for (const modelType of modelTypes) {
      builtModels[modelType] = {};
      for (const challengesRemaining of [1, 2]) {
        const builtTable = buildCostTable(trainRows, modelType, challengesRemaining);
        const validationScored = scoreCostTable(
          validationRows,
          modelType,
          builtTable,
          challengesRemaining,
        );
        const testScored = scoreCostTable(testRows, modelType, builtTable, challengesRemaining);

        builtModels[modelType][String(challengesRemaining)] = {
          builtTable,
          validation: {
            rows: validationScored.length,
            mae: mean(validationScored.map((row) => row.absError)),
            bias: mean(validationScored.map((row) => row.signedError)),
            recommendationShare:
              validationScored.filter((row) => row.adjustedRecommendation === "challenge").length /
              Math.max(validationScored.length, 1),
          },
          test: {
            rows: testScored.length,
            mae: mean(testScored.map((row) => row.absError)),
            bias: mean(testScored.map((row) => row.signedError)),
            recommendationShare:
              testScored.filter((row) => row.adjustedRecommendation === "challenge").length /
              Math.max(testScored.length, 1),
          },
        };

        modelComparison.push({
          modelType,
          challengesRemaining,
          validationMae: builtModels[modelType][String(challengesRemaining)].validation.mae,
          validationBias: builtModels[modelType][String(challengesRemaining)].validation.bias,
          validationRecommendationShare:
            builtModels[modelType][String(challengesRemaining)].validation.recommendationShare,
          testMae: builtModels[modelType][String(challengesRemaining)].test.mae,
          testRecommendationShare:
            builtModels[modelType][String(challengesRemaining)].test.recommendationShare,
        });
      }
    }

    modelComparison.sort((a, b) => a.validationMae - b.validationMae || a.testMae - b.testMae);
    const selection = {
      modelType: modelComparison[0].modelType,
      challengesRemaining: modelComparison[0].challengesRemaining,
    };

    const selectedBuilt =
      builtModels[selection.modelType][String(selection.challengesRemaining)];
    const selectedBuckets = [...selectedBuilt.builtTable.table.entries()]
      .map(([key, value]) => ({
        bucket: key,
        sampleSize: value.sampleSize,
        meanCost: value.meanCost,
      }))
      .sort((a, b) => a.bucket.localeCompare(b.bucket));

    const report = {
      generatedAt: new Date().toISOString(),
      dataset: {
        geometryVariant: CURRENT_GEOMETRY_VARIANT,
        trainRows: trainRows.length,
        validationRows: validationRows.length,
        testRows: testRows.length,
      },
      baseline: {
        testRecommendationShare:
          testRows.filter((row) => row.immediateExpectedValue > 0).length / Math.max(testRows.length, 1),
      },
      modelComparison,
      selection,
      validation: Object.fromEntries(
        modelTypes.map((modelType) => [
          modelType,
          {
            1: builtModels[modelType]["1"].validation,
            2: builtModels[modelType]["2"].validation,
          },
        ]),
      ),
      test: Object.fromEntries(
        modelTypes.map((modelType) => [
          modelType,
          {
            1: builtModels[modelType]["1"].test,
            2: builtModels[modelType]["2"].test,
          },
        ]),
      ),
      bucketTables: Object.fromEntries(
        modelTypes.map((modelType) => [
          modelType,
          {
            1: [...builtModels[modelType]["1"].builtTable.table.entries()]
              .map(([key, value]) => ({
                bucket: key,
                sampleSize: value.sampleSize,
                meanCost: value.meanCost,
              }))
              .sort((a, b) => a.bucket.localeCompare(b.bucket)),
            2: [...builtModels[modelType]["2"].builtTable.table.entries()]
              .map(([key, value]) => ({
                bucket: key,
                sampleSize: value.sampleSize,
                meanCost: value.meanCost,
              }))
              .sort((a, b) => a.bucket.localeCompare(b.bucket)),
          },
        ]),
      ),
      selectedBuckets,
    };

    fs.mkdirSync(path.dirname(ARTIFACT_PATH), { recursive: true });
    fs.writeFileSync(ARTIFACT_PATH, `${JSON.stringify(report, null, 2)}\n`);
    fs.writeFileSync(DOC_PATH, `${buildMarkdown(report)}\n`);
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
