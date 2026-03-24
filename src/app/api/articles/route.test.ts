import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  createArticleDraftMock,
  generateDailyAutoArticleMock,
  listPublishedArticlesMock,
  enqueueJobMock,
  requireOwnerAdminMock,
  assertValidCsrfMock,
} = vi.hoisted(() => ({
  createArticleDraftMock: vi.fn(),
  generateDailyAutoArticleMock: vi.fn(),
  listPublishedArticlesMock: vi.fn(),
  enqueueJobMock: vi.fn(),
  requireOwnerAdminMock: vi.fn(),
  assertValidCsrfMock: vi.fn(),
}));

vi.mock("@/lib/server/articles", () => ({
  createArticleDraft: createArticleDraftMock,
  generateDailyAutoArticle: generateDailyAutoArticleMock,
  listPublishedArticles: listPublishedArticlesMock,
}));

vi.mock("@/lib/server/job-queue", () => ({
  enqueueJob: enqueueJobMock,
}));

vi.mock("@/lib/server/admin", () => ({
  requireOwnerAdmin: requireOwnerAdminMock,
}));

vi.mock("@/lib/server/csrf", () => ({
  assertValidCsrf: assertValidCsrfMock,
}));

import { GET, POST } from "@/app/api/articles/route";

describe("articles route", () => {
  beforeEach(() => {
    requireOwnerAdminMock.mockReset();
    assertValidCsrfMock.mockReset();
    requireOwnerAdminMock.mockResolvedValue({
      userId: "owner-1",
      roles: ["admin"],
      isVerified: true,
    });
  });

  it("lists published articles", async () => {
    listPublishedArticlesMock.mockResolvedValueOnce([{ slug: "daily-recap" }]);

    const response = await GET(new Request("http://localhost/api/articles?limit=5"));

    expect(listPublishedArticlesMock).toHaveBeenCalledWith(5);
    expect(await response.json()).toEqual({ articles: [{ slug: "daily-recap" }] });
  });

  it("creates article drafts and can trigger daily-auto generation", async () => {
    createArticleDraftMock.mockResolvedValueOnce("article-1");
    const draftResponse = await POST(
      new Request("http://localhost/api/articles", {
        method: "POST",
        body: JSON.stringify({
          articleType: "weekly_editorial",
          title: "Weekly Zone Watch",
          bodyMd: "Draft body",
          sections: [
            {
              sectionKey: "week-facts",
              sectionKind: "fact",
              heading: "Week Facts",
              bodyMd: "Fact block",
              sectionOrder: 1,
            },
          ],
        }),
      }),
    );

    expect(draftResponse.status).toBe(201);
    expect(await draftResponse.json()).toEqual({ articleId: "article-1" });

    generateDailyAutoArticleMock.mockResolvedValueOnce({ articleId: "article-2", status: "published" });
    const autoResponse = await POST(
      new Request("http://localhost/api/articles?mode=daily-auto&sourceDate=2026-03-05", {
        method: "POST",
        headers: { "x-csrf-token": "test-token" },
      }),
    );

    expect(generateDailyAutoArticleMock).toHaveBeenCalledWith("2026-03-05");
    expect(autoResponse.status).toBe(201);
    expect(await autoResponse.json()).toEqual({ article: { articleId: "article-2", status: "published" } });
  });

  it("can queue daily-auto generation for the worker path", async () => {
    enqueueJobMock.mockResolvedValueOnce({ jobRunId: "job-1", status: "queued" });

    const response = await POST(
      new Request("http://localhost/api/articles?mode=daily-auto&sourceDate=2026-03-05&async=true", {
        method: "POST",
        headers: { "x-csrf-token": "test-token" },
      }),
    );

    expect(response.status).toBe(202);
    expect(await response.json()).toEqual({
      jobRunId: "job-1",
      status: "queued",
      pollAfterSeconds: 5,
    });
  });
});
