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

const DOC_PATH = path.join(ROOT, `docs/models/audits/${AUDIT_DATE}-leverage-audit.md`);
const ARTIFACT_PATH = path.join(
  ROOT,
  `docs/models/audits/artifacts/${AUDIT_DATE}-leverage-audit.json`,
);
const MIN_EXACT_WIN_EXPECTANCY_SAMPLE_SIZE = 20;
const WIN_EXPECTANCY_LOW_CONFIDENCE_BLEND_PRIOR_WEIGHT = 100;

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

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
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

function pearsonCorrelation(xs, ys) {
  if (!xs.length || xs.length !== ys.length) return null;
  const meanX = mean(xs);
  const meanY = mean(ys);
  if (meanX === null || meanY === null) return null;
  let numerator = 0;
  let denomX = 0;
  let denomY = 0;
  for (let i = 0; i < xs.length; i += 1) {
    const dx = xs[i] - meanX;
    const dy = ys[i] - meanY;
    numerator += dx * dy;
    denomX += dx * dx;
    denomY += dy * dy;
  }
  if (denomX === 0 || denomY === 0) return null;
  return numerator / Math.sqrt(denomX * denomY);
}

function formatPct(value, digits = 1) {
  return `${(value * 100).toFixed(digits)}%`;
}

function formatSignedPctPoint(value) {
  return `${value >= 0 ? "+" : ""}${(value * 100).toFixed(2)} pts`;
}

function formatMaybeNumber(value, digits = 1) {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return Number(value).toFixed(digits);
}

function normalizeHalfInning(value) {
  if (!value) return null;
  const normalized = String(value).toLowerCase();
  if (normalized === "top") return "Top";
  if (normalized === "bottom") return "Bottom";
  return value;
}

function scoreDiffBucket(halfInning, homeScore, awayScore) {
  if (homeScore === null || homeScore === undefined || awayScore === null || awayScore === undefined) {
    return null;
  }
  const normalizedHalf = normalizeHalfInning(halfInning);
  const battingTeamDiff = normalizedHalf === "Top" ? awayScore - homeScore : homeScore - awayScore;
  if (battingTeamDiff <= -4) return "trail4plus";
  if (battingTeamDiff === -3) return "trail3";
  if (battingTeamDiff === -2) return "trail2";
  if (battingTeamDiff === -1) return "trail1";
  if (battingTeamDiff === 0) return "tied";
  if (battingTeamDiff === 1) return "lead1";
  if (battingTeamDiff === 2) return "lead2";
  if (battingTeamDiff === 3) return "lead3";
  return "lead4plus";
}

function inningBucket(inning) {
  if (inning >= 9) return "9+";
  if (inning >= 7) return "7-8";
  if (inning >= 4) return "4-6";
  return "1-3";
}

function buildCanonicalPitchState(state) {
  return {
    inning: state.inning ?? null,
    inningBucket: state.inning == null ? null : inningBucket(state.inning),
    halfInning: normalizeHalfInning(state.halfInning),
    scoreDiffBucket: scoreDiffBucket(state.halfInning, state.homeScore, state.awayScore),
    outs: state.outs ?? null,
    basesState: state.basesState ?? null,
  };
}

function countKey(balls, strikes) {
  if (balls === null || balls === undefined || strikes === null || strikes === undefined) return null;
  return `${balls}-${strikes}`;
}

function incrementBallCount(balls, strikes) {
  if (balls >= 3) return null;
  return countKey(balls + 1, strikes);
}

function incrementStrikeCount(balls, strikes) {
  if (strikes >= 2) return null;
  return countKey(balls, strikes + 1);
}

function getCalledPitch(calledDescription) {
  const normalized = String(calledDescription ?? "").toUpperCase();
  if (normalized.startsWith("CALLED STRIKE")) return "called_strike";
  if (normalized.startsWith("BALL")) return "ball";
  return null;
}

