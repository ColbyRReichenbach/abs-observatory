import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/umpires/44",
}));

vi.mock("@/lib/data", () => ({
  getUmpireSummary: vi.fn(async () => ({
    umpireId: 44,
    umpireName: "Test Umpire",
    challengedCalls: 18,
    overturnedCalls: 9,
    confirmedCalls: 9,
    overturnRate: 0.5,
    gamesWorked: 12,
  })),
  getUmpireProfile: vi.fn(async () => ({
    directionalBias: {
      strikeToBall: 4,
      ballToStrike: 3,
      otherOverturns: 2,
      confirmed: 9,
    },
    zoneBuckets: [
      { zone: "up", challenges: 5, overturnRate: 0.4 },
      { zone: "down", challenges: 6, overturnRate: 0.5 },
    ],
    countHotspots: [{ countKey: "3-2", challenges: 4, overturnRate: 0.5 }],
  })),
  getUmpireTrend: vi.fn(async () => [
    {
      gamePk: 12,
      gameDate: "2026-03-05T00:00:00Z",
      awayTeamId: 147,
      awayTeamAbbr: "NYY",
      homeTeamId: 111,
      homeTeamAbbr: "BOS",
      challengedCount: 4,
      overturnedCount: 2,
      accuracy: 0.95,
    },
  ]),
  getUmpireChallenges: vi.fn(async () => []),
  getUmpirePerformanceDNA: vi.fn(async () => ({
    rhythm: [],
    extremes: [],
  })),
  getUmpireLeaderboardModel: vi.fn(async () => [
    {
      umpireId: 44,
      umpireName: "Test Umpire",
      challengedCalls: 18,
      overturnedCalls: 9,
      confirmedCalls: 9,
      overturnRate: 0.5,
      gamesWorked: 12,
      reportCardScore: 58,
      grade: "C",
      fanDescriptor: "Watchful",
      orgDescriptor: "Monitor",
      confidence: "medium",
      riskTier: "Moderate",
      averageRunExpectancyDelta: 0.011,
      averageWinExpectancyDelta: 0.0021,
    },
    {
      umpireId: 99,
      umpireName: "Other Umpire",
      challengedCalls: 20,
      overturnedCalls: 6,
      confirmedCalls: 14,
      overturnRate: 0.3,
      gamesWorked: 15,
      reportCardScore: 74,
      grade: "B",
      fanDescriptor: "Steady",
      orgDescriptor: "Stable profile",
      confidence: "high",
      riskTier: "Low",
      averageRunExpectancyDelta: -0.004,
      averageWinExpectancyDelta: -0.0012,
    },
  ]),
  getUmpirePitchTypeBreakdown: vi.fn(async () => []),
  getUmpireSeasonTrend: vi.fn(async () => []),
}));

import UmpirePage from "@/app/umpires/[umpireId]/page";

describe("umpire detail page", () => {
  it("renders the route shell and summary header for the selected umpire", async () => {
    const page = await UmpirePage({
      params: Promise.resolve({ umpireId: "44" }),
      searchParams: Promise.resolve({ range: "all" }),
    });
    const html = renderToStaticMarkup(page);

    expect(html).toContain("Test Umpire");
    expect(html).toContain("Success Rate");
    expect(html).toContain("League Rank");
    expect(html).toContain("mx-auto max-w-7xl");
    expect(html).toContain("min-h-[220px]");
  });
});
