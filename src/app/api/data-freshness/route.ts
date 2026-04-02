import { NextResponse } from "next/server";

import { getDataFreshnessSnapshot } from "@/lib/server/data-freshness";

export async function GET() {
  const snapshot = await getDataFreshnessSnapshot();

  return NextResponse.json(snapshot, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
