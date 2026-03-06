import { NextResponse } from "next/server";

import { challengeValueRequestSchema, estimateChallengeValue } from "@/lib/v2";

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = challengeValueRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid payload",
        details: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  const result = estimateChallengeValue(parsed.data);
  return NextResponse.json(result);
}
