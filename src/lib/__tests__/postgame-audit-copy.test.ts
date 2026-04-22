import { describe, expect, it } from "vitest";

import {
  buildPostgameAuditCoverage,
  buildPostgameAuditNarrative,
  buildPostgameAuditPresentation,
  buildPostgameAuditTeamVerdicts,
  buildPostgameAuditUmpireVerdict,
} from "@/lib/postgame-audit-copy";
import type { GamePostgameAudit } from "@/lib/types";

function buildAudit(overrides: Partial<GamePostgameAudit> = {}): GamePostgameAudit {
  return {
    gamePk: 1,
    gameDate: "2026-04-19",
    statusAbstract: "Final",
    venue: "T-Mobile Park",
    homeTeamName: "Seattle Mariners",
    awayTeamName: "New York Yankees",
    homeScore: 4,
    awayScore: 3,
    totalChallenges: 4,
    overturnedChallenges: 2,
    confirmedChallenges: 2,
    lateCloseChallenges: 2,
    positiveExpectedChallengeCount: 2,
    lowValueChallengeCount: 1,
    valueMode: "win",
    totalExpectedValue: 0.0123,
    totalActualValue: 0.0155,
    totalValueSurplus: 0.0032,
    home: {
      teamId: 136,
      teamName: "Seattle Mariners",
      abbreviation: "SEA",
      primaryColor: "#0C2C56",
      totalChallenges: 2,
      overturnedChallenges: 2,
      overturnRate: 1,
      averageLeverage: 1.4,
      lateCloseShare: 0.5,
      totalValue: 0.0112,
      expectedValueSum: 0.007,
      valueSurplus: 0.0042,
    },
    away: {
      teamId: 147,
      teamName: "New York Yankees",
      abbreviation: "NYY",
      primaryColor: "#0C2340",
      totalChallenges: 2,
      overturnedChallenges: 0,
      overturnRate: 0,
      averageLeverage: 1.1,
      lateCloseShare: 0.5,
      totalValue: 0.0043,
      expectedValueSum: 0.0053,
      valueSurplus: -0.001,
    },
    impactSummary: {
      totalChallenges: 4,
      overturnedChallenges: 2,
      confirmedChallenges: 2,
      biggestSwing: {
        challengeId: "c1",
        challengeTeamName: "Seattle Mariners",
        inning: 8,
        halfInning: "Bottom",
        calledDescription: "Called Strike",
        isOverturned: true,
        countBefore: "2-2",
        umpireCount: "2-2",
        countAfter: "3-2",
        estimatedLeverageIndex: 1.9,
        estimatedChallengeSwing: 0.61,
        runExpectancyDelta: 0.08,
        runExpectancyConfidence: "high",
        winExpectancyDelta: 0.021,
        winExpectancyConfidence: "high",
        expectedChallengeValue: 0.014,
        decisionRecommendation: "challenge",
        impactSummary: "Late-game overturn extended the inning.",
      },
      highestLeverage: {
        challengeId: "c2",
        challengeTeamName: "New York Yankees",
        inning: 9,
        halfInning: "Top",
        calledDescription: "Called Ball",
        isOverturned: false,
        countBefore: "1-2",
        umpireCount: "2-2",
        countAfter: "2-2",
        estimatedLeverageIndex: 2.1,
        estimatedChallengeSwing: -0.2,
        runExpectancyDelta: null,
        runExpectancyConfidence: null,
        winExpectancyDelta: null,
        winExpectancyConfidence: null,
        expectedChallengeValue: 0.003,
        decisionRecommendation: "hold",
        impactSummary: "Confirmed call held the at-bat line.",
      },
      biggestRunValue: null,
      biggestWinValue: null,
    },
    umpireSummary: {
      totalChallenges: 4,
      overturnedChallenges: 2,
      mostTargetedSplit: null,
      highestRiskSplit: {
        pitcherThrows: "R",
        batterStand: "L",
        sampleSize: 2,
        overturnRate: 0.5,
        averageLeverage: 1.5,
        averageWinDelta: 0.01,
        averageRunDelta: 0.05,
      },
      topPitchType: {
        pitchType: "Four-Seam Fastball",
        sampleSize: 3,
        overturnRate: 0.33,
        averageLeverage: 1.2,
      },
      topLane: {
        lane: "glove-side edge",
        sampleSize: 2,
        overturnRate: 0.5,
        averageLeverage: 1.3,
      },
      splits: [],
    },
    narrative: {
      headline: "",
      summary: "",
      valueRead: "",
      umpireRead: "",
    },
    coverage: {
      valueMode: "win",
      hasExpectedValueLayer: true,
      hasTrustedActualValueLayer: true,
      methodologyNote: "",
    },
    teamVerdicts: {
      home: {
        teamId: 136,
        teamName: "Seattle Mariners",
        summary: "",
        wonReviewBattle: true,
      },
      away: {
        teamId: 147,
        teamName: "New York Yankees",
        summary: "",
        wonReviewBattle: false,
      },
    },
    umpireVerdict: {
      summary: "",
      highestRiskSplitLabel: null,
      topPitchType: null,
      topLane: null,
    },
    ...overrides,
  };
}

