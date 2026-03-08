import { NextResponse } from "next/server";
import { ZodError, z } from "zod";

import { APPROVED_AVATAR_PRESETS } from "@/lib/server/identity-policy";
import { logServerError } from "@/lib/server/logging";
import { getViewerProfile, updateViewerProfile } from "@/lib/server/profiles";

const PRIVATE_RESPONSE_HEADERS = {
  "Cache-Control": "no-store",
};

const PROFILE_UPDATE_SCHEMA = z.object({
  username: z.string().min(3).max(16).optional().nullable(),
  bio: z.string().max(280).optional().nullable(),
  avatarPreset: z.enum(APPROVED_AVATAR_PRESETS).optional().nullable(),
  favoriteTeamId: z.number().int().optional().nullable(),
  isPublic: z.boolean().optional(),
  postingEnabled: z.boolean().optional(),
  aiHistoryEnabled: z.boolean().optional(),
});

export async function GET(request: Request) {
  try {
    const profile = await getViewerProfile(request);
    if (!profile) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401, headers: PRIVATE_RESPONSE_HEADERS });
    }

    return NextResponse.json({ profile }, { headers: PRIVATE_RESPONSE_HEADERS });
  } catch (error) {
    logServerError("api.profile.get", error);
    const message = error instanceof Error ? error.message : "Unable to load profile";
    const status = message === "New signups are temporarily disabled" ? 503 : 400;
    return NextResponse.json({ error: message }, { status, headers: PRIVATE_RESPONSE_HEADERS });
  }
}

export async function PUT(request: Request) {
  try {
    const body = PROFILE_UPDATE_SCHEMA.parse(await request.json());
    const profile = await updateViewerProfile(request, body);

    if (!profile) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401, headers: PRIVATE_RESPONSE_HEADERS });
    }

    return NextResponse.json({ profile }, { headers: PRIVATE_RESPONSE_HEADERS });
  } catch (error) {
    logServerError("api.profile.put", error);
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Invalid profile payload", details: error.flatten() },
        { status: 400, headers: PRIVATE_RESPONSE_HEADERS },
      );
    }

    const message = error instanceof Error ? error.message : "Unable to update profile";
    const status =
      message === "Authentication required"
        ? 401
        : message === "Verified identity required" || message.startsWith("CSRF")
          ? 403
          : message === "New signups are temporarily disabled"
            ? 503
            : 400;
    return NextResponse.json({ error: message }, { status, headers: PRIVATE_RESPONSE_HEADERS });
  }
}
