import { describe, expect, it } from "vitest";

import { assertValidCsrf, getCsrfCookieName, shouldBypassCsrf } from "@/lib/server/csrf";

describe("csrf helper", () => {
  it("bypasses csrf for dev and worker-authenticated requests", () => {
    expect(
      shouldBypassCsrf(new Request("http://localhost/api/comments", { headers: { "x-dev-user-id": "user-1" } })),
    ).toBe(true);
    expect(
      shouldBypassCsrf(new Request("http://localhost/api/internal/jobs", { headers: { "x-worker-token": "token" } })),
    ).toBe(true);
  });

  it("accepts matching csrf cookie and header on same-origin writes", () => {
    expect(() =>
      assertValidCsrf(
        new Request("http://localhost/api/profile", {
          method: "PUT",
          headers: {
            cookie: `${getCsrfCookieName()}=test-token`,
            "x-csrf-token": "test-token",
            origin: "http://localhost",
          },
        }),
      ),
    ).not.toThrow();
  });

  it("rejects missing or mismatched csrf tokens", () => {
    expect(() =>
      assertValidCsrf(
        new Request("http://localhost/api/profile", {
          method: "PUT",
          headers: {
            cookie: `${getCsrfCookieName()}=test-token`,
            origin: "http://localhost",
          },
        }),
      ),
    ).toThrow("CSRF validation failed");

    expect(() =>
      assertValidCsrf(
        new Request("http://localhost/api/profile", {
          method: "PUT",
          headers: {
            cookie: `${getCsrfCookieName()}=test-token`,
            "x-csrf-token": "wrong-token",
            origin: "http://localhost",
          },
        }),
      ),
    ).toThrow("CSRF validation failed");
  });
});
