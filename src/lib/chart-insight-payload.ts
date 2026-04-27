import type {
  ChallengeEvent,
  ChallengeValueTimelineEntry,
  GameChallengeOpportunityBoard,
  TeamChallengeScenarioCell,
  TeamChallengeValueSummary,
  TeamDecisionValueReport,
} from "@/lib/types";
import { getChallengeCountState } from "@/lib/challenge-context";

export type StructuredChartInsight = {
  headline: string;
  sections: Array<{
    label: string;
    body: string;
  }>;
};

export type ChartInsightPayload = {
  chartType: string;
  chartKey: string;
  chartTitle: string;
  baseballQuestion: string;
  chartSummary: string;
  payload: Record<string, unknown>;
};

export type UmpireRhythmPoint = {
  inning: number;
  total: number;
  overturned: number;
  accuracy: number;
};

export type ZoneNineCellInsight = {
  key: string;
  label: string;
  challenges: number;
  overturnRate: number;
};

export function buildUmpireRhythmChartPayload(
  umpireId: number,
  umpireName: string,
  rhythm: UmpireRhythmPoint[],
): ChartInsightPayload {
  const rankedByAccuracy = [...rhythm].sort((a, b) => a.accuracy - b.accuracy);
  const best = rankedByAccuracy.at(-1) ?? null;
  const worst = rankedByAccuracy[0] ?? null;
  const early = rhythm.filter((entry) => entry.inning <= 3);
  const late = rhythm.filter((entry) => entry.inning >= 7);
  const average = (entries: UmpireRhythmPoint[]) =>
    entries.length ? entries.reduce((sum, entry) => sum + entry.accuracy, 0) / entries.length : null;
  const earlyAverage = average(early);
  const lateAverage = average(late);
  const lateSwingPct =
    earlyAverage !== null && lateAverage !== null ? Number(((lateAverage - earlyAverage) * 100).toFixed(2)) : null;

  return {
    chartType: "umpire_rhythm",
    chartKey: `umpire-rhythm:${umpireId}`,
    chartTitle: "Umpire Rhythm",
    baseballQuestion: "Does challenged-call accuracy hold, improve, or fade as the game moves inning by inning?",
    chartSummary: `${umpireName} rhythm chart based on inning-level challenged-call accuracy.`,
    payload: {
      umpireId,
      umpireName,
      sampleSize: rhythm.reduce((sum, entry) => sum + entry.total, 0),
      inningsTracked: rhythm.length,
      bestInning: best
        ? {
            inning: best.inning,
            accuracyPct: Number((best.accuracy * 100).toFixed(1)),
            challenges: best.total,
          }
        : null,
      worstInning: worst
        ? {
            inning: worst.inning,
            accuracyPct: Number((worst.accuracy * 100).toFixed(1)),
            challenges: worst.total,
          }
        : null,
      earlyAverageAccuracyPct: earlyAverage !== null ? Number((earlyAverage * 100).toFixed(1)) : null,
      lateAverageAccuracyPct: lateAverage !== null ? Number((lateAverage * 100).toFixed(1)) : null,
      lateSwingPct,
      innings: rhythm.map((entry) => ({
        inning: entry.inning,
        challenges: entry.total,
        overturned: entry.overturned,
        accuracyPct: Number((entry.accuracy * 100).toFixed(1)),
      })),
    },
  };
}

