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
      style: "Clutch",
      orgStyleLabel: "Opportunistic",
      styleConfidence: "high",
      styleScores: { Clutch: 80, Calculated: 65, "Trigger-Happy": 40, Passive: 25 },
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
      fanDescriptor: "Erratic",
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

    expect(html).toContain("Today&#x27;s Most Controversial Call");
    expect(html).toContain("Team Personalities");
    expect(html).toContain("Umpires in the Spotlight");
  });

  it("renders org-oriented labels when view=org", async () => {
    const page = await HomePage({ searchParams: Promise.resolve({ view: "org" }) });
    const html = renderToStaticMarkup(page);

    expect(html).toContain("League Signal");
    expect(html).toContain("Challenge Operators");
    expect(html).toContain("Umpire Watch List");
    expect(html).toContain("Watch:");
  });
});
