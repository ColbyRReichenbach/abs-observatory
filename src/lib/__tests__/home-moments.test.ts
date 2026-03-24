import { describe, expect, it } from "vitest";

import { computeChallengeLeverageScore, rankChallengeMoments } from "@/lib/home-moments";
import type { HomeChallengeMoment } from "@/lib/types";

describe("home moments ranking", () => {
  it("assigns higher leverage to late and close overturned challenges", () => {
    const high = computeChallengeLeverageScore({ inning: 9, homeScore: 3, awayScore: 2, isOverturned: true });
    const low = computeChallengeLeverageScore({ inning: 2, homeScore: 7, awayScore: 1, isOverturned: false });
    expect(high).toBeGreaterThan(low);
  });

  it("sorts moments by leverage then recency", () => {
    const moments: HomeChallengeMoment[] = [
      {
        challengeId: "a",
        gamePk: 1,
        challengedAt: "2026-03-05T20:00:00Z",
        gameLabel: "A",
        inning: 8,
        halfInning: "Top",
        calledDescription: "Ball",
        challengeTeamName: "Team A",
        isOverturned: true,
        leverageScore: 2.2,
      },
      {
        challengeId: "b",
        gamePk: 2,
        challengedAt: "2026-03-05T21:00:00Z",
        gameLabel: "B",
        inning: 9,
        halfInning: "Bottom",
        calledDescription: "Strike",
        challengeTeamName: "Team B",
        isOverturned: false,
        leverageScore: 2.2,
      },
      {
        challengeId: "c",
        gamePk: 3,
        challengedAt: "2026-03-05T19:00:00Z",
        gameLabel: "C",
        inning: 6,
        halfInning: "Top",
        calledDescription: "Ball",
        challengeTeamName: "Team C",
        isOverturned: false,
        leverageScore: 1.1,
      },
    ];

    const ranked = rankChallengeMoments(moments);
    expect(ranked.map((m) => m.challengeId)).toEqual(["b", "a", "c"]);
  });
});

