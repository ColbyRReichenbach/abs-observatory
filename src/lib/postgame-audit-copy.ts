import type {
  GamePostgameAudit,
  GamePostgameAuditCoverage,
  GamePostgameAuditNarrative,
  GamePostgameAuditSide,
  GamePostgameAuditTeamVerdict,
  GamePostgameAuditUmpireVerdict,
} from "@/lib/types";
import type { ViewMode } from "@/lib/view-mode";

const VALUE_EPSILON = 0.0005;

export function buildPostgameAuditNarrative(audit: GamePostgameAudit): GamePostgameAuditNarrative {
  const edge = resolveReviewEdge(audit);
  const actualLabel = formatValue(audit.totalActualValue, audit.valueMode);
  const expectedLabel = formatValue(audit.totalExpectedValue, "win");
  const surplusLabel = formatValue(audit.totalValueSurplus, "win");

  return {
    headline: buildHeadline(audit, edge),
    summary: buildSummary(audit),
    valueRead: buildValueRead(audit, edge, actualLabel, expectedLabel, surplusLabel),
    umpireRead: buildUmpireRead(audit),
  };
}

export function buildPostgameAuditPresentation(audit: GamePostgameAudit, viewMode: ViewMode = "fan") {
  if (viewMode === "fan") {
    return {
      narrative: buildPostgameAuditNarrative(audit),
      coverage: buildPostgameAuditCoverage(audit),
      teamVerdicts: buildPostgameAuditTeamVerdicts(audit),
      umpireVerdict: buildPostgameAuditUmpireVerdict(audit),
    };
  }

  return {
    narrative: buildOrgNarrative(audit),
    coverage: buildOrgCoverage(audit),
    teamVerdicts: buildOrgTeamVerdicts(audit),
    umpireVerdict: buildOrgUmpireVerdict(audit),
  };
}

export function buildPostgameAuditCoverage(audit: GamePostgameAudit): GamePostgameAuditCoverage {
  return {
    valueMode: audit.valueMode,
    hasExpectedValueLayer: audit.totalExpectedValue !== null,
    hasTrustedActualValueLayer: audit.totalActualValue !== null,
    methodologyNote:
      audit.valueMode === "win"
        ? "This report leans on the replay log and the win-probability model. The saved markdown recap is extra context now, not the source of truth."
        : audit.valueMode === "run"
          ? "This game does not carry enough clean win-probability coverage for a fair surplus read, so the report leans on run expectancy instead."
          : "This game is too thin for a clean win- or run-value read, so the report falls back to estimated swing.",
  };
}

export function buildPostgameAuditTeamVerdicts(audit: GamePostgameAudit): {
  home: GamePostgameAuditTeamVerdict;
  away: GamePostgameAuditTeamVerdict;
} {
  const edge = resolveReviewEdge(audit);
  const homeOutcome =
    edge.kind === "even" ? "even" : edge.side.teamId === audit.home.teamId ? "won" : "lost";
  const awayOutcome =
    edge.kind === "even" ? "even" : edge.side.teamId === audit.away.teamId ? "won" : "lost";

  return {
    home: buildTeamVerdict(audit, audit.home, audit.away, homeOutcome),
    away: buildTeamVerdict(audit, audit.away, audit.home, awayOutcome),
  };
}

export function buildPostgameAuditUmpireVerdict(audit: GamePostgameAudit): GamePostgameAuditUmpireVerdict {
  return {
    summary: buildUmpireRead(audit),
    highestRiskSplitLabel: audit.umpireSummary?.highestRiskSplit
      ? `${audit.umpireSummary.highestRiskSplit.pitcherThrows}/${audit.umpireSummary.highestRiskSplit.batterStand}`
      : null,
    topPitchType: audit.umpireSummary?.topPitchType?.pitchType ?? null,
    topLane: audit.umpireSummary?.topLane?.lane ?? null,
  };
}

type ReviewEdge =
  | { kind: "clear"; side: GamePostgameAuditSide; other: GamePostgameAuditSide }
  | { kind: "even"; home: GamePostgameAuditSide; away: GamePostgameAuditSide };

function resolveReviewEdge(audit: GamePostgameAudit): ReviewEdge {
  const homeMetric = getComparisonMetric(audit.home, audit.valueMode);
  const awayMetric = getComparisonMetric(audit.away, audit.valueMode);

  if (homeMetric === null || awayMetric === null || homeMetric === awayMetric) {
    return { kind: "even", home: audit.home, away: audit.away };
  }

  return homeMetric > awayMetric
    ? { kind: "clear", side: audit.home, other: audit.away }
    : { kind: "clear", side: audit.away, other: audit.home };
}

function getComparisonMetric(
  side: GamePostgameAuditSide,
  valueMode: GamePostgameAudit["valueMode"],
): number | null {
  if (valueMode === "win") {
    if (isUsableNumber(side.valueSurplus)) return side.valueSurplus;
    if (isUsableNumber(side.totalValue)) return side.totalValue;
    return side.totalChallenges === 0 ? 0 : null;
  }

  if (valueMode === "run") {
    if (isUsableNumber(side.totalValue)) return side.totalValue;
    return side.totalChallenges === 0 ? 0 : null;
  }

  if (isUsableNumber(side.totalValue)) return side.totalValue;
  if (isUsableNumber(side.overturnRate)) return side.overturnRate;
  return side.totalChallenges === 0 ? 0 : null;
}