export function buildUmpireZoneMapChartPayload(
  umpireId: number,
  umpireName: string,
  zoneGrid: ZoneNineCellInsight[],
): ChartInsightPayload {
  const occupied = zoneGrid.filter((cell) => cell.challenges > 0);
  const busiest = [...occupied].sort((a, b) => b.challenges - a.challenges)[0] ?? null;
  const highestOverturn = [...occupied].sort(
    (a, b) => b.overturnRate - a.overturnRate || b.challenges - a.challenges,
  )[0] ?? null;

  return {
    chartType: "umpire_zone_map",
    chartKey: `umpire-zone:${umpireId}`,
    chartTitle: "Zone Map",
    baseballQuestion: "Where does challenge traffic actually land, and which strike-zone lanes are most vulnerable to overturns?",
    chartSummary: `${umpireName} nine-zone challenge map built from reviewed pitch locations.`,
    payload: {
      umpireId,
      umpireName,
      occupiedCells: occupied.length,
      totalChallenges: occupied.reduce((sum, cell) => sum + cell.challenges, 0),
      busiestLane: busiest
        ? {
            label: busiest.label,
            challenges: busiest.challenges,
            overturnRatePct: Number((busiest.overturnRate * 100).toFixed(1)),
          }
        : null,
      highestOverturnLane: highestOverturn
        ? {
            label: highestOverturn.label,
            challenges: highestOverturn.challenges,
            overturnRatePct: Number((highestOverturn.overturnRate * 100).toFixed(1)),
          }
        : null,
      zones: zoneGrid.map((cell) => ({
        key: cell.key,
        label: cell.label,
        challenges: cell.challenges,
        overturnRatePct: Number((cell.overturnRate * 100).toFixed(1)),
      })),
    },
  };
}

export function buildTeamDecisionScatterChartPayload(report: TeamDecisionValueReport): ChartInsightPayload {
  const sections = report.breakdownSections.map((section) => ({
    key: section.key,
    title: section.title,
    entries: section.entries.map((entry) => ({
      label: entry.label,
      challenges: entry.challenges,
      expectedWePct:
        entry.averageExpectedChallengeValue === null
          ? null
          : Number((entry.averageExpectedChallengeValue * 100).toFixed(2)),
      realizedWePct:
        entry.averageRealizedChallengeValue === null
          ? null
          : Number((entry.averageRealizedChallengeValue * 100).toFixed(2)),
      surplusPct: entry.decisionSurplus === null ? null : Number((entry.decisionSurplus * 100).toFixed(2)),
    })),
  }));
  const allEntries = sections.flatMap((section) => section.entries);
  const bestSurplus = [...allEntries]
    .filter((entry) => entry.surplusPct !== null)
    .sort((left, right) => (right.surplusPct ?? -Infinity) - (left.surplusPct ?? -Infinity))[0] ?? null;
  const worstSurplus = [...allEntries]
    .filter((entry) => entry.surplusPct !== null)
    .sort((left, right) => (left.surplusPct ?? Infinity) - (right.surplusPct ?? Infinity))[0] ?? null;

  return {
    chartType: "team_decision_value_scatter",
    chartKey: "team-decision-value-scatter",
    chartTitle: "Expected vs Realized Challenge Value",
    baseballQuestion:
      "Is the club winning because it is choosing the right challenge windows, or is it getting noisy results that drift away from process?",
    chartSummary: "Scenario buckets plotted by expected challenge value versus realized challenge value.",
    payload: {
      totalChallenges: report.summary.totalChallenges,
      bestSurplus,
      worstSurplus,
      sections,
    },
  };
}

export function buildTeamInventoryDeploymentChartPayload(report: TeamDecisionValueReport): ChartInsightPayload {
  const inningPhase = report.breakdownSections.find((section) => section.key === "inning_phase");
  const buckets = (inningPhase?.entries ?? []).map((entry) => ({
    label: entry.label,
    challenges: entry.challenges,
    expectedValue: entry.averageExpectedChallengeValue,
    realizedValue: entry.averageRealizedChallengeValue,
    weightedExpected: entry.averageExpectedChallengeValue === null ? null : entry.averageExpectedChallengeValue * entry.challenges,
    weightedRealized: entry.averageRealizedChallengeValue === null ? null : entry.averageRealizedChallengeValue * entry.challenges,
  }));
  const totalWeightedRealized = buckets.reduce(
    (sum, bucket) => sum + Math.abs(bucket.weightedRealized ?? 0),
    0,
  );
  const lateCloseRealizedShare =
    totalWeightedRealized > 0
      ? buckets
          .filter((bucket) => ["Late", "Late (7-9)", "Extras"].includes(bucket.label))
          .reduce((sum, bucket) => sum + Math.abs(bucket.weightedRealized ?? 0), 0) / totalWeightedRealized
      : 0;

  return {
    chartType: "team_inventory_deployment",
    chartKey: "team-inventory-deployment",
    chartTitle: "Usage vs Modeled Value Share",
    baseballQuestion:
      "Is the team actually spending review inventory in the innings where modeled value lives, or just where challenge volume happens to accumulate?",
    chartSummary: "Inning-phase deployment chart comparing challenge usage share with expected and realized value share.",
    payload: {
      totalChallenges: report.summary.totalChallenges,
      lateCloseExpectedSharePct: Number((report.summary.lateCloseExpectedValueShare * 100).toFixed(1)),
      lateCloseRealizedSharePct: Number((lateCloseRealizedShare * 100).toFixed(1)),
      buckets: buckets.map((bucket) => ({
        ...bucket,
        expectedValuePct: bucket.expectedValue === null ? null : Number((bucket.expectedValue * 100).toFixed(2)),
        realizedValuePct: bucket.realizedValue === null ? null : Number((bucket.realizedValue * 100).toFixed(2)),
      })),
    },
  };
}

