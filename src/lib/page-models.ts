import { computeOrgWatchRisk, computeTeamChallengeStyle, computeUmpireReportCard, scoreControversyMoment } from "@/lib/rubrics";
import type {
  ConfidenceBand,
  HomeChallengeMoment,
  TeamLeaderboardEntry,
  TeamSummary,
  UmpireLeaderboardEntry,
  UmpireSummary,
} from "@/lib/types";

export type TeamStyleMetric = {
  teamId: number;
  lateLeverageShare: number;
  earlyLowLeverageShare: number;
  avgRunExpectancyDelta: number | null;
  highRunValueShare: number;
  runValueConfidence: ConfidenceBand | null;
  avgWinExpectancyDelta: number | null;
  highWinValueShare: number;
  winValueConfidence: ConfidenceBand | null;
};

export type UmpireRubricMetric = {
  umpireId: number;
  overturnRateVariance: number;
  recentOverturnRate: number | null;
};

function stdDev(values: number[]) {
  if (values.length <= 1) return 0;
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

export function buildTeamLeaderboardEntries(
  teams: TeamSummary[],
  styleMetrics: Map<number, TeamStyleMetric>,
): TeamLeaderboardEntry[] {
  const leagueChallengeRatePerGame =
    teams.length > 0
      ? teams.reduce((sum, team) => sum + (team.gamesTracked > 0 ? team.challengesTotal / team.gamesTracked : 0), 0) / teams.length
      : 0;
  const leagueLateLeverageShare =
    teams.length > 0
      ? teams.reduce((sum, team) => sum + (styleMetrics.get(team.teamId)?.lateLeverageShare ?? 0), 0) / teams.length
      : 0;
  const leagueEarlyLowLeverageShare =
    teams.length > 0
      ? teams.reduce((sum, team) => sum + (styleMetrics.get(team.teamId)?.earlyLowLeverageShare ?? 0), 0) / teams.length
      : 0;
  const leagueAverageChallengesRemaining =
    teams.length > 0 ? teams.reduce((sum, team) => sum + team.avgRemaining, 0) / teams.length : 0;
  const leagueOverturnRate =
    teams.reduce((sum, team) => sum + team.usedSuccessful, 0) /
    Math.max(1, teams.reduce((sum, team) => sum + team.challengesTotal, 0));

  return teams.map((team) => {
    const metric = styleMetrics.get(team.teamId) ?? {
      teamId: team.teamId,
      lateLeverageShare: 0,
      earlyLowLeverageShare: 0,
      avgRunExpectancyDelta: null,
      highRunValueShare: 0,
      runValueConfidence: null,
      avgWinExpectancyDelta: null,
      highWinValueShare: 0,
      winValueConfidence: null,
    };
    const style = computeTeamChallengeStyle({
      sampleSize: team.challengesTotal,
      challengeRatePerGame: team.gamesTracked > 0 ? team.challengesTotal / team.gamesTracked : 0,
      leagueChallengeRatePerGame,
      lateLeverageShare: metric.lateLeverageShare,
      leagueLateLeverageShare,
      earlyLowLeverageShare: metric.earlyLowLeverageShare,
      leagueEarlyLowLeverageShare,
      averageChallengesRemaining: team.avgRemaining,
      leagueAverageChallengesRemaining,
      overturnRate: team.overturnRate,
      leagueOverturnRate,
    });

    return {
      ...team,
      style: style.style,
      orgStyleLabel: style.orgLabel,
      styleConfidence: style.confidence,
      styleScores: style.scores,
      challengeRatePerGame: team.gamesTracked > 0 ? team.challengesTotal / team.gamesTracked : 0,
      lateLeverageShare: metric.lateLeverageShare,
      earlyLowLeverageShare: metric.earlyLowLeverageShare,
      avgRunExpectancyDelta: metric.avgRunExpectancyDelta,
      highRunValueShare: metric.highRunValueShare,
      runValueConfidence: metric.runValueConfidence,
      avgWinExpectancyDelta: metric.avgWinExpectancyDelta,
      highWinValueShare: metric.highWinValueShare,
      winValueConfidence: metric.winValueConfidence,
    };
  });
}

export function buildUmpireLeaderboardEntries(
  umpires: UmpireSummary[],
  rubricMetrics: Map<number, UmpireRubricMetric>,
): UmpireLeaderboardEntry[] {
  const tracked = umpires.filter((umpire) => umpire.challengedCalls > 0);
  const leagueOverturnRate =
    tracked.reduce((sum, umpire) => sum + umpire.overturnedCalls, 0) /
    Math.max(1, tracked.reduce((sum, umpire) => sum + umpire.challengedCalls, 0));
  const leagueOverturnRateStdDev = stdDev(tracked.map((umpire) => umpire.overturnRate));
  const leagueVarianceMean =
    tracked.length > 0
      ? tracked.reduce((sum, umpire) => sum + (rubricMetrics.get(umpire.umpireId)?.overturnRateVariance ?? 0), 0) / tracked.length
      : 0;
  const leagueVarianceStdDev = stdDev(
    tracked.map((umpire) => rubricMetrics.get(umpire.umpireId)?.overturnRateVariance ?? 0),
  );

  return umpires.map((umpire) => {
    const metric = rubricMetrics.get(umpire.umpireId) ?? {
      umpireId: umpire.umpireId,
      overturnRateVariance: 0,
      recentOverturnRate: null,
    };
    const reportCard = computeUmpireReportCard({
      challengedCalls: umpire.challengedCalls,
      overturnedCalls: umpire.overturnedCalls,
      leagueOverturnRate,
      leagueOverturnRateStdDev,
      umpireVariance: metric.overturnRateVariance,
      leagueVarianceMean,
      leagueVarianceStdDev,
      recentOverturnRate: metric.recentOverturnRate,
    });
    const risk = computeOrgWatchRisk({
      umpireScore: reportCard.score,
      directionalBiasSeverity: clampRisk((umpire.overturnedCalls / Math.max(1, umpire.challengedCalls)) * 100),
      zoneConcentrationSeverity: clampRisk(metric.overturnRateVariance * 100),
      recentTrendRisk: clampRisk((metric.recentOverturnRate ?? umpire.overturnRate) * 100),
      countHotspotVolatility: clampRisk(metric.overturnRateVariance * 85),
    });

    return {
      ...umpire,
      reportCardScore: reportCard.score,
      grade: reportCard.grade,
      fanDescriptor: reportCard.fanDescriptor,
      orgDescriptor: reportCard.orgDescriptor,
      confidence: reportCard.confidence,
      riskTier: risk.tier,
      overturnRateVariance: metric.overturnRateVariance,
      recentOverturnRate: metric.recentOverturnRate,
    };
  });
}

function clampRisk(value: number) {
  return Math.max(0, Math.min(100, value));
}

export function buildHomeChallengeMoments(moments: HomeChallengeMoment[]): HomeChallengeMoment[] {
  const total = Math.max(1, moments.length - 1);
  return [...moments]
    .map((moment, index, all) => {
      const scored = scoreControversyMoment({
        inning: moment.inning,
        scoreDifferential:
          moment.homeScore == null || moment.awayScore == null ? null : moment.homeScore - moment.awayScore,
        outs: moment.outs ?? null,
        basesState: moment.basesState ?? null,
        balls: moment.balls ?? null,
        strikes: moment.strikes ?? null,
        isOverturned: moment.isOverturned,
        impactType: moment.impactType ?? null,
        slateProgress: all.length <= 1 ? 1 : 1 - index / total,
      });
      return {
        ...moment,
        leverageScore: scored.leverageScore,
        controversyScore: scored.score,
        reasonChips: scored.chips,
      };
    })
    .sort((a, b) => {
      if ((b.controversyScore ?? 0) !== (a.controversyScore ?? 0)) {
        return (b.controversyScore ?? 0) - (a.controversyScore ?? 0);
      }
      const aTs = a.challengedAt ? new Date(a.challengedAt).getTime() : 0;
      const bTs = b.challengedAt ? new Date(b.challengedAt).getTime() : 0;
      return bTs - aTs;
    });
}
