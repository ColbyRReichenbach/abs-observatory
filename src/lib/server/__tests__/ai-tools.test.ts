import { beforeEach, describe, expect, it, vi } from "vitest";

const dataMocks = vi.hoisted(() => ({
  getGame: vi.fn(),
  getGameChallenges: vi.fn(),
  getGameLiveStatus: vi.fn(),
  getHomeChallengeMoments: vi.fn(),
  getLiveGames: vi.fn(),
  getTeamAggression: vi.fn(),
  getTeamChallengeScenarioMatrix: vi.fn(),
  getTeamChallengeValueSummary: vi.fn(),
  getTeamDecisionValueReport: vi.fn(),
  getTeamInningEfficiency: vi.fn(),
  getTeamLeaderboardModel: vi.fn(),
  getTeamSideSplits: vi.fn(),
  getTeamSummary: vi.fn(),
  getTeamTrend: vi.fn(),
  getUmpireLeaderboardModel: vi.fn(),
  getUmpireProfile: vi.fn(),
  getUmpireSummary: vi.fn(),
}));

vi.mock("@/lib/data", () => dataMocks);

function team(overrides: Record<string, unknown>) {
  return {
    teamId: 1,
    teamName: "Baseline Club",
    gamesTracked: 10,
    usedSuccessful: 5,
    usedFailed: 5,
    challengesTotal: 10,
    avgRemaining: 1.2,
    overturnRate: 0.5,
    style: "Balanced",
    orgStyleLabel: "Mixed Profile",
    styleConfidence: "medium",
    styleScores: {},
    challengeRatePerGame: 1,
    lateLeverageShare: 0.4,
    earlyLowLeverageShare: 0.2,
    avgRunExpectancyDelta: null,
    highRunValueShare: 0,
    runValueConfidence: null,
    avgWinExpectancyDelta: null,
    highWinValueShare: 0,
    winValueConfidence: null,
    averageExpectedChallengeValue: null,
    averageRealizedChallengeValue: null,
    decisionSurplus: null,
    challengeRecommendationRate: 0,
    holdRecommendationRate: 0,
    capturedValueShare: 0,
    wastedValueShare: 0,
    highPressureExpectedValueShare: 0,
    lateCloseChallengeShare: 0,
    lateCloseExpectedValueShare: 0,
    bestDecisionWindowLabel: null,
    bestDecisionWindowExpectedValue: null,
    decisionValueConfidence: null,
    ...overrides,
  };
}

function umpire(overrides: Record<string, unknown>) {
  return {
    umpireId: 1,
    umpireName: "Baseline Umpire",
    challengedCalls: 10,
    overturnedCalls: 5,
    confirmedCalls: 5,
    overturnRate: 0.5,
    gamesWorked: 4,
    reportCardScore: 50,
    grade: "C",
    fanDescriptor: "Mixed",
    orgDescriptor: "Monitor",
    confidence: "medium",
    riskTier: "Moderate",
    overturnRateVariance: 0.1,
    recentOverturnRate: 0.5,
    averageRunExpectancyDelta: null,
    averageWinExpectancyDelta: null,
    ...overrides,
  };
}

describe("ai-tools", () => {
  beforeEach(() => {
    for (const mock of Object.values(dataMocks)) {
      mock.mockReset();
    }

    dataMocks.getLiveGames.mockResolvedValue([
      {
        gamePk: 1,
        gameDate: "2026-05-14T19:00:00.000Z",
        status: "Live",
        detailedState: "In Progress",
        homeTeamId: 158,
        homeTeamName: "Milwaukee Brewers",
        homeScore: 7,
        awayTeamId: 135,
        awayTeamName: "San Diego Padres",
        awayScore: 0,
        homeAbsRemaining: 0,
        awayAbsRemaining: 0,
        challengeCount: 5,
        inning: 7,
        inningHalf: "Top",
      },
    ]);
    dataMocks.getHomeChallengeMoments.mockResolvedValue([]);
    dataMocks.getTeamLeaderboardModel.mockResolvedValue([
      team({ teamId: 138, teamName: "St. Louis Cardinals", challengesTotal: 72, usedSuccessful: 43 }),
      team({ teamId: 158, teamName: "Milwaukee Brewers", challengesTotal: 51, usedSuccessful: 29 }),
    ]);
    dataMocks.getUmpireLeaderboardModel.mockResolvedValue([
      umpire({ umpireId: 101, umpireName: "Willie Traynor", riskTier: "Moderate" }),
    ]);
  });

  it("adds homepage leaderboard context for global copilot questions", async () => {
    const { resolveToolResults } = await import("@/lib/server/ai-tools");

    const results = await resolveToolResults({ scope: "global" });

    expect(results.map((result) => result.toolName)).toEqual([
      "get_live_games",
      "get_home_challenge_moments",
      "get_home_team_leaderboard",
      "get_home_umpire_leaderboard",
    ]);
    expect(dataMocks.getTeamLeaderboardModel).toHaveBeenCalledWith("season", {
      includeDecisionMetrics: true,
      includeValueMetrics: true,
    });

    const livePayload = results.find((result) => result.toolName === "get_live_games")?.payload as {
      metricNotes?: Record<string, string>;
      games?: Array<{ gameChallengeCount?: number }>;
    };
    expect(livePayload.metricNotes?.gameChallengeCount).toContain("not a team-owned challenge count");
    expect(livePayload.games?.[0]?.gameChallengeCount).toBe(5);

    const teamPayload = results.find((result) => result.toolName === "get_home_team_leaderboard")?.payload as {
      leadersByTotalChallenges?: Array<{ teamName?: string; challengesTotal?: number }>;
      leagueTotals?: { challengesTotal?: number };
    };
    expect(teamPayload.leadersByTotalChallenges?.[0]).toMatchObject({
      teamName: "St. Louis Cardinals",
      challengesTotal: 72,
    });
    expect(teamPayload.leagueTotals?.challengesTotal).toBe(123);
  });

  it("honors preferred global tool names to avoid unnecessary leaderboard work", async () => {
    const { resolveToolResults } = await import("@/lib/server/ai-tools");

    const results = await resolveToolResults(
      { scope: "global" },
      { preferredToolNames: ["get_home_team_leaderboard"] },
    );

    expect(results.map((result) => result.toolName)).toEqual(["get_home_team_leaderboard"]);
    expect(dataMocks.getTeamLeaderboardModel).toHaveBeenCalledTimes(1);
    expect(dataMocks.getLiveGames).not.toHaveBeenCalled();
    expect(dataMocks.getUmpireLeaderboardModel).not.toHaveBeenCalled();
  });
});
