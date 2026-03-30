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
  getChallengeDirection,
  getEdgeBucketForChallenge,
  getWinExpectancyCountSwing,
  loadEnvFile,
  mean,
  percentile,
  toMarkdownTable,
} from "./shared-audit-utils.mjs";

const DOC_PATH = path.join(ROOT, `docs/models/audits/${AUDIT_DATE}-decision-value-audit.md`);
const ARTIFACT_PATH = path.join(
  ROOT,
  `docs/models/audits/artifacts/${AUDIT_DATE}-decision-value-audit.json`,
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

function leverageApprox(req) {
  const inningFactor = clamp(req.inning / 9, 0.1, 1.7);
  const closeGameFactor = clamp(1.5 - Math.abs(req.scoreDiffBattingTeam) * 0.15, 0.3, 1.5);
  const countFactor = req.balls === 3 && req.strikes === 2 ? 1.2 : req.strikes === 2 ? 1.1 : 1.0;
  const baseOutFactor = req.runnersOnBase > 0 ? 1 + req.runnersOnBase * 0.12 : 0.95;
  return Number(clamp(inningFactor * closeGameFactor * countFactor * baseOutFactor, 0.2, 3.0).toFixed(3));
}

function calculateHeuristicSuccessDelta(req, li) {
  let successPerLi = HEURISTIC_SUCCESS_PER_LI;
  if (req.inning >= 8 && Math.abs(req.scoreDiffBattingTeam) <= 1) {
    successPerLi += HEURISTIC_LATE_CLOSE_PER_LI_BOOST;
  }
  if (req.runnersOnBase > 0) {
    successPerLi += HEURISTIC_RUNNER_PRESSURE_PER_LI_BOOST;
  }
  if (req.balls >= 2 || req.strikes >= 2) {
    successPerLi += HEURISTIC_COUNT_PRESSURE_PER_LI_BOOST;
  }
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

function synthesizeScores(scoreDiffBattingTeam, halfInning) {
  if (halfInning === "Top") {
    const homeScore = scoreDiffBattingTeam >= 0 ? 0 : Math.abs(scoreDiffBattingTeam);
    const awayScore = homeScore + scoreDiffBattingTeam;
    return { homeScore, awayScore };
  }
  const awayScore = scoreDiffBattingTeam >= 0 ? 0 : Math.abs(scoreDiffBattingTeam);
  const homeScore = awayScore + scoreDiffBattingTeam;
  return { homeScore, awayScore };
}

function resolveOverturnProbabilityWithFallback(input, rows) {
  const challengeDirection = getChallengeDirection(input.calledPitch);
  const resolvedEdgeBucket = getEdgeBucketForChallenge(input);
  const lookups = [
    { tier: "exact", challengeDirection, edgeBucket: resolvedEdgeBucket ?? null },
    { tier: "direction_only", challengeDirection, edgeBucket: null },
    { tier: "global", challengeDirection: null, edgeBucket: null },
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
  const { homeScore, awayScore } = synthesizeScores(req.scoreDiffBattingTeam, req.halfInning);
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
    avgExpected: mean(grouped.map((row) => row.expectedWpDelta)),
    avgRealized: mean(grouped.map((row) => row.realizedWpDelta)),
    avgSignedGap: mean(grouped.map((row) => row.realizedWpDelta - row.expectedWpDelta)),
    positiveRealizedShare:
      grouped.filter((row) => row.realizedWpDelta > 0).length / grouped.length,
  }));
}

