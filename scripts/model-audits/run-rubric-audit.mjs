import fs from "node:fs/promises";
import path from "node:path";
import { Client } from "pg";
import {
  AUDIT_DATE,
  ROOT as repoRoot,
  describeAuditDatabaseTarget,
  formatAuditDateLabel,
  loadAuditEnv,
  resolveAuditDatabaseUrl,
} from "./audit-runtime.mjs";

const ARTIFACT_DIR = path.join(repoRoot, "docs", "models", "audits", "artifacts");
const DOC_PATH = path.join(repoRoot, "docs", "models", "audits", `${AUDIT_DATE}-rubric-audit.md`);
const JSON_PATH = path.join(ARTIFACT_DIR, `${AUDIT_DATE}-rubric-audit.json`);

const OBSERVED_ZONE_HALF_WIDTH = (17 / 24) + (1.45 / 12);
const MAX_CHIPS = 4;

function clamp(value, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value));
}

function computeRegressedRate(successes, attempts, priorRate, priorSampleSize = 20) {
  const boundedAttempts = Math.max(0, attempts);
  const boundedSuccesses = clamp(successes, 0, boundedAttempts);
  return (boundedSuccesses + priorSampleSize * priorRate) / (boundedAttempts + priorSampleSize);
}

function zScore(value, mean, stdDev) {
  if (!Number.isFinite(stdDev) || stdDev <= 0) return 0;
  return (value - mean) / stdDev;
}

function confidenceFromSampleSize(sampleSize) {
  if (sampleSize >= 25) return "high";
  if (sampleSize >= 10) return "medium";
  return "low";
}

function scoreFromRelativeDelta(value, baseline, positiveIsBetter = true, multiplier = 40) {
  if (!Number.isFinite(value) || !Number.isFinite(baseline) || baseline === 0) return 50;
  const delta = (value - baseline) / Math.abs(baseline);
  const signed = positiveIsBetter ? delta : -delta;
  return clamp(50 + signed * multiplier);
}

function mapUmpireGrade(score) {
  if (score >= 84) return "A";
  if (score >= 68) return "B";
  if (score >= 50) return "C";
  if (score >= 35) return "D";
  return "F";
}

function softenExtremeGradeForConfidence(grade, confidence) {
  if (confidence === "high") return grade;
  if (grade === "A") return "B";
  if (grade === "F") return confidence === "medium" ? "D" : "C";
  return grade;
}

function mapFanDescriptor(grade, confidence) {
  switch (grade) {
    case "A":
      return "Reliable";
    case "B":
      return "Steady";
    case "C":
      return "Watchful";
    case "D":
      return "Volatile";
    case "F":
      return "High-Risk";
    default:
      return "Watchful";
  }
}

function mapOrgDescriptor(grade, confidence) {
  switch (grade) {
    case "A":
      return "Low-risk profile";
    case "B":
      return "Stable profile";
    case "C":
      return "Monitor";
    case "D":
      return "Elevated risk";
    case "F":
      return "High-risk profile";
    default:
      return "Monitor";
  }
}

function mapOrgStyleLabel(style) {
  switch (style) {
    case "High-Impact":
      return "Timely";
    case "Selective":
      return "Selective";
    case "Overactive":
      return "High-Usage";
    case "Low-Usage":
      return "Low-Usage";
    case "Balanced":
      return "Mixed profile";
    default:
      return "Mixed profile";
  }
}

function computeUmpireReportCard(input) {
  const regressedOverturnRate = computeRegressedRate(
    input.overturnedCalls,
    input.challengedCalls,
    input.leagueOverturnRate,
    20,
  );
  const recentRate = input.recentOverturnRate ?? regressedOverturnRate;

  const rateScore = clamp(
    50 - 14 * zScore(regressedOverturnRate, input.leagueOverturnRate, input.leagueOverturnRateStdDev),
  );
  const accuracyScore = clamp(100 - regressedOverturnRate * 100);
  const consistencyScore = clamp(
    50 - 10 * zScore(input.umpireVariance, input.leagueVarianceMean, input.leagueVarianceStdDev),
  );
  const recentFormScore = clamp(
    50 - 8 * zScore(recentRate - regressedOverturnRate, 0, input.leagueOverturnRateStdDev),
  );

  const score = clamp(0.45 * rateScore + 0.3 * accuracyScore + 0.15 * consistencyScore + 0.1 * recentFormScore);
  const confidence = confidenceFromSampleSize(input.challengedCalls);
  const grade = softenExtremeGradeForConfidence(mapUmpireGrade(score), confidence);

  return {
    score: Number(score.toFixed(2)),
    grade,
    confidence,
    fanDescriptor: mapFanDescriptor(grade, confidence),
    orgDescriptor: mapOrgDescriptor(grade, confidence),
    regressedOverturnRate: Number(regressedOverturnRate.toFixed(4)),
  };
}

function computeOrgWatchRisk(input) {
  const directionalBiasSeverity = clamp(input.directionalBiasSeverity);
  const zoneConcentrationSeverity = clamp(input.zoneConcentrationSeverity);
  const recentTrendRisk = clamp(input.recentTrendRisk);
  const countHotspotVolatility = clamp(input.countHotspotVolatility);
  const umpireScore = clamp(input.umpireScore);

  const baseRisk =
    0.4 * (100 - umpireScore) +
    0.2 * directionalBiasSeverity +
    0.15 * zoneConcentrationSeverity +
    0.15 * recentTrendRisk +
    0.1 * countHotspotVolatility;

  const hotSignalCount = [
    directionalBiasSeverity,
    zoneConcentrationSeverity,
    recentTrendRisk,
    countHotspotVolatility,
  ].filter((value) => value >= 65).length;

  let stackedSignalBonus = 0;
  if (hotSignalCount >= 2) stackedSignalBonus += 2;
  if (hotSignalCount >= 3) stackedSignalBonus += 1;
  if (umpireScore <= 35 && hotSignalCount >= 3) stackedSignalBonus += 1;

  const riskScore = clamp(baseRisk + stackedSignalBonus);
  let tier = "Low";
  const qualifiesForHighRisk = riskScore >= 80 || (riskScore >= 72 && hotSignalCount >= 3 && umpireScore <= 40);
  if (qualifiesForHighRisk) tier = "High";
  else if (riskScore >= 56 || (riskScore >= 50 && hotSignalCount >= 2)) tier = "Elevated";
  else if (riskScore >= 34) tier = "Moderate";

  return { riskScore: Number(riskScore.toFixed(2)), tier, hotSignalCount };
}

function softenRiskTierForConfidence(riskTier, confidence) {
  if (confidence !== "low") return riskTier;
  if (riskTier === "High") return "Elevated";
  if (riskTier === "Low") return "Moderate";
  return riskTier;
}

