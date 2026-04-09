import type {
  ConfidenceBand,
  ControversyReasonChip,
  OrgRiskTier,
  TeamStyle,
  TeamStyleOrgLabel,
  UmpireFanDescriptor,
  UmpireGrade,
  UmpireOrgDescriptor,
} from "@/lib/types";

type ScoreBreakdown = {
  [key: string]: number;
};

export type UmpireReportCardInput = {
  challengedCalls: number;
  overturnedCalls: number;
  leagueOverturnRate: number;
  leagueOverturnRateStdDev: number;
  umpireVariance: number;
  leagueVarianceMean: number;
  leagueVarianceStdDev: number;
  recentOverturnRate?: number | null;
  priorSampleSize?: number;
};

export type UmpireReportCardResult = {
  score: number;
  grade: UmpireGrade;
  confidence: ConfidenceBand;
  fanDescriptor: UmpireFanDescriptor;
  orgDescriptor: UmpireOrgDescriptor;
  regressedOverturnRate: number;
  breakdown: ScoreBreakdown;
};

export type TeamStyleInput = {
  sampleSize: number;
  challengeRatePerGame: number;
  leagueChallengeRatePerGame: number;
  lateLeverageShare: number;
  leagueLateLeverageShare: number;
  earlyLowLeverageShare: number;
  leagueEarlyLowLeverageShare: number;
  averageChallengesRemaining: number;
  leagueAverageChallengesRemaining: number;
  overturnRate: number;
  leagueOverturnRate: number;
};

export type TeamStyleResult = {
  style: TeamStyle;
  orgLabel: TeamStyleOrgLabel;
  confidence: ConfidenceBand;
  scores: Record<TeamStyle, number>;
  dimensions: ScoreBreakdown;
};

export type ControversyMomentInput = {
  inning: number | null;
  homeScore?: number | null;
  awayScore?: number | null;
  scoreDifferential?: number | null;
  outs: number | null;
  basesState: string | null;
  balls: number | null;
  strikes: number | null;
  isOverturned: boolean;
  impactType?: string | null;
  missDistance?: number | null;
  slateProgress?: number | null;
  noveltyPenalty?: number | null;
  realizedChallengeValue?: number | null;
  expectedChallengeValue?: number | null;
  decisionValueMode?: "win_expectancy" | "heuristic" | null;
};

export type ControversyMomentResult = {
  score: number;
  scoreVersion: string;
  leverageScore: number;
  resultImpactScore: number;
  missSeverityScore: number;
  modeledValueScore: number;
  recencyScore: number;
  noveltyScore: number;
  chips: ControversyReasonChip[];
};

export const CONTROVERSY_SCORE_KIND = "editorial_composite";
export const CONTROVERSY_SCORE_VERSION = "controversy_editorial_v2";

export type OrgWatchRiskInput = {
  umpireScore: number;
  directionalBiasSeverity: number;
  zoneConcentrationSeverity: number;
  recentTrendRisk: number;
  countHotspotVolatility: number;
  confidence?: ConfidenceBand | null;
  matchupHistoryModifier?: number;
};

export type OrgWatchRiskResult = {
  riskScore: number;
  tier: OrgRiskTier;
};

export const UMPIRE_REPORT_CARD_VERSION = "umpire_report_card_v2";
export const TEAM_STYLE_VERSION = "team_style_v2";
export const ORG_WATCH_RISK_VERSION = "org_watch_risk_v2";

const MAX_CHIPS = 4;

export function clamp(value: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value));
}

export function computeRegressedRate(
  successes: number,
  attempts: number,
  priorRate: number,
  priorSampleSize = 20,
) {
  const boundedAttempts = Math.max(0, attempts);
  const boundedSuccesses = clamp(successes, 0, boundedAttempts);
  return (boundedSuccesses + priorSampleSize * priorRate) / (boundedAttempts + priorSampleSize);
}

function zScore(value: number, mean: number, stdDev: number) {
  if (!Number.isFinite(stdDev) || stdDev <= 0) return 0;
  return (value - mean) / stdDev;
}

function confidenceFromSampleSize(sampleSize: number): ConfidenceBand {
  if (sampleSize >= 25) return "high";
  if (sampleSize >= 10) return "medium";
  return "low";
}

function scoreFromRelativeDelta(value: number, baseline: number, positiveIsBetter = true, multiplier = 40) {
  if (!Number.isFinite(value) || !Number.isFinite(baseline) || baseline === 0) return 50;
  const delta = (value - baseline) / Math.abs(baseline);
  const signed = positiveIsBetter ? delta : -delta;
  return clamp(50 + signed * multiplier);
}

function mapUmpireGrade(score: number): UmpireGrade {
  if (score >= 82) return "A";
  if (score >= 68) return "B";
  if (score >= 45) return "C";
  if (score >= 30) return "D";
  return "F";
}

function mapFanDescriptor(grade: UmpireGrade): UmpireFanDescriptor {
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
  }
}

function mapOrgDescriptor(grade: UmpireGrade): UmpireOrgDescriptor {
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
  }
}

function mapOrgStyleLabel(style: TeamStyle): TeamStyleOrgLabel {
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
  }
}

function softenExtremeGradeForConfidence(grade: UmpireGrade, confidence: ConfidenceBand): UmpireGrade {
  if (confidence === "high") return grade;
  if (grade === "A") return "B";
  if (grade === "F") return confidence === "medium" ? "D" : "C";
  return grade;
}

function softenRiskTierForConfidence(riskTier: OrgRiskTier, confidence: ConfidenceBand | null | undefined): OrgRiskTier {
  if (confidence !== "low") return riskTier;
  if (riskTier === "High") return "Elevated";
  if (riskTier === "Low") return "Moderate";
  return riskTier;
}

