import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { AiPolicyError, buildAiErrorPayload, runChat } from "@/lib/server/ai-chat";
import { logServerError } from "@/lib/server/logging";

const PRIVATE_RESPONSE_HEADERS = {
  "Cache-Control": "no-store",
};

export async function POST(request: Request) {
  try {
    const response = await runChat(request);
    return NextResponse.json(response, {
      status: response.status === "queued" ? 202 : 200,
      headers: PRIVATE_RESPONSE_HEADERS,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: "Invalid request payload",
          details: error.flatten(),
        },
        { status: 400, headers: PRIVATE_RESPONSE_HEADERS },
      );
    }

    if (error instanceof AiPolicyError) {
      return NextResponse.json(buildAiErrorPayload(error), { status: error.status, headers: PRIVATE_RESPONSE_HEADERS });
    }

    logServerError("api.ai.chat", error);
    const message = error instanceof Error ? error.message : "AI chat failed";
    const status = message.startsWith("CSRF") ? 403 : message === "New signups are temporarily disabled" ? 503 : 500;
    return NextResponse.json({ error: message }, { status, headers: PRIVATE_RESPONSE_HEADERS });
  }
}