export function buildTeamChallengeValueMatrixPayload(
  cells: TeamChallengeScenarioCell[],
  summary: TeamChallengeValueSummary,
): ChartInsightPayload {
  const rankedCells = [...cells]
    .sort((left, right) => {
      const rightValue = right.avgWinExpectancyDelta ?? right.avgRunExpectancyDelta ?? right.avgPositiveOutcomeDelta ?? -Infinity;
      const leftValue = left.avgWinExpectancyDelta ?? left.avgRunExpectancyDelta ?? left.avgPositiveOutcomeDelta ?? -Infinity;
      return rightValue - leftValue;
    })
    .slice(0, 8)
    .map((cell) => ({
      rowLabel: cell.rowLabel,
      colLabel: cell.colLabel,
      challenges: cell.challenges,
      avgEli: Number(cell.avgEstimatedLeverage.toFixed(1)),
      avgWinDeltaPct: cell.avgWinExpectancyDelta === null ? null : Number((cell.avgWinExpectancyDelta * 100).toFixed(2)),
      avgRunDelta: cell.avgRunExpectancyDelta === null ? null : Number(cell.avgRunExpectancyDelta.toFixed(3)),
      avgCountEdgePct:
        cell.avgPositiveOutcomeDelta === null ? null : Number((cell.avgPositiveOutcomeDelta * 100).toFixed(1)),
    }));

  return {
    chartType: "team_challenge_value_matrix",
    chartKey: "team-challenge-value-matrix",
    chartTitle: "Challenge Value Matrix",
    baseballQuestion:
      "Which scenario windows are actually worth a team’s reviews, and where is this club deploying challenges into stronger or weaker baseball contexts?",
    chartSummary: "Matrix of challenge timing windows scored by leverage and modeled value.",
    payload: {
      totalChallenges: summary.totalChallenges,
      bestScenarioLabel: summary.bestScenarioLabel,
      bestScenarioChallenges: summary.bestScenarioChallenges,
      highPressureSharePct: Number((summary.highPressureShare * 100).toFixed(1)),
      averageRunExpectancyDelta: summary.averageRunExpectancyDelta,
      averageWinExpectancyDelta:
        summary.averageWinExpectancyDelta === null ? null : Number((summary.averageWinExpectancyDelta * 100).toFixed(2)),
      topCells: rankedCells,
    },
  };
}

