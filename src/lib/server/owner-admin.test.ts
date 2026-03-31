import { beforeEach, describe, expect, it } from "vitest";

import { getOwnerEmails, isOwnerIdentity } from "./owner-admin";

describe("owner-admin", () => {
  beforeEach(() => {
    delete process.env.OWNER_CLERK_USER_ID;
    delete process.env.OWNER_EMAIL;
    delete process.env.OWNER_EMAILS;
  });

  it("matches the configured owner Clerk id", () => {
    process.env.OWNER_CLERK_USER_ID = "user_owner";

    expect(isOwnerIdentity({ provider: "clerk", externalAuthId: "user_owner" })).toBe(true);
    expect(isOwnerIdentity({ provider: "clerk", externalAuthId: "user_other" })).toBe(false);
  });

  it("matches configured owner emails case-insensitively", () => {
    process.env.OWNER_EMAILS = "Owner@One.com, second@example.com";

    expect(getOwnerEmails()).toEqual(["owner@one.com", "second@example.com"]);
    expect(
      isOwnerIdentity({
        provider: "clerk",
        externalAuthId: "user_other",
        email: "OWNER@ONE.COM",
      }),
    ).toBe(true);
  });
});
