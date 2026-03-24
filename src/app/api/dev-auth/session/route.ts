import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ ok: false, disabled: true }, { status: 501 });
}
