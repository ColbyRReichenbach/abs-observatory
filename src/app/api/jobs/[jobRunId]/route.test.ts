import { beforeEach, describe, expect, it, vi } from "vitest";

const getJobRunMock = vi.fn();
const getOwnedJobRunMock = vi.fn();
const getViewerProfileMock = vi.fn();
const isAuthorizedWorkerRequestMock = vi.fn();

vi.mock("@/lib/server/job-queue", () => ({
  getJobRun: getJobRunMock,
  getOwnedJobRun: getOwnedJobRunMock,
}));

vi.mock("@/lib/server/profiles", () => ({
  getViewerProfile: getViewerProfileMock,
}));

vi.mock("@/lib/server/worker-auth", () => ({
  isAuthorizedWorkerRequest: isAuthorizedWorkerRequestMock,
}));

describe("job status route", () => {
  beforeEach(() => {
    getJobRunMock.mockReset();
    getOwnedJobRunMock.mockReset();
    getViewerProfileMock.mockReset();
    isAuthorizedWorkerRequestMock.mockReset();
  });

  it("returns owned jobs for authenticated users", async () => {
    const { GET } = await import("./route");
    isAuthorizedWorkerRequestMock.mockReturnValueOnce(false);
    getViewerProfileMock.mockResolvedValueOnce({ userId: "user-1" });
    getOwnedJobRunMock.mockResolvedValueOnce({ jobRunId: "job-1", status: "queued" });

    const response = await GET(new Request("http://localhost/api/jobs/job-1"), {
      params: Promise.resolve({ jobRunId: "job-1" }),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({ job: { jobRunId: "job-1", status: "queued" } });
  });

  it("allows internal worker access to any job", async () => {
    const { GET } = await import("./route");
    isAuthorizedWorkerRequestMock.mockReturnValueOnce(true);
    getJobRunMock.mockResolvedValueOnce({ jobRunId: "job-2", status: "success" });

    const response = await GET(new Request("http://localhost/api/jobs/job-2"), {
      params: Promise.resolve({ jobRunId: "job-2" }),
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ job: { jobRunId: "job-2", status: "success" } });
  });

  it("returns 404 when a user requests a job they do not own", async () => {
    const { GET } = await import("./route");
    isAuthorizedWorkerRequestMock.mockReturnValueOnce(false);
    getViewerProfileMock.mockResolvedValueOnce({ userId: "user-1" });
    getOwnedJobRunMock.mockResolvedValueOnce(null);

    const response = await GET(new Request("http://localhost/api/jobs/job-3"), {
      params: Promise.resolve({ jobRunId: "job-3" }),
    });

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "Not found" });
  });
});