function countRunnersOnBase(basesState) {
  if (!basesState) return 0;
  const normalized = String(basesState).toLowerCase();
  if (/^[01]{3}$/.test(normalized)) {
    return normalized.split("").reduce((count, value) => count + (value === "1" ? 1 : 0), 0);
  }
  if (normalized === "bases loaded") return 3;
  return ["1b", "2b", "3b", "first", "second", "third"].reduce(
    (count, needle) => count + (normalized.includes(needle) ? 1 : 0),
    0,
  );
}

function computeEstimatedLeverageIndex(input) {
  const inning = input.inning ?? 1;
  const scoreDiff =
    input.homeScore === null || input.homeScore === undefined || input.awayScore === null || input.awayScore === undefined
      ? 0
      : Math.abs(input.homeScore - input.awayScore);
  const outs = input.outs ?? 0;
  const runnersOnBase = countRunnersOnBase(input.basesState);
  const balls = input.balls ?? 0;
  const strikes = input.strikes ?? 0;

  const inningScore = inning >= 9 ? 28 : inning >= 7 ? 22 : inning >= 5 ? 14 : 8;
  const scoreScore = scoreDiff === 0 ? 28 : scoreDiff === 1 ? 24 : scoreDiff === 2 ? 18 : scoreDiff === 3 ? 12 : 6;
  const outScore = outs >= 2 ? 14 : outs === 1 ? 9 : 5;
  const baseScore = runnersOnBase >= 3 ? 14 : runnersOnBase === 2 ? 11 : runnersOnBase === 1 ? 8 : 0;
  const countScore = balls === 3 && strikes === 2 ? 16 : strikes >= 2 ? 12 : balls >= 3 ? 10 : 5;

  return Math.max(0, Math.min(100, inningScore + scoreScore + outScore + baseScore + countScore));
}

function getEstimatedLeverageBucket(index) {
  if (index >= 65) return "high";
  if (index >= 40) return "medium";
  return "low";
}

function blendLowConfidenceWinExpectancy(exact, bucket) {
  if (!bucket) return exact;
  if (exact.sampleSize <= MIN_EXACT_WIN_EXPECTANCY_SAMPLE_SIZE) return bucket;
  if (exact.confidenceBand !== "low") return exact;
  const exactWeight =
    exact.sampleSize / (exact.sampleSize + WIN_EXPECTANCY_LOW_CONFIDENCE_BLEND_PRIOR_WEIGHT);
  return {
    ...exact,
    battingTeamWinProbability:
      exact.battingTeamWinProbability * exactWeight +
      bucket.battingTeamWinProbability * (1 - exactWeight),
  };
}

function resolveWinExpectancyWithFallback(state, rows) {
  const canonical = buildCanonicalPitchState(state);
  if (
    canonical.inning === null ||
    canonical.inningBucket === null ||
    canonical.halfInning === null ||
    canonical.scoreDiffBucket === null ||
    canonical.outs === null ||
    canonical.basesState === null
  ) {
    return null;
  }

  const findMatch = (tier, inning, inningBucketValue, countKeyValue) =>
    rows.find(
      (row) =>
        row.fallbackTier === tier &&
        row.inning === inning &&
        row.inningBucket === inningBucketValue &&
        row.halfInning === canonical.halfInning &&
        row.scoreDiffBucket === canonical.scoreDiffBucket &&
        row.outs === canonical.outs &&
        row.basesState === canonical.basesState &&
        row.countKey === countKeyValue,
    ) ?? null;

  const exact = findMatch("exact", canonical.inning, null, state.countKey ?? null);
  const bucket = findMatch("drop_inning_to_bucket", null, canonical.inningBucket, state.countKey ?? null);
  if (exact) return blendLowConfidenceWinExpectancy(exact, bucket);
  if (bucket) return bucket;

  const dropCountExact = findMatch("drop_count_key_exact_inning", canonical.inning, null, null);
  const dropCountBucket = findMatch("drop_count_key_bucketed_inning", null, canonical.inningBucket, null);
  if (dropCountExact) return blendLowConfidenceWinExpectancy(dropCountExact, dropCountBucket);
  if (dropCountBucket) return dropCountBucket;
  return null;
}

