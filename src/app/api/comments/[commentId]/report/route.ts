import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({ error: "Comment reporting is temporarily unavailable" }, { status: 501 });
}
