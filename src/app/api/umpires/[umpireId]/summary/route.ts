import { NextResponse } from "next/server";

import { getUmpireSummary } from "@/lib/data";
import type { RangeKey } from "@/lib/types";

function normalizeRange(value: string | null): RangeKey {
  if (value === "7d" || value === "30d" || value === "season" || value === "all") return value;
  return "season";
}

export async function GET(request: Request, { params }: { params: Promise<{ umpireId: string }> }) {
  const { umpireId } = await params;
  const url = new URL(request.url);
  const range = normalizeRange(url.searchParams.get("range"));
  const summary = await getUmpireSummary(Number(umpireId), range);
  if (!summary) return NextResponse.json({ error: "Umpire not found" }, { status: 404 });
  return NextResponse.json({ summary });
}
