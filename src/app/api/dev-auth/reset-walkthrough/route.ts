import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({ ok: false, disabled: true }, { status: 501 });
}
