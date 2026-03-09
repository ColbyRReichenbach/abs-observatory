import { beforeEach, describe, expect, it, vi } from "vitest";

const { sqlMock, sqlOneMock, withTransactionMock } = vi.hoisted(() => ({
  sqlMock: vi.fn(),
  sqlOneMock: vi.fn(),
  withTransactionMock: vi.fn(),
}));

const { getTeamLeaderboardModelMock, getUmpireLeaderboardModelMock } = vi.hoisted(() => ({
  getTeamLeaderboardModelMock: vi.fn(),
  getUmpireLeaderboardModelMock: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  sql: sqlMock,
  sqlOne: sqlOneMock,
  withTransaction: withTransactionMock,
}));

vi.mock("@/lib/data", () => ({
  getTeamLeaderboardModel: getTeamLeaderboardModelMock,
  getUmpireLeaderboardModel: getUmpireLeaderboardModelMock,
}));

import { generateDailyAutoArticle, getArticleBySlug } from "@/lib/server/articles";

describe("editorial article generation", () => {
  beforeEach(() => {
    delete process.env.ARTICLE_AUTOPUBLISH_FREEZE;
    sqlMock.mockReset();
    sqlOneMock.mockReset();
    withTransactionMock.mockReset();
    getTeamLeaderboardModelMock.mockReset();
    getUmpireLeaderboardModelMock.mockReset();
    getTeamLeaderboardModelMock.mockResolvedValue([
      {
        teamId: 147,
        teamName: "New York Yankees",
        gamesTracked: 12,
        usedSuccessful: 8,
        usedFailed: 4,
        challengesTotal: 12,
        avgRemaining: 0.9,
        overturnRate: 0.667,
        style: "Clutch",
        orgStyleLabel: "Opportunistic",
        styleConfidence: "high",
        styleScores: { Clutch: 82, Calculated: 60, "Trigger-Happy": 45, Passive: 20 },
      },
    ]);
    getUmpireLeaderboardModelMock.mockResolvedValue([
      {
        umpireId: 11,
        umpireName: "Test Umpire",
        challengedCalls: 20,
        overturnedCalls: 10,
        confirmedCalls: 10,
        overturnRate: 0.5,
        gamesWorked: 10,
        reportCardScore: 42,
        grade: "D",
        fanDescriptor: "Erratic",
        orgDescriptor: "Elevated risk",
        confidence: "medium",
        riskTier: "Elevated",
      },
    ]);
  });

  it("publishes a daily auto article when evidence-backed marts are present", async () => {
    sqlOneMock.mockResolvedValueOnce({
      summarydate: "2026-03-05",
      gamestracked: 12,
      challengestotal: 18,
      overturnstotal: 7,
      overturnrate: 0.3889,
      teamschallenging: 9,
      avgteamchallenges: 1.5,
      teamsummaries: [],
    });
    sqlMock
      .mockResolvedValueOnce([{ teamid: 147, wins: 12, losses: 5 }])
      .mockResolvedValueOnce([{ teamid: 147, leagueid: 104, divisionrank: 1, wins: 12, losses: 5 }])
      .mockResolvedValueOnce([{ teamid: 147, leagueid: 104, divisionrank: 2, wins: 11, losses: 5 }])
      .mockResolvedValueOnce([
        {
          challengeid: "c-1",
          gamepk: 123,
          challengedat: "2026-03-05T03:10:00Z",
          inning: 8,
          balls: 3,
          strikes: 2,
          outs: 2,
          basesstate: "110",
          homescore: 4,
          awayscore: 4,
          challengeteamname: "New York Yankees",
          challengeplayername: "Aaron Judge",
          calleddescription: "Called Strike",
          isoverturned: true,
          impacttype: "direct_ending_impact",
          missdistance: 0.31,
        },
      ]);

    const queryMock = vi.fn(async (statement: string) => {
      if (statement.includes("RETURNING generation_run_id AS generationRunId")) {
        return [{ generationrunid: "run-1" }];
      }
      if (statement.includes("RETURNING article_id AS articleId")) {
        return [{ articleid: "article-1" }];
      }
      if (statement.includes("SELECT section_id AS sectionId")) {
        return [
          { sectionid: "section-1", sectionkey: "league-facts" },
          { sectionid: "section-2", sectionkey: "league-derived" },
        ];
      }
      return [];
    });

    withTransactionMock.mockImplementationOnce(async (callback: typeof queryMock) => callback(queryMock));

    const result = await generateDailyAutoArticle("2026-03-05");

    expect(result).toEqual({
      articleId: "article-1",
      slug: "abs-daily-recap-2026-03-05-daily-auto",
      status: "published",
      validationState: "passed",
    });
    expect(
      queryMock.mock.calls.some(([statement]) => String(statement).includes("INSERT INTO editorial.generation_runs")),
    ).toBe(true);
    expect(
      queryMock.mock.calls.some(([statement]) => String(statement).includes("INSERT INTO editorial.article_contributors")),
    ).toBe(true);
    const articleInsertCall = queryMock.mock.calls.find(([statement]) =>
      String(statement).includes("INSERT INTO editorial.articles"),
    );
    expect(articleInsertCall?.[1]?.[7]).toEqual(
      expect.objectContaining({
        sourceDate: "2026-03-05",
        summary: expect.any(Object),
        standings: [{ teamid: 147, wins: 12, losses: 5 }],
        authorName: expect.any(String),
        scoutBrief: expect.any(Object),
      }),
    );
  });

  it("suppresses a daily auto article when daily evidence is missing", async () => {
    sqlOneMock.mockResolvedValueOnce(null);
    sqlMock
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const queryMock = vi.fn(async (statement: string) => {
      if (statement.includes("RETURNING generation_run_id AS generationRunId")) {
        return [{ generationrunid: "run-2" }];
      }
      if (statement.includes("RETURNING article_id AS articleId")) {
        return [{ articleid: "article-2" }];
      }
      if (statement.includes("SELECT section_id AS sectionId")) {
        return [];
      }
      return [];
    });

    withTransactionMock.mockImplementationOnce(async (callback: typeof queryMock) => callback(queryMock));

    const result = await generateDailyAutoArticle("2026-03-06");

    expect(result).toEqual({
      articleId: "article-2",
      slug: "abs-daily-recap-2026-03-06-daily-auto",
      status: "suppressed",
      validationState: "failed",
    });
  });

  it("freezes auto-publish when the incident control is active", async () => {
    process.env.ARTICLE_AUTOPUBLISH_FREEZE = "true";
    sqlOneMock.mockResolvedValueOnce({
      summarydate: "2026-03-05",
      gamestracked: 12,
      challengestotal: 18,
      overturnstotal: 7,
      overturnrate: 0.3889,
      teamschallenging: 9,
      avgteamchallenges: 1.5,
      teamsummaries: [],
    });
    sqlMock
      .mockResolvedValueOnce([{ teamid: 147, wins: 12, losses: 5 }])
      .mockResolvedValueOnce([{ teamid: 147, leagueid: 104, divisionrank: 1, wins: 12, losses: 5 }])
      .mockResolvedValueOnce([{ teamid: 147, leagueid: 104, divisionrank: 2, wins: 11, losses: 5 }])
      .mockResolvedValueOnce([
        {
          challengeid: "c-1",
          gamepk: 123,
          challengedat: "2026-03-05T03:10:00Z",
          inning: 8,
          balls: 3,
          strikes: 2,
          outs: 2,
          basesstate: "110",
          homescore: 4,
          awayscore: 4,
          challengeteamname: "New York Yankees",
          challengeplayername: "Aaron Judge",
          calleddescription: "Called Strike",
          isoverturned: true,
          impacttype: "direct_ending_impact",
          missdistance: 0.31,
        },
      ]);

    const queryMock = vi.fn(async (statement: string) => {
      if (statement.includes("RETURNING generation_run_id AS generationRunId")) {
        return [{ generationrunid: "run-3" }];
      }
      if (statement.includes("RETURNING article_id AS articleId")) {
        return [{ articleid: "article-3" }];
      }
      if (statement.includes("SELECT section_id AS sectionId")) {
        return [
          { sectionid: "section-1", sectionkey: "league-facts" },
          { sectionid: "section-2", sectionkey: "league-derived" },
        ];
      }
      return [];
    });

    withTransactionMock.mockImplementationOnce(async (callback: typeof queryMock) => callback(queryMock));

    const result = await generateDailyAutoArticle("2026-03-05");

    expect(result).toEqual({
      articleId: "article-3",
      slug: "abs-daily-recap-2026-03-05-daily-auto",
      status: "generated",
      validationState: "passed",
    });
  });

  it("keeps fact, derived, and hypothesis payloads distinct on article detail reads", async () => {
    sqlOneMock.mockResolvedValueOnce({
      articleid: "article-3",
      slug: "weekly-zone-watch",
      title: "Weekly Zone Watch",
      dek: "Weekly dek",
      articletype: "weekly_editorial",
      status: "published",
      publishedat: "2026-03-09T12:00:00Z",
      scheduledpublishat: "2026-03-09T12:00:00Z",
      sourcedate: "2026-03-02",
      gamepk: null,
      bodymd: "Weekly body",
      validationstate: "passed",
      factspayload: { facts: true },
      derivedmetricspayload: { derived: true },
      hypothesispayload: { hypothesis: true },
      evidencepayload: { evidence: true },
    });
    sqlMock
      .mockResolvedValueOnce([
        {
          sectionid: "section-1",
          sectionkey: "week-facts",
          sectionkind: "fact",
          heading: "Week Facts",
          bodymd: "Fact block",
          sectionorder: 1,
          evidencepayload: { factEvidence: true },
        },
      ])
      .mockResolvedValueOnce([
        {
          evidenceblobid: "blob-1",
          sectionid: "section-1",
          evidencekind: "snapshot",
          label: "Snapshot",
          payload: { source: "daily" },
        },
      ])
      .mockResolvedValueOnce([
        {
          revisionid: "revision-1",
          revisionnumber: 2,
          revisionnote: "Editor pass",
          createdat: "2026-03-09T12:05:00Z",
        },
      ])
      .mockResolvedValueOnce([
        {
          articlecontributorid: "contrib-1",
          displayname: "Miles Meridian",
          role: "Lead Correspondent",
          contributortype: "author",
          sortorder: 1,
          metadata: { tone: "scientific & refined" },
        },
      ]);

    const article = await getArticleBySlug("weekly-zone-watch");

    expect(article).toEqual(
      expect.objectContaining({
        factsPayload: { facts: true },
        derivedMetricsPayload: { derived: true },
        hypothesisPayload: { hypothesis: true },
        contributors: [
          expect.objectContaining({
            displayName: "Miles Meridian",
            contributorType: "author",
          }),
        ],
        sections: [
          expect.objectContaining({
            sectionKind: "fact",
          }),
        ],
      }),
    );
  });
});