function buildHeadline(audit: GamePostgameAudit, edge: ReviewEdge) {
  if (edge.kind === "even") {
    return `${audit.awayTeamName} and ${audit.homeTeamName} finished even on replay.`;
  }

  if (edge.side.totalChallenges === 0) {
    return `${edge.side.teamName} stayed out of trouble on replay.`;
  }

  if (
    isUsableNumber(edge.side.totalValue) &&
    isUsableNumber(edge.other.totalValue) &&
    edge.side.totalValue <= VALUE_EPSILON &&
    edge.other.totalValue < 0
  ) {
    return `${edge.side.teamName} handled replay a little better.`;
  }

  return `${edge.side.teamName} won the replay battle.`;
}

function buildSummary(audit: GamePostgameAudit) {
  const resultSentence =
    audit.homeScore !== null && audit.awayScore !== null
      ? describeGameResult(audit)
      : "Final score unavailable.";

  const replaySentence = pickVariant(audit, "fan-summary-replay", [
    `ABS went to replay ${formatChallengeCount(audit.totalChallenges)} and produced ${formatOverturnTotal(audit.overturnedChallenges)}.`,
    `Replay was triggered ${formatChallengeCount(audit.totalChallenges)}, and the clubs came away with ${formatOverturnTotal(audit.overturnedChallenges)}.`,
    `ABS got used ${formatChallengeCount(audit.totalChallenges)} in this game, with ${formatOverturnTotal(audit.overturnedChallenges)} on the board.`,
  ]);

  const timingSentence = pickVariant(audit, "fan-summary-timing", [
    `${describeLateCloseReviews(audit.lateCloseChallenges)}.`,
    `By leverage, ${describeLateCloseReviews(audit.lateCloseChallenges).toLowerCase()}.`,
    `On the leverage side, ${describeLateCloseReviews(audit.lateCloseChallenges).toLowerCase()}.`,
  ]);

  return `${resultSentence} ${replaySentence} ${timingSentence}`;
}

function buildTeamVerdict(
  audit: GamePostgameAudit,
  side: GamePostgameAuditSide,
  opponent: GamePostgameAuditSide,
  outcome: "won" | "lost" | "even",
): GamePostgameAuditTeamVerdict {
  if (audit.valueMode === "win") {
    return {
      teamId: side.teamId,
      teamName: side.teamName,
      wonReviewBattle: outcome === "won",
      summary: buildWinVerdict(side, opponent, outcome),
    };
  }

  if (audit.valueMode === "run") {
    return {
      teamId: side.teamId,
      teamName: side.teamName,
      wonReviewBattle: outcome === "won",
      summary: buildRunVerdict(side, opponent, outcome),
    };
  }

  return {
    teamId: side.teamId,
    teamName: side.teamName,
    wonReviewBattle: outcome === "won",
    summary: buildEstimatedVerdict(side, opponent, outcome),
  };
}

function buildWinVerdict(side: GamePostgameAuditSide, opponent: GamePostgameAuditSide, outcome: "won" | "lost" | "even") {
  if (side.totalChallenges === 0 && opponent.totalChallenges > 0) {
    return outcome === "won"
      ? `${side.teamName} never needed replay, and ${opponent.teamName} lost ground when it went there.`
      : `${side.teamName} never went to replay, so its side of the WE story stayed mostly neutral.`;
  }

  if (!isUsableNumber(side.totalValue)) {
    return `${side.teamName} had ${formatReviewCount(side.totalChallenges)}, but the WE sample is still too light for a firmer team read.`;
  }

  const actualLabel = formatValue(side.totalValue, "win");
  const expectedLabel = formatValue(side.expectedValueSum, "win");
  const hasExpectation = isUsableNumber(side.expectedValueSum);
  const beatModel = isUsableNumber(side.valueSurplus) ? side.valueSurplus > VALUE_EPSILON : false;
  const missedModel = isUsableNumber(side.valueSurplus) ? side.valueSurplus < -VALUE_EPSILON : false;

  if (outcome === "won") {
    if (hasExpectation && beatModel) {
      return `${side.teamName} beat the WE expectation on replay, coming out at ${actualLabel} against ${expectedLabel} expected.`;
    }

    if (hasExpectation && missedModel) {
      return `${side.teamName} still won the replay side, but it came in lighter than expected at ${actualLabel} against ${expectedLabel}.`;
    }

    return `${side.teamName} had the better of replay on the WE side, worth ${actualLabel}.`;
  }

  if (outcome === "lost" && hasExpectation && beatModel) {
    return `${side.teamName} beat the WE expectation on its own challenges, but ${opponent.teamName} still had the better replay night.`;
  }

  if (outcome === "lost" && hasExpectation && missedModel) {
    return `${side.teamName} left WE on the table in replay, checking in at ${actualLabel} against ${expectedLabel} expected.`;
  }

  if (outcome === "even") {
    if (hasExpectation && beatModel) {
      return `${side.teamName} beat the WE expectation on replay, but not by enough to separate from ${opponent.teamName}.`;
    }

    if (hasExpectation && missedModel) {
      return `${side.teamName} came in below the WE expectation, but ${opponent.teamName} landed in the same neighborhood.`;
    }

    return `${side.teamName} came out roughly even on the WE side of replay.`;
  }

  return `${side.teamName} did not get enough out of replay on the WE side, finishing at ${actualLabel}.`;
}

