import {
  getGame,
  getGameChallenges,
  getGameLiveStatus,
  getHomeChallengeMoments,
  getLiveGames,
  getTeamAggression,
  getTeamChallengeScenarioMatrix,
  getTeamChallengeValueSummary,
  getTeamDecisionValueReport,
  getTeamInningEfficiency,
  getTeamLeaderboardModel,
  getTeamSideSplits,
  getTeamSummary,
  getTeamTrend,
  getUmpireLeaderboardModel,
  getUmpireProfile,
  getUmpireSummary,
} from "@/lib/data";
import type { CopilotContext } from "@/lib/copilot-context";
import type { HomeChallengeMoment, LiveGameCard, RangeKey, TeamLeaderboardEntry, UmpireLeaderboardEntry } from "@/lib/types";
import { getAllowedToolNames, sanitizeToolPayload } from "./ai-policy";

export type ToolResult = {
  toolName: string;
  payload: unknown;
};

type ResolveToolResultsOptions = {
  preferredToolNames?: string[];
  maxArrayItems?: number;
};

function getEntityRange(range?: CopilotContext["range"]): RangeKey {
  if (range === "7d" || range === "30d" || range === "season") return range;
  return "season";
}

function roundNumber(value: number | null | undefined, digits = 3) {
  if (value === null || value === undefined || Number.isNaN(value)) return null;
  return Number(value.toFixed(digits));
}

function sortByNumberDesc<T>(entries: T[], getValue: (entry: T) => number | null | undefined) {
  return [...entries].sort((left, right) => {
    const rightValue = getValue(right) ?? -Infinity;
    const leftValue = getValue(left) ?? -Infinity;
    return rightValue - leftValue;
  });
}

function summarizeLiveGames(games: LiveGameCard[]) {
  return {
    metricNotes: {
      gameChallengeCount: "Total ABS challenges in the game, not a team-owned challenge count.",
      teamChallengeLeaderboards: "Use get_home_team_leaderboard for team season/range challenge leaders.",
    },
    games: games.slice(0, 10).map((game) => ({
      gamePk: game.gamePk,
      status: game.status,
      detailedState: game.detailedState,
      inning: game.inning,
      inningHalf: game.inningHalf,
      matchup: `${game.awayTeamName} at ${game.homeTeamName}`,
      awayTeamName: game.awayTeamName,
      homeTeamName: game.homeTeamName,
      awayScore: game.awayScore,
      homeScore: game.homeScore,
      awayAbsRemaining: game.awayAbsRemaining,
      homeAbsRemaining: game.homeAbsRemaining,
      gameChallengeCount: game.challengeCount,
    })),
  };
}

function summarizeHomeChallengeMoments(moments: HomeChallengeMoment[]) {
  return {
    window: "Recent ABS challenge moments, ordered by product relevance.",
    moments: moments.map((moment) => ({
      challengeId: moment.challengeId,
      gamePk: moment.gamePk,
      challengedAt: moment.challengedAt,
      gameLabel: moment.gameLabel,
      inning: moment.inning,
      halfInning: moment.halfInning,
      count: moment.umpireCount ?? (moment.balls !== null && moment.strikes !== null ? `${moment.balls}-${moment.strikes}` : null),
      challengeTeamName: moment.challengeTeamName,
      isOverturned: moment.isOverturned,
      calledDescription: moment.calledDescription,
      correctedCall: moment.correctedCall,
      playerName: moment.playerName,
      batterName: moment.batterName,
      pitcherName: moment.pitcherName,
      absMargin: roundNumber(moment.absMargin),
      expectedChallengeValue: roundNumber(moment.expectedChallengeValue, 4),
      realizedChallengeValue: roundNumber(moment.realizedChallengeValue, 4),
      reasonChips: moment.reasonChips,
    })),
  };
}

function summarizeTeam(team: TeamLeaderboardEntry) {
  return {
    teamId: team.teamId,
    teamName: team.teamName,
    gamesTracked: team.gamesTracked,
    challengesTotal: team.challengesTotal,
    usedSuccessful: team.usedSuccessful,
    usedFailed: team.usedFailed,
    overturnRate: roundNumber(team.overturnRate),
    avgRemaining: roundNumber(team.avgRemaining, 2),
    challengeRatePerGame: roundNumber(team.challengeRatePerGame, 2),
    orgStyleLabel: team.orgStyleLabel,
    styleConfidence: team.styleConfidence,
    decisionSurplus: roundNumber(team.decisionSurplus, 4),
    averageExpectedChallengeValue: roundNumber(team.averageExpectedChallengeValue, 4),
    averageRealizedChallengeValue: roundNumber(team.averageRealizedChallengeValue, 4),
    capturedValueShare: roundNumber(team.capturedValueShare),
    wastedValueShare: roundNumber(team.wastedValueShare),
    lateCloseExpectedValueShare: roundNumber(team.lateCloseExpectedValueShare),
    bestDecisionWindowLabel: team.bestDecisionWindowLabel,
    bestDecisionWindowExpectedValue: roundNumber(team.bestDecisionWindowExpectedValue, 4),
    decisionValueConfidence: team.decisionValueConfidence,
  };
}

