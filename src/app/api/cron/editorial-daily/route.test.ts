import { beforeEach, describe, expect, it, vi } from "vitest";

const enqueueEditorialDailyAutomationMock = vi.fn();
const isAuthorizedEditorialCronRequestMock = vi.fn();

vi.mock("@/lib/server/editorial-automation", () => ({
  enqueueEditorialDailyAutomation: enqueueEditorialDailyAutomationMock,
  isAuthorizedEditorialCronRequest: isAuthorizedEditorialCronRequestMock,
}));

describe("editorial daily cron route", () => {
  beforeEach(() => {
    enqueueEditorialDailyAutomationMock.mockReset();
    isAuthorizedEditorialCronRequestMock.mockReset();
  });

  it("rejects unauthorized cron requests", async () => {
    const { GET } = await import("./route");
    isAuthorizedEditorialCronRequestMock.mockReturnValueOnce(false);

    const response = await GET(new Request("http://localhost/api/cron/editorial-daily"));

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
  });

  it("enqueues the previous slate when authorized", async () => {
    const { GET } = await import("./route");
    isAuthorizedEditorialCronRequestMock.mockReturnValueOnce(true);
    enqueueEditorialDailyAutomationMock.mockResolvedValueOnce({
      sourceDate: "2026-04-19",
      job: {
        jobRunId: "job-1",
        status: "queued",
      },
    });

    const response = await GET(new Request("http://localhost/api/cron/editorial-daily"));

    expect(response.status).toBe(202);
    expect(enqueueEditorialDailyAutomationMock).toHaveBeenCalledWith({
      sourceDate: null,
      trigger: "cron",
    });
    expect(await response.json()).toEqual({
      ok: true,
      jobRunId: "job-1",
      status: "queued",
      sourceDate: "2026-04-19",
    });
  });

  it("supports a manual source date override", async () => {
    const { GET } = await import("./route");
    isAuthorizedEditorialCronRequestMock.mockReturnValueOnce(true);
    enqueueEditorialDailyAutomationMock.mockResolvedValueOnce({
      sourceDate: "2026-04-18",
      job: {
        jobRunId: "job-2",
        status: "success",
      },
    });

    const response = await GET(new Request("http://localhost/api/cron/editorial-daily?sourceDate=2026-04-18"));

    expect(response.status).toBe(202);
    expect(enqueueEditorialDailyAutomationMock).toHaveBeenCalledWith({
      sourceDate: "2026-04-18",
      trigger: "cron",
    });
  });
});