function buildRunVerdict(side: GamePostgameAuditSide, opponent: GamePostgameAuditSide, outcome: "won" | "lost" | "even") {
  if (side.totalChallenges === 0 && opponent.totalChallenges > 0) {
    return outcome === "won"
      ? `${side.teamName} never needed replay, and that mattered because ${opponent.teamName} gave away run value when it challenged.`
      : `${side.teamName} stayed out of replay, so its side of the run-value story stayed mostly neutral.`;
  }

  if (!isUsableNumber(side.totalValue)) {
    return `${side.teamName} had ${formatReviewCount(side.totalChallenges)}, but the run-value sample is still too thin for a stronger call.`;
  }

  const actualLabel = formatValue(side.totalValue, "run");

  if (outcome === "won") {
    if (side.totalValue > VALUE_EPSILON) {
      return `${side.teamName} came out of replay ahead, picking up ${actualLabel} in run expectancy.`;
    }

    if (side.totalValue < -VALUE_EPSILON) {
      return `${side.teamName} still had the better replay night, but mostly because it lost less run expectancy than ${opponent.teamName}.`;
    }

    return `${side.teamName} held serve on replay and still won that part of the game.`;
  }

  if (outcome === "lost" && side.totalValue < -VALUE_EPSILON) {
    return `${side.teamName} gave away ${formatMagnitudeValue(side.totalValue, "run")} in run expectancy on replay.`;
  }

  if (outcome === "lost" && side.totalValue > VALUE_EPSILON) {
    return `${side.teamName} still gained ${actualLabel} on replay, but ${opponent.teamName} got more out of its challenges.`;
  }

  if (outcome === "even") {
    if (side.totalValue > VALUE_EPSILON) {
      return `${side.teamName} gained ${actualLabel} on replay, but not enough to separate from ${opponent.teamName}.`;
    }

    if (side.totalValue < -VALUE_EPSILON) {
      return `${side.teamName} lost ${formatMagnitudeValue(side.totalValue, "run")} on replay, and ${opponent.teamName} was in the same range.`;
    }

    return `${side.teamName} came out essentially even on replay.`;
  }

  return `${side.teamName} held even on replay, but ${opponent.teamName} got more out of the challenge calls.`;
}

function buildEstimatedVerdict(
  side: GamePostgameAuditSide,
  opponent: GamePostgameAuditSide,
  outcome: "won" | "lost" | "even",
) {
  if (side.totalChallenges === 0 && opponent.totalChallenges > 0) {
    return outcome === "won"
      ? `${side.teamName} stayed off replay altogether, which kept it clear of any challenge damage.`
      : `${side.teamName} never went to replay, so the estimated-swing read does not have much to work with on its side.`;
  }

  if (!isUsableNumber(side.totalValue)) {
    return `${side.teamName} logged ${formatReviewCount(side.totalChallenges)}, but the game is still too thin for a stronger estimated-swing call.`;
  }

  if (outcome === "won") {
    return `${side.teamName} came out a little cleaner in replay, worth ${formatValue(side.totalValue, "estimated")}.`;
  }

  if (outcome === "even") {
    return `${side.teamName} came out roughly even on estimated swing.`;
  }

  return `${side.teamName} never made enough out of replay to catch ${opponent.teamName} on estimated swing.`;
}

function buildValueRead(
  audit: GamePostgameAudit,
  edge: ReviewEdge,
  actualLabel: string,
  expectedLabel: string,
  surplusLabel: string,
) {
  if (audit.valueMode === "win" && audit.totalExpectedValue !== null && audit.totalActualValue !== null) {
    const expectationSentence =
      audit.totalValueSurplus === null
        ? "Replay came in right around model expectation."
        : audit.totalValueSurplus >= 0
          ? `Replay beat the model by ${surplusLabel}.`
          : `Replay fell ${formatMagnitudeValue(audit.totalValueSurplus, "win")} short of the model.`;

    const opener = pickVariant(audit, "fan-value-win", [
      "There is enough win-probability coverage to score this one on WE.",
      "This one has enough win-probability coverage for a real WE read.",
      "The WE layer is strong enough here to score the review game cleanly.",
    ]);

    return `${opener} Reviewed calls were worth ${actualLabel} against ${expectedLabel} expected. ${expectationSentence} ${describeReviewEdge(audit, edge, "win")}`;
  }

  if (audit.valueMode === "run" && audit.totalActualValue !== null) {
    const opener = pickVariant(audit, "fan-value-run", [
      "There is not enough clean win-probability coverage for a fair WE comparison here, so the postgame falls back to run expectancy.",
      "The WE sample is not clean enough for a fair comparison, so the postgame leans on run expectancy instead.",
      "With the WE layer too thin for a clean read, this postgame falls back to run expectancy.",
    ]);

    return `${opener} Reviewed calls swung ${actualLabel} in run value. ${describeReviewEdge(audit, edge, "run")}`;
  }

  const opener = pickVariant(audit, "fan-value-estimated", [
    "This game is too thin for a clean WE or RE read, so the postgame falls back to estimated swing.",
    "Neither the WE nor the RE layer is sturdy enough here, so the postgame leans on estimated swing.",
    "The value layers are too thin for a firmer read here, so the postgame falls back to estimated swing.",
  ]);

  return `${opener} ${describeReviewEdge(audit, edge, "estimated")}`;
}

