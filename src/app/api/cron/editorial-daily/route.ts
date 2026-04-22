import { NextResponse } from "next/server";

import { enqueueEditorialDailyAutomation, isAuthorizedEditorialCronRequest } from "@/lib/server/editorial-automation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isAuthorizedEditorialCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const sourceDate = url.searchParams.get("sourceDate");

  try {
    const result = await enqueueEditorialDailyAutomation({
      sourceDate,
      trigger: "cron",
    });

    return NextResponse.json(
      {
        ok: true,
        jobRunId: result.job.jobRunId,
        status: result.job.status,
        sourceDate: result.sourceDate,
      },
      { status: 202 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to enqueue editorial automation";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