function summarizeTeamLeaderboard(teams: TeamLeaderboardEntry[], range: RangeKey) {
  const totalChallenges = teams.reduce((sum, team) => sum + team.challengesTotal, 0);
  const totalSuccessful = teams.reduce((sum, team) => sum + team.usedSuccessful, 0);

  return {
    range,
    metricNotes: {
      challengesTotal: "Team-owned ABS challenges over the selected range.",
      decisionSurplus: "Average realized challenge value minus average expected challenge value.",
      avgRemaining: "Average challenges left unused at game end.",
    },
    leagueTotals: {
      teamsTracked: teams.length,
      challengesTotal: totalChallenges,
      overturnRate: totalChallenges > 0 ? roundNumber(totalSuccessful / totalChallenges) : null,
    },
    leadersByTotalChallenges: sortByNumberDesc(teams, (team) => team.challengesTotal).slice(0, 8).map(summarizeTeam),
    leadersByOverturnRate: sortByNumberDesc(
      teams.filter((team) => team.challengesTotal >= 5),
      (team) => team.overturnRate,
    )
      .slice(0, 6)
      .map(summarizeTeam),
    leadersByReviewSurplus: sortByNumberDesc(
      teams.filter((team) => team.decisionSurplus !== null),
      (team) => team.decisionSurplus,
    )
      .slice(0, 6)
      .map(summarizeTeam),
    highestLowValueUsageRisk: sortByNumberDesc(teams, (team) => team.wastedValueShare).slice(0, 6).map(summarizeTeam),
    mostSelectiveUse: sortByNumberDesc(teams, (team) => team.avgRemaining * team.overturnRate)
      .slice(0, 6)
      .map(summarizeTeam),
  };
}

function summarizeUmpire(umpire: UmpireLeaderboardEntry) {
  return {
    umpireId: umpire.umpireId,
    umpireName: umpire.umpireName,
    gamesWorked: umpire.gamesWorked,
    challengedCalls: umpire.challengedCalls,
    overturnedCalls: umpire.overturnedCalls,
    confirmedCalls: umpire.confirmedCalls,
    overturnRate: roundNumber(umpire.overturnRate),
    orgDescriptor: umpire.orgDescriptor,
    riskTier: umpire.riskTier,
    confidence: umpire.confidence,
    reportCardScore: roundNumber(umpire.reportCardScore, 1),
    overturnRateVariance: roundNumber(umpire.overturnRateVariance),
    recentOverturnRate: roundNumber(umpire.recentOverturnRate),
    averageRunExpectancyDelta: roundNumber(umpire.averageRunExpectancyDelta),
    averageWinExpectancyDelta: roundNumber(umpire.averageWinExpectancyDelta, 4),
  };
}

function summarizeUmpireLeaderboard(umpires: UmpireLeaderboardEntry[], range: RangeKey) {
  const riskRank: Record<UmpireLeaderboardEntry["riskTier"], number> = {
    High: 4,
    Elevated: 3,
    Moderate: 2,
    Low: 1,
  };

  return {
    range,
    metricNotes: {
      challengedCalls: "ABS challenges in games worked by this home-plate umpire.",
      riskTier: "Product rubric combining volume, overturn profile, and volatility signals.",
    },
    leadersByChallengedCalls: sortByNumberDesc(umpires, (umpire) => umpire.challengedCalls)
      .slice(0, 8)
      .map(summarizeUmpire),
    highestOverturnRates: sortByNumberDesc(
      umpires.filter((umpire) => umpire.challengedCalls >= 5),
      (umpire) => umpire.overturnRate,
    )
      .slice(0, 6)
      .map(summarizeUmpire),
    watchListByRisk: [...umpires]
      .sort((left, right) => {
        const riskGap = riskRank[right.riskTier] - riskRank[left.riskTier];
        if (riskGap !== 0) return riskGap;
        return right.reportCardScore - left.reportCardScore;
      })
      .slice(0, 6)
      .map(summarizeUmpire),
  };
}

