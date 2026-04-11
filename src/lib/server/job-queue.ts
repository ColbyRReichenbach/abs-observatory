import type { ChartInsightPayload } from "@/lib/chart-insight-payload";
import { sql, sqlOne, withTransaction } from "@/lib/db";
import type { CopilotContext } from "@/lib/copilot-context";
import type { AiAudienceMode } from "./ai/context";
import type { SurfaceTaskFamily } from "./ai/task-family";
import type { QueueClass } from "./jobs";

export type JobType =
  | "ai_heavy_chat"
  | "ai_feedback_classification"
  | "article_daily_auto"
  | "enrichment_sync_standings"
  | "enrichment_sync_savant_weekly";

export type JobStatus = "queued" | "running" | "success" | "failed";

export type AiHeavyChatPayload = {
  userId: string;
  conversationId: string;
  userMessageId: string | null;
  message: string;
  audienceMode: AiAudienceMode;
  taskFamily: SurfaceTaskFamily;
  surface?: "copilot" | "visualizer" | "chart_insight";
  context?: CopilotContext;
  chartContext?: ChartInsightPayload;
};

export type AiFeedbackClassificationPayload = {
  feedbackId: string;
};

export type ArticleDailyAutoPayload = {
  sourceDate: string;
};

export type EnrichmentSyncStandingsPayload = {
  snapshotDate?: string;
};

export type EnrichmentSyncSavantWeeklyPayload = {
  weekStart?: string;
};

export type JobPayloadByType = {
  ai_heavy_chat: AiHeavyChatPayload;
  ai_feedback_classification: AiFeedbackClassificationPayload;
  article_daily_auto: ArticleDailyAutoPayload;
  enrichment_sync_standings: EnrichmentSyncStandingsPayload;
  enrichment_sync_savant_weekly: EnrichmentSyncSavantWeeklyPayload;
};

export type QueuedJob<T extends JobType = JobType> = {
  jobRunId: string;
  jobName: string;
  jobType: T;
  queueClass: QueueClass;
  ownerUserId: string | null;
  status: JobStatus;
  payload: JobPayloadByType[T];
  result: unknown;
  metadata: unknown;
  errorMessage: string | null;
  idempotencyKey: string | null;
  attemptCount: number;
  runAfter: string;
  lockedAt: string | null;
  startedAt: string;
  finishedAt: string | null;
};

const JOB_QUEUE_CLASS: Record<JobType, QueueClass> = {
  ai_heavy_chat: "ai_interactive",
  ai_feedback_classification: "article_generation",
  article_daily_auto: "article_generation",
  enrichment_sync_standings: "enrichment",
  enrichment_sync_savant_weekly: "enrichment",
};

function serializeJob<T extends JobType>(
  row: {
    jobrunid: string;
    jobname: string;
    jobtype: T;
    queueclass: QueueClass;
    owneruserid: string | null;
    status: JobStatus;
    payload: JobPayloadByType[T];
    result: unknown;
    metadata: unknown;
    errormessage: string | null;
    idempotencykey: string | null;
    attemptcount: number;
    runafter: string;
    lockedat: string | null;
    startedat: string;
    finishedat: string | null;
  },
): QueuedJob<T> {
  return {
    jobRunId: row.jobrunid,
    jobName: row.jobname,
    jobType: row.jobtype,
    queueClass: row.queueclass,
    ownerUserId: row.owneruserid,
    status: row.status,
    payload: row.payload,
    result: row.result,
    metadata: row.metadata,
    errorMessage: row.errormessage,
    idempotencyKey: row.idempotencykey,
    attemptCount: Number(row.attemptcount),
    runAfter: row.runafter,
    lockedAt: row.lockedat,
    startedAt: row.startedat,
    finishedAt: row.finishedat,
  };
}

type JobRow<T extends JobType = JobType> = {
  jobrunid: string;
  jobname: string;
  jobtype: T;
  queueclass: QueueClass;
  owneruserid: string | null;
  status: JobStatus;
  payload: JobPayloadByType[T];
  result: unknown;
  metadata: unknown;
  errormessage: string | null;
  idempotencykey: string | null;
  attemptcount: number;
  runafter: string;
  lockedat: string | null;
  startedat: string;
  finishedat: string | null;
};

const SELECT_JOB_COLUMNS = `
  job_run_id AS jobRunId,
  job_name AS jobName,
  job_type AS jobType,
  queue_class AS queueClass,
  owner_user_id AS ownerUserId,
  status,
  payload,
  result,
  metadata,
  error_message AS errorMessage,
  idempotency_key AS idempotencyKey,
  attempt_count AS attemptCount,
  run_after AS runAfter,
  locked_at AS lockedAt,
  started_at AS startedAt,
  finished_at AS finishedAt
`;

const SELECT_JOB_COLUMNS_QUALIFIED = `
  target.job_run_id AS jobRunId,
  target.job_name AS jobName,
  target.job_type AS jobType,
  target.queue_class AS queueClass,
  target.owner_user_id AS ownerUserId,
  target.status,
  target.payload,
  target.result,
  target.metadata,
  target.error_message AS errorMessage,
  target.idempotency_key AS idempotencyKey,
  target.attempt_count AS attemptCount,
  target.run_after AS runAfter,
  target.locked_at AS lockedAt,
  target.started_at AS startedAt,
  target.finished_at AS finishedAt
`;

