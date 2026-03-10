import { NextRequest, NextResponse } from "next/server";

import { getCsrfCookieName, issueCsrfToken } from "@/lib/server/csrf";

const PRIVATE_RESPONSE_HEADERS = {
  "Cache-Control": "no-store",
};

function cookieOptions() {
  return {
    httpOnly: false,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
  };
}

export async function GET(request: NextRequest) {
  const cookieName = getCsrfCookieName();
  const existingToken = request.cookies.get(cookieName)?.value;
  const csrfToken = existingToken ?? issueCsrfToken();
  const response = NextResponse.json({ csrfToken }, { headers: PRIVATE_RESPONSE_HEADERS });

  if (!existingToken) {
    response.cookies.set(cookieName, csrfToken, cookieOptions());
  }

  return response;
}
