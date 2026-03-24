import { beforeEach, describe, expect, it, vi } from "vitest";

const sqlMock = vi.fn();
const sqlOneMock = vi.fn();
const withTransactionMock = vi.fn();

vi.mock("@/lib/db", () => ({
  sql: sqlMock,
  sqlOne: sqlOneMock,
  withTransaction: withTransactionMock,
}));

describe("job-queue", () => {
  beforeEach(() => {
    sqlMock.mockReset();
    sqlOneMock.mockReset();
    withTransactionMock.mockReset();
  });

  it("reuses idempotent jobs when one already exists", async () => {
    const { enqueueJob } = await import("@/lib/server/job-queue");
    sqlOneMock.mockResolvedValueOnce({
      jobrunid: "job-1",
      jobname: "ai_heavy_chat",
      jobtype: "ai_heavy_chat",
      queueclass: "ai_interactive",
      owneruserid: "user-1",
      status: "queued",
      payload: { userId: "user-1" },
      result: null,
      metadata: null,
      errormessage: null,
      idempotencykey: "dup",
      attemptcount: 0,
      runafter: new Date().toISOString(),
      lockedat: null,
      startedat: new Date().toISOString(),
      finishedat: null,
    });

    const job = await enqueueJob({
      jobType: "ai_heavy_chat",
      payload: { userId: "user-1", conversationId: "conversation-1", userMessageId: null, message: "hi" },
      ownerUserId: "user-1",
      idempotencyKey: "dup",
    });

    expect(job.jobRunId).toBe("job-1");
    expect(sqlOneMock).toHaveBeenCalledOnce();
  });

  it("claims queued jobs through the transactional query", async () => {
    const { claimQueuedJobs } = await import("@/lib/server/job-queue");
    withTransactionMock.mockImplementation(async (callback: (query: typeof sqlMock) => Promise<unknown>) =>
      callback(async () => [
        {
          jobrunid: "job-2",
          jobname: "article_daily_auto",
          jobtype: "article_daily_auto",
          queueclass: "article_generation",
          owneruserid: null,
          status: "running",
          payload: { sourceDate: "2026-03-06" },
          result: null,
          metadata: null,
          errormessage: null,
          idempotencykey: null,
          attemptcount: 1,
          runafter: new Date().toISOString(),
          lockedat: new Date().toISOString(),
          startedat: new Date().toISOString(),
          finishedat: null,
        },
      ]),
    );

    const jobs = await claimQueuedJobs(1);
    expect(jobs).toHaveLength(1);
    expect(jobs[0]?.jobType).toBe("article_daily_auto");
  });
});
