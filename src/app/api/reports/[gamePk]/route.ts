import { NextResponse } from "next/server";

import { getGameReport } from "@/lib/data";

export async function GET(_: Request, { params }: { params: Promise<{ gamePk: string }> }) {
  const { gamePk } = await params;
  const report = await getGameReport(Number(gamePk));
  if (!report) return NextResponse.json({ error: "Report not found" }, { status: 404 });
  return NextResponse.json({ report });
}