export function getQueueClassForJob(jobType: JobType): QueueClass {
  return JOB_QUEUE_CLASS[jobType];
}

export async function enqueueJob<T extends JobType>(params: {
  jobName?: string;
  jobType: T;
  payload: JobPayloadByType[T];
  ownerUserId?: string | null;
  metadata?: unknown;
  idempotencyKey?: string | null;
  runAfter?: string | null;
}): Promise<QueuedJob<T>> {
  if (params.idempotencyKey) {
    const existing = await sqlOne<JobRow<T>>(
      `
      SELECT ${SELECT_JOB_COLUMNS}
      FROM ops.job_runs
      WHERE idempotency_key = $1
      `,
      [params.idempotencyKey],
    );
    if (existing) {
      return serializeJob(existing);
    }
  }

  const inserted = await sqlOne<JobRow<T>>(
    `
    INSERT INTO ops.job_runs (
      job_name,
      queue_class,
      job_type,
      owner_user_id,
      status,
      payload,
      metadata,
      idempotency_key,
      run_after
    )
    VALUES ($1, $2, $3, $4, 'queued', $5, $6, $7, COALESCE($8::timestamptz, NOW()))
    RETURNING ${SELECT_JOB_COLUMNS}
    `,
    [
      params.jobName ?? params.jobType,
      getQueueClassForJob(params.jobType),
      params.jobType,
      params.ownerUserId ?? null,
      JSON.stringify(params.payload ?? null),
      params.metadata === undefined ? null : JSON.stringify(params.metadata),
      params.idempotencyKey ?? null,
      params.runAfter ?? null,
    ],
  );

  if (!inserted) {
    throw new Error("Failed to enqueue job");
  }

  return serializeJob(inserted);
}

export async function getJobRun(jobRunId: string): Promise<QueuedJob | null> {
  const row = await sqlOne<JobRow>(
    `
    SELECT ${SELECT_JOB_COLUMNS}
    FROM ops.job_runs
    WHERE job_run_id = $1
    `,
    [jobRunId],
  );

  return row ? serializeJob(row) : null;
}

function buildClaimOrderCase() {
  return `
    CASE queue_class
      WHEN 'live_read' THEN 100
      WHEN 'comment_write' THEN 90
      WHEN 'ai_interactive' THEN 80
      WHEN 'article_generation' THEN 60
      WHEN 'enrichment' THEN 40
      ELSE 20
    END DESC
  `;
}

export async function claimQueuedJobs(limit: number): Promise<QueuedJob[]> {
  if (limit <= 0) return [];

  return withTransaction(async (query) => {
    const rows = await query<JobRow>(
      `
      WITH candidates AS (
        SELECT queue.job_run_id
        FROM ops.job_runs AS queue
        WHERE queue.status = 'queued'
          AND queue.run_after <= NOW()
        ORDER BY ${buildClaimOrderCase().replaceAll("queue_class", "queue.queue_class")}, queue.started_at ASC
        LIMIT $1
        FOR UPDATE SKIP LOCKED
      )
      UPDATE ops.job_runs AS target
      SET
        status = 'running',
        attempt_count = target.attempt_count + 1,
        locked_at = NOW(),
        started_at = NOW(),
        finished_at = NULL,
        error_message = NULL
      FROM candidates
      WHERE target.job_run_id = candidates.job_run_id
      RETURNING ${SELECT_JOB_COLUMNS_QUALIFIED}
      `,
      [limit],
    );

    return rows.map((row) => serializeJob(row));
  });
}

async function updateJobTerminalState(
  jobRunId: string,
  status: "success" | "failed",
  params: {
    result?: unknown;
    metadata?: unknown;
    errorMessage?: string | null;
  },
) {
  await sql(
    `
    UPDATE ops.job_runs
    SET
      status = $2,
      result = COALESCE($3::jsonb, result),
      metadata = CASE
        WHEN $4::jsonb IS NULL THEN metadata
        WHEN metadata IS NULL THEN $4::jsonb
        ELSE metadata || $4::jsonb
      END,
      error_message = $5,
      locked_at = NULL,
      finished_at = NOW()
    WHERE job_run_id = $1
    `,
    [
      jobRunId,
      status,
      params.result === undefined ? null : JSON.stringify(params.result),
      params.metadata === undefined ? null : JSON.stringify(params.metadata),
      params.errorMessage ?? null,
    ],
  );
}

export async function markJobSuccess(jobRunId: string, result?: unknown, metadata?: unknown) {
  await updateJobTerminalState(jobRunId, "success", { result, metadata });
}

export async function markJobFailure(jobRunId: string, errorMessage: string, metadata?: unknown) {
  await updateJobTerminalState(jobRunId, "failed", { errorMessage, metadata });
}

export async function getOwnedJobRun(jobRunId: string, ownerUserId: string): Promise<QueuedJob | null> {
  const row = await sqlOne<JobRow>(
    `
    SELECT ${SELECT_JOB_COLUMNS}
    FROM ops.job_runs
    WHERE job_run_id = $1
      AND owner_user_id = $2
    `,
    [jobRunId, ownerUserId],
  );

  return row ? serializeJob(row) : null;
}

export async function clearFinishedJobs(): Promise<void> {
  await sql("DELETE FROM ops.job_runs WHERE status IN ('success', 'failed')");
}
