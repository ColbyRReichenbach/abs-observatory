import { describe, expect, it, vi } from "vitest";

const deleteOwnCommentMock = vi.fn();
const moderateCommentActionMock = vi.fn();

vi.mock("@/lib/server/community", () => ({
  deleteOwnComment: deleteOwnCommentMock,
  moderateCommentAction: moderateCommentActionMock,
}));

describe("/api/comments/[commentId]", () => {
  it("allows owner delete payloads", async () => {
    const { PATCH } = await import("./route");
    deleteOwnCommentMock.mockResolvedValueOnce({ commentId: "comment-1", moderationStatus: "deleted" });

    const response = await PATCH(
      new Request("http://localhost/api/comments/comment-1", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "delete" }),
      }),
      { params: Promise.resolve({ commentId: "comment-1" }) },
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      comment: { commentId: "comment-1", moderationStatus: "deleted" },
    });
  });

  it("maps forbidden moderation attempts to 403", async () => {
    const { PATCH } = await import("./route");
    moderateCommentActionMock.mockRejectedValueOnce(new Error("Forbidden"));

    const response = await PATCH(
      new Request("http://localhost/api/comments/comment-1", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "hide", reason: "bad actor" }),
      }),
      { params: Promise.resolve({ commentId: "comment-1" }) },
    );

    expect(response.status).toBe(403);
  });

  it("maps missing comments to 404", async () => {
    const { PATCH } = await import("./route");
    moderateCommentActionMock.mockRejectedValueOnce(new Error("Comment not found"));

    const response = await PATCH(
      new Request("http://localhost/api/comments/comment-1", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "restore" }),
      }),
      { params: Promise.resolve({ commentId: "comment-1" }) },
    );

    expect(response.status).toBe(404);
  });
});
