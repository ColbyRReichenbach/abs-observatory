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

  it("rejects test keys in Vercel deployments unless explicitly allowed", () => {
    expect(
      hasValidClerkCredentials({
        VERCEL: "1",
        VERCEL_ENV: "preview",
        NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_abc123",
        CLERK_SECRET_KEY: "sk_test_def456",
      } as NodeJS.ProcessEnv),
    ).toBe(false);

    expect(
      hasValidClerkCredentials({
        VERCEL: "1",
        VERCEL_ENV: "preview",
        ALLOW_CLERK_TEST_KEYS: "true",
        NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_abc123",
        CLERK_SECRET_KEY: "sk_test_def456",
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
