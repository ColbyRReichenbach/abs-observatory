import { describe, expect, it } from "vitest";

import { buildPregameFanComparisonData } from "@/components/game-hub/pregame-team-comparison-chart";
import type { PregameIntel } from "@/lib/types";

const intel: PregameIntel = {
  homeTeamId: 121,
  awayTeamId: 142,
  umpireId: 100,
  umpireName: "Test Umpire",
  awayTeam: { offensiveChallenges: 1.4, defensiveChallenges: 1.1, successRate: 0.51 },
  homeTeam: { offensiveChallenges: 1.2, defensiveChallenges: 0.8, successRate: 0.52 },
  umpireTendency: { lowZoneAccuracy: 0.6, highZoneAccuracy: 0.58, overallAccuracy: 0.59 },
  zoneBriefing: [
    { bucket: "up_glove", challenges: 5, overturnRate: 0.6, hasSample: true },
    { bucket: "up_arm", challenges: 4, overturnRate: 0.5, hasSample: true },
    { bucket: "down_glove", challenges: 3, overturnRate: 0.4, hasSample: true },
    { bucket: "down_arm", challenges: 2, overturnRate: 0.3, hasSample: true },
  ],
  challengeTiming: {
    home: new Array(9).fill(0),
    away: new Array(9).fill(0),
    leagueAverage: new Array(9).fill(0),
  },
  teamHistoryVsUmpire: {
    home: { games: 4, challenges: 8, overturnRate: 0.5, hasSample: true },
    away: { games: 4, challenges: 8, overturnRate: 0.48, hasSample: true },
    leagueAverage: 0.53,
  },
};

describe("buildPregameFanComparisonData", () => {
  it("keeps offense and defense as bars and overturn rate as marker-only percentage values", () => {
    const data = buildPregameFanComparisonData(intel);

    expect(data).toEqual([
      expect.objectContaining({
        metric: "Offense / Game",
        homeBar: 1.2,
        awayBar: 1.4,
        homeRate: null,
        awayRate: null,
      }),
      expect.objectContaining({
        metric: "Defense / Game",
        homeBar: 0.8,
        awayBar: 1.1,
        homeRate: null,
        awayRate: null,
      }),
      expect.objectContaining({
        metric: "Overturn %",
        homeBar: null,
        awayBar: null,
        homeRate: 52,
        awayRate: 51,
      }),
    ]);
  });
});
