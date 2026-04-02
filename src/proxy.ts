import { clerkMiddleware } from "@clerk/nextjs/server";
import type { NextFetchEvent, NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { getCsrfCookieName, issueCsrfToken } from "@/lib/server/csrf";

const hasClerkCredentials =
  Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) && Boolean(process.env.CLERK_SECRET_KEY);

const clerkProtectedPrefixes = [
  "/admin",
  "/profile",
  "/query",
  "/sign-in",
  "/sign-up",
  "/api/me",
  "/api/profile",
  "/api/jobs",
  "/api/ai",
  "/api/community",
];

function shouldRunClerkProxy(pathname: string) {
  return clerkProtectedPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function withSecurityHeaders(response: NextResponse) {
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  response.headers.set("Cross-Origin-Opener-Policy", "same-origin");
  response.headers.set("Content-Security-Policy", "frame-ancestors 'none'; base-uri 'self';");
  if (process.env.NODE_ENV === "production") {
    response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
  }

  if (!response.cookies.get(getCsrfCookieName())) {
    response.cookies.set(getCsrfCookieName(), issueCsrfToken(), {
      httpOnly: false,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
    });
  }
  return response;
}

const authProxy = clerkMiddleware(() => withSecurityHeaders(NextResponse.next()));

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpg|jpeg|gif|png|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};

export function proxy(request: NextRequest, event: NextFetchEvent) {
  if (!hasClerkCredentials) {
    return withSecurityHeaders(NextResponse.next());
  }

  if (!shouldRunClerkProxy(request.nextUrl.pathname)) {
    return withSecurityHeaders(NextResponse.next());
  }

  return authProxy(request, event);
}
