import { beforeEach, describe, expect, it, vi } from "vitest";

const { sqlOneMock } = vi.hoisted(() => ({
  sqlOneMock: vi.fn(),
}));

const { requireOwnerAdminMock } = vi.hoisted(() => ({
  requireOwnerAdminMock: vi.fn(),
}));

const { writeAuditLogMock } = vi.hoisted(() => ({
  writeAuditLogMock: vi.fn(),
}));

const { clearCachedValueMock, getCacheKeyMock } = vi.hoisted(() => ({
  clearCachedValueMock: vi.fn(),
  getCacheKeyMock: vi.fn(() => "cache-key"),
}));

const { revalidatePathMock } = vi.hoisted(() => ({
  revalidatePathMock: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  sql: vi.fn(),
  sqlOne: sqlOneMock,
}));

vi.mock("@/lib/server/admin", () => ({
  requireOwnerAdmin: requireOwnerAdminMock,
}));

vi.mock("@/lib/server/audit", () => ({
  writeAuditLog: writeAuditLogMock,
}));

vi.mock("@/lib/server/scale", () => ({
  clearCachedValue: clearCachedValueMock,
  getCacheKey: getCacheKeyMock,
}));

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

import { publishArticleFromAdmin } from "@/lib/server/admin-editorial";

describe("admin editorial publishing", () => {
  beforeEach(() => {
    sqlOneMock.mockReset();
    requireOwnerAdminMock.mockReset();
    writeAuditLogMock.mockReset();
    clearCachedValueMock.mockReset();
    getCacheKeyMock.mockClear();
    revalidatePathMock.mockReset();

    requireOwnerAdminMock.mockResolvedValue({
      userId: "owner-1",
      roles: ["owner_admin"],
    });
  });

  it("publishes validation-passed generated output", async () => {
    sqlOneMock
      .mockResolvedValueOnce({
        articleid: "article-1",
        slug: "observer-run",
        status: "generated",
        validationstate: "passed",
      })
      .mockResolvedValueOnce({
        articleid: "article-1",
        slug: "observer-run",
      });

    await expect(publishArticleFromAdmin("observer-run")).resolves.toEqual({
      articleId: "article-1",
      slug: "observer-run",
    });

    expect(writeAuditLogMock).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "editorial_article_published",
        targetId: "article-1",
      }),
    );
  });

  it("rejects publishing when validation has not passed", async () => {
    sqlOneMock.mockResolvedValueOnce({
      articleid: "article-2",
      slug: "not-ready",
      status: "generated",
      validationstate: "pending",
    });

    await expect(publishArticleFromAdmin("not-ready")).rejects.toThrow("Only validation-passed articles can be published");
  });

  it("rejects blocked desk states", async () => {
    sqlOneMock.mockResolvedValueOnce({
      articleid: "article-3",
      slug: "suppressed-run",
      status: "suppressed",
      validationstate: "passed",
    });

    await expect(publishArticleFromAdmin("suppressed-run")).rejects.toThrow("Blocked articles cannot be published from the desk");
  });
});
