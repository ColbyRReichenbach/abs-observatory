import { beforeEach, describe, expect, it, vi } from "vitest";

const { sqlMock } = vi.hoisted(() => ({
  sqlMock: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  sql: sqlMock,
}));

import { getGamePregameIntel } from "@/lib/pregame-intel";

describe("pregame intel team comparison data", () => {
  beforeEach(() => {
    sqlMock.mockReset();
  });

  it("maps per-game offense and defense challenge rates from lowercase half_inning source data", async () => {
    sqlMock
      .mockResolvedValueOnce([
        {
          umpire_id: 100,
          umpire_name: "Test Umpire",
          home_team_id: 121,
          away_team_id: 142,
          away_offense: "1.8",
          away_defense: "1.2",
          away_success: "0.5294",
          home_offense: "1.1",
          home_defense: "0.9",
          home_success: "0.5164",
        },
      ])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        { challenge_team_id: 121, inning: 1, challenges: 3 },
        { challenge_team_id: 142, inning: 2, challenges: 4 },
      ])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ league_average: "0.48" }])
      .mockResolvedValueOnce([
        { inning: 1, avg_challenges: "0.11" },
        { inning: 2, avg_challenges: "0.09" },
      ]);

    const intel = await getGamePregameIntel(823639);

    expect(sqlMock).toHaveBeenCalledWith(expect.stringContaining("LOWER(c.half_inning) = 'top'"), [823639]);
    expect(intel).toMatchObject({
      awayTeam: {
        offensiveChallenges: 1.8,
        defensiveChallenges: 1.2,
        successRate: 0.5294,
      },
      homeTeam: {
        offensiveChallenges: 1.1,
        defensiveChallenges: 0.9,
        successRate: 0.5164,
      },
    });
  });

  it("marks umpire zone and history reads as fallback when the preview game has no assigned plate umpire", async () => {
    sqlMock
      .mockResolvedValueOnce([
        {
          umpire_id: null,
          umpire_name: null,
          home_team_id: 121,
          away_team_id: 142,
          away_offense: "1.4",
          away_defense: "1.1",
          away_success: "0.5",
          home_offense: "1.2",
          home_defense: "0.8",
          home_success: "0.52",
        },
      ])
      .mockResolvedValueOnce([
        { challenge_team_id: 121, inning: 5, challenges: 2 },
        { challenge_team_id: 142, inning: 8, challenges: 3 },
      ])
      .mockResolvedValueOnce([{ league_average: "0.532" }])
      .mockResolvedValueOnce([
        { inning: 5, avg_challenges: "0.14" },
        { inning: 8, avg_challenges: "0.16" },
      ]);

    const intel = await getGamePregameIntel(823639);
    const fallbackRates = intel?.zoneBriefing.map((zone) => zone.overturnRate) ?? [];

    expect(intel?.umpireId).toBeNull();
    expect(intel?.umpireName).toBe("Unknown Umpire");
    expect(intel?.zoneBriefing.every((zone) => zone.hasSample === false)).toBe(true);
    expect(new Set(fallbackRates).size).toBe(1);
    expect(fallbackRates[0]).toBeGreaterThan(0);
    expect(intel?.teamHistoryVsUmpire.home.hasSample).toBe(false);
    expect(intel?.teamHistoryVsUmpire.away.hasSample).toBe(false);
  });
});
