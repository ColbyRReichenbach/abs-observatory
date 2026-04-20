import { NextResponse } from "next/server";

const DISABLED_BODY = {
  ok: false,
  disabled: true,
  code: "follows_not_enabled",
  message: "Follow relationships remain disabled until public identity, moderation, and ownership rules are broader than the current profile layer.",
};

export async function POST() {
  return NextResponse.json(DISABLED_BODY, { status: 501 });
}

export async function DELETE() {
  return NextResponse.json(DISABLED_BODY, { status: 501 });
}
