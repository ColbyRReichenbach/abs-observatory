import { NextResponse } from "next/server";
import { z, ZodError } from "zod";

import { getProfileOnboardingState } from "@/lib/profile-onboarding";
import { logServerError } from "@/lib/server/logging";
import { getViewerProfile, updateViewerProfile } from "@/lib/server/profiles";

const PRIVATE_RESPONSE_HEADERS = {
  "Cache-Control": "no-store",
};

const ONBOARDING_UPDATE_SCHEMA = z.object({
  username: z.string().min(3).max(16).optional().nullable(),
  favoriteTeamId: z.number().int().optional().nullable(),
  isPublic: z.boolean().optional(),
});

function toOnboardingResponse(profile: NonNullable<Awaited<ReturnType<typeof getViewerProfile>>>) {
  const onboarding = getProfileOnboardingState({
    isVerified: profile.isVerified,
    username: profile.username,
    favoriteTeamId: profile.favoriteTeamId,
    isPublic: profile.isPublic,
  });

  return { profile, onboarding };
}

export async function GET(request: Request) {
  try {
    const profile = await getViewerProfile(request);

    if (!profile) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401, headers: PRIVATE_RESPONSE_HEADERS });
    }

    return NextResponse.json(toOnboardingResponse(profile), { headers: PRIVATE_RESPONSE_HEADERS });
  } catch (error) {
    logServerError("api.profile.onboarding.get", error);
    const message = error instanceof Error ? error.message : "Unable to load onboarding state";
    return NextResponse.json({ error: message }, { status: 400, headers: PRIVATE_RESPONSE_HEADERS });
  }
}

export async function POST(request: Request) {
  try {
    const body = ONBOARDING_UPDATE_SCHEMA.parse(await request.json());
    const profile = await updateViewerProfile(request, body);

    if (!profile) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401, headers: PRIVATE_RESPONSE_HEADERS });
    }

    return NextResponse.json(toOnboardingResponse(profile), { headers: PRIVATE_RESPONSE_HEADERS });
  } catch (error) {
    logServerError("api.profile.onboarding.post", error);

    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Invalid onboarding payload", details: error.flatten() },
        { status: 400, headers: PRIVATE_RESPONSE_HEADERS },
      );
    }

    const message = error instanceof Error ? error.message : "Unable to update onboarding";
    const status =
      message === "Authentication required"
        ? 401
        : message === "Verified identity required" || message.startsWith("CSRF")
          ? 403
          : 400;
    return NextResponse.json({ error: message }, { status, headers: PRIVATE_RESPONSE_HEADERS });
  }
}