describe("postgame audit copy", () => {
  it("builds a clear win-value read when trusted surplus exists", () => {
    const audit = buildAudit();
    const narrative = buildPostgameAuditNarrative(audit);
    const coverage = buildPostgameAuditCoverage(audit);
    const teamVerdicts = buildPostgameAuditTeamVerdicts(audit);
    const umpireVerdict = buildPostgameAuditUmpireVerdict(audit);

    expect(narrative.headline).toContain("Seattle Mariners won the replay battle");
    expect(narrative.summary).toContain("Seattle Mariners beat New York Yankees 4-3");
    expect(narrative.valueRead).toContain("Reviewed calls were worth");
    expect(narrative.valueRead).toContain("Replay beat the model");
    expect(coverage.hasExpectedValueLayer).toBe(true);
    expect(teamVerdicts.home.wonReviewBattle).toBe(true);
    expect(teamVerdicts.home.summary).toContain("beat the WE expectation on replay");
    expect(umpireVerdict.summary).toContain("Four-Seam Fastball was the pitch taken to replay most often");
  });

  it("falls back to estimated-swing language when trusted value is unavailable", () => {
    const baseAudit = buildAudit();
    const audit = buildAudit({
      valueMode: "estimated",
      totalExpectedValue: null,
      totalActualValue: 0.41,
      totalValueSurplus: null,
      home: {
        ...baseAudit.home,
        totalValue: 0.33,
        valueSurplus: null,
        expectedValueSum: null,
      },
      away: {
        ...baseAudit.away,
        totalValue: 0.08,
        valueSurplus: null,
        expectedValueSum: null,
      },
    });
    const narrative = buildPostgameAuditNarrative(audit);
    const coverage = buildPostgameAuditCoverage(audit);

    expect(narrative.valueRead).toContain("estimated swing");
    expect(coverage.methodologyNote).toContain("estimated swing");
  });

  it("keeps small umpire samples descriptive instead of overcalling them", () => {
    const audit = buildAudit();
    const umpireVerdict = buildPostgameAuditUmpireVerdict(audit);

    expect(
      umpireVerdict.summary.includes("too small a sample to call a trend") ||
      umpireVerdict.summary.includes("small-sample bucket") ||
      umpireVerdict.summary.includes("still light"),
    ).toBe(true);
    expect(umpireVerdict.summary).toContain("1-for-2");
    expect(umpireVerdict.summary).not.toContain("shakier matchup");
    expect(umpireVerdict.summary).not.toContain("hottest lane");
  });

  it("avoids N/A winner copy when one side never uses a challenge", () => {
    const baseAudit = buildAudit();
    const audit = buildAudit({
      valueMode: "run",
      totalActualValue: -0.062,
      totalExpectedValue: null,
      home: {
        ...baseAudit.home,
        teamName: "Los Angeles Angels",
        totalChallenges: 0,
        totalValue: null,
        expectedValueSum: null,
        lateCloseShare: null,
        overturnRate: null,
      },
      away: {
        ...baseAudit.away,
        teamName: "San Diego Padres",
        totalChallenges: 3,
        totalValue: -0.062,
        expectedValueSum: null,
        overturnRate: 0.67,
      },
    });

    const narrative = buildPostgameAuditNarrative(audit);
    const teamVerdicts = buildPostgameAuditTeamVerdicts(audit);

    expect(narrative.headline).toContain("Los Angeles Angels stayed out of trouble on replay");
    expect(narrative.valueRead).toContain("never needed replay");
    expect(teamVerdicts.home.summary).not.toContain("N/A");
  });

  it("avoids saying a club lost value when it actually broke even", () => {
    const baseAudit = buildAudit();
    const audit = buildAudit({
      valueMode: "run",
      totalExpectedValue: null,
      totalActualValue: 0.0392,
      totalValueSurplus: null,
      home: {
        ...baseAudit.home,
        teamName: "New York Yankees",
        totalValue: 0,
      },
      away: {
        ...baseAudit.away,
        teamName: "Kansas City Royals",
        totalValue: 0.0392,
      },
    });

    const teamVerdicts = buildPostgameAuditTeamVerdicts(audit);

    expect(teamVerdicts.home.summary).toContain("held even on replay");
    expect(teamVerdicts.home.summary).not.toContain("lost +0.00%");
  });

  it("switches to org-facing terminology when org mode is requested", () => {
    const audit = buildAudit({
      valueMode: "run",
      totalExpectedValue: null,
      totalActualValue: 0.022,
    });

    const presentation = buildPostgameAuditPresentation(audit, "org");

    expect(presentation.narrative.headline).toContain("review");
    expect(presentation.narrative.valueRead).toContain("realized run value");
    expect(presentation.coverage.methodologyNote).toContain("realized run value");
    expect(presentation.umpireVerdict.summary).toContain("review exposure");
  });
});
