import { NextResponse } from "next/server";

import { deleteViewerAccount, purgeViewerAiHistory } from "@/lib/server/account";
import { isClerkConfigured } from "@/lib/server/auth";
import { getOrCreateAiEntitlement } from "@/lib/server/entitlements";
import { logServerError } from "@/lib/server/logging";
import { getViewerProfile } from "@/lib/server/profiles";

export async function GET(request: Request) {
  try {
    const viewer = await getViewerProfile(request);
    const entitlements = viewer ? await getOrCreateAiEntitlement(viewer.userId) : null;
    return NextResponse.json(
      {
        authenticated: Boolean(viewer),
        authProvider: isClerkConfigured() ? "clerk" : "header-dev",
        viewer,
        entitlements,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    logServerError("api.me.get", error);
    const message = error instanceof Error ? error.message : "Unable to load viewer";
    const status = message === "New signups are temporarily disabled" ? 503 : 400;
    return NextResponse.json(
      { error: message },
      {
        status,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  }
}

export async function DELETE(request: Request) {
  const url = new URL(request.url);
  const scope = url.searchParams.get("scope") ?? "account";

  try {
    if (scope === "ai") {
      await purgeViewerAiHistory(request);
      return NextResponse.json(
        { ok: true, scope: "ai" },
        {
          headers: {
            "Cache-Control": "no-store",
          },
        },
      );
    }

    await deleteViewerAccount(request);
    return NextResponse.json(
      { ok: true, scope: "account" },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    logServerError("api.me.delete", error, { scope });
    const message = error instanceof Error ? error.message : "Unable to delete viewer data";
    const status =
      message === "Authentication required"
        ? 401
        : message === "Verified identity required" || message.startsWith("CSRF")
          ? 403
          : 400;
    return NextResponse.json(
      { error: message },
      {
        status,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  }
}
