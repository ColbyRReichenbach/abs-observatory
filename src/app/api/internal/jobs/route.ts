import { NextResponse } from "next/server";
import { z } from "zod";

import { enqueueJob } from "@/lib/server/job-queue";
import { isAuthorizedWorkerRequest } from "@/lib/server/worker-auth";

export const runtime = "nodejs";

const enqueueSchema = z.discriminatedUnion("jobType", [
  z.object({
    jobType: z.literal("article_daily_auto"),
    payload: z.object({
      sourceDate: z.string(),
    }),
  }),
  z.object({
    jobType: z.literal("enrichment_sync_standings"),
    payload: z.object({
      snapshotDate: z.string().optional(),
    }).default({}),
  }),
  z.object({
    jobType: z.literal("enrichment_sync_savant_weekly"),
    payload: z.object({
      weekStart: z.string().optional(),
    }).default({}),
  }),
]);

export async function POST(request: Request) {
  if (!isAuthorizedWorkerRequest(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = enqueueSchema.parse(await request.json());
    const job = await enqueueJob({
      jobType: body.jobType,
      payload: body.payload,
      metadata: { enqueuedFrom: "api.internal.jobs" },
    });
    return NextResponse.json(
      {
        jobRunId: job.jobRunId,
        status: job.status,
      },
      { status: 202 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to enqueue job";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
