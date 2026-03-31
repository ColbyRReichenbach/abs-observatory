import { NextRequest, type NextFetchEvent } from "next/server";
import { afterEach, describe, expect, it } from "vitest";

describe("proxy security headers", () => {
  const originalPublishable = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  const originalSecret = process.env.CLERK_SECRET_KEY;

  afterEach(() => {
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = originalPublishable;
    process.env.CLERK_SECRET_KEY = originalSecret;
  });

  it("adds baseline security headers on fallback proxy", async () => {
    delete process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
    delete process.env.CLERK_SECRET_KEY;

    const { proxy } = await import("./src/proxy");
    const response = proxy(new NextRequest("http://localhost/teams"), {} as NextFetchEvent);

    expect(response.headers.get("x-frame-options")).toBe("DENY");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(response.headers.get("content-security-policy")).toContain("frame-ancestors 'none'");
    expect(response.cookies.get("aibs_csrf")?.value).toBeTruthy();
  });
});