function getMargin(input: ControversyMomentInput) {
  if (Number.isFinite(input.scoreDifferential)) return Math.abs(input.scoreDifferential ?? 0);
  return Math.abs((input.homeScore ?? 0) - (input.awayScore ?? 0));
}

function getRunnerFlags(basesState: string | null) {
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

function computeLeverageScore(input: ControversyMomentInput) {
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

function computeResultImpactScore(input: ControversyMomentInput) {
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

function computeMissSeverityScore(missDistance: number | null | undefined) {
  if (missDistance == null || !Number.isFinite(missDistance)) return 40;
  if (missDistance >= 0.5) return 95;
  if (missDistance >= 0.25) return 75;
  if (missDistance >= 0.1) return 55;
  return 35;
}

function computeRecencyScore(progress: number | null | undefined) {
  const bounded = clamp(progress ?? 0.5, 0, 1);
  if (bounded >= 0.9) return 100;
  if (bounded >= 0.7) return 80;
  if (bounded >= 0.4) return 60;
  return 40;
}

function computeModeledValueScore(
  realizedChallengeValue: number | null | undefined,
  expectedChallengeValue: number | null | undefined,
  decisionValueMode: "win_expectancy" | "heuristic" | null | undefined,
) {
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

function buildReasonChips(input: ControversyMomentInput, missSeverityScore: number): ControversyReasonChip[] {
  const chips: ControversyReasonChip[] = [];
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

export function computeUmpireReportCard(input: UmpireReportCardInput): UmpireReportCardResult {
  const priorSampleSize = input.priorSampleSize ?? 20;
  const regressedOverturnRate = computeRegressedRate(
    input.overturnedCalls,
    input.challengedCalls,
    input.leagueOverturnRate,
    priorSampleSize,
  );
  const recentRate = input.recentOverturnRate ?? regressedOverturnRate;

  const rateScore = clamp(
    50 - 12 * zScore(regressedOverturnRate, input.leagueOverturnRate, input.leagueOverturnRateStdDev),
  );
  const consistencyScore = clamp(
    50 - 8 * zScore(input.umpireVariance, input.leagueVarianceMean, input.leagueVarianceStdDev),
  );
  const recentFormScore = clamp(
    50 - 6 * zScore(recentRate - regressedOverturnRate, 0, input.leagueOverturnRateStdDev),
  );

  const score = clamp(0.78 * rateScore + 0.12 * consistencyScore + 0.1 * recentFormScore);
  const confidence = confidenceFromSampleSize(input.challengedCalls);
  const grade = softenExtremeGradeForConfidence(mapUmpireGrade(score), confidence);

  return {
    score: Number(score.toFixed(2)),
    grade,
    confidence,
    fanDescriptor: mapFanDescriptor(grade),
    orgDescriptor: mapOrgDescriptor(grade),
    regressedOverturnRate: Number(regressedOverturnRate.toFixed(4)),
    breakdown: {
      rateScore: Number(rateScore.toFixed(2)),
      consistencyScore: Number(consistencyScore.toFixed(2)),
      recentFormScore: Number(recentFormScore.toFixed(2)),
    },
  };
}

export function computeTeamChallengeStyle(input: TeamStyleInput): TeamStyleResult {
  const aggressionScore = scoreFromRelativeDelta(
    input.challengeRatePerGame,
    input.leagueChallengeRatePerGame,
    true,
  );
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

  const scores: Record<TeamStyle, number> = {
    "High-Impact":
      0.3 * lateLeverageScore + 0.25 * efficiencyScore + 0.2 * aggressionScore + 0.25 * conservationScore,
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
    .map(([style, score]) => ({ style: style as TeamStyle, score }))
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

  let winner = ranked[0].style;
  if (ranked.length > 1 && ranked[0].score - ranked[1].score <= 4) {
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
    scores: Object.fromEntries(
      Object.entries(scores).map(([style, score]) => [style, Number(score.toFixed(2))]),
    ) as Record<TeamStyle, number>,
    dimensions: {
      aggressionScore: Number(aggressionScore.toFixed(2)),
      lateLeverageScore: Number(lateLeverageScore.toFixed(2)),
      disciplineScore: Number(disciplineScore.toFixed(2)),
      conservationScore: Number(conservationScore.toFixed(2)),
      efficiencyScore: Number(efficiencyScore.toFixed(2)),
    },
  };
}

export function scoreControversyMoment(input: ControversyMomentInput): ControversyMomentResult {
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
    scoreVersion: CONTROVERSY_SCORE_VERSION,
    leverageScore,
    resultImpactScore,
    missSeverityScore,
    modeledValueScore,
    recencyScore,
    noveltyScore,
    chips: buildReasonChips(input, missSeverityScore),
  };
}

export function computeOrgWatchRisk(input: OrgWatchRiskInput): OrgWatchRiskResult {
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
    0.1 * countHotspotVolatility +
    (input.matchupHistoryModifier ?? 0);

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
  let tier: OrgRiskTier = "Low";
  const qualifiesForHighRisk = riskScore >= 80 || (riskScore >= 72 && hotSignalCount >= 3 && umpireScore <= 40);
  if (qualifiesForHighRisk) tier = "High";
  else if (riskScore >= 56 || (riskScore >= 50 && hotSignalCount >= 2)) tier = "Elevated";
  else if (riskScore >= 35) tier = "Moderate";

  return {
    riskScore: Number(riskScore.toFixed(2)),
    tier: softenRiskTierForConfidence(tier, input.confidence),
  };
}
