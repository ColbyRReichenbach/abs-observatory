import { beforeEach, describe, expect, it, vi } from "vitest";

const claimQueuedJobsMock = vi.fn();
const markJobSuccessMock = vi.fn();
const markJobFailureMock = vi.fn();
const executeQueuedChatJobMock = vi.fn();
const classifyFeedbackMock = vi.fn();
const generateDailyAutoArticleMock = vi.fn();

vi.mock("@/lib/server/job-queue", () => ({
  claimQueuedJobs: claimQueuedJobsMock,
  markJobSuccess: markJobSuccessMock,
  markJobFailure: markJobFailureMock,
}));

vi.mock("@/lib/server/ai-chat", () => ({
  executeQueuedChatJob: executeQueuedChatJobMock,
}));

vi.mock("@/lib/server/ai-feedback-classifier", () => ({
  classifyFeedback: classifyFeedbackMock,
}));

vi.mock("@/lib/server/articles", () => ({
  generateDailyAutoArticle: generateDailyAutoArticleMock,
}));

describe("worker-jobs", () => {
  beforeEach(() => {
    claimQueuedJobsMock.mockReset();
    markJobSuccessMock.mockReset();
    markJobFailureMock.mockReset();
    executeQueuedChatJobMock.mockReset();
    classifyFeedbackMock.mockReset();
    generateDailyAutoArticleMock.mockReset();
  });

  it("processes queued AI jobs and marks them successful", async () => {
    const { processQueuedJobs } = await import("@/lib/server/worker-jobs");
    claimQueuedJobsMock.mockResolvedValueOnce([
      {
        jobRunId: "job-1",
        jobName: "ai_heavy_chat",
        jobType: "ai_heavy_chat",
        queueClass: "ai_interactive",
        ownerUserId: "user-1",
        status: "running",
        payload: {
          userId: "user-1",
          conversationId: "conversation-1",
          userMessageId: "message-1",
          message: "historical split",
        },
      },
    ]);
    executeQueuedChatJobMock.mockResolvedValueOnce({
      conversationId: "conversation-1",
      answer: "Queued answer",
      toolResults: [],
      citations: [],
      safetyDisposition: "allowed",
      confidence: "medium",
    });

    const result = await processQueuedJobs(1);

    expect(result.claimedCount).toBe(1);
    expect(markJobSuccessMock).toHaveBeenCalledOnce();
    expect(markJobFailureMock).not.toHaveBeenCalled();
  });

  it("marks failed article jobs without crashing the worker loop", async () => {
    const { processQueuedJobs } = await import("@/lib/server/worker-jobs");
    claimQueuedJobsMock.mockResolvedValueOnce([
      {
        jobRunId: "job-2",
        jobName: "article_daily_auto",
        jobType: "article_daily_auto",
        queueClass: "article_generation",
        ownerUserId: null,
        status: "running",
        payload: {
          sourceDate: "2026-03-06",
        },
      },
    ]);
    generateDailyAutoArticleMock.mockRejectedValueOnce(new Error("daily auto failed"));

    const result = await processQueuedJobs(1);

    expect(result.processed[0]).toEqual(
      expect.objectContaining({
        jobRunId: "job-2",
        status: "failed",
      }),
    );
    expect(markJobFailureMock).toHaveBeenCalledWith("job-2", "daily auto failed", expect.any(Object));
  });

  it("processes queued feedback classification jobs", async () => {
    const { processQueuedJobs } = await import("@/lib/server/worker-jobs");
    claimQueuedJobsMock.mockResolvedValueOnce([
      {
        jobRunId: "job-3",
        jobName: "ai_feedback_classification",
        jobType: "ai_feedback_classification",
        queueClass: "article_generation",
        ownerUserId: null,
        status: "running",
        payload: {
          feedbackId: "feedback-1",
        },
      },
    ]);
    classifyFeedbackMock.mockResolvedValueOnce({
      bucket: "baseball_logic",
      confidence: "high",
      notes: "User flagged baseball logic issues.",
      source: "rules",
      modelName: "rules",
    });

    const result = await processQueuedJobs(1);

    expect(result.claimedCount).toBe(1);
    expect(classifyFeedbackMock).toHaveBeenCalledWith("feedback-1");
    expect(markJobSuccessMock).toHaveBeenCalledOnce();
  });
});
