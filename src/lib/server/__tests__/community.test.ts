import { beforeEach, describe, expect, it, vi } from "vitest";

const sqlMock = vi.fn();
const sqlOneMock = vi.fn();
const withTransactionMock = vi.fn();
const getViewerProfileMock = vi.fn();
const writeAuditLogMock = vi.fn();
const consumeRateLimitMock = vi.fn();

vi.mock("@/lib/db", () => ({
  sql: sqlMock,
  sqlOne: sqlOneMock,
  withTransaction: withTransactionMock,
}));

vi.mock("@/lib/server/profiles", () => ({
  getViewerProfile: getViewerProfileMock,
}));

vi.mock("@/lib/server/audit", () => ({
  writeAuditLog: writeAuditLogMock,
}));

vi.mock("@/lib/server/scale", () => ({
  consumeRateLimit: consumeRateLimitMock,
}));

describe("community service", () => {
  beforeEach(() => {
    vi.resetModules();
    delete process.env.COMMENTS_GLOBAL_KILL_SWITCH;
    sqlMock.mockReset();
    sqlOneMock.mockReset();
    withTransactionMock.mockReset();
    getViewerProfileMock.mockReset();
    writeAuditLogMock.mockReset();
    consumeRateLimitMock.mockReset();
    consumeRateLimitMock.mockResolvedValue({ allowed: true, remaining: 10, resetAt: Date.now() + 60_000 });
  });

  it("creates comments with moderation metadata for flagged phrases", async () => {
    const { createComment } = await import("@/lib/server/community");

    getViewerProfileMock.mockResolvedValue({
      userId: "user-1",
      username: "dodger_blue",
      displayName: "Dodger Blue",
      postingEnabled: true,
      isVerified: true,
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    });
    sqlOneMock
      .mockResolvedValueOnce({ status: "open" })
      .mockResolvedValueOnce({ recentcount: "0" })
      .mockResolvedValueOnce({ recentcount: "0" });
    withTransactionMock.mockImplementation(async (callback) =>
      callback(async (statement: string) => {
        if (statement.includes("INSERT INTO community.comments")) {
          return [{ commentid: "comment-1", createdat: "2026-03-06T00:00:00.000Z" }];
        }
        return [];
      }),
    );

    const result = await createComment(new Request("http://localhost", { headers: { "x-dev-user-id": "user-1" } }), {
      threadId: "thread-1",
      body: "That call was hate speech by the zone",
    });

    expect(result.moderationStatus).toBe("pending_review");
    expect(result.toxicityScore).toBeGreaterThan(0.08);
    expect(writeAuditLogMock).toHaveBeenCalledOnce();
  });

  it("creates replies under an existing thread comment", async () => {
    const { createComment } = await import("@/lib/server/community");

    getViewerProfileMock.mockResolvedValue({
      userId: "user-1",
      username: "dodger_blue",
      displayName: "Dodger Blue",
      postingEnabled: true,
      isVerified: true,
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    });
    sqlOneMock
      .mockResolvedValueOnce({ status: "open" })
      .mockResolvedValueOnce({
        commentid: "comment-1",
        threadid: "thread-1",
        userid: "user-2",
        moderationstatus: "published",
        deletedat: null,
        createdat: "2026-03-06T00:00:00.000Z",
      })
      .mockResolvedValueOnce({ recentcount: "0" })
      .mockResolvedValueOnce({ recentcount: "0" });
    withTransactionMock.mockImplementation(async (callback) =>
      callback(async (statement: string, values?: unknown[]) => {
        if (statement.includes("INSERT INTO community.comments")) {
          expect(values?.[1]).toBe("comment-1");
          return [{ commentid: "reply-1", createdat: "2026-03-06T01:00:00.000Z" }];
        }
        return [];
      }),
    );

    const result = await createComment(new Request("http://localhost", { headers: { "x-dev-user-id": "user-1" } }), {
      threadId: "thread-1",
      parentCommentId: "comment-1",
      body: "Reply ball.",
    });

    expect(result.parentCommentId).toBe("comment-1");
  });

  it("renders deleted comments as placeholders without dropping the reply record", async () => {
    const { listComments } = await import("@/lib/server/community");

    sqlMock.mockResolvedValue([
      {
        commentid: "comment-1",
        threadid: "thread-1",
        userid: "user-1",
        parentcommentid: null,
        username: "dodger_blue",
        displayname: "Dodger Blue",
        body: "original text",
        structuredreaction: null,
        moderationstatus: "published",
        toxicityscore: null,
        deletedat: "2026-03-06T00:00:00.000Z",
        createdat: "2026-03-06T00:00:00.000Z",
      },
    ]);

    const result = await listComments("thread-1");

    expect(result).toEqual([
      expect.objectContaining({
        commentId: "comment-1",
        body: "Comment removed",
        moderationStatus: "deleted",
        deletedAt: "2026-03-06T00:00:00.000Z",
      }),
    ]);
  });

  it("honors the global comments kill switch", async () => {
    process.env.COMMENTS_GLOBAL_KILL_SWITCH = "true";
    const { createComment } = await import("@/lib/server/community");

    await expect(
      createComment(new Request("http://localhost"), {
        threadId: "thread-1",
        body: "hello",
      }),
    ).rejects.toThrow("Comments are temporarily disabled");
  });

  it("allows owners to delete their own comments and blocks other users", async () => {
    const { deleteOwnComment } = await import("@/lib/server/community");

    getViewerProfileMock.mockResolvedValue({
      userId: "user-1",
      username: "dodger_blue",
      displayName: "Dodger Blue",
      postingEnabled: true,
      isVerified: true,
      roles: ["user"],
    });
    sqlOneMock
      .mockResolvedValueOnce({
        commentid: "comment-1",
        threadid: "thread-1",
        userid: "user-1",
        moderationstatus: "published",
        deletedat: null,
      })
      .mockResolvedValueOnce({
        commentid: "comment-1",
        threadid: "thread-1",
        userid: "user-1",
        createdat: "2026-03-06T00:00:00.000Z",
      });

    const result = await deleteOwnComment(
      new Request("http://localhost", { headers: { "x-dev-user-id": "user-1" } }),
      "comment-1",
    );

    expect(result.moderationStatus).toBe("deleted");
    expect(result.body).toBe("Comment removed");

    sqlOneMock.mockReset();
    getViewerProfileMock.mockResolvedValue({
      userId: "user-2",
      username: "other_user",
      displayName: "Other User",
      postingEnabled: true,
      isVerified: true,
      roles: ["user"],
    });
    sqlOneMock.mockResolvedValueOnce({
      commentid: "comment-1",
      threadid: "thread-1",
      userid: "user-1",
      moderationstatus: "published",
      deletedat: null,
    });

    await expect(
      deleteOwnComment(new Request("http://localhost", { headers: { "x-dev-user-id": "user-2" } }), "comment-1"),
    ).rejects.toThrow("Forbidden");
  });

  it("allows moderators to hide comments and blocks non-moderators", async () => {
    const { moderateCommentAction } = await import("@/lib/server/community");

    getViewerProfileMock.mockResolvedValue({
      userId: "mod-1",
      username: "zone_admin",
      displayName: "Zone Admin",
      postingEnabled: true,
      isVerified: true,
      roles: ["moderator"],
    });
    sqlOneMock
      .mockResolvedValueOnce({
        commentid: "comment-1",
        threadid: "thread-1",
        userid: "user-1",
        moderationstatus: "pending_review",
        deletedat: null,
      })
      .mockResolvedValueOnce({
        commentid: "comment-1",
        threadid: "thread-1",
        userid: "user-1",
        moderationstatus: "hidden",
        deletedat: null,
        createdat: "2026-03-06T00:00:00.000Z",
      });
    sqlMock
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
      {
        commentid: "comment-1",
        threadid: "thread-1",
        userid: "user-1",
        parentcommentid: null,
        username: "dodger_blue",
        displayname: "Dodger Blue",
        body: "original text",
        structuredreaction: null,
        moderationstatus: "hidden",
        toxicityscore: 0.5,
        deletedat: null,
        createdat: "2026-03-06T00:00:00.000Z",
      },
      ]);

    const result = await moderateCommentAction(
      new Request("http://localhost", { headers: { "x-dev-user-id": "mod-1" } }),
      {
        commentId: "comment-1",
        action: "hide",
        reason: "Escalated pending review",
      },
    );

    expect(result.moderationStatus).toBe("hidden");

    sqlOneMock.mockReset();
    getViewerProfileMock.mockResolvedValue({
      userId: "user-2",
      username: "plain_user",
      displayName: "Plain User",
      postingEnabled: true,
      isVerified: true,
      roles: ["user"],
    });

    await expect(
      moderateCommentAction(new Request("http://localhost", { headers: { "x-dev-user-id": "user-2" } }), {
        commentId: "comment-1",
        action: "hide",
      }),
    ).rejects.toThrow("Forbidden");
  });

  it("allows verified viewers to like available comments and blocks unavailable ones", async () => {
    const { likeComment } = await import("@/lib/server/community");

    getViewerProfileMock.mockResolvedValue({
      userId: "user-1",
      username: "dodger_blue",
      displayName: "Dodger Blue",
      postingEnabled: true,
      isVerified: true,
      roles: ["user"],
    });
    sqlOneMock.mockResolvedValueOnce({
      commentid: "comment-1",
      threadid: "thread-1",
      userid: "user-2",
      moderationstatus: "published",
      deletedat: null,
    });

    await likeComment(new Request("http://localhost", { headers: { "x-dev-user-id": "user-1" } }), "comment-1");

    expect(consumeRateLimitMock).toHaveBeenCalledWith(
      expect.objectContaining({ bucket: "comments:likes", subject: "user-1", limit: 30 }),
    );
    expect(sqlMock).toHaveBeenCalledWith(expect.stringContaining("INSERT INTO community.comment_likes"), [
      "comment-1",
      "user-1",
    ]);

    sqlMock.mockClear();
    sqlOneMock.mockReset();
    sqlOneMock.mockResolvedValueOnce({
      commentid: "comment-1",
      threadid: "thread-1",
      userid: "user-2",
      moderationstatus: "hidden",
      deletedat: null,
    });

    await expect(
      likeComment(new Request("http://localhost", { headers: { "x-dev-user-id": "user-1" } }), "comment-1"),
    ).rejects.toThrow("Comment is not available");
  });

  it("blocks comment likes when the rate limit window is exceeded", async () => {
    const { likeComment } = await import("@/lib/server/community");

    getViewerProfileMock.mockResolvedValue({
      userId: "user-1",
      username: "dodger_blue",
      displayName: "Dodger Blue",
      postingEnabled: true,
      isVerified: true,
      roles: ["user"],
    });
    consumeRateLimitMock.mockResolvedValueOnce({ allowed: false, remaining: 0, resetAt: Date.now() + 60_000 });
    sqlOneMock.mockResolvedValueOnce({
      commentid: "comment-1",
      threadid: "thread-1",
      userid: "user-2",
      moderationstatus: "published",
      deletedat: null,
    });

    await expect(
      likeComment(new Request("http://localhost", { headers: { "x-dev-user-id": "user-1" } }), "comment-1"),
    ).rejects.toThrow("Comment like rate limit exceeded");
  });

  it("removes likes and records comment reports for verified viewers", async () => {
    const { unlikeComment, reportComment } = await import("@/lib/server/community");

    getViewerProfileMock.mockResolvedValue({
      userId: "user-1",
      username: "dodger_blue",
      displayName: "Dodger Blue",
      postingEnabled: true,
      isVerified: true,
      roles: ["user"],
    });
    sqlOneMock.mockResolvedValueOnce({
      commentid: "comment-1",
      threadid: "thread-1",
      userid: "user-2",
      moderationstatus: "published",
      deletedat: null,
    });

    await unlikeComment(new Request("http://localhost", { headers: { "x-dev-user-id": "user-1" } }), "comment-1");
    expect(sqlMock).toHaveBeenCalledWith(expect.stringContaining("DELETE FROM community.comment_likes"), [
      "comment-1",
      "user-1",
    ]);

    sqlOneMock.mockResolvedValueOnce({
      commentid: "comment-1",
      threadid: "thread-1",
      userid: "user-2",
      moderationstatus: "published",
      deletedat: null,
    });

    await reportComment(new Request("http://localhost", { headers: { "x-dev-user-id": "user-1" } }), {
      commentId: "comment-1",
      reason: "Abusive language",
      details: "Escalate review",
    });
    expect(sqlMock).toHaveBeenLastCalledWith(expect.stringContaining("INSERT INTO community.comment_reports"), [
      "comment-1",
      "user-1",
      "Abusive language",
      "Escalate review",
    ]);
  });

  it("rejects reports for missing comments", async () => {
    const { reportComment } = await import("@/lib/server/community");

    getViewerProfileMock.mockResolvedValue({
      userId: "user-1",
      username: "dodger_blue",
      displayName: "Dodger Blue",
      postingEnabled: true,
      isVerified: true,
      roles: ["user"],
    });
    sqlOneMock.mockResolvedValueOnce(null);

    await expect(
      reportComment(new Request("http://localhost", { headers: { "x-dev-user-id": "user-1" } }), {
        commentId: "missing-comment",
        reason: "Spam",
      }),
    ).rejects.toThrow("Comment not found");
  });
});
