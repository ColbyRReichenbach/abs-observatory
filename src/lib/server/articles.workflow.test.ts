import { beforeEach, describe, expect, it, vi } from "vitest";

const { sqlMock, sqlOneMock, withTransactionMock } = vi.hoisted(() => ({
  sqlMock: vi.fn(),
  sqlOneMock: vi.fn(),
  withTransactionMock: vi.fn(),
}));

const { getViewerProfileMock } = vi.hoisted(() => ({
  getViewerProfileMock: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  sql: sqlMock,
  sqlOne: sqlOneMock,
  withTransaction: withTransactionMock,
}));

vi.mock("@/lib/server/profiles", () => ({
  getViewerProfile: getViewerProfileMock,
}));

import { createArticleDraft, updateArticleDraft } from "@/lib/server/articles";

describe("editorial workflow services", () => {
  beforeEach(() => {
    sqlMock.mockReset();
    sqlOneMock.mockReset();
    withTransactionMock.mockReset();
    getViewerProfileMock.mockReset();
    getViewerProfileMock.mockResolvedValue({
      userId: "user-1",
      isVerified: true,
      roles: ["admin"],
    });
  });

  it("creates weekly editorial drafts with revisions and evidence blobs", async () => {
    const queryMock = vi.fn(async (statement: string) => {
      if (statement.includes("RETURNING article_id AS articleId")) {
        return [{ articleid: "article-1" }];
      }
      if (statement.includes("SELECT section_id AS sectionId")) {
        return [{ sectionid: "section-1", sectionkey: "week-facts" }];
      }
      if (statement.includes("SELECT COALESCE(MAX(revision_number), 0)")) {
        return [{ revisionnumber: 0 }];
      }
      return [];
    });
    withTransactionMock.mockImplementationOnce(async (callback: typeof queryMock) => callback(queryMock));

    const articleId = await createArticleDraft(new Request("http://localhost/api/articles", { headers: { "x-dev-user-id": "user-1" } }), {
      articleType: "weekly_editorial",
      title: "Weekly Zone Watch",
      bodyMd: "Draft body",
      scheduledPublishAt: "2026-03-09T12:00:00Z",
      sections: [
        {
          sectionKey: "week-facts",
          sectionKind: "fact",
          heading: "Week Facts",
          bodyMd: "Fact block",
          sectionOrder: 1,
          evidencePayload: { summary: true },
        },
      ],
      evidenceBlobs: [
        {
          sectionKey: "week-facts",
          evidenceKind: "snapshot",
          label: "Weekly snapshot",
          payload: { weekStart: "2026-03-02" },
        },
      ],
      factsPayload: { facts: 1 },
      derivedMetricsPayload: { derived: 1 },
      hypothesisPayload: { hypothesis: 1 },
    });

    expect(articleId).toBe("article-1");
    expect(queryMock).toHaveBeenCalledWith(expect.stringContaining("INSERT INTO editorial.article_revisions"), expect.any(Array));
    expect(queryMock).toHaveBeenCalledWith(expect.stringContaining("INSERT INTO editorial.article_evidence_blobs"), expect.any(Array));
  });

  it("updates drafts and records a new revision", async () => {
    const queryMock = vi.fn(async (statement: string) => {
      if (statement.includes("FROM editorial.articles")) {
        return [
          {
            articleid: "article-1",
            title: "Weekly Zone Watch",
            dek: "Dek",
            bodymd: "Old body",
            factspayload: { facts: 1 },
            derivedmetricspayload: { derived: 1 },
            hypothesispayload: { hypothesis: 1 },
          },
        ];
      }
      if (statement.includes("SELECT section_id AS sectionId")) {
        return [{ sectionid: "section-1", sectionkey: "week-facts" }];
      }
      if (statement.includes("SELECT COALESCE(MAX(revision_number), 0)")) {
        return [{ revisionnumber: 1 }];
      }
      return [];
    });
    withTransactionMock.mockImplementationOnce(async (callback: typeof queryMock) => callback(queryMock));

    const articleId = await updateArticleDraft(
      new Request("http://localhost/api/articles/weekly-zone-watch", { headers: { "x-dev-user-id": "user-1" } }),
      "weekly-zone-watch",
      {
      bodyMd: "Updated body",
      revisionNote: "Editor pass",
      sections: [
        {
          sectionKey: "week-facts",
          sectionKind: "fact",
          heading: "Week Facts",
          bodyMd: "Updated fact block",
          sectionOrder: 1,
          evidencePayload: { summary: "updated" },
        },
      ],
      evidenceBlobs: [
        {
          sectionKey: "week-facts",
          evidenceKind: "snapshot",
          label: "Weekly snapshot",
          payload: { refreshed: true },
        },
      ],
    },
    );

    expect(articleId).toBe("article-1");
    expect(queryMock).toHaveBeenCalledWith(expect.stringContaining("UPDATE editorial.articles"), expect.any(Array));
    expect(queryMock).toHaveBeenCalledWith(expect.stringContaining("INSERT INTO editorial.article_revisions"), expect.any(Array));
  });
});