function describeReviewEdge(audit: GamePostgameAudit, edge: ReviewEdge, valueMode: GamePostgameAudit["valueMode"]) {
  if (edge.kind === "even") {
    return valueMode === "estimated"
      ? "Neither club opened much daylight in replay."
      : "Neither club opened real daylight once the replay calls were stacked up.";
  }

  const winner = edge.side;
  const loser = edge.other;

  if (winner.totalChallenges === 0 && loser.totalChallenges > 0) {
    return `${winner.teamName} never needed replay, while ${loser.teamName} gave away ${formatMagnitudeValue(loser.totalValue, valueMode)} on its challenges.`;
  }

  if (loser.totalChallenges === 0 && winner.totalChallenges > 0) {
    return `${winner.teamName} was the only club that went to replay, and those ${formatReviewCount(winner.totalChallenges)} came out to ${formatValue(winner.totalValue, valueMode)}.`;
  }

  if (valueMode === "win" && isUsableNumber(winner.valueSurplus) && isUsableNumber(loser.valueSurplus)) {
    if (winner.valueSurplus > VALUE_EPSILON && loser.valueSurplus < -VALUE_EPSILON) {
      return `${winner.teamName} beat the model by ${formatValue(winner.valueSurplus, "win")} while ${loser.teamName} fell ${formatMagnitudeValue(loser.valueSurplus, "win")} short.`;
    }

    if (winner.valueSurplus > VALUE_EPSILON && isZeroish(loser.valueSurplus)) {
      return `${winner.teamName} beat the model while ${loser.teamName} came in right around expectation.`;
    }

    if (winner.valueSurplus > VALUE_EPSILON && loser.valueSurplus > VALUE_EPSILON) {
      return `${winner.teamName} beat the model by more, ${formatValue(winner.valueSurplus, "win")} to ${formatValue(loser.valueSurplus, "win")}.`;
    }

    if (winner.valueSurplus < -VALUE_EPSILON && loser.valueSurplus < -VALUE_EPSILON) {
      return `${winner.teamName} missed the model by less, ${formatMagnitudeValue(winner.valueSurplus, "win")} short to ${formatMagnitudeValue(loser.valueSurplus, "win")} short.`;
    }
  }

  if (!isUsableNumber(winner.totalValue) || !isUsableNumber(loser.totalValue)) {
    return `${winner.teamName} had the better of replay, but one side of the value sample is still too light for a sharper comparison.`;
  }

  if (winner.totalValue > VALUE_EPSILON && loser.totalValue < -VALUE_EPSILON) {
    return `${winner.teamName} gained ${formatValue(winner.totalValue, valueMode)} on replay while ${loser.teamName} gave away ${formatMagnitudeValue(loser.totalValue, valueMode)}.`;
  }

  if (winner.totalValue > VALUE_EPSILON && isZeroish(loser.totalValue)) {
    return `${winner.teamName} squeezed value out of replay while ${loser.teamName} came away even.`;
  }

  if (isZeroish(winner.totalValue) && loser.totalValue < -VALUE_EPSILON) {
    return `${winner.teamName} held even on replay while ${loser.teamName} lost ground.`;
  }

  if (winner.totalValue < -VALUE_EPSILON && loser.totalValue < -VALUE_EPSILON) {
    return `${winner.teamName} lost less on replay, ${formatValue(winner.totalValue, valueMode)} to ${formatValue(loser.totalValue, valueMode)}.`;
  }

  if (winner.totalValue > VALUE_EPSILON && loser.totalValue > VALUE_EPSILON) {
    return `${winner.teamName} got more out of replay, ${formatValue(winner.totalValue, valueMode)} to ${formatValue(loser.totalValue, valueMode)}.`;
  }

  return `${winner.teamName} came out a little better in replay, ${formatValue(winner.totalValue, valueMode)} to ${formatValue(loser.totalValue, valueMode)}.`;
}

function buildUmpireRead(audit: GamePostgameAudit) {
  if (!audit.umpireSummary || audit.umpireSummary.totalChallenges === 0) {
    return "There was not enough replay action here to build a real umpire note from the postgame sample.";
  }

  const highestRiskSplit = audit.umpireSummary.highestRiskSplit;
  const topPitchType = audit.umpireSummary.topPitchType;
  const topLane = audit.umpireSummary.topLane;

  const splitSentence = highestRiskSplit
    ? buildSplitSentence(highestRiskSplit)
    : "No handedness split drew enough replay action to shape the game story.";

  const pitchSentence = topPitchType
    ? topPitchType.sampleSize === 1
      ? `Only one ${topPitchType.pitchType} was challenged.`
      : topPitchType.sampleSize === 2
        ? `${topPitchType.pitchType} was challenged twice.`
        : `${topPitchType.pitchType} was the pitch taken to replay most often, with ${formatReviewCount(topPitchType.sampleSize)} and a ${formatShare(topPitchType.overturnRate)} overturn rate.`
    : "No one pitch type carried enough replay volume to matter much.";

  const laneSentence = topLane
    ? topLane.sampleSize === 1
      ? `${topLane.lane} saw only one challenged pitch.`
      : topLane.sampleSize === 2
        ? `${topLane.lane} saw two challenged pitches.`
        : `${topLane.lane} was the most challenged part of the zone, with ${formatReviewCount(topLane.sampleSize)} and a ${formatShare(topLane.overturnRate)} overturn rate.`
    : "No one part of the zone drew enough challenged pitches to stand out.";

  return `${splitSentence} ${pitchSentence} ${laneSentence}`;
}

