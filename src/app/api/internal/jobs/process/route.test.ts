import { beforeEach, describe, expect, it, vi } from "vitest";

const processQueuedJobsMock = vi.fn();
const isAuthorizedWorkerRequestMock = vi.fn();

vi.mock("@/lib/server/worker-jobs", () => ({
  processQueuedJobs: processQueuedJobsMock,
}));

vi.mock("@/lib/server/worker-auth", () => ({
  isAuthorizedWorkerRequest: isAuthorizedWorkerRequestMock,
}));

describe("internal jobs process route", () => {
  beforeEach(() => {
    processQueuedJobsMock.mockReset();
    isAuthorizedWorkerRequestMock.mockReset();
  });

  it("rejects unauthorized process requests", async () => {
    const { POST } = await import("./route");
    isAuthorizedWorkerRequestMock.mockReturnValueOnce(false);

    const response = await POST(new Request("http://localhost/api/internal/jobs/process", { method: "POST" }));

    expect(response.status).toBe(403);
  });

  it("processes queued work when authorized", async () => {
    const { POST } = await import("./route");
    isAuthorizedWorkerRequestMock.mockReturnValueOnce(true);
    processQueuedJobsMock.mockResolvedValueOnce({
      claimedCount: 1,
      processed: [{ jobRunId: "job-1", status: "success" }],
    });

    const response = await POST(
      new Request("http://localhost/api/internal/jobs/process?limit=2", { method: "POST" }),
    );

    expect(processQueuedJobsMock).toHaveBeenCalledWith(2);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      claimedCount: 1,
      processed: [{ jobRunId: "job-1", status: "success" }],
    });
  });
});
