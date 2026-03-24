import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({ error: "Comment likes are temporarily unavailable" }, { status: 501 });
}
