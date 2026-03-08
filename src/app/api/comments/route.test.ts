import { describe, expect, it, vi } from "vitest";

const createCommentMock = vi.fn();
const findThreadIdMock = vi.fn();
const listCommentsMock = vi.fn();

vi.mock("@/lib/server/community", () => ({
  createComment: createCommentMock,
  findThreadId: findThreadIdMock,
  listComments: listCommentsMock,
}));

describe("/api/comments", () => {
  it("maps authentication failures to 401", async () => {
    const { POST } = await import("./route");
    createCommentMock.mockRejectedValueOnce(new Error("Authentication required"));

    const response = await POST(
      new Request("http://localhost/api/comments", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ threadId: crypto.randomUUID(), body: "Hello" }),
      }),
    );

    expect(response.status).toBe(401);
  });

  it("maps rate limit failures to 429", async () => {
    const { POST } = await import("./route");
    createCommentMock.mockRejectedValueOnce(new Error("Comment rate limit exceeded"));

    const response = await POST(
      new Request("http://localhost/api/comments", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ threadId: crypto.randomUUID(), body: "Hello" }),
      }),
    );

    expect(response.status).toBe(429);
  });

  it("maps verification failures to 403", async () => {
    const { POST } = await import("./route");
    createCommentMock.mockRejectedValueOnce(new Error("Verified identity required"));

    const response = await POST(
      new Request("http://localhost/api/comments", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ threadId: crypto.randomUUID(), body: "Hello" }),
      }),
    );

    expect(response.status).toBe(403);
  });

  it("maps csrf failures to 403", async () => {
    const { POST } = await import("./route");
    createCommentMock.mockRejectedValueOnce(new Error("CSRF validation failed"));

    const response = await POST(
      new Request("http://localhost/api/comments", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ threadId: crypto.randomUUID(), body: "Hello" }),
      }),
    );

    expect(response.status).toBe(403);
  });

  it("returns existing comments for a resolved thread", async () => {
    const { GET } = await import("./route");
    const threadId = crypto.randomUUID();
    findThreadIdMock.mockResolvedValueOnce(threadId);
    listCommentsMock.mockResolvedValueOnce([{ commentId: "comment-1" }]);

    const response = await GET(new Request(`http://localhost/api/comments?articleId=${crypto.randomUUID()}`));
    const body = await response.json();

    expect(body).toEqual({
      threadId,
      comments: [{ commentId: "comment-1" }],
    });
  });
});
