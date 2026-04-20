import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { enqueueJobMock } = vi.hoisted(() => ({
  enqueueJobMock: vi.fn(),
}));

vi.mock("@/lib/server/job-queue", () => ({
  enqueueJob: enqueueJobMock,
}));

import {
  buildEditorialDailyIdempotencyKey,
  enqueueEditorialDailyAutomation,
  isAuthorizedEditorialCronRequest,
  normalizeEditorialSourceDate,
  resolveEditorialSourceDate,
} from "@/lib/server/editorial-automation";

describe("editorial automation", () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalCronSecret = process.env.CRON_SECRET;

  beforeEach(() => {
    enqueueJobMock.mockReset();
    process.env.NODE_ENV = "test";
    delete process.env.CRON_SECRET;
  });

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    if (originalCronSecret === undefined) {
      delete process.env.CRON_SECRET;
    } else {
      process.env.CRON_SECRET = originalCronSecret;
    }
  });

  it("resolves the previous eastern slate date by default", () => {
    expect(resolveEditorialSourceDate(new Date("2026-04-20T15:00:00Z"))).toBe("2026-04-19");
  });

  it("accepts explicit source dates and rejects malformed values", () => {
    expect(normalizeEditorialSourceDate("2026-04-18")).toBe("2026-04-18");
    expect(() => normalizeEditorialSourceDate("04/18/2026")).toThrow("sourceDate must be formatted as YYYY-MM-DD");
  });

  it("enqueues article daily auto jobs with stable idempotency", async () => {
    enqueueJobMock.mockResolvedValueOnce({
      jobRunId: "job-1",
      status: "queued",
    });

    const result = await enqueueEditorialDailyAutomation({
      sourceDate: "2026-04-19",
      requestedAt: new Date("2026-04-20T14:00:00Z"),
      trigger: "cron",
    });

    expect(buildEditorialDailyIdempotencyKey("2026-04-19")).toBe("editorial-daily-auto:2026-04-19");
    expect(enqueueJobMock).toHaveBeenCalledWith(
      expect.objectContaining({
        jobName: "editorial_daily_auto",
        jobType: "article_daily_auto",
        payload: { sourceDate: "2026-04-19" },
        idempotencyKey: "editorial-daily-auto:2026-04-19",
      }),
    );
    expect(result).toEqual({
      sourceDate: "2026-04-19",
      job: {
        jobRunId: "job-1",
        status: "queued",
      },
    });
  });

  it("uses CRON_SECRET bearer auth when configured", () => {
    process.env.CRON_SECRET = "top-secret";

    expect(
      isAuthorizedEditorialCronRequest(
        new Request("http://localhost/api/cron/editorial-daily", {
          headers: { authorization: "Bearer top-secret" },
        }),
      ),
    ).toBe(true);

    expect(
      isAuthorizedEditorialCronRequest(
        new Request("http://localhost/api/cron/editorial-daily", {
          headers: { authorization: "Bearer wrong" },
        }),
      ),
    ).toBe(false);
  });
});
