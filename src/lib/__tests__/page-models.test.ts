import { describe, expect, it } from "vitest";

import { buildHomeChallengeMoments, buildTeamLeaderboardEntries, buildUmpireLeaderboardEntries } from "@/lib/page-models";
import type { HomeChallengeMoment, TeamSummary, UmpireSummary } from "@/lib/types";

describe("page model builders", () => {
  it("adds team styles from summary and timing metrics", () => {
    const teams: TeamSummary[] = [
      {
        teamId: 1,
        teamName: "Team One",
        gamesTracked: 10,
        usedSuccessful: 8,
        usedFailed: 2,
        challengesTotal: 10,
        avgRemaining: 1.2,
        overturnRate: 0.8,
      },
      {
        teamId: 2,
        teamName: "Team Two",
        gamesTracked: 10,
        usedSuccessful: 2,
        usedFailed: 8,
        challengesTotal: 10,
        avgRemaining: 0.2,
        overturnRate: 0.2,
      },
    ];

    const entries = buildTeamLeaderboardEntries(
      teams,
      new Map([
        [1, { teamId: 1, lateLeverageShare: 0.7, earlyLowLeverageShare: 0.1, avgRunExpectancyDelta: 0.12, highRunValueShare: 0.7, runValueConfidence: "high", avgWinExpectancyDelta: 0.018, highWinValueShare: 0.7, winValueConfidence: "high" }],
        [2, { teamId: 2, lateLeverageShare: 0.1, earlyLowLeverageShare: 0.6, avgRunExpectancyDelta: -0.04, highRunValueShare: 0.3, runValueConfidence: "medium", avgWinExpectancyDelta: -0.006, highWinValueShare: 0.3, winValueConfidence: "medium" }],
      ]),
    );

    expect(entries[0].style === "High-Impact" || entries[0].style === "Selective").toBe(true);
    expect(entries[0].styleScores["High-Impact"]).toBeGreaterThan(entries[0].styleScores["Low-Usage"]);
    expect(entries[1].style).not.toBe(entries[0].style);
    expect(entries[0].avgRunExpectancyDelta).toBe(0.12);
    expect(entries[0].avgWinExpectancyDelta).toBe(0.018);
  });

  it("adds umpire grades and risk tiers", () => {
    const umpires: UmpireSummary[] = [
      {
        umpireId: 11,
        umpireName: "Stable Ump",
        challengedCalls: 30,
        overturnedCalls: 8,
        confirmedCalls: 22,
        overturnRate: 0.2667,
        gamesWorked: 15,
      },
      {
        umpireId: 22,
        umpireName: "Wild Ump",
        challengedCalls: 30,
        overturnedCalls: 20,
        confirmedCalls: 10,
        overturnRate: 0.6667,
        gamesWorked: 15,
      },
    ];

    const entries = buildUmpireLeaderboardEntries(
      umpires,
      new Map([
        [11, { umpireId: 11, overturnRateVariance: 0.03, recentOverturnRate: 0.25 }],
        [22, { umpireId: 22, overturnRateVariance: 0.12, recentOverturnRate: 0.75 }],
      ]),
    );

    const stable = entries.find((entry) => entry.umpireId === 11)!;
    const wild = entries.find((entry) => entry.umpireId === 22)!;
    expect(stable.reportCardScore).toBeGreaterThan(wild.reportCardScore);
    expect(wild.riskTier).not.toBe("Low");
  });

  it("re-ranks home moments by controversy score and adds chips", () => {
    const moments: HomeChallengeMoment[] = [
      {
        challengeId: "low",
        gamePk: 1,
        challengedAt: "2026-03-08T01:00:00Z",
        gameLabel: "A at B",
        inning: 2,
        halfInning: "Top",
        balls: 0,
        strikes: 0,
        playerName: "Hitter",
        pitchNumber: 1,
        calledDescription: "Ball",
        challengeTeamName: "A",
        isOverturned: false,
        leverageScore: 0,
        gameStatus: "Final",
      },
      {
        challengeId: "high",
        gamePk: 2,
        challengedAt: "2026-03-08T03:00:00Z",
        gameLabel: "C at D",
        inning: 9,
        halfInning: "Bottom",
        balls: 3,
        strikes: 2,
        outs: 2,
        basesState: "011",
        playerName: "Slugger",
        pitchNumber: 7,
        calledDescription: "Called Strike",
        challengeTeamName: "D",
        isOverturned: true,
        leverageScore: 0,
        gameStatus: "Final",
        impactType: "direct_ending_impact",
        homeScore: 4,
        awayScore: 4,
      },
    ];

    const ranked = buildHomeChallengeMoments(moments);
    expect(ranked[0].challengeId).toBe("high");
    expect(ranked[0].reasonChips).toContain("Overturned");
  });
});