function buildSplitSentence(
  highestRiskSplit: {
    pitcherThrows: string;
    batterStand: string;
    sampleSize: number;
    overturnRate: number;
  },
) {
  const label = `${highestRiskSplit.pitcherThrows}/${highestRiskSplit.batterStand} matchups`;

  if (highestRiskSplit.sampleSize === 1) {
    return pickVariantFromKey(label, "fan-split-1", [
      `${label} got checked once, so that reads as a footnote more than a trend.`,
      `Only one ${label} review showed up, which leaves that split as a note more than a signal.`,
      `${label} reached replay once, so there is not much there beyond a one-off note.`,
    ]);
  }

  if (highestRiskSplit.sampleSize === 2) {
    return pickVariantFromKey(label, "fan-split-2", [
      `${label} drew two reviews and went ${formatForRecord(highestRiskSplit.sampleSize, highestRiskSplit.overturnRate)} on overturns. That is still too small a sample to call a trend.`,
      `${label} only showed up twice, going ${formatForRecord(highestRiskSplit.sampleSize, highestRiskSplit.overturnRate)} on overturns. That is still light.`,
      `${label} produced two replay checks and a ${formatForRecord(highestRiskSplit.sampleSize, highestRiskSplit.overturnRate)} mark. That is not enough to push it past the small-sample bucket.`,
    ]);
  }

  if (highestRiskSplit.sampleSize < 5) {
    return pickVariantFromKey(label, "fan-split-light", [
      `${label} drew the most replay attention, going ${formatForRecord(highestRiskSplit.sampleSize, highestRiskSplit.overturnRate)} on overturns. The sample is still light.`,
      `${label} saw the most replay action, with a ${formatForRecord(highestRiskSplit.sampleSize, highestRiskSplit.overturnRate)} overturn record. The sample is still light.`,
      `${label} led the replay sample at ${formatForRecord(highestRiskSplit.sampleSize, highestRiskSplit.overturnRate)} on overturns, though the volume is still light.`,
    ]);
  }

  return pickVariantFromKey(label, "fan-split-full", [
    `${label} drew the most replay attention, going ${formatForRecord(highestRiskSplit.sampleSize, highestRiskSplit.overturnRate)} on overturns.`,
    `${label} carried the heaviest replay sample, with a ${formatForRecord(highestRiskSplit.sampleSize, highestRiskSplit.overturnRate)} overturn record.`,
    `${label} was the busiest split in replay, finishing ${formatForRecord(highestRiskSplit.sampleSize, highestRiskSplit.overturnRate)} on overturns.`,
  ]);
}

function buildOrgNarrative(audit: GamePostgameAudit): GamePostgameAuditNarrative {
  const edge = resolveReviewEdge(audit);
  const actualLabel = formatValue(audit.totalActualValue, audit.valueMode);
  const expectedLabel = formatValue(audit.totalExpectedValue, "win");

  return {
    headline: buildOrgHeadline(audit, edge),
    summary: `${describeGameResult(audit)} ${pickVariant(audit, "org-summary", [
      `Clubs went to ABS ${formatChallengeCount(audit.totalChallenges)}, with ${formatOverturnTotal(audit.overturnedChallenges)} and ${describeLateCloseReviews(audit.lateCloseChallenges).toLowerCase()}.`,
      `Review inventory got used ${formatChallengeCount(audit.totalChallenges)} and produced ${formatOverturnTotal(audit.overturnedChallenges)}. ${describeLateCloseReviews(audit.lateCloseChallenges)}.`,
      `The game produced ${formatReviewCount(audit.totalChallenges)} and ${formatOverturnTotal(audit.overturnedChallenges)}. ${describeLateCloseReviews(audit.lateCloseChallenges)}.`,
    ])}`,
    valueRead: buildOrgValueRead(audit, edge, actualLabel, expectedLabel),
    umpireRead: buildOrgUmpireRead(audit),
  };
}

function buildOrgCoverage(audit: GamePostgameAudit): GamePostgameAuditCoverage {
  return {
    valueMode: audit.valueMode,
    hasExpectedValueLayer: audit.totalExpectedValue !== null,
    hasTrustedActualValueLayer: audit.totalActualValue !== null,
    methodologyNote:
      audit.valueMode === "win"
        ? "This audit has enough win-probability coverage to compare realized review value against expected challenge value."
        : audit.valueMode === "run"
          ? "Win-probability coverage is incomplete here, so the audit leans on realized run value instead of a surplus read."
          : "This game is too thin for a clean win- or run-value audit, so the report falls back to estimated swing.",
  };
}

function buildOrgTeamVerdicts(audit: GamePostgameAudit): { home: GamePostgameAuditTeamVerdict; away: GamePostgameAuditTeamVerdict } {
  const edge = resolveReviewEdge(audit);
  const homeOutcome = edge.kind === "even" ? "even" : edge.side.teamId === audit.home.teamId ? "won" : "lost";
  const awayOutcome = edge.kind === "even" ? "even" : edge.side.teamId === audit.away.teamId ? "won" : "lost";

  return {
    home: {
      teamId: audit.home.teamId,
      teamName: audit.home.teamName,
      wonReviewBattle: homeOutcome === "won",
      summary: buildOrgTeamVerdict(audit, audit.home, audit.away, homeOutcome),
    },
    away: {
      teamId: audit.away.teamId,
      teamName: audit.away.teamName,
      wonReviewBattle: awayOutcome === "won",
      summary: buildOrgTeamVerdict(audit, audit.away, audit.home, awayOutcome),
    },
  };
}

function buildOrgUmpireVerdict(audit: GamePostgameAudit): GamePostgameAuditUmpireVerdict {
  return {
    summary: buildOrgUmpireRead(audit),
    highestRiskSplitLabel: audit.umpireSummary?.highestRiskSplit
      ? `${audit.umpireSummary.highestRiskSplit.pitcherThrows}/${audit.umpireSummary.highestRiskSplit.batterStand}`
      : null,
    topPitchType: audit.umpireSummary?.topPitchType?.pitchType ?? null,
    topLane: audit.umpireSummary?.topLane?.lane ?? null,
  };
}

