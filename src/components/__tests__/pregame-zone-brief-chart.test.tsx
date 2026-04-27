import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { PregameZoneBriefChart } from "@/components/game-hub/pregame-zone-brief-chart";
import type { PregameIntel } from "@/lib/types";

const intelWithoutAssignedUmpire: PregameIntel = {
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
    home: new Array(9).fill(0),
    away: new Array(9).fill(0),
    leagueAverage: new Array(9).fill(0),
  },
  teamHistoryVsUmpire: {
    home: { games: 0, challenges: 0, overturnRate: 0.532, hasSample: false },
    away: { games: 0, challenges: 0, overturnRate: 0.532, hasSample: false },
    leagueAverage: 0.532,
  },
};

describe("PregameZoneBriefChart", () => {
  it("shows an assignment-pending empty state when no plate umpire is posted", () => {
    const html = renderToStaticMarkup(<PregameZoneBriefChart intel={intelWithoutAssignedUmpire} viewMode="fan" />);

    expect(html).toContain("Scheduled plate umpire has not been published yet.");
    expect(html).toContain("Zone-specific overturn reads will appear once MLB posts the assignment.");
    expect(html).not.toContain("53%");
  });
});
