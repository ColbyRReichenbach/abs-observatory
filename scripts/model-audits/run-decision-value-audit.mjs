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
  formatSignedPctPoint,
  getWinExpectancyCountSwing,
  mean,
  toMarkdownTable,
} from "./shared-audit-utils.mjs";

const DOC_PATH = path.join(ROOT, `docs/models/audits/${AUDIT_DATE}-decision-value-audit.md`);
const ARTIFACT_PATH = path.join(
  ROOT,
  `docs/models/audits/artifacts/${AUDIT_DATE}-decision-value-audit.json`,
);

const CURRENT_GEOMETRY_VARIANT = "radius_adjusted";
const HEURISTIC_SUCCESS_PER_LI = 0.012;
const HEURISTIC_FAILURE_COST_PER_LI = 0.0025;
const INVENTORY_COST_VERSION = "inventory_future_opportunity_failure_weighted_v2";
const INVENTORY_UPPER_BOUND_REALIZATION_RATE = 0.04;
const INVENTORY_MAX_COST_BY_REMAINING = {
  1: 0.015,
  2: 0.0075,
};
const INVENTORY_UPPER_BOUND_BY_BUCKET = {
  "1|1-3|close": 0.28954352014010387,
  "1|1-3|not_close": 0.23589356435643613,
  "1|4-6|close": 0.24681330022075038,
  "1|4-6|not_close": 0.19392706919945835,
  "1|7-8|close": 0.21035421686746955,
  "1|7-8|not_close": 0.10613727729556854,
  "1|9+|close": 0.11896820388349548,
  "1|9+|not_close": 0.01721450549450547,
  "2|1-3|close": 0.21517434325744247,
  "2|1-3|not_close": 0.17001245874587342,
  "2|4-6|close": 0.17933073951434852,
  "2|4-6|not_close": 0.1295591587516967,
  "2|7-8|close": 0.134208543263965,
  "2|7-8|not_close": 0.06035564184559155,
  "2|9+|close": 0.06170121359223295,
  "2|9+|not_close": 0.007338901098901094,
};
const INVENTORY_COST_SENSITIVITY = [
  { version: "v0_5x", multiplier: 0.5 },
  { version: "v1_0x", multiplier: 1 },
  { version: "v2_0x", multiplier: 2 },
  { version: "v4_0x", multiplier: 4 },
  { version: "v8_0x", multiplier: 8 },
];
const RECOMMENDATION_THRESHOLDS = [0, 0.0025, 0.005, 0.01, 0.02];
const BUDGET_SCENARIOS = [1, 2];

loadAuditEnv();
const DATABASE_URL = resolveAuditDatabaseUrl();
const DATABASE_TARGET = describeAuditDatabaseTarget(DATABASE_URL);

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function challengeDirectionFromObservedCall(observedCall) {
  if (observedCall === "strike") return "strike_to_ball";
  if (observedCall === "ball") return "ball_to_strike";
  return null;
}

