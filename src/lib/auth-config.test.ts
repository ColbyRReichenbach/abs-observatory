import { describe, expect, it } from "vitest";

import { hasValidClerkCredentials } from "./auth-config";

describe("hasValidClerkCredentials", () => {
  it("accepts plausible clerk live and local test keys", () => {
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

  it("accepts test keys in Vercel deployments", () => {
    expect(
      hasValidClerkCredentials({
        VERCEL: "1",
        VERCEL_ENV: "preview",
        NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_abc123",
        CLERK_SECRET_KEY: "sk_test_def456",
      } as NodeJS.ProcessEnv),
    ).toBe(true);

    expect(
      hasValidClerkCredentials({
        VERCEL: "1",
        VERCEL_ENV: "production",
        NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_abc123",
        CLERK_SECRET_KEY: "sk_test_def456",
      } as NodeJS.ProcessEnv),
    ).toBe(true);
  });

  it("accepts Clerk publishable keys with base64url characters", () => {
    expect(
      hasValidClerkCredentials({
        NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_live_abc123-DEF_456",
        CLERK_SECRET_KEY: "sk_live_def456-GHI_789",
      } as NodeJS.ProcessEnv),
    ).toBe(true);
  });

  it("rejects mixed clerk key modes", () => {
    expect(
      hasValidClerkCredentials({
        NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_live_abc123",
        CLERK_SECRET_KEY: "sk_test_def456",
      } as NodeJS.ProcessEnv),
    ).toBe(false);
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
