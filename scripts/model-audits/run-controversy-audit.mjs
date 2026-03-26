import fs from "node:fs";
import path from "node:path";
import { Client } from "pg";
import {
  AUDIT_DATE,
  AUDIT_END,
  ROOT,
  SPRING_START,
  clamp,
  computeDirectionalZoneDistance,
  countRunnersOnBase,
  formatAuditDateLabel,
  formatMaybeNumber,
  formatPct,
  formatSignedPctPoint,
  getCalledPitch,
  getEdgeBucketForChallenge,
  getWinExpectancyCountSwing,
  loadEnvFile,
  mean,
  percentile,
  toMarkdownTable,
} from "./shared-audit-utils.mjs";

const DOC_PATH = path.join(ROOT, `docs/models/audits/${AUDIT_DATE}-controversy-audit.md`);
const ARTIFACT_PATH = path.join(
  ROOT,
  `docs/models/audits/artifacts/${AUDIT_DATE}-controversy-audit.json`,
);

const HEURISTIC_SUCCESS_PER_LI = 0.009;
const HEURISTIC_FAILURE_COST_PER_LI = 0.003;
const HEURISTIC_LATE_CLOSE_PER_LI_BOOST = 0.0015;
const HEURISTIC_RUNNER_PRESSURE_PER_LI_BOOST = 0.0005;
const HEURISTIC_COUNT_PRESSURE_PER_LI_BOOST = 0.0005;

loadEnvFile(".env");
loadEnvFile(".env.local");

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required");
}

function getMargin(row) {
  return Math.abs((row.homeScore ?? 0) - (row.awayScore ?? 0));
}

function getRunnerFlags(basesState) {
  const normalized = (basesState ?? "").padEnd(3, "0").slice(0, 3);
  const first = normalized[0] === "1";
  const second = normalized[1] === "1";
  const third = normalized[2] === "1";
  return {
    runnersOn: Number(first) + Number(second) + Number(third),
    risp: second || third,
    basesLoaded: first && second && third,
  };
}

function computeLeverageScore(input) {
  const inning = input.inning ?? 0;
  const margin = getMargin(input);
  const { basesLoaded, risp, runnersOn } = getRunnerFlags(input.basesState);

  let score = 0;
  if (inning >= 9) score += 75;
  else if (inning === 8) score += 60;
  else if (inning === 7) score += 45;
  else if (inning >= 4) score += 25;
  else score += 10;

  if (margin === 0) score += 20;
  else if (margin === 1) score += 15;
  else if (margin === 2) score += 10;

  if ((input.outs ?? 0) >= 2) score += 10;
  else if ((input.outs ?? 0) === 1) score += 6;
  else if ((input.outs ?? 0) === 0) score += 2;

  if (basesLoaded) score += 20;
  else if (risp) score += 12;
  else if (runnersOn > 0) score += 6;

  const fullCount = input.balls === 3 && input.strikes === 2;
  const pressureCount = input.strikes === 2 || input.balls === 3;
  if (fullCount) score += 15;
  else if (pressureCount) score += 8;
  return clamp(score);
}

function computeResultImpactScore(input) {
  switch (input.impactType) {
    case "direct_ending_impact":
      return input.isOverturned ? 100 : 55;
    case "direct_count_impact":
      return input.isOverturned ? 75 : 45;
    case "downstream_inferred_impact":
      return 45;
    default:
      return input.isOverturned ? 65 : 35;
  }
}

function computeMissSeverityScore(missDistance) {
  if (missDistance == null || !Number.isFinite(missDistance)) return 40;
  if (missDistance >= 0.5) return 95;
  if (missDistance >= 0.25) return 75;
  if (missDistance >= 0.1) return 55;
  return 35;
}

function computeRecencyScore(progress) {
  const bounded = clamp(progress ?? 0.5, 0, 1);
  if (bounded >= 0.9) return 100;
  if (bounded >= 0.7) return 80;
  if (bounded >= 0.4) return 60;
  return 40;
}

function computeModeledValueScore(realizedChallengeValue, expectedChallengeValue, decisionValueMode) {
  const resolvedValue =
    realizedChallengeValue !== null && realizedChallengeValue !== undefined
      ? Math.abs(realizedChallengeValue)
      : expectedChallengeValue !== null && expectedChallengeValue !== undefined
        ? Math.abs(expectedChallengeValue)
        : null;
  if (resolvedValue === null || !Number.isFinite(resolvedValue) || resolvedValue <= 0) return 0;
  let score = 20;
  if (resolvedValue >= 0.03) score = 95;
  else if (resolvedValue >= 0.02) score = 80;
  else if (resolvedValue >= 0.01) score = 62;
  else if (resolvedValue >= 0.005) score = 45;
  else if (resolvedValue >= 0.0025) score = 30;
  if (decisionValueMode === "heuristic") return Math.min(score, 65);
  return score;
}