export function buildGameChallengeOpportunityBoardPayload(board: GameChallengeOpportunityBoard): ChartInsightPayload {
  const populatedCells = board.cells
    .filter((cell) => cell.homeChallenges + cell.awayChallenges > 0)
    .map((cell) => ({
      rowLabel: cell.rowLabel,
      colLabel: cell.colLabel,
      homeChallenges: cell.homeChallenges,
      awayChallenges: cell.awayChallenges,
      homeAvgEli: Number(cell.homeAvgEstimatedLeverage.toFixed(1)),
      awayAvgEli: Number(cell.awayAvgEstimatedLeverage.toFixed(1)),
      homeHighPressureSharePct: Number((cell.homeHighPressureShare * 100).toFixed(1)),
      awayHighPressureSharePct: Number((cell.awayHighPressureShare * 100).toFixed(1)),
    }))
    .sort((left, right) => right.homeChallenges + right.awayChallenges - (left.homeChallenges + left.awayChallenges))
    .slice(0, 8);

  return {
    chartType: "game_challenge_opportunity_board",
    chartKey: `game-opportunity-board:${board.homeAbbreviation}:${board.awayAbbreviation}`,
    chartTitle: "Challenge Opportunity Board",
    baseballQuestion:
      "Which scenario windows tend to turn into review flashpoints for each club, and where should a staff expect challenge traffic before first pitch?",
    chartSummary: "Pregame board of shared and team-specific challenge windows by inning/count context.",
    payload: {
      homeTeam: board.homeAbbreviation,
      awayTeam: board.awayAbbreviation,
      topCells: populatedCells,
    },
  };
}

export function buildChallengeValueTimelinePayload(entries: ChallengeValueTimelineEntry[]): ChartInsightPayload {
  const simplified = entries.slice(0, 12).map((entry) => ({
    ...(() => {
      const countState = getChallengeCountState(entry.countBefore, entry.umpireCount, entry.countAfter);
      return {
        countBefore: countState.beforeLabel,
        countAfter: countState.afterLabel,
        countShift: countState.transitionLabel,
        terminalOutcome: countState.terminalOutcome,
        countAdvantageLabel: countState.countAdvantageLabel,
      };
    })(),
    challengeId: entry.challengeId,
    inning: entry.inning,
    halfInning: entry.halfInning,
    challengeTeam: entry.challengeTeamName,
    overturned: entry.isOverturned,
    estimatedSwing: entry.estimatedChallengeSwing,
    estimatedEli: entry.estimatedLeverageIndex,
    runDelta: entry.runExpectancyDelta === null ? null : Number(entry.runExpectancyDelta.toFixed(3)),
    winDelta: entry.winExpectancyDelta === null ? null : Number((entry.winExpectancyDelta * 100).toFixed(2)),
    expectedValuePct: entry.expectedChallengeValue === null ? null : Number((entry.expectedChallengeValue * 100).toFixed(2)),
  }));

  return {
    chartType: "challenge_value_timeline",
    chartKey: `challenge-value-timeline:${entries[0]?.challengeId ?? "none"}`,
    chartTitle: "Scenario Timeline",
    baseballQuestion:
      "How did challenge timing and consequence evolve across the game, and which reviewed moments actually carried the biggest baseball cost or gain?",
    chartSummary: "Game-level reviewed moments sorted through leverage, swing, and modeled value.",
    payload: {
      totalChallenges: entries.length,
      overturnedChallenges: entries.filter((entry) => entry.isOverturned).length,
      entries: simplified,
    },
  };
}