function buildOrgHeadline(audit: GamePostgameAudit, edge: ReviewEdge) {
  if (edge.kind === "even") {
    return `${audit.awayTeamName} and ${audit.homeTeamName} finished essentially even on review value.`;
  }

  if (edge.side.totalChallenges === 0) {
    return `${edge.side.teamName} protected its challenge inventory and stayed out of replay.`;
  }

  if (
    isUsableNumber(edge.side.totalValue) &&
    isUsableNumber(edge.other.totalValue) &&
    edge.side.totalValue <= VALUE_EPSILON &&
    edge.other.totalValue < 0
  ) {
    return `${edge.side.teamName} graded slightly better on the review edge.`;
  }

  return `${edge.side.teamName} won the review-value battle.`;
}

function buildOrgValueRead(
  audit: GamePostgameAudit,
  edge: ReviewEdge,
  actualLabel: string,
  expectedLabel: string,
) {
  if (audit.valueMode === "win" && audit.totalExpectedValue !== null && audit.totalActualValue !== null) {
    const surplusSentence =
      audit.totalValueSurplus === null
        ? "Realized review value landed right around expectation."
        : audit.totalValueSurplus >= 0
          ? `Decision surplus finished at ${formatValue(audit.totalValueSurplus, "win")}.`
          : `Decision cost finished at ${formatMagnitudeValue(audit.totalValueSurplus, "win")}.`;
    const opener = pickVariant(audit, "org-value-win", [
      "There is enough win-probability coverage to compare realized review value against expected challenge value.",
      "The WE layer is sturdy enough here for a clean expected-versus-realized review read.",
      "This game has enough WE coverage to score process against outcome on the review side.",
    ]);
    return `${opener} Reviewed calls returned ${actualLabel} against ${expectedLabel} expected. ${surplusSentence} ${describeOrgEdge(audit, edge)}`;
  }

  if (audit.valueMode === "run" && audit.totalActualValue !== null) {
    const opener = pickVariant(audit, "org-value-run", [
      "Win-probability coverage is incomplete here, so the audit falls back to realized run value instead of an expected-value comparison.",
      "The WE layer is incomplete here, so the audit leans on realized run value instead of a process-versus-outcome comparison.",
      "With incomplete WE coverage, the cleanest postgame audit here is realized run value.",
    ]);
    return `${opener} Reviewed calls moved ${actualLabel} in run value. ${describeOrgEdge(audit, edge)}`;
  }

  const opener = pickVariant(audit, "org-value-estimated", [
    "This game is too thin for a clean win- or run-value audit, so the postgame falls back to estimated swing.",
    "The value layers are too thin here for a firmer audit, so the postgame falls back to estimated swing.",
    "Neither the WE nor the RE sample is sturdy enough here, so the audit falls back to estimated swing.",
  ]);
  return `${opener} ${describeOrgEdge(audit, edge)}`;
}

function describeOrgEdge(audit: GamePostgameAudit, edge: ReviewEdge) {
  if (edge.kind === "even") {
    return "Neither club created meaningful separation once the review outcomes were stacked up.";
  }

  const winner = edge.side;
  const loser = edge.other;

  if (winner.totalChallenges === 0 && loser.totalChallenges > 0) {
    return `${winner.teamName} preserved its review inventory, while ${loser.teamName} gave away ${formatMagnitudeValue(loser.totalValue, audit.valueMode)} when it went to replay.`;
  }

  if (loser.totalChallenges === 0 && winner.totalChallenges > 0) {
    return `${winner.teamName} was the only club that spent review inventory, and those ${formatReviewCount(winner.totalChallenges)} returned ${formatValue(winner.totalValue, audit.valueMode)}.`;
  }

  if (audit.valueMode === "win" && isUsableNumber(winner.valueSurplus) && isUsableNumber(loser.valueSurplus)) {
    if (winner.valueSurplus > VALUE_EPSILON && loser.valueSurplus < -VALUE_EPSILON) {
      return `${winner.teamName} posted positive decision surplus of ${formatValue(winner.valueSurplus, "win")} while ${loser.teamName} took on ${formatMagnitudeValue(loser.valueSurplus, "win")} of decision cost.`;
    }
    if (winner.valueSurplus > VALUE_EPSILON && loser.valueSurplus > VALUE_EPSILON) {
      return `${winner.teamName} created more decision surplus, ${formatValue(winner.valueSurplus, "win")} to ${formatValue(loser.valueSurplus, "win")}.`;
    }
    if (winner.valueSurplus < -VALUE_EPSILON && loser.valueSurplus < -VALUE_EPSILON) {
      return `${winner.teamName} carried less decision cost, ${formatMagnitudeValue(winner.valueSurplus, "win")} to ${formatMagnitudeValue(loser.valueSurplus, "win")}.`;
    }
  }

  if (!isUsableNumber(winner.totalValue) || !isUsableNumber(loser.totalValue)) {
    return `${winner.teamName} graded better, but one side of the review sample is still too thin for a sharper comparison.`;
  }

  if (winner.totalValue > VALUE_EPSILON && loser.totalValue < -VALUE_EPSILON) {
    return `${winner.teamName} captured ${formatValue(winner.totalValue, audit.valueMode)} in realized value while ${loser.teamName} gave away ${formatMagnitudeValue(loser.totalValue, audit.valueMode)}.`;
  }

  if (winner.totalValue > VALUE_EPSILON && isZeroish(loser.totalValue)) {
    return `${winner.teamName} extracted value while ${loser.teamName} finished essentially neutral.`;
  }

  if (isZeroish(winner.totalValue) && loser.totalValue < -VALUE_EPSILON) {
    return `${winner.teamName} stayed neutral on review value while ${loser.teamName} lost ground.`;
  }

  if (winner.totalValue < -VALUE_EPSILON && loser.totalValue < -VALUE_EPSILON) {
    return `${winner.teamName} limited decision cost better, ${formatValue(winner.totalValue, audit.valueMode)} to ${formatValue(loser.totalValue, audit.valueMode)}.`;
  }

  return `${winner.teamName} graded slightly better on the review edge, ${formatValue(winner.totalValue, audit.valueMode)} to ${formatValue(loser.totalValue, audit.valueMode)}.`;
}