function scoreControversyMoment(input) {
  const leverageScore = computeLeverageScore(input);
  const resultImpactScore = computeResultImpactScore(input);
  const missSeverityScore = computeMissSeverityScore(input.missDistance);
  const modeledValueScore = computeModeledValueScore(
    input.realizedChallengeValue,
    input.expectedChallengeValue,
    input.decisionValueMode,
  );
  const recencyScore = computeRecencyScore(input.slateProgress);
  const noveltyScore = clamp(50 - (input.noveltyPenalty ?? 0));

  let score =
    0.29 * leverageScore +
    0.18 * resultImpactScore +
    0.16 * missSeverityScore +
    0.22 * modeledValueScore +
    0.1 * recencyScore +
    0.05 * noveltyScore;
  if (!input.isOverturned) score *= 0.85;
  return {
    score: Number(clamp(score).toFixed(2)),
    leverageScore,
    resultImpactScore,
    missSeverityScore,
    modeledValueScore,
    recencyScore,
    noveltyScore,
  };
}

function leverageApprox(req) {
  const inningFactor = clamp(req.inning / 9, 0.1, 1.7);
  const closeGameFactor = clamp(1.5 - Math.abs(req.scoreDiffBattingTeam) * 0.15, 0.3, 1.5);
  const countFactor = req.balls === 3 && req.strikes === 2 ? 1.2 : req.strikes === 2 ? 1.1 : 1.0;
  const baseOutFactor = req.runnersOnBase > 0 ? 1 + req.runnersOnBase * 0.12 : 0.95;
  return Number(clamp(inningFactor * closeGameFactor * countFactor * baseOutFactor, 0.2, 3.0).toFixed(3));
}

function calculateHeuristicSuccessDelta(req, li) {
  let successPerLi = HEURISTIC_SUCCESS_PER_LI;
  if (req.inning >= 8 && Math.abs(req.scoreDiffBattingTeam) <= 1) successPerLi += HEURISTIC_LATE_CLOSE_PER_LI_BOOST;
  if (req.runnersOnBase > 0) successPerLi += HEURISTIC_RUNNER_PRESSURE_PER_LI_BOOST;
  if (req.balls >= 2 || req.strikes >= 2) successPerLi += HEURISTIC_COUNT_PRESSURE_PER_LI_BOOST;
  return Number((successPerLi * li).toFixed(4));
}

function incrementBallCount(balls, strikes) {
  if (balls >= 3) return null;
  return `${balls + 1}-${strikes}`;
}

function incrementStrikeCount(balls, strikes) {
  if (strikes >= 2) return null;
  return `${balls}-${strikes + 1}`;
}

function calculateSuccessWinDelta(req, winRows) {
  const heldCountKey =
    req.calledPitch === "called_strike" ? incrementStrikeCount(req.balls, req.strikes) : incrementBallCount(req.balls, req.strikes);
  const correctedCountKey =
    req.calledPitch === "called_strike" ? incrementBallCount(req.balls, req.strikes) : incrementStrikeCount(req.balls, req.strikes);
  if (!heldCountKey || !correctedCountKey) return null;
  const scoreDiffBattingTeam = req.scoreDiffBattingTeam;
  const homeScore = req.halfInning === "Top"
    ? scoreDiffBattingTeam >= 0 ? 0 : Math.abs(scoreDiffBattingTeam)
    : (scoreDiffBattingTeam >= 0 ? 0 : Math.abs(scoreDiffBattingTeam)) + scoreDiffBattingTeam;
  const awayScore = req.halfInning === "Top"
    ? homeScore + scoreDiffBattingTeam
    : scoreDiffBattingTeam >= 0 ? 0 : Math.abs(scoreDiffBattingTeam);
  const basesState = `${req.runnersOnBase >= 1 ? "1" : "0"}${req.runnersOnBase >= 2 ? "1" : "0"}${req.runnersOnBase >= 3 ? "1" : "0"}`;
  return getWinExpectancyCountSwing(
    {
      inning: req.inning,
      halfInning: req.halfInning,
      outs: req.outs,
      basesState,
      homeScore,
      awayScore,
    },
    heldCountKey,
    correctedCountKey,
    winRows,
  );
}

