import { beforeEach, describe, expect, it, vi } from "vitest";

const enqueueJobMock = vi.fn();
const isAuthorizedWorkerRequestMock = vi.fn();

vi.mock("@/lib/server/job-queue", () => ({
  enqueueJob: enqueueJobMock,
}));

vi.mock("@/lib/server/worker-auth", () => ({
  isAuthorizedWorkerRequest: isAuthorizedWorkerRequestMock,
}));

describe("internal jobs route", () => {
  beforeEach(() => {
    enqueueJobMock.mockReset();
    isAuthorizedWorkerRequestMock.mockReset();
  });

  it("rejects unauthorized requests", async () => {
    const { POST } = await import("./route");
    isAuthorizedWorkerRequestMock.mockReturnValueOnce(false);

    const response = await POST(
      new Request("http://localhost/api/internal/jobs", {
        method: "POST",
        body: JSON.stringify({ jobType: "article_daily_auto", payload: { sourceDate: "2026-03-06" } }),
      }),
    );

    expect(response.status).toBe(403);
  });

  it("enqueues authorized worker jobs", async () => {
    const { POST } = await import("./route");
    isAuthorizedWorkerRequestMock.mockReturnValueOnce(true);
    enqueueJobMock.mockResolvedValueOnce({ jobRunId: "job-1", status: "queued" });

    const response = await POST(
      new Request("http://localhost/api/internal/jobs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jobType: "article_daily_auto", payload: { sourceDate: "2026-03-06" } }),
      }),
    );

    expect(response.status).toBe(202);
    expect(await response.json()).toEqual({ jobRunId: "job-1", status: "queued" });
  });

  it("accepts feedback classification jobs", async () => {
    const { POST } = await import("./route");
    isAuthorizedWorkerRequestMock.mockReturnValueOnce(true);
    enqueueJobMock.mockResolvedValueOnce({ jobRunId: "job-2", status: "queued" });

    const response = await POST(
      new Request("http://localhost/api/internal/jobs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jobType: "ai_feedback_classification", payload: { feedbackId: "123e4567-e89b-42d3-a456-426614174000" } }),
      }),
    );

    expect(response.status).toBe(202);
    expect(enqueueJobMock).toHaveBeenCalledWith(
      expect.objectContaining({
        jobType: "ai_feedback_classification",
        payload: { feedbackId: "123e4567-e89b-42d3-a456-426614174000" },
      }),
    );
  });
});