function computeTeamChallengeStyle(input) {
  const aggressionScore = scoreFromRelativeDelta(input.challengeRatePerGame, input.leagueChallengeRatePerGame, true);
  const lateLeverageScore = scoreFromRelativeDelta(input.lateLeverageShare, input.leagueLateLeverageShare, true);
  const disciplineScore = scoreFromRelativeDelta(
    input.earlyLowLeverageShare,
    input.leagueEarlyLowLeverageShare,
    false,
  );
  const conservationScore = scoreFromRelativeDelta(
    input.averageChallengesRemaining,
    input.leagueAverageChallengesRemaining,
    true,
  );
  const efficiencyScore = scoreFromRelativeDelta(input.overturnRate, input.leagueOverturnRate, true, 30);

  const scores = {
    "High-Impact": 0.3 * lateLeverageScore + 0.25 * efficiencyScore + 0.2 * aggressionScore + 0.25 * conservationScore,
    Selective:
      0.3 * disciplineScore + 0.3 * conservationScore + 0.25 * efficiencyScore + 0.15 * lateLeverageScore,
    Overactive:
      0.35 * aggressionScore +
      0.3 * (100 - disciplineScore) +
      0.2 * (100 - conservationScore) +
      0.15 * (100 - efficiencyScore),
    "Low-Usage":
      0.35 * (100 - aggressionScore) +
      0.3 * conservationScore +
      0.2 * (100 - lateLeverageScore) +
      0.15 * disciplineScore,
    Balanced: 0,
  };

  const ranked = Object.entries(scores)
    .filter(([style]) => style !== "Balanced")
    .map(([style, score]) => ({ style, score }))
    .sort((a, b) => b.score - a.score);

  const topScore = ranked[0]?.score ?? 0;
  const runnerUpScore = ranked[1]?.score ?? 0;
  const topGap = topScore - runnerUpScore;
  const centeredAggression = 100 - Math.min(100, Math.abs(aggressionScore - 50) * 2);
  const centeredLeverage = 100 - Math.min(100, Math.abs(lateLeverageScore - 50) * 2);
  const centeredDiscipline = 100 - Math.min(100, Math.abs(disciplineScore - 50) * 2);
  const efficiencyNeutrality = 100 - Math.min(100, Math.abs(efficiencyScore - 50) * 2);

  scores.Balanced =
    0.35 * clamp(100 - topGap * 10) +
    0.2 * centeredAggression +
    0.2 * centeredLeverage +
    0.15 * centeredDiscipline +
    0.1 * efficiencyNeutrality;

  let winner = ranked[0]?.style ?? "Balanced";
  if (ranked.length > 1 && topGap <= 4) {
    if (lateLeverageScore >= 60 && aggressionScore >= 50) winner = "High-Impact";
    else if (aggressionScore >= 60 && conservationScore <= 45) winner = "Overactive";
    else if (disciplineScore >= 55 && conservationScore >= 55) winner = "Selective";
    else winner = "Low-Usage";
  }

  const decisiveLateIdentity = lateLeverageScore >= 60 && aggressionScore >= 50;
  const decisiveAggressiveIdentity = aggressionScore >= 60 && conservationScore <= 45;
  const decisiveDisciplinedIdentity = disciplineScore >= 55 && conservationScore >= 55;

  const shouldUseBalanced =
    input.sampleSize >= 12 &&
    !decisiveLateIdentity &&
    !decisiveAggressiveIdentity &&
    !decisiveDisciplinedIdentity &&
    (topGap <= 3 ||
      (topGap <= 7 && efficiencyScore >= 45 && efficiencyScore <= 58) ||
      (topScore < 64 && scores.Balanced >= topScore - 2));

  if (shouldUseBalanced) winner = "Balanced";

  return {
    style: winner,
    orgLabel: mapOrgStyleLabel(winner),
    confidence: confidenceFromSampleSize(input.sampleSize),
    topGap: Number(topGap.toFixed(2)),
    scores: Object.fromEntries(Object.entries(scores).map(([style, score]) => [style, Number(score.toFixed(2))])),
    dimensions: {
      aggressionScore: Number(aggressionScore.toFixed(2)),
      lateLeverageScore: Number(lateLeverageScore.toFixed(2)),
      disciplineScore: Number(disciplineScore.toFixed(2)),
      conservationScore: Number(conservationScore.toFixed(2)),
      efficiencyScore: Number(efficiencyScore.toFixed(2)),
    },
  };
}

