import { NextResponse } from "next/server";
import { z } from "zod";

import { createComment, findThreadId, listComments } from "@/lib/server/community";
import { logServerError } from "@/lib/server/logging";

const COMMENT_CREATE_SCHEMA = z.object({
  threadId: z.string().uuid().optional(),
  articleId: z.string().uuid().optional(),
  challengeId: z.string().uuid().optional(),
  parentCommentId: z.string().uuid().optional(),
  body: z.string().min(1).max(2000),
  structuredReaction: z.string().max(64).optional().nullable(),
});

export async function GET(request: Request) {
  const url = new URL(request.url);
  const threadId = url.searchParams.get("threadId");
  const articleId = url.searchParams.get("articleId");
  const challengeId = url.searchParams.get("challengeId");

  const resolvedThreadId =
    threadId ??
    (articleId ? await findThreadId({ threadType: "article", articleId }) : null) ??
    (challengeId ? await findThreadId({ threadType: "challenge", challengeId }) : null);

  if (!resolvedThreadId) {
    return NextResponse.json({ threadId: null, comments: [] });
  }

  const comments = await listComments(resolvedThreadId);
  return NextResponse.json({ threadId: resolvedThreadId, comments });
}

export async function POST(request: Request) {
  try {
    const body = COMMENT_CREATE_SCHEMA.parse(await request.json());
    const comment = await createComment(request, body);
    return NextResponse.json({ comment }, { status: 201 });
  } catch (error) {
    logServerError("api.comments.post", error);
    const message = error instanceof Error ? error.message : "Unable to create comment";
    const status =
      message === "Authentication required"
        ? 401
        : message === "Verified identity required"
          ? 403
          : message.startsWith("CSRF")
            ? 403
            : message === "New signups are temporarily disabled"
              ? 503
            : message.includes("rate limit")
              ? 429
              : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
