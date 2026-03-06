import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

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
    expect(html).toContain("Recent Challenge Trend");
    expect(html).toContain("Home / Away Split");
    expect(html).toContain("New York Yankees");
    expect(html).toContain("home");
  });
});