function calledPitchFromObservedCall(observedCall) {
  if (observedCall === "strike") return "called_strike";
  if (observedCall === "ball") return "ball";
  return null;
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

function inventoryCostApprox(req, leverageIndex) {
  void leverageIndex;
  const remainingChallenges = req.challengesRemaining >= 2 ? 2 : 1;
  const inningKey = req.inning >= 9 ? "9+" : req.inning >= 7 ? "7-8" : req.inning >= 4 ? "4-6" : "1-3";
  const closeKey = Math.abs(req.scoreDiffBattingTeam) <= 1 ? "close" : "not_close";
  const bucketKey = `${remainingChallenges}|${inningKey}|${closeKey}`;
  return Number(
    Math.min(
      (INVENTORY_UPPER_BOUND_BY_BUCKET[bucketKey] ?? 0) * INVENTORY_UPPER_BOUND_REALIZATION_RATE,
      INVENTORY_MAX_COST_BY_REMAINING[remainingChallenges],
    ).toFixed(4),
  );
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

function expectedValueBucket(value) {
  if (value == null || Number.isNaN(value)) return "unknown";
  if (value < -0.005) return "< -0.005";
  if (value < 0) return "-0.005 to 0";
  if (value < 0.005) return "0 to 0.005";
  return ">= 0.005";
}

function summarizeBy(rows, keyFn, metricFn) {
  const groups = new Map();
  for (const row of rows) {
    const key = keyFn(row);
    const existing = groups.get(key) ?? [];
    existing.push(row);
    groups.set(key, existing);
  }
  return [...groups.entries()].map(([key, grouped]) => metricFn(key, grouped));
}

function simulateBudgetPolicy(rows, budgetPerGameTeam) {
  const grouped = new Map();
  for (const row of rows) {
    const key = `${row.gamePk}|${row.challengeTeamId ?? "unknown"}`;
    const existing = grouped.get(key) ?? [];
    existing.push(row);
    grouped.set(key, existing);
  }

  const selected = [];
  for (const groupRows of grouped.values()) {
    const chosen = groupRows
      .filter((row) => row.challengeTeamId != null && row.expectedChallengeValue > 0)
      .sort((a, b) => b.expectedChallengeValue - a.expectedChallengeValue)
      .slice(0, budgetPerGameTeam);
    selected.push(...chosen);
  }

  const selectedKey = new Set(
    selected.map((row) => `${row.gamePk}|${row.atBatNumber}|${row.pitchNumber}`),
  );

  return {
    budgetPerGameTeam,
    selectedRows: selected.length,
    recommendationShare: selected.length / Math.max(rows.length, 1),
    avgExpectedChallengeValueOnSelected: mean(selected.map((row) => row.expectedChallengeValue)),
    actualChallengeRateOnSelected:
      selected.filter((row) => row.wasChallenged).length / Math.max(selected.length, 1),
    actualOverturnRateOnSelectedChallenges:
      selected.filter((row) => row.wasChallenged).length > 0
        ? selected.filter((row) => row.wasChallenged && row.isOverturned).length /
          selected.filter((row) => row.wasChallenged).length
        : null,
    actualChallengedRowsCaptured: rows.filter(
      (row) => row.wasChallenged && selectedKey.has(`${row.gamePk}|${row.atBatNumber}|${row.pitchNumber}`),
    ).length,
    positiveEvRowsLeftUnselected: rows.filter(
      (row) => row.expectedChallengeValue > 0 && !selectedKey.has(`${row.gamePk}|${row.atBatNumber}|${row.pitchNumber}`),
    ).length,
  };
}

function buildMarkdown(report) {
  return `# Decision Value Audit

Date: ${formatAuditDateLabel()}

## Scope

- Source table: \`modeling.called_pitch_decisions\`
- Population: all challenge-eligible \`test\` opportunities
- Geometry variant: \`${report.dataset.geometryVariant}\`
- Overturn lookup source: \`mart_modeled_abs_overturn_probability_fallbacks\`
- Inventory cost version: \`${report.dataset.inventoryCostVersion}\`

## Overview

- Held-out opportunities: ${report.dataset.testOpportunities}
- Validation opportunities: ${report.dataset.validationOpportunities}
- Held-out challenged rows: ${report.dataset.testChallengedRows}
- Held-out non-challenged rows: ${report.dataset.testNonChallengedRows}
- Split policy: \`${report.dataset.splitPolicyVersion}\`
- Challenge recommendation share: ${formatPct(report.opportunitySummary.challengeRecommendationShare)}
- Actual historical challenge share: ${formatPct(report.opportunitySummary.actualChallengeShare)}
- Mean expected challenge value: ${formatPct(report.opportunitySummary.meanExpectedChallengeValue, 2)}
- Positive-EV non-challenged opportunities: ${report.rootCause.positiveEvNonChallengedRows}
- Negative-EV challenged opportunities: ${report.rootCause.negativeEvChallengedRows}

## Inventory Cost Sensitivity On Validation

${toMarkdownTable(report.validationInventorySensitivity, [
    { label: "Version", render: (row) => row.version },
    { label: "Multiplier", render: (row) => formatMaybeNumber(row.multiplier, 1) },
    { label: "Validation Challenge Share", render: (row) => formatPct(row.recommendationShare) },
    { label: "Avg Expected", render: (row) => formatPct(row.meanExpectedChallengeValue, 2) },
    { label: "Positive-EV Non-Challenge Rows", render: (row) => row.positiveEvHoldRows },
  ])}

## Validation Threshold Envelope

${toMarkdownTable(report.validationThresholdEnvelope, [
    { label: "Threshold", render: (row) => formatPct(row.threshold, 2) },
    { label: "Validation Challenge Share", render: (row) => formatPct(row.recommendationShare) },
    { label: "Avg Expected On Recommended", render: (row) => formatPct(row.avgExpectedChallengeValueOnRecommended, 2) },
    { label: "Positive-EV Holds", render: (row) => row.positiveEvHoldRows },
    { label: "Negative-EV Challenges", render: (row) => row.negativeEvChallengeRows },
  ])}

## Validation Budget-Constrained Envelope

${toMarkdownTable(report.validationBudgetEnvelope, [
    { label: "Budget / Team-Game", render: (row) => row.budgetPerGameTeam },
    { label: "Validation Challenge Share", render: (row) => formatPct(row.recommendationShare) },
    { label: "Avg Expected On Selected", render: (row) => formatPct(row.avgExpectedChallengeValueOnSelected, 2) },
    { label: "Actual Challenge Rate On Selected", render: (row) => formatPct(row.actualChallengeRateOnSelected) },
    { label: "Actual Overturn Rate On Selected Challenges", render: (row) => formatPct(row.actualOverturnRateOnSelectedChallenges) },
    { label: "Actual Challenged Rows Captured", render: (row) => row.actualChallengedRowsCaptured },
    { label: "Positive-EV Rows Left Unselected", render: (row) => row.positiveEvRowsLeftUnselected },
  ])}

## Opportunity-Level Policy Summary

${toMarkdownTable(report.byRecommendation, [
    { label: "Recommendation", render: (row) => row.key },
    { label: "Rows", render: (row) => row.rows },
    { label: "Actual Challenge Rate", render: (row) => formatPct(row.actualChallengeRate) },
    { label: "Avg Ovr Prob", render: (row) => formatPct(row.avgOverturnProbability) },
    { label: "Avg Success", render: (row) => formatPct(row.avgSuccessValue, 2) },
    { label: "Avg Fail", render: (row) => formatPct(row.avgFailureValue, 2) },
    { label: "Avg Inventory", render: (row) => formatPct(row.avgInventoryCost, 2) },
    { label: "Avg Expected", render: (row) => formatPct(row.avgExpectedChallengeValue, 2) },
  ])}

## By Expected Value Bucket

${toMarkdownTable(report.byExpectedBucket, [
    { label: "EV Bucket", render: (row) => row.key },
    { label: "Rows", render: (row) => row.rows },
    { label: "Actual Challenge Rate", render: (row) => formatPct(row.actualChallengeRate) },
    { label: "Overturn Rate On Challenged", render: (row) => formatPct(row.overturnRateOnChallenged) },
    { label: "Avg Expected", render: (row) => formatPct(row.avgExpectedChallengeValue, 2) },
  ])}

## Challenged-Subset Diagnostic

This section is descriptive only. Realized value is observed only for pitches that were actually challenged, so it is not a causal evaluation of the full policy.

- Challenged rows in held-out test: ${report.challengedSubset.rows}
- Mean expected challenge value on challenged rows: ${formatPct(report.challengedSubset.meanExpectedChallengeValue, 2)}
- Mean realized challenge value on challenged rows: ${formatPct(report.challengedSubset.meanRealizedChallengeValue, 2)}
- Mean signed gap (realized - expected): ${formatSignedPctPoint(report.challengedSubset.meanSignedGap)}
- Recommended-share on challenged rows: ${formatPct(report.challengedSubset.recommendedShare)}
- Positive realized share on challenged rows: ${formatPct(report.challengedSubset.positiveRealizedShare)}

${toMarkdownTable(report.challengedByRecommendation, [
    { label: "Recommendation", render: (row) => row.key },
    { label: "Rows", render: (row) => row.rows },
    { label: "Avg Expected", render: (row) => formatPct(row.avgExpectedChallengeValue, 2) },
    { label: "Avg Realized", render: (row) => formatPct(row.avgRealizedChallengeValue, 2) },
    { label: "Positive Realized Share", render: (row) => formatPct(row.positiveRealizedShare) },
    { label: "Overturn Share", render: (row) => formatPct(row.overturnShare) },
  ])}

## Largest Missed Positive-EV Holds

${toMarkdownTable(report.topMissedOpportunities, [
    { label: "Game", render: (row) => row.gamePk },
    { label: "Phase", render: (row) => row.competitionPhase },
    { label: "State", render: (row) => `${row.inning} ${row.halfInning}, ${row.basesState}, ${row.balls}-${row.strikes}` },
    { label: "Ovr Prob", render: (row) => formatPct(row.overturnProbability) },
    { label: "Expected", render: (row) => formatPct(row.expectedChallengeValue, 2) },
  ])}

## Largest Negative-EV Actual Challenges

${toMarkdownTable(report.topNegativeActualChallenges, [
    { label: "Game", render: (row) => row.gamePk },
    { label: "Phase", render: (row) => row.competitionPhase },
    { label: "State", render: (row) => `${row.inning} ${row.halfInning}, ${row.basesState}, ${row.balls}-${row.strikes}` },
    { label: "Ovr Prob", render: (row) => formatPct(row.overturnProbability) },
    { label: "Expected", render: (row) => formatPct(row.expectedChallengeValue, 2) },
    { label: "Realized", render: (row) => formatPct(row.realizedChallengeValue, 2) },
  ])}

## Notes

- This audit now scores the full held-out opportunity set rather than only historical challenges.
- Non-challenged rows do not have observed counterfactual realized value, so opportunity-level metrics are descriptive policy diagnostics, not causal proof.
- Challenged-subset realized-value comparisons are useful for sanity checks, but they remain selection-biased until a stronger counterfactual design is added.
- Threshold-envelope reporting is included so recommendation rate can be compared against historical usage before any stronger deployment claim is made.
- Budget-constrained validation reporting is descriptive only; it shows what a simple team-game budgeted selector would do, not what a fully retained-challenge simulation has proven.
`;
}

async function main() {
  console.info(
    `[decision-value-audit] database_role=${DATABASE_TARGET.role} host=${DATABASE_TARGET.host} db=${DATABASE_TARGET.database}`,
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

    const opportunities = (
      await client.query(`
        SELECT
          c.game_pk,
          c.game_date,
          c.competition_phase,
          c.split_set,
          c.split_policy_version,
          c.at_bat_number,
          c.pitch_number,
          c.inning,
          c.half_inning,
          c.balls,
          c.strikes,
          c.outs,
          c.bases_state,
          c.home_score,
          c.away_score,
          c.score_diff_batting,
          c.observed_call,
          c.min_edge_distance_radius_adjusted,
          COALESCE(c.challenge_dedupe_key, '') AS challenge_dedupe_key,
          c.batting_team_id,
          c.fielding_team_id,
          c.opportunity_team_id,
          c.opportunity_team_side,
          c.actual_challenge_team_id,
          c.was_challenged,
          c.challenge_outcome,
          c.is_overturned
        FROM modeling.called_pitch_decisions c
        WHERE split_set IN ('validation', 'test')
          AND is_challenge_eligible = TRUE
          AND observed_call IN ('ball', 'strike')
        ORDER BY game_pk, at_bat_number, pitch_number
      `)
    ).rows.map((row) => {
      const observedCall = row.observed_call;
      const calledPitch = calledPitchFromObservedCall(observedCall);
      const challengeDirection = challengeDirectionFromObservedCall(observedCall);
      const rawMargin =
        row.min_edge_distance_radius_adjusted == null ? null : Number(row.min_edge_distance_radius_adjusted);
      const alignedMargin = toChallengeAlignedMargin(challengeDirection, rawMargin);
      const edgeBucket = toEdgeBucket(alignedMargin);
      return {
        gamePk: Number(row.game_pk),
        gameDate: row.game_date,
        competitionPhase: row.competition_phase ?? "unknown",
        splitSet: row.split_set,
        splitPolicyVersion: row.split_policy_version ?? "unknown",
        atBatNumber: Number(row.at_bat_number ?? 0),
        pitchNumber: Number(row.pitch_number ?? 0),
        inning: Number(row.inning ?? 0),
        halfInning: String(row.half_inning).toLowerCase() === "bottom" ? "Bottom" : "Top",
        balls: Number(row.balls ?? 0),
        strikes: Number(row.strikes ?? 0),
        outs: Number(row.outs ?? 0),
        basesState: row.bases_state ?? "000",
        homeScore: row.home_score === null ? null : Number(row.home_score),
        awayScore: row.away_score === null ? null : Number(row.away_score),
        scoreDiffBattingTeam: Number(row.score_diff_batting ?? 0),
        observedCall,
        calledPitch,
        challengeDirection,
        battingTeamId: row.batting_team_id == null ? null : Number(row.batting_team_id),
        fieldingTeamId: row.fielding_team_id == null ? null : Number(row.fielding_team_id),
        opportunityTeamId: row.opportunity_team_id == null ? null : Number(row.opportunity_team_id),
        opportunityTeamSide: row.opportunity_team_side ?? null,
        actualChallengeTeamId:
          row.actual_challenge_team_id == null ? null : Number(row.actual_challenge_team_id),
        rawMargin,
        alignedMargin,
        edgeBucket,
        challengeDedupeKey: row.challenge_dedupe_key || null,
        wasChallenged: Boolean(row.was_challenged),
        challengeOutcome: row.challenge_outcome,
        isOverturned: row.is_overturned === null ? null : Boolean(row.is_overturned),
      };
    });

    const splitPolicyVersion =
      opportunities.find((row) => row.splitPolicyVersion && row.splitPolicyVersion !== "unknown")
        ?.splitPolicyVersion ?? "unknown";

    const scoredRows = opportunities
      .map((row) => {
        if (!row.calledPitch || !row.challengeDirection) return null;

        const overturn = resolveOverturnProbabilityWithFallback(
          {
            challengeDirection: row.challengeDirection,
            edgeBucket: row.edgeBucket,
          },
          overturnRows,
        );

        const leverageIndex = leverageApprox(row);
        const winDelta = calculateSuccessWinDelta(
          {
            inning: row.inning,
            halfInning: row.halfInning,
            balls: row.balls,
            strikes: row.strikes,
            outs: row.outs,
            basesState: row.basesState,
            homeScore: row.homeScore,
            awayScore: row.awayScore,
            calledPitch: row.calledPitch,
          },
          winRows,
        );

        const successValue =
          winDelta
            ? Number((winDelta.swing * getChallengeTeamValueMultiplier(row.calledPitch)).toFixed(4))
            : Number((HEURISTIC_SUCCESS_PER_LI * leverageIndex).toFixed(4));
        const failureValue = Number((-HEURISTIC_FAILURE_COST_PER_LI * leverageIndex).toFixed(4));
        const inventoryCost = inventoryCostApprox(
          {
            inning: row.inning,
            basesState: row.basesState,
            balls: row.balls,
            strikes: row.strikes,
            scoreDiffBattingTeam: row.scoreDiffBattingTeam,
            challengesRemaining: 1,
          },
          leverageIndex,
        );
        const overturnProbability = overturn?.overturnProbability ?? 0.5;
        const failureBranchValue = Number((failureValue - inventoryCost).toFixed(4));
        const expectedChallengeValue =
          overturnProbability * successValue +
          (1 - overturnProbability) * failureBranchValue;
        const realizedChallengeValue = row.wasChallenged
          ? (row.isOverturned ? successValue : failureBranchValue)
          : null;

        return {
          ...row,
          challengeTeamId: row.opportunityTeamId,
          leverageIndex,
          overturnProbability,
          overturnProbabilityFallbackTier: overturn?.fallbackTier ?? "global",
          overturnProbabilityConfidence: overturn?.confidenceBand ?? null,
          successValue,
          failureValue: failureBranchValue,
          rawFailureValue: failureValue,
          inventoryCost,
          expectedChallengeValue: Number(expectedChallengeValue.toFixed(4)),
          realizedChallengeValue:
            realizedChallengeValue == null ? null : Number(realizedChallengeValue.toFixed(4)),
          decisionValueMode: winDelta ? "win_expectancy" : "heuristic",
          recommendation: expectedChallengeValue > 0 ? "challenge" : "hold",
        };
      })
      .filter(Boolean);

    const validationRows = scoredRows.filter((row) => row.splitSet === "validation");
    const testRows = scoredRows.filter((row) => row.splitSet === "test");
    const challengedSubsetRows = testRows.filter((row) => row.wasChallenged);

    const byRecommendation = summarizeBy(
      testRows,
      (row) => row.recommendation,
      (key, rows) => ({
        key,
        rows: rows.length,
        actualChallengeRate: rows.filter((row) => row.wasChallenged).length / rows.length,
        avgOverturnProbability: mean(rows.map((row) => row.overturnProbability)),
        avgSuccessValue: mean(rows.map((row) => row.successValue)),
        avgFailureValue: mean(rows.map((row) => row.failureValue)),
        avgInventoryCost: mean(rows.map((row) => row.inventoryCost)),
        avgExpectedChallengeValue: mean(rows.map((row) => row.expectedChallengeValue)),
      }),
    ).sort((a, b) => b.avgExpectedChallengeValue - a.avgExpectedChallengeValue);

    const byExpectedBucket = summarizeBy(
      testRows,
      (row) => expectedValueBucket(row.expectedChallengeValue),
      (key, rows) => {
        const challengedRows = rows.filter((row) => row.wasChallenged);
        return {
          key,
          rows: rows.length,
          actualChallengeRate: challengedRows.length / rows.length,
          overturnRateOnChallenged:
            challengedRows.length > 0
              ? challengedRows.filter((row) => row.isOverturned).length / challengedRows.length
              : null,
          avgExpectedChallengeValue: mean(rows.map((row) => row.expectedChallengeValue)),
        };
      },
    ).sort((a, b) => a.avgExpectedChallengeValue - b.avgExpectedChallengeValue);

    const challengedByRecommendation = summarizeBy(
      challengedSubsetRows,
      (row) => row.recommendation,
      (key, rows) => ({
        key,
        rows: rows.length,
        avgExpectedChallengeValue: mean(rows.map((row) => row.expectedChallengeValue)),
        avgRealizedChallengeValue: mean(rows.map((row) => row.realizedChallengeValue)),
        positiveRealizedShare:
          rows.filter((row) => (row.realizedChallengeValue ?? -Infinity) > 0).length / rows.length,
        overturnShare: rows.filter((row) => row.isOverturned).length / rows.length,
      }),
    ).sort((a, b) => b.avgExpectedChallengeValue - a.avgExpectedChallengeValue);

    const validationInventorySensitivity = INVENTORY_COST_SENSITIVITY.map(({ version, multiplier }) => {
      const rescored = validationRows.map((row) => {
        const adjustedExpectedChallengeValue =
          row.overturnProbability * row.successValue +
          (1 - row.overturnProbability) * (row.rawFailureValue - row.inventoryCost * multiplier);
        return {
          ...row,
          adjustedExpectedChallengeValue,
          adjustedRecommendation: adjustedExpectedChallengeValue > 0 ? "challenge" : "hold",
        };
      });
      return {
        version,
        multiplier,
        recommendationShare:
          rescored.filter((row) => row.adjustedRecommendation === "challenge").length /
          Math.max(rescored.length, 1),
        meanExpectedChallengeValue: mean(
          rescored.map((row) => row.adjustedExpectedChallengeValue),
        ),
        positiveEvHoldRows: rescored.filter(
          (row) => row.adjustedRecommendation === "hold" && row.adjustedExpectedChallengeValue > 0,
        ).length,
      };
    });

    const validationThresholdEnvelope = RECOMMENDATION_THRESHOLDS.map((threshold) => {
      const recommendedRows = validationRows.filter(
        (row) => row.expectedChallengeValue >= threshold,
      );
      return {
        threshold,
        recommendationShare: recommendedRows.length / Math.max(validationRows.length, 1),
        avgExpectedChallengeValueOnRecommended: mean(
          recommendedRows.map((row) => row.expectedChallengeValue),
        ),
        positiveEvHoldRows: validationRows.filter(
          (row) => row.expectedChallengeValue > 0 && row.expectedChallengeValue < threshold,
        ).length,
        negativeEvChallengeRows: validationRows.filter(
          (row) => row.expectedChallengeValue >= threshold && row.expectedChallengeValue < 0,
        ).length,
      };
    });

    const validationBudgetEnvelope = BUDGET_SCENARIOS.map((budgetPerGameTeam) =>
      simulateBudgetPolicy(validationRows, budgetPerGameTeam),
    );

    const report = {
      generatedAt: new Date().toISOString(),
      dataset: {
        geometryVariant: CURRENT_GEOMETRY_VARIANT,
        inventoryCostVersion: INVENTORY_COST_VERSION,
        splitPolicyVersion,
        validationOpportunities: validationRows.length,
        testOpportunities: testRows.length,
        testChallengedRows: challengedSubsetRows.length,
        testNonChallengedRows: testRows.length - challengedSubsetRows.length,
      },
      validationInventorySensitivity,
      validationThresholdEnvelope,
      validationBudgetEnvelope,
      opportunitySummary: {
        challengeRecommendationShare:
          testRows.filter((row) => row.recommendation === "challenge").length / testRows.length,
        actualChallengeShare:
          testRows.filter((row) => row.wasChallenged).length / testRows.length,
        meanExpectedChallengeValue: mean(testRows.map((row) => row.expectedChallengeValue)),
      },
      byRecommendation,
      byExpectedBucket,
      challengedSubset: {
        rows: challengedSubsetRows.length,
        meanExpectedChallengeValue: mean(challengedSubsetRows.map((row) => row.expectedChallengeValue)),
        meanRealizedChallengeValue: mean(challengedSubsetRows.map((row) => row.realizedChallengeValue)),
        meanSignedGap: mean(
          challengedSubsetRows.map(
            (row) => (row.realizedChallengeValue ?? 0) - row.expectedChallengeValue,
          ),
        ),
        recommendedShare:
          challengedSubsetRows.filter((row) => row.recommendation === "challenge").length /
          challengedSubsetRows.length,
        positiveRealizedShare:
          challengedSubsetRows.filter((row) => (row.realizedChallengeValue ?? -Infinity) > 0).length /
          challengedSubsetRows.length,
      },
      challengedByRecommendation,
      topMissedOpportunities: scoredRows
        .filter((row) => row.splitSet === "test")
        .filter((row) => !row.wasChallenged && row.expectedChallengeValue > 0)
        .sort((a, b) => b.expectedChallengeValue - a.expectedChallengeValue)
        .slice(0, 10),
      topNegativeActualChallenges: challengedSubsetRows
        .filter((row) => row.expectedChallengeValue < 0)
        .sort((a, b) => a.expectedChallengeValue - b.expectedChallengeValue)
        .slice(0, 10),
      rootCause: {
        winExpectancyBackedRows: testRows.filter((row) => row.decisionValueMode === "win_expectancy").length,
        heuristicRows: testRows.filter((row) => row.decisionValueMode === "heuristic").length,
        positiveEvNonChallengedRows: testRows.filter(
          (row) => !row.wasChallenged && row.expectedChallengeValue > 0,
        ).length,
        strongPositiveEvNonChallengedRows: testRows.filter(
          (row) => !row.wasChallenged && row.expectedChallengeValue >= 0.005,
        ).length,
        negativeEvChallengedRows: challengedSubsetRows.filter(
          (row) => row.expectedChallengeValue < 0,
        ).length,
        recommendedOverturnedShare:
          challengedSubsetRows.filter((row) => row.recommendation === "challenge" && row.isOverturned).length /
          Math.max(challengedSubsetRows.filter((row) => row.isOverturned).length, 1),
      },
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
