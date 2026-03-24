import { execFile } from "node:child_process";
import { promisify } from "node:util";

import { generateDailyAutoArticle } from "./articles";
import { executeQueuedChatJob } from "./ai-chat";
import { classifyFeedback } from "./ai-feedback-classifier";
import {
  claimQueuedJobs,
  type JobPayloadByType,
  type JobType,
  markJobFailure,
  markJobSuccess,
  type QueuedJob,
} from "./job-queue";

const execFileAsync = promisify(execFile);

type JobProcessorResult = {
  summary: string;
  payload?: unknown;
};

export async function runWorkerCommand(command: string, args: string[]): Promise<JobProcessorResult> {
  const { stdout, stderr } = await execFileAsync(command, args, {
    cwd: process.cwd(),
    env: process.env,
  });

  return {
    summary: [stdout.trim(), stderr.trim()].filter(Boolean).join("\n"),
  };
}

async function processAiHeavyChat(job: QueuedJob<"ai_heavy_chat">): Promise<JobProcessorResult> {
  const response = await executeQueuedChatJob(job.payload);
  return {
    summary: "AI heavy chat completed.",
    payload: response,
  };
}

async function processAiFeedbackClassification(job: QueuedJob<"ai_feedback_classification">): Promise<JobProcessorResult> {
  const result = await classifyFeedback(job.payload.feedbackId);
  return {
    summary: "AI feedback classified.",
    payload: result,
  };
}

async function processArticleDailyAuto(job: QueuedJob<"article_daily_auto">): Promise<JobProcessorResult> {
  const article = await generateDailyAutoArticle(job.payload.sourceDate, {
    jobRunId: job.jobRunId,
  });
  return {
    summary: "Daily auto article generated.",
    payload: article,
  };
}

async function processStandingsSync(job: QueuedJob<"enrichment_sync_standings">): Promise<JobProcessorResult> {
  const args = ["etl/sync_standings_snapshots.py"];
  if (job.payload.snapshotDate) {
    args.push("--date", job.payload.snapshotDate);
  }
  return runWorkerCommand("python3", args);
}

async function processSavantWeekly(job: QueuedJob<"enrichment_sync_savant_weekly">): Promise<JobProcessorResult> {
  const args = ["etl/sync_savant_weekly_enrichment.py"];
  if (job.payload.weekStart) {
    args.push("--week-start", job.payload.weekStart);
  }
  return runWorkerCommand("python3", args);
}

const JOB_PROCESSORS: {
  [K in JobType]: (job: QueuedJob<K>) => Promise<JobProcessorResult>;
} = {
  ai_heavy_chat: processAiHeavyChat,
  ai_feedback_classification: processAiFeedbackClassification,
  article_daily_auto: processArticleDailyAuto,
  enrichment_sync_standings: processStandingsSync,
  enrichment_sync_savant_weekly: processSavantWeekly,
};

async function processQueuedJob<K extends JobType>(job: QueuedJob<K>) {
  const processor = JOB_PROCESSORS[job.jobType] as (selectedJob: QueuedJob<K>) => Promise<JobProcessorResult>;
  try {
    const result = await processor(job);
    await markJobSuccess(job.jobRunId, result.payload, {
      summary: result.summary,
      processedAt: new Date().toISOString(),
    });
    return {
      jobRunId: job.jobRunId,
      status: "success" as const,
      summary: result.summary,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Job processing failed";
    await markJobFailure(job.jobRunId, message, {
      failedAt: new Date().toISOString(),
    });
    return {
      jobRunId: job.jobRunId,
      status: "failed" as const,
      summary: message,
    };
  }
}

export async function processQueuedJobs(limit = 1) {
  const claimed = await claimQueuedJobs(limit);
  const results = [];

  for (const job of claimed) {
    results.push(await processQueuedJob(job as QueuedJob<JobType>));
  }

  return {
    processed: results,
    claimedCount: claimed.length,
  };
}

export function buildHeavyAiJobPayload(payload: JobPayloadByType["ai_heavy_chat"]): JobPayloadByType["ai_heavy_chat"] {
  return payload;
}
