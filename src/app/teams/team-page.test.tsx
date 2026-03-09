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
  getTeamSideSplits: vi.fn(async () => [
    {
      side: "home",
      games: 5,
      usedSuccessful: 4,
      usedFailed: 1,
      challengesTotal: 5,
      avgRemaining: 1,
      overturnRate: 0.8,
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
      style: "Clutch",
      orgStyleLabel: "Opportunistic",
      styleConfidence: "high",
      styleScores: {
        Clutch: 78,
        Calculated: 62,
        "Trigger-Happy": 44,
        Passive: 25,
      },
    },
  ]),
}));

import TeamPage from "@/app/teams/[teamId]/page";

describe("team detail page", () => {
  it("renders kpis, trend and split sections", async () => {
    const page = await TeamPage({
      params: Promise.resolve({ teamId: "111" }),
      searchParams: Promise.resolve({ range: "30d" }),
    });
    const html = renderToStaticMarkup(page);

    expect(html).toContain("Boston Red Sox");
    expect(html).toContain("Challenge");
    expect(html).toContain("Trajectory");
    expect(html).toContain("Location Variance");
    expect(html).toContain("ABS personality breakdown");
    expect(html).toContain("Home");
    expect(html).toContain("Archetype");
  });
});