function buildOrgTeamVerdict(
  audit: GamePostgameAudit,
  side: GamePostgameAuditSide,
  opponent: GamePostgameAuditSide,
  outcome: "won" | "lost" | "even",
) {
  if (side.totalChallenges === 0 && opponent.totalChallenges > 0) {
    return outcome === "won"
      ? `${side.teamName} never had to spend a challenge, while ${opponent.teamName} lost value when it did.`
      : `${side.teamName} stayed out of replay, so its side of the review audit stayed mostly neutral.`;
  }

  if (audit.valueMode === "win") {
    if (!isUsableNumber(side.totalValue)) {
      return `${side.teamName} logged ${formatReviewCount(side.totalChallenges)}, but the WE sample is still too light for a firmer process read.`;
    }
    if (isUsableNumber(side.expectedValueSum)) {
      if (outcome === "won") {
        return `${side.teamName} turned ${formatValue(side.totalValue, "win")} of realized review value against ${formatValue(side.expectedValueSum, "win")} expected.`;
      }
      if (outcome === "lost") {
        return `${side.teamName} finished at ${formatValue(side.totalValue, "win")} against ${formatValue(side.expectedValueSum, "win")} expected and lost ground in the broader process read.`;
      }
      return `${side.teamName} finished near even on review value, at ${formatValue(side.totalValue, "win")} against ${formatValue(side.expectedValueSum, "win")} expected.`;
    }
    return `${side.teamName} finished at ${formatValue(side.totalValue, "win")} on the WE side of the audit.`;
  }

  if (audit.valueMode === "run") {
    if (!isUsableNumber(side.totalValue)) {
      return `${side.teamName} logged ${formatReviewCount(side.totalChallenges)}, but the realized run-value sample is still too thin for a firmer process read.`;
    }
    if (outcome === "won") {
      return side.totalValue > VALUE_EPSILON
        ? `${side.teamName} captured ${formatValue(side.totalValue, "run")} in realized run value through stronger review decisions.`
        : `${side.teamName} still graded better, largely by limiting decision cost better than ${opponent.teamName}.`;
    }
    if (outcome === "lost") {
      return side.totalValue < -VALUE_EPSILON
        ? `${side.teamName} gave away ${formatMagnitudeValue(side.totalValue, "run")} in realized run value on replay.`
        : `${side.teamName} still captured ${formatValue(side.totalValue, "run")}, but ${opponent.teamName} extracted more out of its review inventory.`;
    }
    return isZeroish(side.totalValue)
      ? `${side.teamName} finished essentially even on review value.`
      : `${side.teamName} landed in the same realized run-value band as ${opponent.teamName}.`;
  }

  if (!isUsableNumber(side.totalValue)) {
    return `${side.teamName} logged ${formatReviewCount(side.totalChallenges)}, but the game is still too thin for a stronger estimated-swing audit.`;
  }
  if (outcome === "won") return `${side.teamName} graded slightly better on estimated swing, worth ${formatValue(side.totalValue, "estimated")}.`;
  if (outcome === "even") return `${side.teamName} finished roughly even on estimated swing.`;
  return `${side.teamName} did not create enough separation to catch ${opponent.teamName} on estimated swing.`;
}

function buildOrgUmpireRead(audit: GamePostgameAudit) {
  if (!audit.umpireSummary || audit.umpireSummary.totalChallenges === 0) {
    return "There was not enough replay volume here to build a real umpire exposure note from the postgame sample.";
  }

  const highestRiskSplit = audit.umpireSummary.highestRiskSplit;
  const topPitchType = audit.umpireSummary.topPitchType;
  const topLane = audit.umpireSummary.topLane;

  const splitSentence = highestRiskSplit
    ? buildOrgSplitSentence(highestRiskSplit)
    : "No handedness split drew enough replay volume to shape the challenge-rhythm note.";

  const pitchSentence = topPitchType
    ? topPitchType.sampleSize <= 2
      ? `${topPitchType.pitchType} reached review ${topPitchType.sampleSize === 1 ? "once" : "twice"}, so the pitch-type exposure signal is still light.`
      : `${topPitchType.pitchType} carried the heaviest review exposure, with ${formatReviewCount(topPitchType.sampleSize)} and a ${formatShare(topPitchType.overturnRate)} overturn rate.`
    : "No one pitch type carried enough review exposure to shape the umpire file.";

  const laneSentence = topLane
    ? topLane.sampleSize <= 2
      ? `${topLane.lane} saw ${topLane.sampleSize === 1 ? "one challenged pitch" : "two challenged pitches"}, which reads more like early zone vulnerability than a stable overturn lane.`
      : `${topLane.lane} was the clearest overturn lane, with ${formatReviewCount(topLane.sampleSize)} and a ${formatShare(topLane.overturnRate)} overturn rate.`
    : "No one part of the zone drew enough challenged pitches to establish a clear overturn lane.";

  return `${splitSentence} ${pitchSentence} ${laneSentence}`;
}

