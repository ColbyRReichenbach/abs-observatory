import { NextResponse } from "next/server";

import { getGameLiveStatus } from "@/lib/data";

export async function GET(_: Request, { params }: { params: Promise<{ gamePk: string }> }) {
  const { gamePk } = await params;
  const status = await getGameLiveStatus(Number(gamePk));
  return NextResponse.json({ status });
}
