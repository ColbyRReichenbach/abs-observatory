import { NextResponse } from "next/server";

import { getGamePostgameAudit, getGameReport } from "@/lib/data";

export async function GET(_: Request, { params }: { params: Promise<{ gamePk: string }> }) {
  const { gamePk } = await params;
  const gameId = Number(gamePk);
  const [report, audit] = await Promise.all([getGameReport(gameId), getGamePostgameAudit(gameId)]);
  if (!report && !audit) return NextResponse.json({ error: "Report not found" }, { status: 404 });
  return NextResponse.json({ report, audit });
}
