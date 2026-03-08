import { beforeEach, describe, expect, it, vi } from "vitest";

const sqlOneMock = vi.fn();
const withTransactionMock = vi.fn();
const getAuthIdentityMock = vi.fn();

vi.mock("@/lib/db", () => ({
  sqlOne: sqlOneMock,
  withTransaction: withTransactionMock,
}));

vi.mock("@/lib/server/auth", () => ({
  getAuthIdentity: getAuthIdentityMock,
}));

describe("profiles", () => {
  beforeEach(() => {
    delete process.env.SIGNUPS_GLOBAL_KILL_SWITCH;
    sqlOneMock.mockReset();
    withTransactionMock.mockReset();
    getAuthIdentityMock.mockReset();
  });

  it("blocks new signups when the global signup freeze is enabled", async () => {
    process.env.SIGNUPS_GLOBAL_KILL_SWITCH = "true";
    const { syncUserFromIdentity } = await import("@/lib/server/profiles");
    sqlOneMock.mockResolvedValueOnce(null);

    await expect(
      syncUserFromIdentity({
        provider: "clerk",
        externalAuthId: "user_123",
        externalOrgId: null,
        email: "user@example.com",
        displayName: "New User",
        avatarUrl: null,
        isVerified: true,
      }),
    ).rejects.toThrow("New signups are temporarily disabled");
  });
});