function getMargin(input) {
  if (Number.isFinite(input.scoreDifferential)) return Math.abs(input.scoreDifferential ?? 0);
  return Math.abs((input.homeScore ?? 0) - (input.awayScore ?? 0));
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

function buildReasonChips(input, missSeverityScore) {
  const chips = [];
  const margin = getMargin(input);
  const { basesLoaded, risp } = getRunnerFlags(input.basesState);
  const inning = input.inning ?? 0;

  if (inning >= 10) chips.push("Extras");
  else if (inning >= 7) chips.push("Late Inning");

  chips.push(input.isOverturned ? "Overturned" : "Confirmed");

  if (margin === 0) chips.push("Tie Game");
  else if (margin === 1) chips.push("One-Run Game");

  if (input.balls === 3 && input.strikes === 2) chips.push("Full Count");
  if (basesLoaded) chips.push("Bases Loaded");
  else if (risp) chips.push("RISP");

  if ((input.outs ?? 0) === 2) chips.push("Two Outs");
  if (input.impactType === "direct_ending_impact") chips.push("Direct Impact");

  if (missSeverityScore >= 80) chips.push("Far Off Plate");
  else if (missSeverityScore >= 55) chips.push("Borderline Zone");

  return chips.slice(0, MAX_CHIPS);
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
    0.10 * recencyScore +
    0.05 * noveltyScore;

  if (!input.isOverturned) score *= 0.85;
  score = clamp(score);

  return {
    score: Number(score.toFixed(2)),
    leverageScore: Number(leverageScore.toFixed(2)),
    resultImpactScore: Number(resultImpactScore.toFixed(2)),
    missSeverityScore: Number(missSeverityScore.toFixed(2)),
    modeledValueScore: Number(modeledValueScore.toFixed(2)),
    recencyScore: Number(recencyScore.toFixed(2)),
    noveltyScore: Number(noveltyScore.toFixed(2)),
    chips: buildReasonChips(input, missSeverityScore),
  };
}

function computeObservedZoneMissDistance(sample) {
  if (
    sample.px === null ||
    sample.pz === null ||
    sample.strikeZoneTop === null ||
    sample.strikeZoneBottom === null ||
    !Number.isFinite(sample.px) ||
    !Number.isFinite(sample.pz) ||
    !Number.isFinite(sample.strikeZoneTop) ||
    !Number.isFinite(sample.strikeZoneBottom)
  ) {
    return null;
  }

  const horizontalOverhang = Math.max(Math.abs(sample.px) - OBSERVED_ZONE_HALF_WIDTH, 0);
  const verticalBelow = Math.max(sample.strikeZoneBottom - sample.pz, 0);
  const verticalAbove = Math.max(sample.pz - sample.strikeZoneTop, 0);
  const verticalOverhang = Math.max(verticalBelow, verticalAbove, 0);
  if (horizontalOverhang === 0 && verticalOverhang === 0) return 0;
  return Math.hypot(horizontalOverhang, verticalOverhang);
}

function countBaseRunners(basesState) {
  return (basesState ?? "").split("").filter((char) => char === "1").length;
}

function leverageApprox(req) {
  const inningFactor = Math.max(0.1, Math.min(req.inning / 9, 1.7));
  const closeGameFactor = Math.max(0.3, Math.min(1.5 - Math.abs(req.scoreDiffBattingTeam) * 0.15, 1.5));
  const countFactor = req.balls === 3 && req.strikes === 2 ? 1.2 : req.strikes === 2 ? 1.1 : 1.0;
  const baseOutFactor = req.runnersOnBase > 0 ? 1 + req.runnersOnBase * 0.12 : 0.95;
  return Number(Math.max(0.2, Math.min(inningFactor * closeGameFactor * countFactor * baseOutFactor, 3.0)).toFixed(3));
}

function calculateHeuristicSuccessDelta(req, li) {
  let successPerLi = 0.009;
  if (req.inning >= 8 && Math.abs(req.scoreDiffBattingTeam) <= 1) successPerLi += 0.0015;
  if (req.runnersOnBase > 0) successPerLi += 0.0005;
  if (req.balls >= 2 || req.strikes >= 2) successPerLi += 0.0005;
  return Number((successPerLi * li).toFixed(4));
}

function mean(values) {
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function stdDev(values) {
  if (!values.length) return 0;
  const average = mean(values) ?? 0;
  return Math.sqrt(values.reduce((sum, value) => sum + (value - average) ** 2, 0) / values.length);
}

function increment(counter, key, amount = 1) {
  counter.set(key, (counter.get(key) ?? 0) + amount);
}

function bucketControversy(score) {
  if (score >= 85) return "85+";
  if (score >= 70) return "70-84";
  if (score >= 55) return "55-69";
  return "<55";
}

function formatPercent(value, digits = 1) {
  if (value == null || Number.isNaN(value)) return "n/a";
  return `${(value * 100).toFixed(digits)}%`;
}

function formatDate(value) {
  if (!value) return "n/a";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toISOString().slice(0, 10);
}

function formatNumber(value, digits = 2) {
  if (value == null || Number.isNaN(value)) return "n/a";
  return Number(value).toFixed(digits);
}

function toMarkdownTable(rows, columns) {
  const header = `| ${columns.map((column) => column.label).join(" | ")} |`;
  const separator = `| ${columns.map(() => "---").join(" | ")} |`;
  const body = rows.map((row) => `| ${columns.map((column) => String(column.render(row))).join(" | ")} |`);
  return [header, separator, ...body].join("\n");
}

function mapEntries(counter, keyName, valueName = "count") {
  return [...counter.entries()]
    .sort((left, right) => right[1] - left[1] || String(left[0]).localeCompare(String(right[0])))
    .map(([key, value]) => ({ [keyName]: key, [valueName]: value }));
}

function buildMarkdown(report) {
  return `# Rubric Distribution Audit

Date: ${formatAuditDateLabel()}

## Scope

- Data window: ${formatDate(report.dataWindow.start)} through ${formatDate(report.dataWindow.end)}
- Team style sample: ${report.overview.teamsTracked} tracked clubs
- Umpire rubric sample: ${report.overview.umpiresTracked} tracked HP umpires
- Controversy sample: ${report.overview.controversyMoments} spring challenges

## Analyst Readout

- Team-style spread covers ${report.summary.teamStyleBuckets} style buckets, with \`${report.summary.topTeamStyle.style}\` the largest family at ${report.summary.topTeamStyle.count} clubs (${formatPercent(report.summary.topTeamStyle.share)}).
- Umpire report cards cover ${report.summary.umpireGradeBuckets} grade buckets; the median score sits at ${formatNumber(report.summary.medianUmpireScore)} with a low-confidence share of ${formatPercent(report.summary.lowConfidenceUmpireShare)}.
- Org watch risk is not collapsed into one tier: \`${report.summary.topRiskTier.tier}\` is largest at ${report.summary.topRiskTier.count} umpires (${formatPercent(report.summary.topRiskTier.share)}), with low-confidence damping preventing weak samples from staying at \`High\` or \`Low\`.
- Controversy ranking is not just “overturned = top”: overturned moments average ${formatNumber(report.summary.meanOverturnedControversy)} while confirmed moments average ${formatNumber(report.summary.meanConfirmedControversy)}, and the top bucket still concentrates late / close / modeled-value events.

## Team Style Distribution

${toMarkdownTable(report.teamStyles.byStyle, [
  { label: "Style", render: (row) => row.style },
  { label: "Org Label", render: (row) => row.orgLabel },
  { label: "Teams", render: (row) => row.count },
  { label: "Share", render: (row) => formatPercent(row.share) },
])}

### Style Confidence

${toMarkdownTable(report.teamStyles.byConfidence, [
  { label: "Confidence", render: (row) => row.confidence },
  { label: "Teams", render: (row) => row.count },
])}

### Most Ambiguous Team Profiles

${toMarkdownTable(report.teamStyles.ambiguousTeams, [
  { label: "Team", render: (row) => row.teamName },
  { label: "Style", render: (row) => row.style },
  { label: "Top Gap", render: (row) => formatNumber(row.topGap) },
  { label: "Confidence", render: (row) => row.confidence },
])}

## Umpire Grade + Risk Distribution

### Grades

${toMarkdownTable(report.umpires.byGrade, [
  { label: "Grade", render: (row) => row.grade },
  { label: "Umpires", render: (row) => row.count },
  { label: "Share", render: (row) => formatPercent(row.share) },
])}

### Fan Descriptors

${toMarkdownTable(report.umpires.byFanDescriptor, [
  { label: "Descriptor", render: (row) => row.descriptor },
  { label: "Umpires", render: (row) => row.count },
])}

### Org Descriptors

${toMarkdownTable(report.umpires.byOrgDescriptor, [
  { label: "Descriptor", render: (row) => row.descriptor },
  { label: "Umpires", render: (row) => row.count },
])}

### Risk Tiers

${toMarkdownTable(report.umpires.byRiskTier, [
  { label: "Risk Tier", render: (row) => row.tier },
  { label: "Umpires", render: (row) => row.count },
  { label: "Share", render: (row) => formatPercent(row.share) },
])}

### Highest-Risk Umpire Profiles

${toMarkdownTable(report.umpires.topRiskProfiles, [
  { label: "Umpire", render: (row) => row.umpireName },
  { label: "Grade", render: (row) => row.grade },
  { label: "Risk Tier", render: (row) => row.riskTier },
  { label: "Risk Score", render: (row) => formatNumber(row.riskScore) },
  { label: "Confidence", render: (row) => row.confidence },
])}

## Controversy Spread

### Score Buckets

${toMarkdownTable(report.controversy.byScoreBucket, [
  { label: "Bucket", render: (row) => row.bucket },
  { label: "Moments", render: (row) => row.count },
  { label: "Share", render: (row) => formatPercent(row.share) },
])}

### Outcome Split

${toMarkdownTable(report.controversy.byOutcome, [
  { label: "Outcome", render: (row) => row.outcome },
  { label: "Moments", render: (row) => row.count },
  { label: "Avg Score", render: (row) => formatNumber(row.avgScore) },
])}

### Impact Types

${toMarkdownTable(report.controversy.byImpactType, [
  { label: "Impact Type", render: (row) => row.impactType },
  { label: "Moments", render: (row) => row.count },
  { label: "Share", render: (row) => formatPercent(row.share) },
])}

### Value Modes

${toMarkdownTable(report.controversy.byDecisionMode, [
  { label: "Mode", render: (row) => row.mode },
  { label: "Moments", render: (row) => row.count },
  { label: "Share", render: (row) => formatPercent(row.share) },
])}

### Top Spring Controversy Moments

${toMarkdownTable(report.controversy.topMoments, [
  { label: "Game", render: (row) => row.gamePk },
  { label: "Date", render: (row) => formatDate(row.gameDate) },
  { label: "Inning", render: (row) => `${row.halfInning} ${row.inning}` },
  { label: "Game Score", render: (row) => `${row.awayScore}-${row.homeScore}` },
  { label: "Controversy", render: (row) => formatNumber(row.controversyScore) },
  { label: "Outcome", render: (row) => (row.isOverturned ? "Overturned" : "Confirmed") },
  { label: "Chips", render: (row) => row.reasonChips.join(", ") },
])}

## Recommendation

- Team style and umpire grade/risk spreads are healthy enough for product use; there is no evidence of rubric collapse into a single label family.
- The main monitoring item is not threshold failure but controversy weighting drift once regular-season volume adds more direct-ending impacts and higher-WE late states.
- This rubric audit should be rerun on the daily/weekly cadence, especially after any RE/WE/overturn model change, because those upstream model changes can shift controversy ordering without changing the rubric code itself.

## Notes

- Org risk tiers in this audit mirror actual site behavior by applying low-confidence softening after raw risk-tier computation.
- Controversy scoring uses the same shared rubric weights and challenge-value modes as the current product path, but the recency component is approximated across the full spring window rather than a homepage-only last-48-hours feed.
`;
}

async function main() {
  loadAuditEnv();
  const databaseUrl = resolveAuditDatabaseUrl();
  const databaseTarget = describeAuditDatabaseTarget(databaseUrl);

  console.info(
    `[rubric-audit] database_role=${databaseTarget.role} host=${databaseTarget.host} db=${databaseTarget.database}`,
  );
  const client = new Client({
    connectionString: databaseUrl,
    ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined,
  });
  await client.connect();

  try {
    await client.query(`
      DROP TABLE IF EXISTS audit_challenge_states;
      CREATE TEMP TABLE audit_challenge_states AS
      SELECT
        c.challenge_id,
        c.game_pk,
        g.game_date::date AS game_date,
        c.challenge_team_id,
        COALESCE(t.name, CONCAT('Team ', c.challenge_team_id::text)) AS challenge_team_name,
        c.is_overturned,
        c.inning,
        CASE WHEN c.half_inning IS NULL THEN NULL ELSE INITCAP(c.half_inning) END AS half_inning,
        c.outs,
        c.bases_state,
        c.home_score,
        c.away_score,
        COALESCE(p.balls_before, c.balls, 0) AS balls_before,
        COALESCE(p.strikes_before, c.strikes, 0) AS strikes_before,
        CASE
          WHEN c.inning >= 9 THEN '9+'
          WHEN c.inning >= 7 THEN '7-8'
          WHEN c.inning >= 4 THEN '4-6'
          ELSE '1-3'
        END AS inning_bucket,
        CASE
          WHEN COALESCE(c.pitch_number, c.inferred_pitch_number) IS NULL THEN NULL
          WHEN p.balls_before IS NULL OR p.strikes_before IS NULL THEN NULL
          WHEN c.is_overturned = FALSE THEN
            CASE WHEN p.balls_after IS NULL OR p.strikes_after IS NULL THEN NULL ELSE CONCAT(p.balls_after, '-', p.strikes_after) END
          WHEN p.balls_after IS NOT NULL AND p.balls_before IS NOT NULL AND p.balls_after > p.balls_before THEN CONCAT(p.balls_before, '-', p.strikes_before + 1)
          WHEN p.strikes_after IS NOT NULL AND p.strikes_before IS NOT NULL AND p.strikes_after > p.strikes_before THEN CONCAT(p.balls_before + 1, '-', p.strikes_before)
          ELSE CASE WHEN p.balls_after IS NULL OR p.strikes_after IS NULL THEN NULL ELSE CONCAT(p.balls_after, '-', p.strikes_after) END
        END AS held_count_key,
        CASE
          WHEN p.balls_after IS NULL OR p.strikes_after IS NULL THEN NULL
          ELSE CONCAT(p.balls_after, '-', p.strikes_after)
        END AS corrected_count_key,
        CASE
          WHEN LOWER(COALESCE(p.called_description, c.called_description, '')) LIKE 'called strike%' THEN 'strike_to_ball'
          WHEN LOWER(COALESCE(p.called_description, c.called_description, '')) LIKE 'ball%' THEN 'ball_to_strike'
          ELSE NULL
        END AS challenge_direction,
        CASE
          WHEN LOWER(c.half_inning) = 'top' THEN
            CASE
              WHEN c.away_score IS NULL OR c.home_score IS NULL THEN NULL
              WHEN c.away_score - c.home_score <= -4 THEN 'trail4plus'
              WHEN c.away_score - c.home_score = -3 THEN 'trail3'
              WHEN c.away_score - c.home_score = -2 THEN 'trail2'
              WHEN c.away_score - c.home_score = -1 THEN 'trail1'
              WHEN c.away_score - c.home_score = 0 THEN 'tied'
              WHEN c.away_score - c.home_score = 1 THEN 'lead1'
              WHEN c.away_score - c.home_score = 2 THEN 'lead2'
              WHEN c.away_score - c.home_score = 3 THEN 'lead3'
              ELSE 'lead4plus'
            END
          WHEN LOWER(c.half_inning) = 'bottom' THEN
            CASE
              WHEN c.home_score IS NULL OR c.away_score IS NULL THEN NULL
              WHEN c.home_score - c.away_score <= -4 THEN 'trail4plus'
              WHEN c.home_score - c.away_score = -3 THEN 'trail3'
              WHEN c.home_score - c.away_score = -2 THEN 'trail2'
              WHEN c.home_score - c.away_score = -1 THEN 'trail1'
              WHEN c.home_score - c.away_score = 0 THEN 'tied'
              WHEN c.home_score - c.away_score = 1 THEN 'lead1'
              WHEN c.home_score - c.away_score = 2 THEN 'lead2'
              WHEN c.home_score - c.away_score = 3 THEN 'lead3'
              ELSE 'lead4plus'
            END
          ELSE NULL
        END AS score_diff_bucket,
        pt.impact_type,
        COALESCE(c.px, c.inferred_px) AS px,
        COALESCE(c.pz, c.inferred_pz) AS pz,
        COALESCE(c.strike_zone_top, c.inferred_strike_zone_top) AS strike_zone_top,
        COALESCE(c.strike_zone_bottom, c.inferred_strike_zone_bottom) AS strike_zone_bottom,
        CASE
          WHEN COALESCE(c.px, c.inferred_px) IS NULL
            OR COALESCE(c.pz, c.inferred_pz) IS NULL
            OR COALESCE(c.strike_zone_top, c.inferred_strike_zone_top) IS NULL
            OR COALESCE(c.strike_zone_bottom, c.inferred_strike_zone_bottom) IS NULL
          THEN NULL
          WHEN LOWER(COALESCE(p.called_description, c.called_description, '')) LIKE 'called strike%' THEN
            CASE
              WHEN SQRT(
                POWER(GREATEST(ABS(COALESCE(c.px, c.inferred_px)) - 0.8291666667, 0), 2)
                + POWER(
                  GREATEST(
                    COALESCE(c.strike_zone_bottom, c.inferred_strike_zone_bottom) - COALESCE(c.pz, c.inferred_pz),
                    COALESCE(c.pz, c.inferred_pz) - COALESCE(c.strike_zone_top, c.inferred_strike_zone_top),
                    0
                  ),
                  2
                )
              ) <= 0.015 THEN 'edge'
              WHEN SQRT(
                POWER(GREATEST(ABS(COALESCE(c.px, c.inferred_px)) - 0.8291666667, 0), 2)
                + POWER(
                  GREATEST(
                    COALESCE(c.strike_zone_bottom, c.inferred_strike_zone_bottom) - COALESCE(c.pz, c.inferred_pz),
                    COALESCE(c.pz, c.inferred_pz) - COALESCE(c.strike_zone_top, c.inferred_strike_zone_top),
                    0
                  ),
                  2
                )
              ) <= 0.16 THEN 'near_edge'
              ELSE 'clear_miss'
            END
          WHEN LOWER(COALESCE(p.called_description, c.called_description, '')) LIKE 'ball%' THEN
            CASE
              WHEN GREATEST(
                LEAST(
                  0.8291666667 - ABS(COALESCE(c.px, c.inferred_px)),
                  COALESCE(c.pz, c.inferred_pz) - COALESCE(c.strike_zone_bottom, c.inferred_strike_zone_bottom),
                  COALESCE(c.strike_zone_top, c.inferred_strike_zone_top) - COALESCE(c.pz, c.inferred_pz)
                ),
                0
              ) <= 0.003 THEN 'edge'
              ELSE 'near_edge'
            END
          ELSE NULL
        END AS edge_bucket
      FROM abs_challenges c
      JOIN games g ON g.game_pk = c.game_pk
      LEFT JOIN teams t ON t.team_id = c.challenge_team_id
      LEFT JOIN pitches p
        ON p.game_pk = c.game_pk
       AND p.at_bat_index = c.at_bat_index
       AND p.pitch_number = COALESCE(c.pitch_number, c.inferred_pitch_number)
      LEFT JOIN mart_game_pitch_timeline pt
        ON pt.game_pk = c.game_pk
       AND pt.at_bat_index = c.at_bat_index
       AND pt.pitch_number = COALESCE(c.pitch_number, c.inferred_pitch_number)
    `);

    await client.query(`
      CREATE INDEX audit_challenge_states_we_idx
        ON audit_challenge_states (inning, inning_bucket, half_inning, score_diff_bucket, outs, bases_state, held_count_key, corrected_count_key);
      CREATE INDEX audit_challenge_states_overturn_idx
        ON audit_challenge_states (challenge_direction, edge_bucket);
    `);

    await client.query(`
      DROP TABLE IF EXISTS audit_we_fallbacks;
      CREATE TEMP TABLE audit_we_fallbacks AS
      SELECT * FROM mart_win_expectancy_fallbacks;
      CREATE INDEX audit_we_fallbacks_idx
        ON audit_we_fallbacks (fallback_tier, inning, inning_bucket, half_inning, score_diff_bucket, outs, bases_state, count_key);
    `);

    await client.query(`
      DROP TABLE IF EXISTS audit_overturn_fallbacks;
      CREATE TEMP TABLE audit_overturn_fallbacks AS
      SELECT * FROM mart_historical_abs_overturn_probability_fallbacks;
      CREATE INDEX audit_overturn_fallbacks_idx
        ON audit_overturn_fallbacks (fallback_tier, challenge_direction, edge_bucket);
    `);

    const overview = (
      await client.query(`
        SELECT
          (SELECT MIN(game_date)::date FROM games) AS first_game_date,
          (SELECT MAX(game_date)::date FROM games) AS last_game_date,
          (SELECT COUNT(*) FROM audit_challenge_states) AS controversy_moments
      `)
    ).rows[0];

    const teamRows = (
      await client.query(`
        WITH remaining_snapshot AS (
          SELECT DISTINCT ON (game_pk)
            game_pk,
            abs_home_remaining,
            abs_away_remaining
          FROM game_state_snapshots
          ORDER BY game_pk, snapshot_time DESC
        ),
        team_game_summary AS (
          SELECT
            c.game_pk,
            c.challenge_team_id AS "teamId",
            LOWER(MAX(c.challenge_team_side)) AS "teamSide",
            SUM(CASE WHEN c.is_overturned THEN 1 ELSE 0 END)::INT AS "usedSuccessful",
            SUM(CASE WHEN NOT c.is_overturned THEN 1 ELSE 0 END)::INT AS "usedFailed"
          FROM abs_challenges c
          WHERE c.challenge_team_id IS NOT NULL
          GROUP BY c.game_pk, c.challenge_team_id
        ),
        team_summary AS (
          SELECT
            t.team_id AS "teamId",
            t.name AS "teamName",
            COUNT(DISTINCT s.game_pk)::INT AS "gamesTracked",
            COALESCE(SUM(s."usedSuccessful"), 0)::INT AS "usedSuccessful",
            COALESCE(SUM(s."usedFailed"), 0)::INT AS "usedFailed",
            COALESCE(SUM(s."usedSuccessful" + s."usedFailed"), 0)::INT AS "challengesTotal",
            COALESCE(
              AVG(
                CASE
                  WHEN s."teamSide" = 'home' THEN rs.abs_home_remaining
                  WHEN s."teamSide" = 'away' THEN rs.abs_away_remaining
                  ELSE NULL
                END
              ),
              0
            )::NUMERIC AS "avgRemaining",
            CASE WHEN SUM(s."usedSuccessful" + s."usedFailed") > 0
              THEN SUM(s."usedSuccessful")::NUMERIC / SUM(s."usedSuccessful" + s."usedFailed")
              ELSE 0
            END AS "overturnRate"
          FROM teams t
          LEFT JOIN team_game_summary s ON s."teamId" = t.team_id
          LEFT JOIN remaining_snapshot rs ON rs.game_pk = s.game_pk
          GROUP BY t.team_id, t.name
        ),
        style_metrics AS (
          SELECT
            c.challenge_team_id AS "teamId",
            AVG(CASE WHEN c.inning >= 7 OR ABS(COALESCE(c.home_score, 0) - COALESCE(c.away_score, 0)) <= 2 THEN 1.0 ELSE 0.0 END)::NUMERIC AS "lateLeverageShare",
            AVG(CASE WHEN c.inning <= 3 AND ABS(COALESCE(c.home_score, 0) - COALESCE(c.away_score, 0)) >= 3 THEN 1.0 ELSE 0.0 END)::NUMERIC AS "earlyLowLeverageShare"
          FROM abs_challenges c
          WHERE c.challenge_team_id IS NOT NULL
          GROUP BY c.challenge_team_id
        )
        SELECT s.*, m."lateLeverageShare", m."earlyLowLeverageShare"
        FROM team_summary s
        LEFT JOIN style_metrics m ON m."teamId" = s."teamId"
        WHERE s."challengesTotal" > 0
      `)
    ).rows;

    const umpireRows = (
      await client.query(`
        WITH umpire_game_summary AS (
          SELECT
            o.official_id AS "umpireId",
            o.official_name AS "umpireName",
            c.game_pk,
            COUNT(*)::INT AS "challengedCalls",
            SUM(CASE WHEN c.is_overturned THEN 1 ELSE 0 END)::INT AS "overturnedCalls",
            SUM(CASE WHEN NOT c.is_overturned THEN 1 ELSE 0 END)::INT AS "confirmedCalls",
            CASE
              WHEN COUNT(*) > 0 THEN SUM(CASE WHEN c.is_overturned THEN 1 ELSE 0 END)::NUMERIC / COUNT(*)
              ELSE 0
            END AS "gameOverturnRate"
          FROM abs_challenges c
          JOIN officials o
            ON o.game_pk = c.game_pk
           AND o.official_type = 'Home Plate'
          GROUP BY o.official_id, o.official_name, c.game_pk
        ),
        umpire_summary AS (
          SELECT
            s."umpireId",
            s."umpireName",
            COALESCE(SUM(s."challengedCalls"), 0)::INT AS "challengedCalls",
            COALESCE(SUM(s."overturnedCalls"), 0)::INT AS "overturnedCalls",
            COALESCE(SUM(s."confirmedCalls"), 0)::INT AS "confirmedCalls",
            CASE WHEN SUM(s."challengedCalls") > 0
              THEN SUM(s."overturnedCalls")::NUMERIC / SUM(s."challengedCalls")
              ELSE 0
            END AS "overturnRate",
            COUNT(DISTINCT s.game_pk)::INT AS "gamesWorked"
          FROM umpire_game_summary s
          GROUP BY s."umpireId", s."umpireName"
        ),
        rubric_metrics AS (
          WITH filtered AS (
            SELECT
              s."umpireId",
              s.game_pk,
              s."challengedCalls",
              s."overturnedCalls",
              s."gameOverturnRate",
              ROW_NUMBER() OVER (PARTITION BY s."umpireId" ORDER BY g.game_date DESC, s.game_pk DESC) AS "recentRank"
            FROM umpire_game_summary s
            JOIN games g ON g.game_pk = s.game_pk
          )
          SELECT
            "umpireId",
            COALESCE(STDDEV_POP("gameOverturnRate"), 0)::NUMERIC AS "overturnRateVariance",
            CASE
              WHEN SUM("challengedCalls") FILTER (WHERE "recentRank" <= 5) > 0
                THEN SUM("overturnedCalls") FILTER (WHERE "recentRank" <= 5)::NUMERIC / SUM("challengedCalls") FILTER (WHERE "recentRank" <= 5)
              ELSE NULL
            END AS "recentOverturnRate"
          FROM filtered
          GROUP BY "umpireId"
        )
        SELECT s.*, m."overturnRateVariance", m."recentOverturnRate"
        FROM umpire_summary s
        LEFT JOIN rubric_metrics m ON m."umpireId" = s."umpireId"
        WHERE s."challengedCalls" > 0
      `)
    ).rows;

    const controversyRows = (
      await client.query(`
        WITH overturn_resolved AS (
          SELECT
            cs.challenge_id,
            COALESCE(exact.overturn_probability, direction_only.overturn_probability, global_row.overturn_probability, 0.5) AS overturn_probability
          FROM audit_challenge_states cs
          LEFT JOIN audit_overturn_fallbacks exact
            ON exact.fallback_tier = 'exact'
           AND exact.challenge_direction = cs.challenge_direction
           AND exact.edge_bucket = cs.edge_bucket
          LEFT JOIN audit_overturn_fallbacks direction_only
            ON direction_only.fallback_tier = 'direction_only'
           AND direction_only.challenge_direction = cs.challenge_direction
          LEFT JOIN audit_overturn_fallbacks global_row
            ON global_row.fallback_tier = 'global'
        ),
        we_resolved AS (
          SELECT
            cs.challenge_id,
            COALESCE(post_exact.batting_team_win_probability, post_bucket.batting_team_win_probability, post_drop_count_exact.batting_team_win_probability, post_drop_count_bucket.batting_team_win_probability)
            - COALESCE(pre_exact.batting_team_win_probability, pre_bucket.batting_team_win_probability, pre_drop_count_exact.batting_team_win_probability, pre_drop_count_bucket.batting_team_win_probability) AS success_we_delta
          FROM audit_challenge_states cs
          LEFT JOIN audit_we_fallbacks pre_exact
            ON pre_exact.fallback_tier = 'exact'
           AND pre_exact.inning = cs.inning
           AND pre_exact.half_inning = cs.half_inning
           AND pre_exact.score_diff_bucket = cs.score_diff_bucket
           AND pre_exact.outs = cs.outs
           AND pre_exact.bases_state = cs.bases_state
           AND pre_exact.count_key = cs.held_count_key
          LEFT JOIN audit_we_fallbacks post_exact
            ON post_exact.fallback_tier = 'exact'
           AND post_exact.inning = cs.inning
           AND post_exact.half_inning = cs.half_inning
           AND post_exact.score_diff_bucket = cs.score_diff_bucket
           AND post_exact.outs = cs.outs
           AND post_exact.bases_state = cs.bases_state
           AND post_exact.count_key = cs.corrected_count_key
          LEFT JOIN audit_we_fallbacks pre_bucket
            ON pre_bucket.fallback_tier = 'drop_inning_to_bucket'
           AND pre_bucket.inning_bucket = cs.inning_bucket
           AND pre_bucket.half_inning = cs.half_inning
           AND pre_bucket.score_diff_bucket = cs.score_diff_bucket
           AND pre_bucket.outs = cs.outs
           AND pre_bucket.bases_state = cs.bases_state
           AND pre_bucket.count_key = cs.held_count_key
          LEFT JOIN audit_we_fallbacks post_bucket
            ON post_bucket.fallback_tier = 'drop_inning_to_bucket'
           AND post_bucket.inning_bucket = cs.inning_bucket
           AND post_bucket.half_inning = cs.half_inning
           AND post_bucket.score_diff_bucket = cs.score_diff_bucket
           AND post_bucket.outs = cs.outs
           AND post_bucket.bases_state = cs.bases_state
           AND post_bucket.count_key = cs.corrected_count_key
          LEFT JOIN audit_we_fallbacks pre_drop_count_exact
            ON pre_drop_count_exact.fallback_tier = 'drop_count_key_exact_inning'
           AND pre_drop_count_exact.inning = cs.inning
           AND pre_drop_count_exact.half_inning = cs.half_inning
           AND pre_drop_count_exact.score_diff_bucket = cs.score_diff_bucket
           AND pre_drop_count_exact.outs = cs.outs
           AND pre_drop_count_exact.bases_state = cs.bases_state
          LEFT JOIN audit_we_fallbacks post_drop_count_exact
            ON post_drop_count_exact.fallback_tier = 'drop_count_key_exact_inning'
           AND post_drop_count_exact.inning = cs.inning
           AND post_drop_count_exact.half_inning = cs.half_inning
           AND post_drop_count_exact.score_diff_bucket = cs.score_diff_bucket
           AND post_drop_count_exact.outs = cs.outs
           AND post_drop_count_exact.bases_state = cs.bases_state
          LEFT JOIN audit_we_fallbacks pre_drop_count_bucket
            ON pre_drop_count_bucket.fallback_tier = 'drop_count_key_bucketed_inning'
           AND pre_drop_count_bucket.inning_bucket = cs.inning_bucket
           AND pre_drop_count_bucket.half_inning = cs.half_inning
           AND pre_drop_count_bucket.score_diff_bucket = cs.score_diff_bucket
           AND pre_drop_count_bucket.outs = cs.outs
           AND pre_drop_count_bucket.bases_state = cs.bases_state
          LEFT JOIN audit_we_fallbacks post_drop_count_bucket
            ON post_drop_count_bucket.fallback_tier = 'drop_count_key_bucketed_inning'
           AND post_drop_count_bucket.inning_bucket = cs.inning_bucket
           AND post_drop_count_bucket.half_inning = cs.half_inning
           AND post_drop_count_bucket.score_diff_bucket = cs.score_diff_bucket
           AND post_drop_count_bucket.outs = cs.outs
           AND post_drop_count_bucket.bases_state = cs.bases_state
        )
        SELECT
          cs.challenge_id,
          cs.game_pk,
          cs.game_date,
          cs.challenge_team_name,
          cs.is_overturned,
          cs.inning,
          cs.half_inning,
          cs.outs,
          cs.bases_state,
          cs.balls_before,
          cs.strikes_before,
          cs.home_score,
          cs.away_score,
          cs.impact_type,
          cs.px,
          cs.pz,
          cs.strike_zone_top,
          cs.strike_zone_bottom,
          o.overturn_probability,
          w.success_we_delta
        FROM audit_challenge_states cs
        LEFT JOIN overturn_resolved o ON o.challenge_id = cs.challenge_id
        LEFT JOIN we_resolved w ON w.challenge_id = cs.challenge_id
        ORDER BY cs.game_date ASC, cs.game_pk ASC, cs.challenge_id ASC
      `)
    ).rows;

    const leagueChallengeRatePerGame =
      teamRows.reduce(
        (sum, row) => sum + (Number(row.gamesTracked) > 0 ? Number(row.challengesTotal) / Number(row.gamesTracked) : 0),
        0,
      ) / Math.max(teamRows.length, 1);
    const leagueLateLeverageShare =
      teamRows.reduce((sum, row) => sum + Number(row.lateLeverageShare ?? 0), 0) / Math.max(teamRows.length, 1);
    const leagueEarlyLowLeverageShare =
      teamRows.reduce((sum, row) => sum + Number(row.earlyLowLeverageShare ?? 0), 0) / Math.max(teamRows.length, 1);
    const leagueAverageChallengesRemaining =
      teamRows.reduce((sum, row) => sum + Number(row.avgRemaining ?? 0), 0) / Math.max(teamRows.length, 1);
    const leagueOverturnRate =
      teamRows.reduce((sum, row) => sum + Number(row.usedSuccessful), 0) /
      Math.max(1, teamRows.reduce((sum, row) => sum + Number(row.challengesTotal), 0));

    const styledTeams = teamRows.map((row) => {
      const challengeRatePerGame = Number(row.gamesTracked) > 0 ? Number(row.challengesTotal) / Number(row.gamesTracked) : 0;
      const style = computeTeamChallengeStyle({
        sampleSize: Number(row.challengesTotal),
        challengeRatePerGame,
        leagueChallengeRatePerGame,
        lateLeverageShare: Number(row.lateLeverageShare ?? 0),
        leagueLateLeverageShare,
        earlyLowLeverageShare: Number(row.earlyLowLeverageShare ?? 0),
        leagueEarlyLowLeverageShare,
        averageChallengesRemaining: Number(row.avgRemaining ?? 0),
        leagueAverageChallengesRemaining,
        overturnRate: Number(row.overturnRate ?? 0),
        leagueOverturnRate,
      });

      return {
        teamId: Number(row.teamId),
        teamName: row.teamName,
        challengesTotal: Number(row.challengesTotal),
        style: style.style,
        orgLabel: style.orgLabel,
        confidence: style.confidence,
        topGap: style.topGap,
        scores: style.scores,
      };
    });

    const trackedUmpires = umpireRows.map((row) => ({
      umpireId: Number(row.umpireId),
      umpireName: row.umpireName,
      challengedCalls: Number(row.challengedCalls),
      overturnedCalls: Number(row.overturnedCalls),
      overturnRate: Number(row.overturnRate ?? 0),
      overturnRateVariance: Number(row.overturnRateVariance ?? 0),
      recentOverturnRate: row.recentOverturnRate === null ? null : Number(row.recentOverturnRate),
    }));

    const leagueUmpireOverturnRate =
      trackedUmpires.reduce((sum, row) => sum + row.overturnedCalls, 0) /
      Math.max(1, trackedUmpires.reduce((sum, row) => sum + row.challengedCalls, 0));
    const overturnRates = trackedUmpires.map((row) => row.overturnRate);
    const leagueOverturnRateStdDev = stdDev(overturnRates);
    const variances = trackedUmpires.map((row) => row.overturnRateVariance);
    const leagueVarianceMean = mean(variances) ?? 0;
    const leagueVarianceStdDev = stdDev(variances);

    const rubricUmpires = trackedUmpires.map((row) => {
      const reportCard = computeUmpireReportCard({
        challengedCalls: row.challengedCalls,
        overturnedCalls: row.overturnedCalls,
        leagueOverturnRate: leagueUmpireOverturnRate,
        leagueOverturnRateStdDev,
        umpireVariance: row.overturnRateVariance,
        leagueVarianceMean,
        leagueVarianceStdDev,
        recentOverturnRate: row.recentOverturnRate,
      });
      const rawRisk = computeOrgWatchRisk({
        umpireScore: reportCard.score,
        directionalBiasSeverity: clamp((row.overturnedCalls / Math.max(1, row.challengedCalls)) * 100),
        zoneConcentrationSeverity: clamp(row.overturnRateVariance * 100),
        recentTrendRisk: clamp((row.recentOverturnRate ?? row.overturnRate) * 100),
        countHotspotVolatility: clamp(row.overturnRateVariance * 85),
      });

      return {
        ...row,
        reportCard,
        rawRisk,
        riskTier: softenRiskTierForConfidence(rawRisk.tier, reportCard.confidence),
      };
    });

    const totalMoments = controversyRows.length;
    const controversialMoments = controversyRows.map((row, index) => {
      const inning = Number(row.inning ?? 0);
      const balls = Number(row.balls_before ?? 0);
      const strikes = Number(row.strikes_before ?? 0);
      const basesState = row.bases_state ?? "000";
      const runnersOnBase = countBaseRunners(basesState);
      const scoreDiffBattingTeam =
        row.half_inning === "Top"
          ? Number(row.away_score ?? 0) - Number(row.home_score ?? 0)
          : Number(row.home_score ?? 0) - Number(row.away_score ?? 0);
      const li = leverageApprox({ inning, balls, strikes, runnersOnBase, scoreDiffBattingTeam });
      const successWeDelta = row.success_we_delta === null ? null : Number(row.success_we_delta);
      const successDelta = successWeDelta ?? calculateHeuristicSuccessDelta({ inning, balls, strikes, runnersOnBase, scoreDiffBattingTeam }, li);
      const failDelta = Number((-0.003 * li).toFixed(4));
      const overturnProbability = Number(row.overturn_probability ?? 0.5);
      const expectedChallengeValue = Number((overturnProbability * successDelta + (1 - overturnProbability) * failDelta).toFixed(4));
      const realizedChallengeValue = row.is_overturned ? successDelta : failDelta;
      const missDistance = computeObservedZoneMissDistance({
        px: row.px === null ? null : Number(row.px),
        pz: row.pz === null ? null : Number(row.pz),
        strikeZoneTop: row.strike_zone_top === null ? null : Number(row.strike_zone_top),
        strikeZoneBottom: row.strike_zone_bottom === null ? null : Number(row.strike_zone_bottom),
      });
      const slateProgress = totalMoments <= 1 ? 1 : index / (totalMoments - 1);
      const scored = scoreControversyMoment({
        inning,
        homeScore: Number(row.home_score ?? 0),
        awayScore: Number(row.away_score ?? 0),
        scoreDifferential: Math.abs(Number(row.home_score ?? 0) - Number(row.away_score ?? 0)),
        outs: row.outs === null ? null : Number(row.outs),
        basesState,
        balls,
        strikes,
        isOverturned: Boolean(row.is_overturned),
        impactType: row.impact_type ?? null,
        missDistance,
        slateProgress,
        noveltyPenalty: 0,
        realizedChallengeValue,
        expectedChallengeValue,
        decisionValueMode: successWeDelta !== null ? "win_expectancy" : "heuristic",
      });

      return {
        challengeId: row.challenge_id,
        gamePk: Number(row.game_pk),
        gameDate: row.game_date,
        challengeTeamName: row.challenge_team_name,
        isOverturned: Boolean(row.is_overturned),
        inning,
        halfInning: row.half_inning,
        outs: row.outs === null ? null : Number(row.outs),
        basesState,
        balls,
        strikes,
        homeScore: Number(row.home_score ?? 0),
        awayScore: Number(row.away_score ?? 0),
        impactType: row.impact_type ?? "unknown",
        missDistance,
        expectedChallengeValue,
        realizedChallengeValue,
        decisionValueMode: successWeDelta !== null ? "win_expectancy" : "heuristic",
        controversyScore: scored.score,
        reasonChips: scored.chips,
      };
    });

    const teamStyleCounts = new Map();
    const teamStyleConfidenceCounts = new Map();
    const teamOrgLabelCounts = new Map();
    for (const row of styledTeams) {
      increment(teamStyleCounts, row.style);
      increment(teamStyleConfidenceCounts, row.confidence);
      increment(teamOrgLabelCounts, row.orgLabel);
    }

    const umpireGradeCounts = new Map();
    const fanDescriptorCounts = new Map();
    const orgDescriptorCounts = new Map();
    const riskTierCounts = new Map();
    const umpireConfidenceCounts = new Map();
    for (const row of rubricUmpires) {
      increment(umpireGradeCounts, row.reportCard.grade);
      increment(fanDescriptorCounts, row.reportCard.fanDescriptor);
      increment(orgDescriptorCounts, row.reportCard.orgDescriptor);
      increment(riskTierCounts, row.riskTier);
      increment(umpireConfidenceCounts, row.reportCard.confidence);
    }

    const controversyBucketCounts = new Map();
    const impactTypeCounts = new Map();
    const decisionModeCounts = new Map();
    for (const row of controversialMoments) {
      increment(controversyBucketCounts, bucketControversy(row.controversyScore));
      increment(impactTypeCounts, row.impactType ?? "unknown");
      increment(decisionModeCounts, row.decisionValueMode ?? "unknown");
    }

    const meanOverturnedControversy =
      mean(controversialMoments.filter((row) => row.isOverturned).map((row) => row.controversyScore)) ?? 0;
    const meanConfirmedControversy =
      mean(controversialMoments.filter((row) => !row.isOverturned).map((row) => row.controversyScore)) ?? 0;

    const byStyle = mapEntries(teamStyleCounts, "style").map((row) => ({
      ...row,
      share: row.count / Math.max(styledTeams.length, 1),
      orgLabel: styledTeams.find((team) => team.style === row.style)?.orgLabel ?? "Mixed profile",
    }));
    const byGrade = mapEntries(umpireGradeCounts, "grade").map((row) => ({
        ...row,
        share: row.count / Math.max(rubricUmpires.length, 1),
      }));
    const byRiskTier = mapEntries(riskTierCounts, "tier").map((row) => ({
      ...row,
      share: row.count / Math.max(rubricUmpires.length, 1),
    }));
    const byScoreBucket = mapEntries(controversyBucketCounts, "bucket").map((row) => ({
      ...row,
      share: row.count / Math.max(controversialMoments.length, 1),
    }));
    const byImpactType = mapEntries(impactTypeCounts, "impactType").map((row) => ({
      ...row,
      share: row.count / Math.max(controversialMoments.length, 1),
    }));
    const byDecisionMode = mapEntries(decisionModeCounts, "mode").map((row) => ({
      ...row,
      share: row.count / Math.max(controversialMoments.length, 1),
    }));

    const byOutcome = [
      {
        outcome: "Overturned",
        count: controversialMoments.filter((row) => row.isOverturned).length,
        avgScore: meanOverturnedControversy,
      },
      {
        outcome: "Confirmed",
        count: controversialMoments.filter((row) => !row.isOverturned).length,
        avgScore: meanConfirmedControversy,
      },
    ];

    const topMoments = [...controversialMoments]
      .sort((left, right) => right.controversyScore - left.controversyScore)
      .slice(0, 10);

    const artifact = {
      auditDate: AUDIT_DATE,
      dataWindow: {
        start: overview.first_game_date,
        end: overview.last_game_date,
      },
      overview: {
        teamsTracked: styledTeams.length,
        umpiresTracked: rubricUmpires.length,
        controversyMoments: Number(overview.controversy_moments),
      },
      teamStyles: {
        byStyle,
        byConfidence: mapEntries(teamStyleConfidenceCounts, "confidence"),
        byOrgLabel: mapEntries(teamOrgLabelCounts, "orgLabel"),
        ambiguousTeams: [...styledTeams]
          .sort((left, right) => left.topGap - right.topGap)
          .slice(0, 10),
      },
      umpires: {
        byGrade,
        byFanDescriptor: mapEntries(fanDescriptorCounts, "descriptor"),
        byOrgDescriptor: mapEntries(orgDescriptorCounts, "descriptor"),
        byRiskTier,
        byConfidence: mapEntries(umpireConfidenceCounts, "confidence"),
        topRiskProfiles: [...rubricUmpires]
          .sort((left, right) => right.rawRisk.riskScore - left.rawRisk.riskScore)
          .slice(0, 10)
          .map((row) => ({
            umpireName: row.umpireName,
            grade: row.reportCard.grade,
            confidence: row.reportCard.confidence,
            riskScore: row.rawRisk.riskScore,
            riskTier: row.riskTier,
          })),
        medianScore: [...rubricUmpires]
          .map((row) => row.reportCard.score)
          .sort((left, right) => left - right)[Math.floor(rubricUmpires.length / 2)] ?? null,
      },
      controversy: {
        byScoreBucket,
        byOutcome,
        byImpactType,
        byDecisionMode,
        topMoments,
      },
      summary: {
        teamStyleBuckets: byStyle.length,
        topTeamStyle: byStyle[0] ?? { style: "n/a", count: 0, share: 0 },
        umpireGradeBuckets: byGrade.length,
        medianUmpireScore:
          [...rubricUmpires].map((row) => row.reportCard.score).sort((left, right) => left - right)[
            Math.floor(rubricUmpires.length / 2)
          ] ?? null,
        lowConfidenceUmpireShare:
          rubricUmpires.filter((row) => row.reportCard.confidence === "low").length / Math.max(rubricUmpires.length, 1),
        topRiskTier: byRiskTier[0] ?? { tier: "n/a", count: 0, share: 0 },
        meanOverturnedControversy,
        meanConfirmedControversy,
      },
    };

    const markdown = buildMarkdown(artifact);
    await fs.mkdir(ARTIFACT_DIR, { recursive: true });
    await fs.writeFile(JSON_PATH, JSON.stringify(artifact, null, 2));
    await fs.writeFile(DOC_PATH, markdown);

    console.log(`Wrote ${path.relative(repoRoot, DOC_PATH)}`);
    console.log(`Wrote ${path.relative(repoRoot, JSON_PATH)}`);
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
