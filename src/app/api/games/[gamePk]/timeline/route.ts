import { NextResponse } from "next/server";

import { getGamePitchTimeline } from "@/lib/data";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ gamePk: string }> },
) {
  const { gamePk } = await params;
  const url = new URL(request.url);

  const timeline = await getGamePitchTimeline(Number(gamePk), {
    atBatIndex: url.searchParams.get("atBatIndex")
      ? Number(url.searchParams.get("atBatIndex"))
      : undefined,
    batterId: url.searchParams.get("batterId")
      ? Number(url.searchParams.get("batterId"))
      : undefined,
    pitcherId: url.searchParams.get("pitcherId")
      ? Number(url.searchParams.get("pitcherId"))
      : undefined,
    challengedOnly: url.searchParams.get("challengedOnly") === "true",
    limit: url.searchParams.get("limit") ? Number(url.searchParams.get("limit")) : undefined,
  });

  return NextResponse.json({ timeline });
}