function buildOrgSplitSentence(highestRiskSplit: {
  pitcherThrows: string;
  batterStand: string;
  sampleSize: number;
  overturnRate: number;
}) {
  const label = `${highestRiskSplit.pitcherThrows}/${highestRiskSplit.batterStand} matchups`;

  if (highestRiskSplit.sampleSize === 1) {
    return pickVariantFromKey(label, "org-split-1", [
      `${label} reached review once, which is not enough to say anything useful about challenge rhythm.`,
      `${label} only showed up once in review, so there is no exposure signal there.`,
      `One ${label} review is not enough to build anything useful around challenge rhythm.`,
    ]);
  }

  if (highestRiskSplit.sampleSize === 2) {
    return pickVariantFromKey(label, "org-split-2", [
      `${label} drew two reviews and went ${formatForRecord(highestRiskSplit.sampleSize, highestRiskSplit.overturnRate)} on overturns. That is still too small a sample to make it a real exposure signal.`,
      `${label} only reached review twice, finishing ${formatForRecord(highestRiskSplit.sampleSize, highestRiskSplit.overturnRate)} on overturns. That is still light.`,
      `${label} produced two review events and a ${formatForRecord(highestRiskSplit.sampleSize, highestRiskSplit.overturnRate)} overturn mark. That is still too thin to treat as a stable exposure note.`,
    ]);
  }

  if (highestRiskSplit.sampleSize < 5) {
    return pickVariantFromKey(label, "org-split-light", [
      `${label} carried the most review exposure, going ${formatForRecord(highestRiskSplit.sampleSize, highestRiskSplit.overturnRate)} on overturns. The challenge-rhythm sample is still light.`,
      `${label} led the review-exposure sample at ${formatForRecord(highestRiskSplit.sampleSize, highestRiskSplit.overturnRate)} on overturns, though the volume is still light.`,
      `${label} was the busiest split in the review sample, going ${formatForRecord(highestRiskSplit.sampleSize, highestRiskSplit.overturnRate)} on overturns. The challenge-rhythm sample is still light.`,
    ]);
  }

  return pickVariantFromKey(label, "org-split-full", [
    `${label} carried the most review exposure, going ${formatForRecord(highestRiskSplit.sampleSize, highestRiskSplit.overturnRate)} on overturns.`,
    `${label} led the exposure sample, finishing ${formatForRecord(highestRiskSplit.sampleSize, highestRiskSplit.overturnRate)} on overturns.`,
    `${label} was the busiest reviewed split, going ${formatForRecord(highestRiskSplit.sampleSize, highestRiskSplit.overturnRate)} on overturns.`,
  ]);
}

function pickVariant(audit: Pick<GamePostgameAudit, "gamePk" | "totalChallenges" | "overturnedChallenges">, key: string, options: string[]) {
  return options[stableVariantIndex(`${audit.gamePk}:${audit.totalChallenges}:${audit.overturnedChallenges}:${key}`, options.length)];
}

function pickVariantFromKey(seedKey: string, key: string, options: string[]) {
  return options[stableVariantIndex(`${seedKey}:${key}`, options.length)];
}

function stableVariantIndex(seed: string, size: number) {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 33 + seed.charCodeAt(index)) >>> 0;
  }
  return size <= 1 ? 0 : hash % size;
}

function describeGameResult(audit: GamePostgameAudit) {
  if (audit.homeScore === null || audit.awayScore === null) return "Final score unavailable.";
  if (audit.homeScore === audit.awayScore) {
    return `${audit.awayTeamName} and ${audit.homeTeamName} finished level at ${audit.awayScore}-${audit.homeScore}.`;
  }

  const homeWon = audit.homeScore > audit.awayScore;
  const winner = homeWon ? audit.homeTeamName : audit.awayTeamName;
  const loser = homeWon ? audit.awayTeamName : audit.homeTeamName;
  const winnerScore = homeWon ? audit.homeScore : audit.awayScore;
  const loserScore = homeWon ? audit.awayScore : audit.homeScore;
  return `${winner} beat ${loser} ${winnerScore}-${loserScore}.`;
}

function describeLateCloseReviews(value: number) {
  if (value <= 0) return "None of those reviews came in a late-close spot";
  if (value === 1) return "One of those reviews came in a late-close spot";
  return `${value} of those reviews came in late-close spots`;
}

function formatReviewCount(value: number) {
  return value === 1 ? "1 review" : `${value} reviews`;
}

function formatChallengeCount(value: number) {
  return value === 1 ? "1 time" : `${value} times`;
}

function formatOverturnTotal(value: number) {
  return value === 1 ? "1 overturn" : `${value} overturns`;
}

function formatForRecord(sampleSize: number, overturnRate: number) {
  return `${Math.round(sampleSize * overturnRate)}-for-${sampleSize}`;
}

function formatShare(value: number | null | undefined) {
  if (!isUsableNumber(value)) return "N/A";
  const pct = value * 100;
  if (pct <= 0) return "0%";
  if (pct < 1) return "<1%";
  if (pct < 10) return `${pct.toFixed(1)}%`;
  return `${Math.round(pct)}%`;
}

function formatValue(value: number | null | undefined, mode: "win" | "run" | "estimated") {
  if (!isUsableNumber(value)) return "N/A";
  if (mode === "estimated") return `${value >= 0 ? "+" : ""}${value.toFixed(2)} ECS`;
  return `${value >= 0 ? "+" : ""}${(value * 100).toFixed(2)}%`;
}

function formatMagnitudeValue(value: number | null | undefined, mode: "win" | "run" | "estimated") {
  if (!isUsableNumber(value)) return "N/A";
  return formatValue(Math.abs(value), mode).replace(/^\+/, "");
}

function isUsableNumber(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isZeroish(value: number | null | undefined) {
  return isUsableNumber(value) && Math.abs(value) < VALUE_EPSILON;
}
