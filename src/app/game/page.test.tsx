import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/data", () => ({
  getGame: vi.fn(async () => ({
    gamepk: 123,
    statusabstract: "Live",
    statusdetailed: "In Progress",
    hometeamid: 111,
    hometeamname: "Boston Red Sox",
    homescore: 2,
    homeabbreviation: "BOS",
    homeprimarycolor: "#BD3039",
    homesecondarycolor: "#0C2340",
    homelogosvgurl: "https://example.com/bos.svg",
    awayteamid: 147,
    awayteamname: "New York Yankees",
    awayscore: 1,
    awayabbreviation: "NYY",
    awayprimarycolor: "#003087",
    awaysecondarycolor: "#E4002B",
    awaylogosvgurl: "https://example.com/nyy.svg",
    venue: "Fenway Park",
  })),
  getGameChallenges: vi.fn(async () => [
    {
      challengeId: "c-1",
      gamePk: 123,
      challengedAt: "2026-03-05T19:02:00Z",
      inning: 4,
      halfInning: "Top",
      balls: 1,
      strikes: 1,
      outs: 1,
      basesState: "100",
      homeScore: 2,
      awayScore: 1,
      challengeTeamId: 147,
      challengeTeamName: "New York Yankees",
      challengePlayerName: "Aaron Judge",
      batterName: "Aaron Judge",
      pitcherName: "Brayan Bello",
      calledDescription: "Called Strike",
      pitchNumber: 4,
      pitchType: "4-Seam Fastball",
      startSpeed: 95.2,
      spinRate: 2310,
      isOverturned: true,
      px: 0.2,
      pz: 3.8,
      strikeZoneTop: 3.5,
      strikeZoneBottom: 1.6,
    },
  ]),
  getGameAbsCounters: vi.fn(async () => ({
    homeTeamId: 111,
    awayTeamId: 147,
    homeRemaining: 1,
    awayRemaining: 2,
  })),
  getGameLiveStatus: vi.fn(async () => ({
    gamePk: 123,
    statusAbstract: "Live",
    inning: 4,
    halfInning: "Top",
    balls: 1,
    strikes: 1,
    outs: 1,
    homeScore: 2,
    awayScore: 1,
    homeRemaining: 1,
    awayRemaining: 2,
    updatedAt: "2026-03-05T19:02:15Z",
    recentChallengeEvents: [],
  })),
  getTeamSummary: vi.fn(async () => ({
    teamId: 111,
    teamName: "Boston Red Sox",
    gamesTracked: 8,
    usedSuccessful: 5,
    usedFailed: 3,
    challengesTotal: 8,
    avgRemaining: 0.9,
    overturnRate: 0.625,
  })),
}));

import GamePage from "@/app/game/[gamePk]/page";

describe("game page route", () => {
  it("renders game shell for a known game id", async () => {
    const element = await GamePage({ params: Promise.resolve({ gamePk: "123" }) });
    const html = renderToStaticMarkup(element);

    expect(html).toContain("Game 123");
    expect(html).toContain("New York Yankees at Boston Red Sox");
    expect(html).toContain("Fenway Park");
    expect(html).toContain("Game scoreboard");
  });
});