function resolveOverturnProbabilityWithFallback(input, rows) {
  const direction = input.calledPitch === "called_strike" ? "strike_to_ball" : "ball_to_strike";
  const edgeBucket = getEdgeBucketForChallenge(input);
  const lookups = [
    { tier: "exact", direction, edgeBucket: edgeBucket ?? null },
    { tier: "direction_only", direction, edgeBucket: null },
    { tier: "global", direction: null, edgeBucket: null },
  ];
  for (const lookup of lookups) {
    const match = rows.find(
      (row) =>
        row.fallbackTier === lookup.tier &&
        row.challengeDirection === lookup.direction &&
        row.edgeBucket === lookup.edgeBucket,
    );
    if (match) return match;
  }
  return null;
}

function summarizeBy(rows, keyFn) {
  const groups = new Map();
  for (const row of rows) {
    const key = keyFn(row);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  }
  return [...groups.entries()].map(([key, grouped]) => ({
    key,
    rows: grouped.length,
    share: grouped.length / rows.length,
    meanScore: mean(grouped.map((row) => row.controversyScore)),
    meanModeledValueScore: mean(grouped.map((row) => row.modeledValueScore)),
    meanLeverageScore: mean(grouped.map((row) => row.leverageScore)),
  }));
}

function buildMarkdown(report) {
  return `# Controversy Audit

Date: ${formatAuditDateLabel()}

## Scope

- Comparison layer: spring ABS challenge moments and their modeled / realized value context
- Internal layer: controversy scoring in \`rubrics.ts\`
- Sample: final spring-training ABS challenges from ${SPRING_START} through ${AUDIT_END}

## Overview

- Challenges scored: ${report.overall.rows}
- Top-decile controversy threshold: ${formatMaybeNumber(report.overall.topDecileThreshold, 2)}
- Overturned share overall: ${formatPct(report.overall.overturnedShare)}
- Overturned share in top decile: ${formatPct(report.overall.topDecileOverturnedShare)}
- Direct-impact share in top decile: ${formatPct(report.overall.topDecileDirectImpactShare)}
- Mean controversy score overall: ${formatMaybeNumber(report.overall.meanScore, 2)}
- Mean controversy score top decile: ${formatMaybeNumber(report.overall.topDecileMeanScore, 2)}

## Key Findings

- The controversy layer is healthy if top-ranked moments are being driven by overturned, late/close, direct-impact, and meaningful modeled-value spots rather than random noise.
- This audit is not asking whether every top controversy moment is overturned; it is asking whether the score is surfacing the right types of moments for the right reasons.
- The most important pressure point is whether modeled value is actually contributing, instead of leverage and overturn status swamping everything.

## By Overturn Status

${toMarkdownTable(report.byOverturnStatus, [
    { label: "Status", render: (row) => row.key },
    { label: "Rows", render: (row) => row.rows },
    { label: "Share", render: (row) => `${(row.share * 100).toFixed(1)}%` },
    { label: "Mean Score", render: (row) => formatMaybeNumber(row.meanScore, 2) },
    { label: "Mean Leverage Score", render: (row) => formatMaybeNumber(row.meanLeverageScore, 2) },
    { label: "Mean Modeled Value Score", render: (row) => formatMaybeNumber(row.meanModeledValueScore, 2) },
  ])}

## By Impact Type

${toMarkdownTable(report.byImpactType, [
    { label: "Impact Type", render: (row) => row.key },
    { label: "Rows", render: (row) => row.rows },
    { label: "Mean Score", render: (row) => formatMaybeNumber(row.meanScore, 2) },
    { label: "Mean Leverage Score", render: (row) => formatMaybeNumber(row.meanLeverageScore, 2) },
    { label: "Mean Modeled Value Score", render: (row) => formatMaybeNumber(row.meanModeledValueScore, 2) },
  ])}

## Top Moments

${toMarkdownTable(report.topMoments, [
    { label: "Game", render: (row) => row.gamePk },
    { label: "Challenge", render: (row) => row.challengeId.slice(0, 8) },
    { label: "Score", render: (row) => formatMaybeNumber(row.controversyScore, 2) },
    { label: "Overturned", render: (row) => row.isOverturned ? "Yes" : "No" },
    { label: "Impact", render: (row) => row.impactType ?? "unknown" },
    { label: "Realized Value", render: (row) => formatPct(row.realizedChallengeValue, 2) },
    { label: "Expected Value", render: (row) => formatPct(row.expectedChallengeValue, 2) },
  ])}

## Root-Cause Readout

- Top-decile late/extra inning share: ${formatPct(report.rootCause.topDecileLateShare)}
- Top-decile tied/one-run share: ${formatPct(report.rootCause.topDecileCloseShare)}
- Top-decile WE-backed share: ${formatPct(report.rootCause.topDecileWeBackedShare)}
- Top-decile modeled value \`>= 0.5%\` share: ${formatPct(report.rootCause.topDecileValueShare)}
- Confirmed-call share in top decile: ${formatPct(report.rootCause.topDecileConfirmedShare)}

## Notes

- This audit intentionally uses the same controversy formula as the product layer.
- The key analyst question is whether the surfaced controversy board tells a baseball-sensible story, not whether controversy equals pure leverage or pure value.
`;
}

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
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
      await client.query(`
        SELECT fallback_tier, challenge_direction, edge_bucket, overturn_probability
        FROM mart_historical_abs_overturn_probability_fallbacks
      `)
    ).rows.map((row) => ({
      fallbackTier: row.fallback_tier,
      challengeDirection: row.challenge_direction,
      edgeBucket: row.edge_bucket,
      overturnProbability: Number(row.overturn_probability ?? 0.5),
    }));

    const challenges = (
      await client.query(
        `
        SELECT DISTINCT ON (c.challenge_id)
          c.challenge_id,
          c.game_pk,
          c.challenged_at,
          c.inning,
          c.half_inning,
          c.home_score,
          c.away_score,
          c.outs,
          c.bases_state,
          COALESCE(p.balls_before, c.balls) AS balls_before,
          COALESCE(p.strikes_before, c.strikes) AS strikes_before,
          COALESCE(p.called_description, c.called_description) AS called_description,
          c.is_overturned,
          timeline.impact_type,
          COALESCE(c.px, c.inferred_px) AS px,
          COALESCE(c.pz, c.inferred_pz) AS pz,
          resolve_abs_strike_zone_top(c.batter_id, c.strike_zone_top, c.inferred_strike_zone_top) AS strike_zone_top,
          resolve_abs_strike_zone_bottom(c.batter_id, c.strike_zone_bottom, c.inferred_strike_zone_bottom) AS strike_zone_bottom
        FROM abs_challenges c
        JOIN games g ON g.game_pk = c.game_pk
        LEFT JOIN pitches p
          ON p.game_pk = c.game_pk
         AND p.at_bat_index = c.at_bat_index
         AND p.pitch_number = COALESCE(c.pitch_number, c.inferred_pitch_number)
        LEFT JOIN mart_game_pitch_timeline timeline
          ON timeline.challenge_id = c.challenge_id
        WHERE g.status_detailed = 'Final'
          AND g.game_date BETWEEN $1::date AND $2::date
          AND c.challenge_team_id IS NOT NULL
        ORDER BY c.challenge_id, c.challenged_at ASC NULLS LAST
        `,
        [SPRING_START, AUDIT_END],
      )
    ).rows;

    const total = Math.max(1, challenges.length - 1);
    const scoredRows = challenges.map((row, index) => {
      const calledPitch = getCalledPitch(row.called_description);
      const balls = row.balls_before === null ? null : Number(row.balls_before);
      const strikes = row.strikes_before === null ? null : Number(row.strikes_before);
      const scoreDiffBattingTeam =
        String(row.half_inning).toLowerCase() === "top"
          ? Number(row.away_score) - Number(row.home_score)
          : Number(row.home_score) - Number(row.away_score);
      const runnersOnBase = countRunnersOnBase(row.bases_state);
      const px = row.px === null ? null : Number(row.px);
      const pz = row.pz === null ? null : Number(row.pz);
      const strikeZoneTop = row.strike_zone_top === null ? null : Number(row.strike_zone_top);
      const strikeZoneBottom = row.strike_zone_bottom === null ? null : Number(row.strike_zone_bottom);
      const missDistance = computeDirectionalZoneDistance({
        calledPitch,
        px,
        pz,
        strikeZoneTop,
        strikeZoneBottom,
      });

      let expectedChallengeValue = null;
      let realizedChallengeValue = null;
      let decisionValueMode = null;
      if (calledPitch && balls !== null && strikes !== null) {
        const li = leverageApprox({
          inning: Number(row.inning),
          balls,
          strikes,
          scoreDiffBattingTeam,
          runnersOnBase,
        });
        const winDelta = calculateSuccessWinDelta(
          {
            inning: Number(row.inning),
            halfInning: String(row.half_inning).toLowerCase() === "bottom" ? "Bottom" : "Top",
            balls,
            strikes,
            outs: Number(row.outs ?? 0),
            scoreDiffBattingTeam,
            runnersOnBase,
            calledPitch,
          },
          winRows,
        );
        const successDelta = winDelta?.swing ?? calculateHeuristicSuccessDelta({
          inning: Number(row.inning),
          balls,
          strikes,
          scoreDiffBattingTeam,
          runnersOnBase,
        }, li);
        const failDelta = Number((-HEURISTIC_FAILURE_COST_PER_LI * li).toFixed(4));
        const overturn = resolveOverturnProbabilityWithFallback(
          { calledPitch, edgeDistance: missDistance, px, pz, strikeZoneTop, strikeZoneBottom },
          overturnRows,
        );
        expectedChallengeValue =
          (overturn?.overturnProbability ?? 0.5) * successDelta +
          (1 - (overturn?.overturnProbability ?? 0.5)) * failDelta;
        realizedChallengeValue = row.is_overturned ? successDelta : failDelta;
        decisionValueMode = winDelta ? "win_expectancy" : "heuristic";
      }

      const scored = scoreControversyMoment({
        inning: Number(row.inning),
        homeScore: Number(row.home_score),
        awayScore: Number(row.away_score),
        outs: Number(row.outs ?? 0),
        basesState: row.bases_state,
        balls,
        strikes,
        isOverturned: row.is_overturned,
        impactType: row.impact_type ?? null,
        missDistance,
        slateProgress: 1 - index / total,
        realizedChallengeValue,
        expectedChallengeValue,
        decisionValueMode,
      });

      return {
        challengeId: row.challenge_id,
        gamePk: Number(row.game_pk),
        inning: Number(row.inning),
        homeScore: Number(row.home_score),
        awayScore: Number(row.away_score),
        isOverturned: row.is_overturned,
        impactType: row.impact_type ?? null,
        decisionValueMode,
        controversyScore: scored.score,
        leverageScore: scored.leverageScore,
        modeledValueScore: scored.modeledValueScore,
        realizedChallengeValue,
        expectedChallengeValue,
      };
    }).sort((a, b) => b.controversyScore - a.controversyScore);

    const topDecileThreshold = percentile(scoredRows.map((row) => row.controversyScore), 0.9);
    const topDecileRows = scoredRows.filter((row) => row.controversyScore >= topDecileThreshold);

    const report = {
      auditDate: AUDIT_DATE,
      springWindow: { start: SPRING_START, end: AUDIT_END },
      overall: {
        rows: scoredRows.length,
        topDecileThreshold,
        overturnedShare: scoredRows.filter((row) => row.isOverturned).length / scoredRows.length,
        topDecileOverturnedShare: topDecileRows.filter((row) => row.isOverturned).length / topDecileRows.length,
        topDecileDirectImpactShare:
          topDecileRows.filter((row) => row.impactType === "direct_ending_impact").length / topDecileRows.length,
        meanScore: mean(scoredRows.map((row) => row.controversyScore)),
        topDecileMeanScore: mean(topDecileRows.map((row) => row.controversyScore)),
      },
      byOverturnStatus: summarizeBy(scoredRows, (row) => row.isOverturned ? "overturned" : "confirmed"),
      byImpactType: summarizeBy(scoredRows, (row) => row.impactType ?? "unknown"),
      topMoments: scoredRows.slice(0, 12),
      rootCause: {
        topDecileLateShare:
          topDecileRows.filter((row) => row.inning >= 7).length / topDecileRows.length,
        topDecileCloseShare:
          topDecileRows.filter((row) => Math.abs(row.homeScore - row.awayScore) <= 1).length / topDecileRows.length,
        topDecileWeBackedShare:
          topDecileRows.filter((row) => row.decisionValueMode === "win_expectancy").length / topDecileRows.length,
        topDecileValueShare:
          topDecileRows.filter((row) => Math.abs(row.realizedChallengeValue ?? row.expectedChallengeValue ?? 0) >= 0.005).length /
          topDecileRows.length,
        topDecileConfirmedShare:
          topDecileRows.filter((row) => !row.isOverturned).length / topDecileRows.length,
      },
    };

    fs.writeFileSync(ARTIFACT_PATH, `${JSON.stringify(report, null, 2)}\n`);
    fs.writeFileSync(DOC_PATH, buildMarkdown(report));
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
