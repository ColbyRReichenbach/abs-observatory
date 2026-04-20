import { NextResponse } from "next/server";
import { getPublicProfileByUsername } from "@/lib/server/profiles";

const PUBLIC_RESPONSE_HEADERS = {
  "Cache-Control": "public, max-age=60, s-maxage=300",
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ username: string }> },
) {
  const { username } = await params;
  const profile = await getPublicProfileByUsername(username);

  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404, headers: PUBLIC_RESPONSE_HEADERS });
  }

  return NextResponse.json({ profile }, { headers: PUBLIC_RESPONSE_HEADERS });
}
