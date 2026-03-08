import { NextResponse } from "next/server";
import { z } from "zod";

import { deleteOwnComment, moderateCommentAction } from "@/lib/server/community";
import { logServerError } from "@/lib/server/logging";

const patchSchema = z.object({
  action: z.enum(["hide", "restore", "delete"]),
  reason: z.string().max(240).optional().nullable(),
});

const PRIVATE_HEADERS = {
  "Cache-Control": "no-store",
};

export async function PATCH(request: Request, { params }: { params: Promise<{ commentId: string }> }) {
  const { commentId } = await params;

  try {
    const input = patchSchema.parse(await request.json());
    const comment =
      input.action === "delete"
        ? await deleteOwnComment(request, commentId)
        : await moderateCommentAction(request, {
            commentId,
            action: input.action,
            reason: input.reason ?? null,
          });

    return NextResponse.json({ comment }, { headers: PRIVATE_HEADERS });
  } catch (error) {
    logServerError("api.comments.patch", error, { commentId });

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid moderation payload" },
        { status: 400, headers: PRIVATE_HEADERS },
      );
    }

    const message = error instanceof Error ? error.message : "Unable to update comment";
    const status =
      message === "Authentication required"
        ? 401
        : message === "Verified identity required" || message === "Forbidden" || message.startsWith("CSRF")
          ? 403
          : message === "Comment not found"
            ? 404
            : 400;

    return NextResponse.json({ error: message }, { status, headers: PRIVATE_HEADERS });
  }
}
