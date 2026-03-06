import { NextResponse } from "next/server";

import { getGameChallenges } from "@/lib/data";

export async function GET(_: Request, { params }: { params: Promise<{ gamePk: string }> }) {
  const { gamePk } = await params;
  const challenges = await getGameChallenges(Number(gamePk));
  return NextResponse.json({ challenges });
}
