import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { PregameUmpireScoutCard } from "@/components/game-hub/pregame-umpire-scout-card";
import type { PregameIntel } from "@/lib/types";

const baseIntel: PregameIntel = {
  homeTeamId: 121,
  awayTeamId: 142,
  umpireId: null,
  umpireName: "Unknown Umpire",
  awayTeam: { offensiveChallenges: 1.4, defensiveChallenges: 1.1, successRate: 0.51 },
  homeTeam: { offensiveChallenges: 1.2, defensiveChallenges: 0.8, successRate: 0.52 },
  umpireTendency: { lowZoneAccuracy: 0.47, highZoneAccuracy: 0.47, overallAccuracy: 0.468 },
  zoneBriefing: [
    { bucket: "up_glove", challenges: 0, overturnRate: 0.532, hasSample: false },
    { bucket: "up_arm", challenges: 0, overturnRate: 0.532, hasSample: false },
    { bucket: "down_glove", challenges: 0, overturnRate: 0.532, hasSample: false },
    { bucket: "down_arm", challenges: 0, overturnRate: 0.532, hasSample: false },
  ],
  challengeTiming: {
    home: [0.05, 0.07, 0.09, 0.11, 0.25, 0.1, 0.08, 0.15, 0.1],
    away: [0.1, 0.08, 0.09, 0.07, 0.11, 0.12, 0.13, 0.2, 0.1],
    leagueAverage: [0.1, 0.11, 0.12, 0.1, 0.11, 0.12, 0.1, 0.12, 0.12],
  },
  teamHistoryVsUmpire: {
    home: { games: 0, challenges: 0, overturnRate: 0.532, hasSample: false },
    away: { games: 0, challenges: 0, overturnRate: 0.532, hasSample: false },
    leagueAverage: 0.532,
  },
};

describe("PregameUmpireScoutCard", () => {
  it("renders an assignment-pending state instead of fallback umpire percentages", () => {
    const html = renderToStaticMarkup(<PregameUmpireScoutCard intel={baseIntel} viewMode="fan" />);

    expect(html).toContain("Scheduled plate umpire has not been published yet.");
    expect(html).toContain("Awaiting assignment");
    expect(html).toContain("Pending");
    expect(html).not.toContain("53%");
  });
});