export async function resolveToolResults(
  context?: CopilotContext,
  options?: ResolveToolResultsOptions,
): Promise<ToolResult[]> {
  const allowed = new Set(getAllowedToolNames(context));
  const preferred =
    options?.preferredToolNames && options.preferredToolNames.length
      ? new Set(options.preferredToolNames.filter((toolName) => allowed.has(toolName)))
      : null;
  const shouldLoad = (toolName: string) => allowed.has(toolName) && (!preferred || preferred.has(toolName));

  if (context?.scope === "game" && context.entityId) {
    const gamePk = Number(context.entityId);
    const [game, liveStatus, challenges] = await Promise.all([
      shouldLoad("get_game_summary") ? getGame(gamePk) : Promise.resolve(null),
      shouldLoad("get_game_live_status") ? getGameLiveStatus(gamePk) : Promise.resolve(null),
      shouldLoad("get_game_challenges") ? getGameChallenges(gamePk) : Promise.resolve([]),
    ]);
    return [
      { toolName: "get_game_summary", payload: game },
      { toolName: "get_game_live_status", payload: liveStatus },
      { toolName: "get_game_challenges", payload: challenges.slice(-20) },
    ]
      .filter((tool) => shouldLoad(tool.toolName))
      .map((tool) => ({ ...tool, payload: sanitizeToolPayload(tool.payload, { maxArrayItems: options?.maxArrayItems }) }));
  }

  if (context?.scope === "team" && context.entityId) {
    const teamId = Number(context.entityId);
    const range = getEntityRange(context.range);
    const [summary, trend, inningEfficiency, sideSplits, aggression, challengeScenarioMatrix, challengeValueSummary, decisionValueReport] = await Promise.all([
      shouldLoad("get_team_summary") ? getTeamSummary(teamId, range) : Promise.resolve(null),
      shouldLoad("get_team_trend") ? getTeamTrend(teamId, range) : Promise.resolve([]),
      shouldLoad("get_team_inning_efficiency") ? getTeamInningEfficiency(teamId, range) : Promise.resolve([]),
      shouldLoad("get_team_side_splits") ? getTeamSideSplits(teamId, range) : Promise.resolve([]),
      shouldLoad("get_team_aggression") ? getTeamAggression(teamId, range) : Promise.resolve([]),
      shouldLoad("get_team_challenge_scenario_matrix")
        ? getTeamChallengeScenarioMatrix(teamId, range)
        : Promise.resolve([]),
      shouldLoad("get_team_challenge_value_summary")
        ? getTeamChallengeValueSummary(teamId, range)
        : Promise.resolve(null),
      shouldLoad("get_team_decision_value_report")
        ? getTeamDecisionValueReport(teamId, range)
        : Promise.resolve(null),
    ]);
    return [
      { toolName: "get_team_summary", payload: summary },
      { toolName: "get_team_trend", payload: trend.slice(-10) },
      { toolName: "get_team_inning_efficiency", payload: inningEfficiency },
      { toolName: "get_team_side_splits", payload: sideSplits },
      { toolName: "get_team_aggression", payload: aggression },
      { toolName: "get_team_challenge_scenario_matrix", payload: challengeScenarioMatrix },
      { toolName: "get_team_challenge_value_summary", payload: challengeValueSummary },
      { toolName: "get_team_decision_value_report", payload: decisionValueReport },
    ]
      .filter((tool) => shouldLoad(tool.toolName))
      .map((tool) => ({ ...tool, payload: sanitizeToolPayload(tool.payload, { maxArrayItems: options?.maxArrayItems }) }));
  }

  if (context?.scope === "umpire" && context.entityId) {
    const umpireId = Number(context.entityId);
    const [summary, profile] = await Promise.all([
      shouldLoad("get_umpire_summary") ? getUmpireSummary(umpireId) : Promise.resolve(null),
      shouldLoad("get_umpire_profile") ? getUmpireProfile(umpireId) : Promise.resolve(null),
    ]);
    return [
      { toolName: "get_umpire_summary", payload: summary },
      { toolName: "get_umpire_profile", payload: profile },
    ]
      .filter((tool) => shouldLoad(tool.toolName))
      .map((tool) => ({ ...tool, payload: sanitizeToolPayload(tool.payload, { maxArrayItems: options?.maxArrayItems }) }));
  }

  const range = getEntityRange(context?.range);
  const [games, moments, teams, umpires] = await Promise.all([
    shouldLoad("get_live_games") ? getLiveGames() : Promise.resolve([]),
    shouldLoad("get_home_challenge_moments") ? getHomeChallengeMoments(8) : Promise.resolve([]),
    shouldLoad("get_home_team_leaderboard")
      ? getTeamLeaderboardModel(range, { includeDecisionMetrics: true, includeValueMetrics: true })
      : Promise.resolve([]),
    shouldLoad("get_home_umpire_leaderboard")
      ? getUmpireLeaderboardModel(range, { includeValueMetrics: true })
      : Promise.resolve([]),
  ]);
  return [
    { toolName: "get_live_games", payload: summarizeLiveGames(games) },
    { toolName: "get_home_challenge_moments", payload: summarizeHomeChallengeMoments(moments) },
    { toolName: "get_home_team_leaderboard", payload: summarizeTeamLeaderboard(teams, range) },
    { toolName: "get_home_umpire_leaderboard", payload: summarizeUmpireLeaderboard(umpires, range) },
  ]
    .filter((tool) => shouldLoad(tool.toolName))
    .map((tool) => ({ ...tool, payload: sanitizeToolPayload(tool.payload, { maxArrayItems: options?.maxArrayItems }) }));
}
