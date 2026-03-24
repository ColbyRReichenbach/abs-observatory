import { NextResponse } from "next/server";

import { getLiveGames } from "@/lib/data";

export async function GET() {
  const games = await getLiveGames();
  return NextResponse.json({ games });
}
