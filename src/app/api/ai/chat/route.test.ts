import { beforeEach, describe, expect, it, vi } from "vitest";

const runChatMock = vi.fn();

vi.mock("@/lib/server/ai-chat", () => ({
  runChat: runChatMock,
  AiPolicyError: class AiPolicyError extends Error {
    code: string;
    status: number;

    constructor(message: string, code: string, status: number) {
      super(message);
      this.code = code;
      this.status = status;
    }
  },
  buildAiErrorPayload: (error: { code: string; message: string }) => ({
    code: error.code,
    error: error.message,
  }),
}));

describe("api/ai/chat route", () => {
  beforeEach(() => {
    runChatMock.mockReset();
  });

  it("returns 202 for queued chat jobs", async () => {
    const { POST } = await import("./route");
    runChatMock.mockResolvedValueOnce({
      conversationId: "conversation-1",
      answer: "Queued.",
      toolResults: [],
      citations: [],
      safetyDisposition: "allowed",
      confidence: "low",
      status: "queued",
      jobRunId: "job-1",
    });

    const response = await POST(
      new Request("http://localhost/api/ai/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: "Historically since 2023, compare 3-1 to 2-2." }),
      }),
    );

    expect(response.status).toBe(202);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual(
      expect.objectContaining({
        status: "queued",
        jobRunId: "job-1",
      }),
    );
  });

  it("maps csrf failures to forbidden", async () => {
    const { POST } = await import("./route");
    runChatMock.mockRejectedValueOnce(new Error("CSRF validation failed"));

    const response = await POST(
      new Request("http://localhost/api/ai/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: "hello" }),
      }),
    );

    expect(response.status).toBe(403);
  });

  it("surfaces stable quota errors from the AI policy layer", async () => {
    const { POST } = await import("./route");
    const { AiPolicyError } = await import("@/lib/server/ai-chat");
    runChatMock.mockRejectedValueOnce(
      new AiPolicyError("Daily AI request allowance exceeded", "AI_QUOTA_EXCEEDED", 429),
    );

    const response = await POST(
      new Request("http://localhost/api/ai/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: "hello" }),
      }),
    );

    expect(response.status).toBe(429);
    expect(await response.json()).toEqual({
      code: "AI_QUOTA_EXCEEDED",
      error: "Daily AI request allowance exceeded",
    });
  });
});
