import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { AI_FEEDBACK_INPUT_SCHEMA, saveAIFeedback } from "@/lib/server/ai-feedback";
import { logServerError } from "@/lib/server/logging";

const PRIVATE_RESPONSE_HEADERS = {
  "Cache-Control": "no-store",
};

export async function POST(request: Request) {
  try {
    const body = AI_FEEDBACK_INPUT_SCHEMA.parse(await request.json());
    const result = await saveAIFeedback(request, body);
    return NextResponse.json({ ok: true, feedbackId: result.feedbackId }, { headers: PRIVATE_RESPONSE_HEADERS });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Invalid feedback payload", details: error.flatten() },
        { status: 400, headers: PRIVATE_RESPONSE_HEADERS },
      );
    }

    logServerError("api.ai.feedback.post", error);
    const message = error instanceof Error ? error.message : "Unable to save AI feedback";
    const status =
      message.startsWith("CSRF")
        ? 403
        : message === "Session identifier required"
          ? 400
          : message === "New signups are temporarily disabled"
            ? 503
            : 500;
    return NextResponse.json({ error: message }, { status, headers: PRIVATE_RESPONSE_HEADERS });
  }
}