function getWinExpectancyCountSwing(state, heldCountKey, correctedCountKey, rows) {
  const held = resolveWinExpectancyWithFallback(
    {
      ...state,
      countKey: heldCountKey,
    },
    rows,
  );
  const corrected = resolveWinExpectancyWithFallback(
    {
      ...state,
      countKey: correctedCountKey,
    },
    rows,
  );
  if (!held || !corrected) return null;
  return {
    held,
    corrected,
    swing: Number((corrected.battingTeamWinProbability - held.battingTeamWinProbability).toFixed(4)),
  };
}

function scoreBucketLabel(bucket) {
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

function runnerStateLabel(basesState) {
  const runners = countRunnersOnBase(basesState);
  if (runners === 0) return "Empty";
  if (runners === 1) return "One Runner";
  if (runners === 2) return "Two Runners";
  return "Bases Loaded";
}

function countPressureLabel(balls, strikes) {
  if (balls === 3 && strikes === 2) return "Full Count";
  if (strikes >= 2) return "Two Strikes";
  if (balls >= 3) return "Three Balls";
  return "Early Count";
}

function summarizeRows(rows) {
  const leverage = rows.map((row) => row.estimatedLeverageIndex);
  const wpSwingAbs = rows.map((row) => row.absoluteWinSwing);
  return {
    rows: rows.length,
    meanLeverage: mean(leverage),
    meanAbsWinSwing: mean(wpSwingAbs),
    medianAbsWinSwing: median(wpSwingAbs),
    p90AbsWinSwing: percentile(wpSwingAbs, 0.9),
  };
}

function summarizeByGroup(rows, key) {
  const groups = new Map();
  for (const row of rows) {
    const groupKey = key(row);
    if (!groups.has(groupKey)) groups.set(groupKey, []);
    groups.get(groupKey).push(row);
  }
  return [...groups.entries()]
    .map(([groupKey, groupRows]) => ({
      key: groupKey,
      rows: groupRows.length,
      share: groupRows.length / rows.length,
      meanLeverage: mean(groupRows.map((row) => row.estimatedLeverageIndex)),
      meanAbsWinSwing: mean(groupRows.map((row) => row.absoluteWinSwing)),
      medianAbsWinSwing: median(groupRows.map((row) => row.absoluteWinSwing)),
      topDecileShare:
        groupRows.filter((row) => row.isTopDecileWinSwing).length / groupRows.length,
    }))
    .sort((a, b) => {
      if (b.meanAbsWinSwing !== a.meanAbsWinSwing) return b.meanAbsWinSwing - a.meanAbsWinSwing;
      return String(a.key).localeCompare(String(b.key));
    });
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
  const highBucket = report.byLeverageBucket.find((row) => row.key === "high");
  const mediumBucket = report.byLeverageBucket.find((row) => row.key === "medium");
  const lowBucket = report.byLeverageBucket.find((row) => row.key === "low");
  return `# Leverage Audit

Date: ${formatAuditDateLabel()}

## Scope

- Comparison layer: internal WE count-swing pressure on real spring ABS challenges
- Internal layer: AiBS public leverage heuristic in \`estimated-leverage.ts\`
- Sample: final spring-training ABS challenges from ${SPRING_START} through ${AUDIT_END}

## Overview

- Challenges benchmarked: ${report.overall.rows}
- Mean estimated leverage index: ${formatMaybeNumber(report.overall.meanLeverage, 1)}
- Mean absolute WE swing: ${formatPct(report.overall.meanAbsWinSwing)}
- Median absolute WE swing: ${formatPct(report.overall.medianAbsWinSwing)}
- 90th percentile absolute WE swing: ${formatPct(report.overall.p90AbsWinSwing)}
- Pearson correlation between leverage index and absolute WE swing: ${formatMaybeNumber(report.pearsonCorrelation, 3)}
- Share of top-decile WE swings captured by \`high\` leverage bucket: ${formatPct(report.topDecileCapture.high)}
- Share of \`low\` leverage rows that still land in top-decile WE swing: ${formatPct(report.topDecileLeakage.low)}

## Key Findings

- The leverage model is directionally credible: \`high\` leverage rows average ${formatPct(highBucket?.meanAbsWinSwing ?? null)} absolute WE swing versus ${formatPct(mediumBucket?.meanAbsWinSwing ?? null)} for \`medium\` and ${formatPct(lowBucket?.meanAbsWinSwing ?? null)} for \`low\`.
- The alignment is only moderate rather than tight: leverage index and absolute WE swing correlate at ${formatMaybeNumber(report.pearsonCorrelation, 3)}, so this heuristic is useful for pressure ordering but not a substitute for WE itself.
- The current heuristic is better at separating empty / one-run / runner-pressure states from true low-pressure spots than it is at ranking the very highest-pressure challenge windows.
- This audit only covers WE-backed count swings; terminal count states that fall out of the WE comparison layer are intentionally excluded from this benchmark.

## By Leverage Bucket

${toMarkdownTable(report.byLeverageBucket, [
    { label: "Bucket", render: (row) => row.key },
    { label: "Rows", render: (row) => row.rows },
    { label: "Share", render: (row) => `${(row.share * 100).toFixed(1)}%` },
    { label: "Mean Index", render: (row) => formatMaybeNumber(row.meanLeverage, 1) },
    { label: "Mean Abs WE Swing", render: (row) => formatPct(row.meanAbsWinSwing) },
    { label: "Top-Decile Share", render: (row) => `${(row.topDecileShare * 100).toFixed(1)}%` },
  ])}

## By Inning Bucket

${toMarkdownTable(report.byInningBucket, [
    { label: "Inning Bucket", render: (row) => row.key },
    { label: "Rows", render: (row) => row.rows },
    { label: "Mean Index", render: (row) => formatMaybeNumber(row.meanLeverage, 1) },
    { label: "Mean Abs WE Swing", render: (row) => formatPct(row.meanAbsWinSwing) },
  ])}

## By Score Bucket

${toMarkdownTable(report.byScoreBucket, [
    { label: "Score Bucket", render: (row) => row.key },
    { label: "Rows", render: (row) => row.rows },
    { label: "Mean Index", render: (row) => formatMaybeNumber(row.meanLeverage, 1) },
    { label: "Mean Abs WE Swing", render: (row) => formatPct(row.meanAbsWinSwing) },
  ])}

## By Runner State

${toMarkdownTable(report.byRunnerState, [
    { label: "Runner State", render: (row) => row.key },
    { label: "Rows", render: (row) => row.rows },
    { label: "Mean Index", render: (row) => formatMaybeNumber(row.meanLeverage, 1) },
    { label: "Mean Abs WE Swing", render: (row) => formatPct(row.meanAbsWinSwing) },
  ])}

## Largest Overstatements

${toMarkdownTable(report.topOverstatements, [
    { label: "State", render: (row) => `${row.inningBucket}, ${row.scoreBucketLabel}, ${row.outs} outs, ${row.runnerState}, ${row.countPressure}` },
    { label: "Rows", render: (row) => row.rows },
    { label: "Mean Index", render: (row) => formatMaybeNumber(row.meanLeverage, 1) },
    { label: "Mean Abs WE Swing", render: (row) => formatPct(row.meanAbsWinSwing) },
    { label: "Gap", render: (row) => formatSignedPctPoint(row.signedPressureGap) },
  ])}

## Largest Understatements

${toMarkdownTable(report.topUnderstatements, [
    { label: "State", render: (row) => `${row.inningBucket}, ${row.scoreBucketLabel}, ${row.outs} outs, ${row.runnerState}, ${row.countPressure}` },
    { label: "Rows", render: (row) => row.rows },
    { label: "Mean Index", render: (row) => formatMaybeNumber(row.meanLeverage, 1) },
    { label: "Mean Abs WE Swing", render: (row) => formatPct(row.meanAbsWinSwing) },
    { label: "Gap", render: (row) => formatSignedPctPoint(row.signedPressureGap) },
  ])}

## Root-Cause Readout

- WE-backed rows available: ${report.rootCause.weBackedRows}
- High leverage rows with abs WE swing below overall median: ${report.rootCause.highLeverageBelowMedianRows}
- Low leverage rows with abs WE swing in the top decile: ${report.rootCause.lowLeverageTopDecileRows}
- Full-count share inside top-decile WE swings: ${formatPct(report.rootCause.fullCountShareTopDecile)}
- Two-strike share inside top-decile WE swings: ${formatPct(report.rootCause.twoStrikeShareTopDecile)}
- Tied and one-run share inside top-decile WE swings: ${formatPct(report.rootCause.closeGameShareTopDecile)}

## Notes

- The WE comparison layer uses internal count-swing WE because public MLB win probability is not exposed at pitch-count resolution.
- This audit should be rerun after meaningful data refreshes because leverage usefulness is mainly about ordering pressure correctly as the challenge sample grows.
- The correct analyst question is whether the heuristic pressure score and bucketing are telling the right story, not whether leverage literally equals WE swing.
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

    const challengeRows = (
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
          COALESCE(p.called_description, c.called_description) AS called_description
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
    for (const row of challengeRows) {
      const calledPitch = getCalledPitch(row.called_description);
      const balls = row.balls_before === null ? null : Number(row.balls_before);
      const strikes = row.strikes_before === null ? null : Number(row.strikes_before);
      if (!calledPitch || balls === null || strikes === null) continue;

      const heldCountKey =
        calledPitch === "called_strike" ? incrementStrikeCount(balls, strikes) : incrementBallCount(balls, strikes);
      const correctedCountKey =
        calledPitch === "called_strike" ? incrementBallCount(balls, strikes) : incrementStrikeCount(balls, strikes);
      if (!heldCountKey || !correctedCountKey) continue;

      const swing = getWinExpectancyCountSwing(
        {
          inning: Number(row.inning),
          halfInning: normalizeHalfInning(row.half_inning),
          outs: row.outs === null ? null : Number(row.outs),
          basesState: row.bases_state,
          homeScore: row.home_score === null ? null : Number(row.home_score),
          awayScore: row.away_score === null ? null : Number(row.away_score),
        },
        heldCountKey,
        correctedCountKey,
        winRows,
      );
      if (!swing) continue;

      const estimatedLeverageIndex = computeEstimatedLeverageIndex({
        inning: Number(row.inning),
        balls,
        strikes,
        outs: row.outs === null ? null : Number(row.outs),
        homeScore: row.home_score === null ? null : Number(row.home_score),
        awayScore: row.away_score === null ? null : Number(row.away_score),
        basesState: row.bases_state,
      });
      benchmarkRows.push({
        challengeId: row.challenge_id,
        gamePk: Number(row.game_pk),
        inning: Number(row.inning),
        inningBucket: inningBucket(Number(row.inning)),
        scoreBucket: scoreDiffBucket(normalizeHalfInning(row.half_inning), Number(row.home_score), Number(row.away_score)),
        scoreBucketLabel: scoreBucketLabel(
          scoreDiffBucket(normalizeHalfInning(row.half_inning), Number(row.home_score), Number(row.away_score)),
        ),
        outs: Number(row.outs ?? 0),
        runnerState: runnerStateLabel(row.bases_state),
        countPressure: countPressureLabel(balls, strikes),
        estimatedLeverageIndex,
        leverageBucket: getEstimatedLeverageBucket(estimatedLeverageIndex),
        absoluteWinSwing: Math.abs(swing.swing),
      });
    }

    const topDecileThreshold = percentile(
      benchmarkRows.map((row) => row.absoluteWinSwing),
      0.9,
    );
    for (const row of benchmarkRows) {
      row.isTopDecileWinSwing = row.absoluteWinSwing >= topDecileThreshold;
    }

    const overall = summarizeRows(benchmarkRows);
    const byLeverageBucket = summarizeByGroup(benchmarkRows, (row) => row.leverageBucket)
      .sort((a, b) => ["high", "medium", "low"].indexOf(a.key) - ["high", "medium", "low"].indexOf(b.key));
    const byInningBucket = summarizeByGroup(benchmarkRows, (row) => row.inningBucket)
      .sort((a, b) => ["1-3", "4-6", "7-8", "9+"].indexOf(a.key) - ["1-3", "4-6", "7-8", "9+"].indexOf(b.key));
    const byScoreBucket = summarizeByGroup(benchmarkRows, (row) => row.scoreBucketLabel)
      .sort((a, b) => ["Tied", "One-Run", "Two-Run", "Three-Run", "Four-Plus"].indexOf(a.key) - ["Tied", "One-Run", "Two-Run", "Three-Run", "Four-Plus"].indexOf(b.key));
    const byRunnerState = summarizeByGroup(benchmarkRows, (row) => row.runnerState)
      .sort((a, b) => ["Bases Loaded", "Two Runners", "One Runner", "Empty"].indexOf(a.key) - ["Bases Loaded", "Two Runners", "One Runner", "Empty"].indexOf(b.key));

    const overallMeanLeverage = overall.meanLeverage;
    const overallMeanAbsWinSwing = overall.meanAbsWinSwing;
    const groupedStateRows = summarizeByGroup(
      benchmarkRows,
      (row) => `${row.inningBucket}|${row.scoreBucketLabel}|${row.outs}|${row.runnerState}|${row.countPressure}`,
    )
      .filter((row) => row.rows >= 8)
      .map((row) => ({
        ...row,
        inningBucket: row.key.split("|")[0],
        scoreBucketLabel: row.key.split("|")[1],
        outs: Number(row.key.split("|")[2]),
        runnerState: row.key.split("|")[3],
        countPressure: row.key.split("|")[4],
        signedPressureGap:
          (row.meanLeverage - overallMeanLeverage) / 100 -
          (row.meanAbsWinSwing - overallMeanAbsWinSwing),
      }));

    const topOverstatements = [...groupedStateRows]
      .sort((a, b) => b.signedPressureGap - a.signedPressureGap)
      .slice(0, 8);
    const topUnderstatements = [...groupedStateRows]
      .sort((a, b) => a.signedPressureGap - b.signedPressureGap)
      .slice(0, 8);

    const topDecileRows = benchmarkRows.filter((row) => row.isTopDecileWinSwing);
    const topDecileCapture = {
      high:
        topDecileRows.filter((row) => row.leverageBucket === "high").length / topDecileRows.length,
      medium:
        topDecileRows.filter((row) => row.leverageBucket === "medium").length / topDecileRows.length,
      low: topDecileRows.filter((row) => row.leverageBucket === "low").length / topDecileRows.length,
    };
    const topDecileLeakage = {
      low:
        benchmarkRows.filter((row) => row.leverageBucket === "low" && row.isTopDecileWinSwing).length /
        benchmarkRows.filter((row) => row.leverageBucket === "low").length,
    };

    const report = {
      auditDate: AUDIT_DATE,
      springWindow: { start: SPRING_START, end: AUDIT_END },
      overall,
      pearsonCorrelation: pearsonCorrelation(
        benchmarkRows.map((row) => row.estimatedLeverageIndex),
        benchmarkRows.map((row) => row.absoluteWinSwing),
      ),
      topDecileCapture,
      topDecileLeakage,
      byLeverageBucket,
      byInningBucket,
      byScoreBucket,
      byRunnerState,
      topOverstatements,
      topUnderstatements,
      rootCause: {
        weBackedRows: benchmarkRows.length,
        highLeverageBelowMedianRows: benchmarkRows.filter(
          (row) => row.leverageBucket === "high" && row.absoluteWinSwing < overall.medianAbsWinSwing,
        ).length,
        lowLeverageTopDecileRows: benchmarkRows.filter(
          (row) => row.leverageBucket === "low" && row.isTopDecileWinSwing,
        ).length,
        fullCountShareTopDecile:
          topDecileRows.filter((row) => row.countPressure === "Full Count").length / topDecileRows.length,
        twoStrikeShareTopDecile:
          topDecileRows.filter((row) => row.countPressure === "Two Strikes").length / topDecileRows.length,
        closeGameShareTopDecile:
          topDecileRows.filter((row) => row.scoreBucketLabel === "Tied" || row.scoreBucketLabel === "One-Run").length /
          topDecileRows.length,
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