function buildMarkdown(report) {
  return `# Decision Value Audit

Date: ${formatAuditDateLabel()}

## Scope

- Comparison layer: realized challenge value on spring ABS reviews
- Internal layer: AiBS decision-value model in \`challenge-decision-value.ts\`
- Sample: final spring-training ABS challenges from ${SPRING_START} through ${AUDIT_END}

## Overview

- Challenges benchmarked: ${report.overall.rows}
- Mean expected WP delta: ${formatPct(report.overall.meanExpected, 2)}
- Mean realized WP delta: ${formatPct(report.overall.meanRealized, 2)}
- Mean signed gap (realized - expected): ${formatSignedPctPoint(report.overall.meanSignedGap)}
- Mean absolute gap: ${formatPct(report.overall.meanAbsGap, 2)}
- Positive-sign agreement: ${formatPct(report.overall.positiveSignAgreement)}
- Recommendation share (\`challenge\` with 1 challenge remaining): ${formatPct(report.overall.challengeRecommendationShare)}

## Key Findings

- Decision value is behaving sensibly if recommended spots realize better average WP value than hold spots.
- This audit is not testing whether historical teams made perfect choices; it is testing whether the current composite model distinguishes stronger from weaker challenge spots.
- The most important readout is whether expected value rank-order aligns with realized value direction across fallback tiers and modes.

## By Recommendation

${toMarkdownTable(report.byRecommendation, [
    { label: "Recommendation", render: (row) => row.key },
    { label: "Rows", render: (row) => row.rows },
    { label: "Avg Expected", render: (row) => formatPct(row.avgExpected, 2) },
    { label: "Avg Realized", render: (row) => formatPct(row.avgRealized, 2) },
    { label: "Gap", render: (row) => formatSignedPctPoint(row.avgSignedGap) },
    { label: "Positive Realized Share", render: (row) => formatPct(row.positiveRealizedShare) },
  ])}

## By Decision Mode

${toMarkdownTable(report.byDecisionMode, [
    { label: "Mode", render: (row) => row.key },
    { label: "Rows", render: (row) => row.rows },
    { label: "Avg Expected", render: (row) => formatPct(row.avgExpected, 2) },
    { label: "Avg Realized", render: (row) => formatPct(row.avgRealized, 2) },
    { label: "Gap", render: (row) => formatSignedPctPoint(row.avgSignedGap) },
  ])}

## By Overturn Fallback Tier

${toMarkdownTable(report.byFallbackTier, [
    { label: "Tier", render: (row) => row.key },
    { label: "Rows", render: (row) => row.rows },
    { label: "Avg Expected", render: (row) => formatPct(row.avgExpected, 2) },
    { label: "Avg Realized", render: (row) => formatPct(row.avgRealized, 2) },
    { label: "Gap", render: (row) => formatSignedPctPoint(row.avgSignedGap) },
  ])}

## Largest Overestimates

${toMarkdownTable(report.topOverestimates, [
    { label: "Game", render: (row) => row.gamePk },
    { label: "Challenge", render: (row) => row.challengeId.slice(0, 8) },
    { label: "Mode", render: (row) => row.decisionValueMode },
    { label: "Tier", render: (row) => row.overturnProbabilityFallbackTier ?? "—" },
    { label: "Expected", render: (row) => formatPct(row.expectedWpDelta, 2) },
    { label: "Realized", render: (row) => formatPct(row.realizedWpDelta, 2) },
    { label: "Gap", render: (row) => formatSignedPctPoint(row.realizedWpDelta - row.expectedWpDelta) },
  ])}

## Largest Underestimates

${toMarkdownTable(report.topUnderestimates, [
    { label: "Game", render: (row) => row.gamePk },
    { label: "Challenge", render: (row) => row.challengeId.slice(0, 8) },
    { label: "Mode", render: (row) => row.decisionValueMode },
    { label: "Tier", render: (row) => row.overturnProbabilityFallbackTier ?? "—" },
    { label: "Expected", render: (row) => formatPct(row.expectedWpDelta, 2) },
    { label: "Realized", render: (row) => formatPct(row.realizedWpDelta, 2) },
    { label: "Gap", render: (row) => formatSignedPctPoint(row.realizedWpDelta - row.expectedWpDelta) },
  ])}

## Root-Cause Readout

- WE-backed decision rows: ${report.rootCause.weBackedRows}
- Heuristic-mode decision rows: ${report.rootCause.heuristicRows}
- Positive expected but negative realized: ${report.rootCause.positiveExpectedNegativeRealized}
- Negative expected but positive realized: ${report.rootCause.negativeExpectedPositiveRealized}
- Avg realized WP delta for recommended challenges: ${formatPct(report.rootCause.recommendedRealizedMean, 2)}
- Avg realized WP delta for hold-labeled challenges: ${formatPct(report.rootCause.holdRealizedMean, 2)}

## Notes

- The recommendation split uses the same one-challenge-remaining threshold as the live product.
- This is an internal composite audit, not an MLB external benchmark.
- The key analyst question is whether the model meaningfully separates stronger from weaker historical challenge spots, not whether it perfectly matches every single realized outcome.
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
        SELECT
          fallback_tier,
          challenge_direction,
          edge_bucket,
          sample_size,
          overturn_probability,
          confidence_band
        FROM mart_historical_abs_overturn_probability_fallbacks
      `)
    ).rows.map((row) => ({
      fallbackTier: row.fallback_tier,
      challengeDirection: row.challenge_direction,
      edgeBucket: row.edge_bucket,
      sampleSize: Number(row.sample_size ?? 0),
      overturnProbability: Number(row.overturn_probability ?? 0.5),
      confidenceBand: row.confidence_band,
    }));

    const challenges = (
      await client.query(
        `
        SELECT
          c.challenge_id,
          c.game_pk,
          c.inning,
          c.half_inning,
          c.outs,
          c.bases_state,
          c.home_score,
          c.away_score,
          COALESCE(p.balls_before, c.balls) AS balls_before,
          COALESCE(p.strikes_before, c.strikes) AS strikes_before,
          COALESCE(p.called_description, c.called_description) AS called_description,
          c.is_overturned,
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
        WHERE g.status_detailed = 'Final'
          AND g.game_date BETWEEN $1::date AND $2::date
          AND c.challenge_team_id IS NOT NULL
        ORDER BY c.game_pk, c.challenge_id
        `,
        [SPRING_START, AUDIT_END],
      )
    ).rows;

    const benchmarkRows = [];
    for (const row of challenges) {
      const calledPitch = getCalledPitch(row.called_description);
      const balls = row.balls_before === null ? null : Number(row.balls_before);
      const strikes = row.strikes_before === null ? null : Number(row.strikes_before);
      if (!calledPitch || balls === null || strikes === null) continue;

      const scoreDiffBattingTeam =
        String(row.half_inning).toLowerCase() === "top"
          ? Number(row.away_score) - Number(row.home_score)
          : Number(row.home_score) - Number(row.away_score);
      const runnersOnBase = countRunnersOnBase(row.bases_state);
      const px = row.px === null ? null : Number(row.px);
      const pz = row.pz === null ? null : Number(row.pz);
      const strikeZoneTop = row.strike_zone_top === null ? null : Number(row.strike_zone_top);
      const strikeZoneBottom = row.strike_zone_bottom === null ? null : Number(row.strike_zone_bottom);
      const edgeDistance = computeDirectionalZoneDistance({
        calledPitch,
        px,
        pz,
        strikeZoneTop,
        strikeZoneBottom,
      });
      const overturn = resolveOverturnProbabilityWithFallback(
        {
          calledPitch,
          edgeDistance,
          px,
          pz,
          strikeZoneTop,
          strikeZoneBottom,
        },
        overturnRows,
      );

      const li = leverageApprox({
        inning: Number(row.inning),
        balls,
        strikes,
        outs: Number(row.outs ?? 0),
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
      const failureCost = Number((-HEURISTIC_FAILURE_COST_PER_LI * li).toFixed(4));
      const expectedWpDelta =
        (overturn?.overturnProbability ?? 0.5) * successDelta +
        (1 - (overturn?.overturnProbability ?? 0.5)) * failureCost;
      const realizedWpDelta = row.is_overturned ? successDelta : failureCost;
      const recommendation = expectedWpDelta > 0.0015 ? "challenge" : "hold";

      benchmarkRows.push({
        challengeId: row.challenge_id,
        gamePk: Number(row.game_pk),
        decisionValueMode: winDelta ? "win_expectancy" : "heuristic",
        overturnProbabilityFallbackTier: overturn?.fallbackTier ?? null,
        expectedWpDelta: Number(expectedWpDelta.toFixed(4)),
        realizedWpDelta: Number(realizedWpDelta.toFixed(4)),
        recommendation,
      });
    }

    const overall = {
      rows: benchmarkRows.length,
      meanExpected: mean(benchmarkRows.map((row) => row.expectedWpDelta)),
      meanRealized: mean(benchmarkRows.map((row) => row.realizedWpDelta)),
      meanSignedGap: mean(benchmarkRows.map((row) => row.realizedWpDelta - row.expectedWpDelta)),
      meanAbsGap: mean(benchmarkRows.map((row) => Math.abs(row.realizedWpDelta - row.expectedWpDelta))),
      positiveSignAgreement:
        benchmarkRows.filter((row) => (row.expectedWpDelta > 0) === (row.realizedWpDelta > 0)).length /
        benchmarkRows.length,
      challengeRecommendationShare:
        benchmarkRows.filter((row) => row.recommendation === "challenge").length / benchmarkRows.length,
    };

    const byRecommendation = summarizeBy(benchmarkRows, (row) => row.recommendation);
    const byDecisionMode = summarizeBy(benchmarkRows, (row) => row.decisionValueMode);
    const byFallbackTier = summarizeBy(benchmarkRows, (row) => row.overturnProbabilityFallbackTier ?? "unknown");
    const topOverestimates = [...benchmarkRows]
      .sort((a, b) => (a.realizedWpDelta - a.expectedWpDelta) - (b.realizedWpDelta - b.expectedWpDelta))
      .slice(0, 10);
    const topUnderestimates = [...benchmarkRows]
      .sort((a, b) => (b.realizedWpDelta - b.expectedWpDelta) - (a.realizedWpDelta - a.expectedWpDelta))
      .slice(0, 10);

    const report = {
      auditDate: AUDIT_DATE,
      springWindow: { start: SPRING_START, end: AUDIT_END },
      overall,
      byRecommendation,
      byDecisionMode,
      byFallbackTier,
      topOverestimates,
      topUnderestimates,
      rootCause: {
        weBackedRows: benchmarkRows.filter((row) => row.decisionValueMode === "win_expectancy").length,
        heuristicRows: benchmarkRows.filter((row) => row.decisionValueMode === "heuristic").length,
        positiveExpectedNegativeRealized: benchmarkRows.filter(
          (row) => row.expectedWpDelta > 0 && row.realizedWpDelta <= 0,
        ).length,
        negativeExpectedPositiveRealized: benchmarkRows.filter(
          (row) => row.expectedWpDelta <= 0 && row.realizedWpDelta > 0,
        ).length,
        recommendedRealizedMean: mean(
          benchmarkRows.filter((row) => row.recommendation === "challenge").map((row) => row.realizedWpDelta),
        ),
        holdRealizedMean: mean(
          benchmarkRows.filter((row) => row.recommendation === "hold").map((row) => row.realizedWpDelta),
        ),
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
