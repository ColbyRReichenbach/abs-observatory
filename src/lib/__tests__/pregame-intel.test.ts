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
});
