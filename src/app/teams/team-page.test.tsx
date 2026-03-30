import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/teams/111",
}));

vi.mock("@/lib/data", () => ({
  getTeamSummary: vi.fn(async () => ({
    teamId: 111,
    teamName: "Boston Red Sox",
    gamesTracked: 10,
    usedSuccessful: 7,
    usedFailed: 3,
    challengesTotal: 10,
    avgRemaining: 0.8,
    overturnRate: 0.7,
  })),
  getTeamTrend: vi.fn(async () => [
    {
      gamePk: 1,
      gameDate: "2026-03-03T00:00:00Z",
      opponentName: "New York Yankees",
      isHome: true,
      usedSuccessful: 2,
      usedFailed: 0,
      challengesTotal: 2,
      remaining: 1,
    },
  ]),
  getTeamIdentity: vi.fn(async () => ({
    teamId: 111,
    teamName: "Boston Red Sox",
    abbreviation: "BOS",
    primaryColor: "#BD3039",
    secondaryColor: "#0C2340",
    logoSvgUrl: "https://example.com/bos.svg",
  })),
  getTeamAggression: vi.fn(async () => []),
  getTeamSchedule: vi.fn(async () => []),
  getTeamUmpireMatchups: vi.fn(async () => []),
  getTeamHitterEyeHeatmap: vi.fn(async () => []),
  getTeamInningEfficiency: vi.fn(async () => [
    { inning: 1, category: "Offensive", overturnRate: 0.6, sampleSize: 3 },
    { inning: 1, category: "Defensive", overturnRate: 0.5, sampleSize: 2 },
  ]),
  getTeamLeaderboardModel: vi.fn(async () => [
    {
      teamId: 111,
      teamName: "Boston Red Sox",
      gamesTracked: 10,
      usedSuccessful: 7,
      usedFailed: 3,
      challengesTotal: 10,
      avgRemaining: 0.8,
      overturnRate: 0.7,
      style: "High-Impact",
      orgStyleLabel: "Timely",
      styleConfidence: "high",
      styleScores: {
        "High-Impact": 78,
        Selective: 62,
        Overactive: 44,
        "Low-Usage": 25,
      },
      challengeRatePerGame: 1,
      lateLeverageShare: 0.42,
      earlyLowLeverageShare: 0.18,
      avgRunExpectancyDelta: 0.14,
      highRunValueShare: 0.7,
      runValueConfidence: "high",
      avgWinExpectancyDelta: 0.018,
      highWinValueShare: 0.7,
      winValueConfidence: "high",
    },
  ]),
  getTeamChallengeScenarioMatrix: vi.fn(async () => [
    {
      rowKey: "risp_lt2",
      rowLabel: "RISP, <2 Outs",
      colKey: "hitter",
      colLabel: "Hitter Ahead",
      challenges: 4,
      overturned: 3,
      overturnRate: 0.75,
      avgEstimatedLeverage: 68.2,
      avgPositiveOutcomeDelta: 0.11,
      avgRunExpectancyDelta: 0.15,
      avgWinExpectancyDelta: 0.0184,
      highPressureShare: 0.75,
    },
  ]),
  getTeamChallengeValueSummary: vi.fn(async () => ({
    totalChallenges: 10,
    highPressureShare: 0.5,
    lowPressureShare: 0.2,
    rispLessThanTwoOutsShare: 0.3,
    averageEstimatedLeverage: 57.4,
    averagePositiveOutcomeDelta: 0.08,
    averageRunExpectancyDelta: 0.12,
    medianRunExpectancyDelta: 0.11,
    highRunValueShare: 0.7,
    lowRunValueBurnShare: 0.3,
    lateCloseRunValueShare: 0.5,
    runExpectancyConfidence: "high",
    averageWinExpectancyDelta: 0.0141,
    medianWinExpectancyDelta: 0.0127,
    highWinValueShare: 0.7,
    lowWinValueBurnShare: 0.3,
    lateCloseWinValueShare: 0.5,
    winExpectancyConfidence: "high",
    bestScenarioLabel: "RISP, <2 Outs • Hitter Ahead",
    bestScenarioChallenges: 4,
  })),
}));

import TeamPage from "@/app/teams/[teamId]/page";

describe("team detail page", () => {
  it("renders the hero, kpis, and streamed analytics fallbacks", async () => {
    const page = await TeamPage({
      params: Promise.resolve({ teamId: "111" }),
      searchParams: Promise.resolve({ range: "30d" }),
    });
    const html = renderToStaticMarkup(page);

    expect(html).toContain("Boston Red Sox");
    expect(html).toContain("Challenge");
    expect(html).toContain("ABS challenge profile");
    expect(html).toContain("Trend Overview");
    expect(html).toContain("Challenge Value Matrix");
    expect(html).toContain("Timing Efficiency");
    expect(html).toContain("Challenge Style");
  });
});