export function buildChallengeDecisionChartPayload(challenge: ChallengeEvent): ChartInsightPayload {
  const countState = getChallengeCountState(challenge.countBefore, challenge.umpireCount, challenge.countAfter);
  return {
    chartType: "challenge_decision_brief",
    chartKey: `challenge-decision:${challenge.challengeId}`,
    chartTitle: "Challenge Decision Brief",
    baseballQuestion:
      "How does the model read this reviewed spot, and what do the game state, model value, and historical count context say about that read?",
    chartSummary: "Single-challenge decision brief combining count change, leverage, consequence, and historical context.",
    payload: {
      challengeId: challenge.challengeId,
      matchup: {
        batter: challenge.batterName,
        pitcher: challenge.pitcherName,
        challengeTeam: challenge.challengeTeamName,
      },
      count: {
        before: countState.initial,
        after: countState.final,
        beforeLabel: countState.beforeLabel,
        afterLabel: countState.afterLabel,
        transitionLabel: countState.transitionLabel,
        terminalOutcome: countState.terminalOutcome,
        countAdvantageLabel: countState.countAdvantageLabel,
      },
      gameState: {
        inning: challenge.inning,
        halfInning: challenge.halfInning,
        outs: challenge.outs,
        basesState: challenge.basesState,
        homeScore: challenge.homeScore,
        awayScore: challenge.awayScore,
      },
      pitch: {
        type: challenge.pitchType,
        velocity: challenge.startSpeed === null || challenge.startSpeed === undefined ? null : Number(challenge.startSpeed.toFixed(1)),
        spinRate: challenge.spinRate === null || challenge.spinRate === undefined ? null : Math.round(challenge.spinRate),
        locationX: challenge.px === null || challenge.px === undefined ? null : Number(challenge.px.toFixed(2)),
        locationZ: challenge.pz === null || challenge.pz === undefined ? null : Number(challenge.pz.toFixed(2)),
      },
      decision: {
        overturned: challenge.isOverturned,
        impactType: challenge.impactType,
        positiveOutcomeDeltaPct:
          challenge.positiveOutcomeDelta === null || challenge.positiveOutcomeDelta === undefined
            ? null
            : Number((challenge.positiveOutcomeDelta * 100).toFixed(1)),
        runExpectancyDelta:
          challenge.runExpectancyDelta === null || challenge.runExpectancyDelta === undefined
            ? null
            : Number(challenge.runExpectancyDelta.toFixed(3)),
        winExpectancyDeltaPct:
          challenge.winExpectancyDelta === null || challenge.winExpectancyDelta === undefined
            ? null
            : Number((challenge.winExpectancyDelta * 100).toFixed(2)),
        estimatedLeverageIndex: challenge.estimatedLeverageIndex,
        overturnProbabilityPct:
          challenge.estimatedOverturnProbability === null || challenge.estimatedOverturnProbability === undefined
            ? null
            : Number((challenge.estimatedOverturnProbability * 100).toFixed(1)),
        expectedChallengeValuePct:
          challenge.expectedChallengeValue === null || challenge.expectedChallengeValue === undefined
            ? null
            : Number((challenge.expectedChallengeValue * 100).toFixed(2)),
        recommendation: challenge.decisionRecommendation,
      },
      baselines: {
        heldCount: challenge.heldCountBaseline
          ? {
              countKey: challenge.heldCountBaseline.countKey,
              battingAverage: Number(challenge.heldCountBaseline.battingAverage.toFixed(3)),
              walkRatePct: Number((challenge.heldCountBaseline.walkRate * 100).toFixed(1)),
              strikeoutRatePct: Number((challenge.heldCountBaseline.strikeoutRate * 100).toFixed(1)),
              sampleSize: challenge.heldCountBaseline.plateAppearances,
            }
          : null,
        correctedCount: challenge.correctedCountBaseline
          ? {
              countKey: challenge.correctedCountBaseline.countKey,
              battingAverage: Number(challenge.correctedCountBaseline.battingAverage.toFixed(3)),
              walkRatePct: Number((challenge.correctedCountBaseline.walkRate * 100).toFixed(1)),
              strikeoutRatePct: Number((challenge.correctedCountBaseline.strikeoutRate * 100).toFixed(1)),
              sampleSize: challenge.correctedCountBaseline.plateAppearances,
            }
          : null,
        pitchType: challenge.pitchTypeCountBaseline
          ? {
              pitchType: challenge.pitchTypeCountBaseline.pitchType,
              countKey: challenge.pitchTypeCountBaseline.countKey,
              sampleSize: challenge.pitchTypeCountBaseline.pitchCount,
              challengeRatePct: Number((challenge.pitchTypeCountBaseline.challengeRate * 100).toFixed(1)),
            }
          : null,
        handedness: challenge.handednessBaseline
          ? {
              pitcherThrows: challenge.handednessBaseline.pitcherThrows,
              batterStand: challenge.handednessBaseline.batterStand,
              countKey: challenge.handednessBaseline.countKey,
              overturnRatePct: Number((challenge.handednessBaseline.overturnRate * 100).toFixed(1)),
              sampleSize: challenge.handednessBaseline.sampleSize,
            }
          : null,
      },
    },
  };
}
