import { NextResponse } from "next/server";

import { getGameLiveStatus } from "@/lib/data";

export async function GET(_: Request, { params }: { params: Promise<{ gamePk: string }> }) {
  const { gamePk } = await params;
  const status = await getGameLiveStatus(Number(gamePk));
  if (!status) return NextResponse.json({ error: "Game not found" }, { status: 404 });
  return NextResponse.json({ status });
}
