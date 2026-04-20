import { beforeEach, describe, expect, it, vi } from "vitest";

type TxQuery = <R extends { [key: string]: unknown }>(statement: string, values?: unknown[]) => Promise<R[]>;

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
        style: "High-Impact",
        orgStyleLabel: "Timely",
        styleConfidence: "high",
        styleScores: { "High-Impact": 82, Selective: 60, Overactive: 45, "Low-Usage": 20, Balanced: 38 },
        challengeRatePerGame: 1,
        lateLeverageShare: 0.4,
        earlyLowLeverageShare: 0.2,
        avgRunExpectancyDelta: 0.12,
        highRunValueShare: 0.65,
        runValueConfidence: "high",
        avgWinExpectancyDelta: 0.016,
        highWinValueShare: 0.68,
        winValueConfidence: "high",
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
        fanDescriptor: "Volatile",
        orgDescriptor: "Elevated risk",
        confidence: "medium",
        riskTier: "Elevated",
        averageRunExpectancyDelta: 0.009,
        averageWinExpectancyDelta: 0.0016,
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

    const queryMock = vi.fn(async (statement: string, values: unknown[] = []) => {
      void values;
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
    const txQuery = queryMock as unknown as TxQuery;

    withTransactionMock.mockImplementationOnce(async (callback: (query: TxQuery) => Promise<unknown>) => callback(txQuery));

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

  it("prioritizes real desk volume over a tiny perfect sample in scout notes", async () => {
    sqlOneMock.mockResolvedValueOnce({
      summarydate: "2026-03-07",
      gamestracked: 10,
      challengestotal: 14,
      overturnstotal: 6,
      overturnrate: 0.4286,
      teamschallenging: 8,
      avgteamchallenges: 1.4,
      teamsummaries: [
        {
          teamId: 111,
          teamName: "Small Sample Club",
          challengesTotal: 1,
          overturnRate: 1,
        },
        {
          teamId: 147,
          teamName: "New York Yankees",
          challengesTotal: 4,
          overturnRate: 0.25,
          lateCloseShare: 0.5,
        },
      ],
    });
    sqlMock
      .mockResolvedValueOnce([{ teamid: 147, wins: 13, losses: 5 }])
      .mockResolvedValueOnce([{ teamid: 147, leagueid: 104, divisionrank: 1, wins: 13, losses: 5 }])
      .mockResolvedValueOnce([{ teamid: 147, leagueid: 104, divisionrank: 1, wins: 12, losses: 5 }])
      .mockResolvedValueOnce([]);

    const queryMock = vi.fn(async (statement: string, values: unknown[] = []) => {
      void values;
      if (statement.includes("RETURNING generation_run_id AS generationRunId")) {
        return [{ generationrunid: "run-4" }];
      }
      if (statement.includes("RETURNING article_id AS articleId")) {
        return [{ articleid: "article-4" }];
      }
      if (statement.includes("SELECT section_id AS sectionId")) {
        return [];
      }
      return [];
    });
    const txQuery = queryMock as unknown as TxQuery;

    withTransactionMock.mockImplementationOnce(async (callback: (query: TxQuery) => Promise<unknown>) => callback(txQuery));

    await generateDailyAutoArticle("2026-03-07");

    const articleInsertCall = queryMock.mock.calls.find(([statement]) =>
      String(statement).includes("INSERT INTO editorial.articles"),
    );
    const factsPayload = articleInsertCall?.[1]?.[7] as { scoutBrief?: { leadCandidates?: Array<{ teamId: number }> } };

    expect(factsPayload.scoutBrief?.leadCandidates?.[0]?.teamId).toBe(147);
  });

  it("suppresses a daily auto article when daily evidence is missing", async () => {
    sqlOneMock.mockResolvedValueOnce(null);
    sqlMock
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const queryMock = vi.fn(async (statement: string, values: unknown[] = []) => {
      void values;
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
    const txQuery = queryMock as unknown as TxQuery;

    withTransactionMock.mockImplementationOnce(async (callback: (query: TxQuery) => Promise<unknown>) => callback(txQuery));

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

    const queryMock = vi.fn(async (statement: string, values: unknown[] = []) => {
      void values;
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
    const txQuery = queryMock as unknown as TxQuery;

    withTransactionMock.mockImplementationOnce(async (callback: (query: TxQuery) => Promise<unknown>) => callback(txQuery));

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
