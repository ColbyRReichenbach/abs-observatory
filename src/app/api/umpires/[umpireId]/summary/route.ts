import { NextResponse } from "next/server";

import { getUmpireSummary } from "@/lib/data";

export async function GET(_: Request, { params }: { params: Promise<{ umpireId: string }> }) {
  const { umpireId } = await params;
  const summary = await getUmpireSummary(Number(umpireId));
  return NextResponse.json({ summary });
}
