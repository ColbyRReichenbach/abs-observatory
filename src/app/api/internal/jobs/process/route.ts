import { NextResponse } from "next/server";

import { processQueuedJobs } from "@/lib/server/worker-jobs";
import { isAuthorizedWorkerRequest } from "@/lib/server/worker-auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isAuthorizedWorkerRequest(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit") ?? 1), 1), 20);

  const result = await processQueuedJobs(limit);
  return NextResponse.json(result);
}
