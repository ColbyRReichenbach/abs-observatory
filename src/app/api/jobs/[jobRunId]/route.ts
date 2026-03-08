import { NextResponse } from "next/server";

import { getJobRun, getOwnedJobRun } from "@/lib/server/job-queue";
import { getViewerProfile } from "@/lib/server/profiles";
import { isAuthorizedWorkerRequest } from "@/lib/server/worker-auth";

const PRIVATE_RESPONSE_HEADERS = {
  "Cache-Control": "no-store",
};

export async function GET(
  request: Request,
  { params }: { params: Promise<{ jobRunId: string }> },
) {
  const { jobRunId } = await params;

  if (isAuthorizedWorkerRequest(request)) {
    const job = await getJobRun(jobRunId);
    return NextResponse.json({ job }, { status: job ? 200 : 404, headers: PRIVATE_RESPONSE_HEADERS });
  }

  const viewer = await getViewerProfile(request);
  if (!viewer) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401, headers: PRIVATE_RESPONSE_HEADERS });
  }

  const job = await getOwnedJobRun(jobRunId, viewer.userId);
  if (!job) {
    return NextResponse.json({ error: "Not found" }, { status: 404, headers: PRIVATE_RESPONSE_HEADERS });
  }

  return NextResponse.json({ job }, { headers: PRIVATE_RESPONSE_HEADERS });
}
