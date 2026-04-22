import { describe, expect, it } from "vitest";

import { hasValidClerkCredentials } from "./auth-config";

describe("hasValidClerkCredentials", () => {
  it("accepts plausible clerk live and test keys", () => {
    expect(
      hasValidClerkCredentials({
        NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_abc123",
        CLERK_SECRET_KEY: "sk_test_def456",
      } as NodeJS.ProcessEnv),
    ).toBe(true);

    expect(
      hasValidClerkCredentials({
        NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_live_abc123",
        CLERK_SECRET_KEY: "sk_live_def456",
      } as NodeJS.ProcessEnv),
    ).toBe(true);
  });

  it("rejects placeholders and partial values", () => {
    expect(
      hasValidClerkCredentials({
        NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_placeholder",
        CLERK_SECRET_KEY: "sk_test_placeholder",
      } as NodeJS.ProcessEnv),
    ).toBe(false);

    expect(
      hasValidClerkCredentials({
        NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "",
        CLERK_SECRET_KEY: "sk_test_def456",
      } as NodeJS.ProcessEnv),
    ).toBe(false);
  });
});
