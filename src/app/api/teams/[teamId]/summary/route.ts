import { NextResponse } from "next/server";

import { getTeamSummary } from "@/lib/data";

export async function GET(_: Request, { params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await params;
  const summary = await getTeamSummary(Number(teamId));
  return NextResponse.json({ summary });
}
