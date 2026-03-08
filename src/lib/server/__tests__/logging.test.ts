import { beforeEach, describe, expect, it, vi } from "vitest";

import { logServerError, redactForLogs } from "@/lib/server/logging";

describe("logging redaction", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("redacts sensitive fields before logging", () => {
    expect(
      redactForLogs({
        authorization: "Bearer secret-token",
        cookie: "session=abc",
        apiKey: "sk-secret",
        prompt: "user prompt contents",
        nested: {
          email: "user@example.com",
          safe: "value",
        },
      }),
    ).toEqual({
      authorization: "[REDACTED]",
      cookie: "[REDACTED]",
      apiKey: "[REDACTED]",
      prompt: "[REDACTED]",
      nested: {
        email: "[REDACTED]",
        safe: "[REDACTED]",
      },
    });
  });

  it("logs sanitized server errors", () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    logServerError("api.webhooks.clerk", new Error("invalid signature"), {
      svixSignature: "v1,secret",
      cookie: "session=abc",
    });

    expect(consoleErrorSpy).toHaveBeenCalledOnce();
    const payload = JSON.parse(String(consoleErrorSpy.mock.calls[0]?.[0]));
    expect(payload.metadata).toEqual({
      svixSignature: "[REDACTED]",
      cookie: "[REDACTED]",
    });
  });
});
