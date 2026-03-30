import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), back: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/",
}));

vi.mock("@/lib/data", () => ({
  getLiveGames: vi.fn(async () => []),
  getHomeChallengeMoments: vi.fn(async () => [
    {
      challengeId: "c1",
      gamePk: 123,
      challengedAt: "2026-03-08T01:00:00Z",
      gameLabel: "Yankees at Red Sox",
      inning: 9,
      halfInning: "Bottom",
      balls: 3,
      strikes: 2,
      outs: 2,
      basesState: "010",
      playerName: "Aaron Judge",
      pitchNumber: 7,
      calledDescription: "Called Strike",
      challengeTeamName: "New York Yankees",
      isOverturned: true,
      leverageScore: 95,
      controversyScore: 88,
      reasonChips: ["Overturned", "Late Inning"],
      gameStatus: "Final",
      homeScore: 4,
      awayScore: 4,
    },
  ]),
  getTeamLeaderboardModel: vi.fn(async () => [
    {
      teamId: 111,
      teamName: "Boston Red Sox",
      gamesTracked: 10,
      usedSuccessful: 7,
      usedFailed: 3,
      challengesTotal: 10,
      avgRemaining: 1.1,
      overturnRate: 0.7,
      style: "High-Impact",
      orgStyleLabel: "Timely",
      styleConfidence: "high",
      styleScores: { "High-Impact": 80, Selective: 65, Overactive: 40, "Low-Usage": 25 },
      challengeRatePerGame: 1,
      lateLeverageShare: 0.45,
      earlyLowLeverageShare: 0.2,
      avgRunExpectancyDelta: 0.14,
      highRunValueShare: 0.7,
      runValueConfidence: "high",
      avgWinExpectancyDelta: 0.018,
      highWinValueShare: 0.7,
      winValueConfidence: "high",
    },
  ]),
  getUmpireLeaderboardModel: vi.fn(async () => [
    {
      umpireId: 44,
      umpireName: "Test Umpire",
      challengedCalls: 18,
      overturnedCalls: 9,
      confirmedCalls: 9,
      overturnRate: 0.5,
      gamesWorked: 12,
      reportCardScore: 42,
      grade: "D",
      fanDescriptor: "Volatile",
      orgDescriptor: "Elevated risk",
      confidence: "medium",
      riskTier: "Elevated",
    },
  ]),
}));

import HomePage from "@/app/page";

describe("home page", () => {
  it("renders fan-oriented labels by default", async () => {
    const page = await HomePage({ searchParams: Promise.resolve({}) });
    const html = renderToStaticMarkup(page);

    expect(html).toContain("The home of MLB ABS challenge coverage.");
    expect(html).toContain("Most");
    expect(html).toContain("Consequential");
  });

  it("renders org-oriented labels when view=org", async () => {
    const page = await HomePage({ searchParams: Promise.resolve({ view: "org" }) });
    const html = renderToStaticMarkup(page);

    expect(html).toContain("Leaguewide ABS challenge monitoring for prep, leverage, and review support.");
    expect(html).toContain("Most");
    expect(html).toContain("Consequential");
  });
});
