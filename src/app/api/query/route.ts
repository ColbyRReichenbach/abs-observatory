import { NextResponse } from "next/server";

export async function POST(request: Request) {
  void request;
  return NextResponse.json(
    {
      error: "The legacy NL-to-SQL route is disabled.",
      code: "AI_QUERY_DEPRECATED",
      hint: "Use /api/ai/chat with typed tools instead.",
    },
    { status: 410 },
  );
}
