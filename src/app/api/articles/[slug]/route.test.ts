import { describe, expect, it, vi } from "vitest";

const { getArticleBySlugMock, publishArticleMock, updateArticleDraftMock } = vi.hoisted(() => ({
  getArticleBySlugMock: vi.fn(),
  publishArticleMock: vi.fn(),
  updateArticleDraftMock: vi.fn(),
}));

vi.mock("@/lib/server/articles", () => ({
  getArticleBySlug: getArticleBySlugMock,
  publishArticle: publishArticleMock,
  updateArticleDraft: updateArticleDraftMock,
}));

import { GET, PATCH } from "@/app/api/articles/[slug]/route";

describe("article detail route", () => {
  it("returns published article detail", async () => {
    getArticleBySlugMock.mockResolvedValueOnce({ slug: "daily-recap" });

    const response = await GET(new Request("http://localhost/api/articles/daily-recap"), {
      params: Promise.resolve({ slug: "daily-recap" }),
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ article: { slug: "daily-recap" } });
  });

  it("updates drafts and publishes articles", async () => {
    updateArticleDraftMock.mockResolvedValueOnce("article-1");
    const updateResponse = await PATCH(
      new Request("http://localhost/api/articles/weekly-zone-watch", {
        method: "PATCH",
        body: JSON.stringify({
          action: "update",
          bodyMd: "Updated draft",
          revisionNote: "Second draft",
        }),
      }),
      { params: Promise.resolve({ slug: "weekly-zone-watch" }) },
    );
    expect(updateArticleDraftMock).toHaveBeenCalled();
    expect(updateResponse.status).toBe(200);

    publishArticleMock.mockResolvedValueOnce(undefined);
    const publishResponse = await PATCH(
      new Request("http://localhost/api/articles/weekly-zone-watch", {
        method: "PATCH",
        body: JSON.stringify({ action: "publish" }),
      }),
      { params: Promise.resolve({ slug: "weekly-zone-watch" }) },
    );

    expect(publishArticleMock).toHaveBeenCalledWith(expect.any(Request), "weekly-zone-watch");
    expect(publishResponse.status).toBe(200);
    expect(await publishResponse.json()).toEqual({ ok: true });
  });

  it("maps csrf and forbidden article edits to 403", async () => {
    updateArticleDraftMock.mockRejectedValueOnce(new Error("CSRF validation failed"));
    const csrfResponse = await PATCH(
      new Request("http://localhost/api/articles/weekly-zone-watch", {
        method: "PATCH",
        body: JSON.stringify({ action: "update", bodyMd: "Updated draft" }),
      }),
      { params: Promise.resolve({ slug: "weekly-zone-watch" }) },
    );
    expect(csrfResponse.status).toBe(403);

    updateArticleDraftMock.mockRejectedValueOnce(new Error("Forbidden"));
    const forbiddenResponse = await PATCH(
      new Request("http://localhost/api/articles/weekly-zone-watch", {
        method: "PATCH",
        body: JSON.stringify({ action: "update", bodyMd: "Updated draft" }),
      }),
      { params: Promise.resolve({ slug: "weekly-zone-watch" }) },
    );
    expect(forbiddenResponse.status).toBe(403);
  });
});
