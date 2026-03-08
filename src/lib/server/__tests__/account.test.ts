import { beforeEach, describe, expect, it, vi } from "vitest";

const withTransactionMock = vi.fn();
const getViewerProfileMock = vi.fn();
const writeAuditLogMock = vi.fn();

vi.mock("@/lib/db", () => ({
  withTransaction: withTransactionMock,
}));

vi.mock("@/lib/server/profiles", () => ({
  getViewerProfile: getViewerProfileMock,
}));

vi.mock("@/lib/server/audit", () => ({
  writeAuditLog: writeAuditLogMock,
}));

describe("account management", () => {
  beforeEach(() => {
    withTransactionMock.mockReset();
    getViewerProfileMock.mockReset();
    writeAuditLogMock.mockReset();
  });

  it("purges AI history for the authenticated viewer", async () => {
    const { purgeViewerAiHistory } = await import("@/lib/server/account");
    getViewerProfileMock.mockResolvedValueOnce({
      userId: "user-1",
      isVerified: true,
    });
    withTransactionMock.mockImplementationOnce(async (callback: (query: (statement: string, values?: unknown[]) => Promise<unknown[]>) => Promise<void>) =>
      callback(async () => []),
    );

    await purgeViewerAiHistory(
      new Request("http://localhost/api/me?scope=ai", {
        method: "DELETE",
        headers: {
          cookie: "aibs_csrf=test-token",
          "x-csrf-token": "test-token",
          origin: "http://localhost",
        },
      }),
    );

    expect(writeAuditLogMock).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "viewer_ai_history_purged",
        targetId: "user-1",
      }),
    );
  });

  it("deletes the viewer account while preserving thread structure", async () => {
    const { deleteViewerAccount } = await import("@/lib/server/account");
    getViewerProfileMock.mockResolvedValueOnce({
      userId: "user-1",
      isVerified: true,
    });
    const queryMock = vi.fn(async () => []);
    withTransactionMock.mockImplementationOnce(async (callback: typeof queryMock) => callback(queryMock));

    await deleteViewerAccount(
      new Request("http://localhost/api/me", {
        method: "DELETE",
        headers: {
          cookie: "aibs_csrf=test-token",
          "x-csrf-token": "test-token",
          origin: "http://localhost",
        },
      }),
    );

    expect(queryMock).toHaveBeenCalledWith(expect.stringContaining("UPDATE community.comments"), ["user-1"]);
    expect(queryMock).toHaveBeenCalledWith(expect.stringContaining("DELETE FROM product.users"), ["user-1"]);
    expect(writeAuditLogMock).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "viewer_account_deleted",
        targetId: "user-1",
      }),
    );
  });
});
