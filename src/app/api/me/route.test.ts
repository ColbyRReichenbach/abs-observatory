import { beforeEach, describe, expect, it, vi } from "vitest";

const getViewerProfileMock = vi.fn();
const isClerkConfiguredMock = vi.fn();
const purgeViewerAiHistoryMock = vi.fn();
const deleteViewerAccountMock = vi.fn();
const getOrCreateAiEntitlementMock = vi.fn();

vi.mock("@/lib/server/profiles", () => ({
  getViewerProfile: getViewerProfileMock,
}));

vi.mock("@/lib/server/auth", () => ({
  isClerkConfigured: isClerkConfiguredMock,
}));

vi.mock("@/lib/server/account", () => ({
  purgeViewerAiHistory: purgeViewerAiHistoryMock,
  deleteViewerAccount: deleteViewerAccountMock,
}));

vi.mock("@/lib/server/entitlements", () => ({
  getOrCreateAiEntitlement: getOrCreateAiEntitlementMock,
}));

describe("/api/me", () => {
  beforeEach(() => {
    getViewerProfileMock.mockReset();
    isClerkConfiguredMock.mockReset();
    purgeViewerAiHistoryMock.mockReset();
    deleteViewerAccountMock.mockReset();
    getOrCreateAiEntitlementMock.mockReset();
    isClerkConfiguredMock.mockReturnValue(false);
  });

  it("returns the current viewer with private cache headers", async () => {
    const { GET } = await import("./route");
    getViewerProfileMock.mockResolvedValueOnce({ userId: "user-1" });
    getOrCreateAiEntitlementMock.mockResolvedValueOnce({ planCode: "free" });

    const response = await GET(new Request("http://localhost/api/me"));

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({
      authenticated: true,
      authProvider: "header-dev",
      viewer: { userId: "user-1" },
      entitlements: { planCode: "free" },
    });
  });

  it("purges AI history or deletes the account via DELETE", async () => {
    const { DELETE } = await import("./route");

    const aiResponse = await DELETE(new Request("http://localhost/api/me?scope=ai", { method: "DELETE" }));
    expect(aiResponse.status).toBe(200);
    expect(await aiResponse.json()).toEqual({ ok: true, scope: "ai" });
    expect(purgeViewerAiHistoryMock).toHaveBeenCalledOnce();

    const accountResponse = await DELETE(new Request("http://localhost/api/me", { method: "DELETE" }));
    expect(accountResponse.status).toBe(200);
    expect(await accountResponse.json()).toEqual({ ok: true, scope: "account" });
    expect(deleteViewerAccountMock).toHaveBeenCalledOnce();
  });

  it("maps signup freeze and csrf failures to stable statuses", async () => {
    const { GET, DELETE } = await import("./route");
    getViewerProfileMock.mockRejectedValueOnce(new Error("New signups are temporarily disabled"));

    const frozenResponse = await GET(new Request("http://localhost/api/me"));
    expect(frozenResponse.status).toBe(503);

    deleteViewerAccountMock.mockRejectedValueOnce(new Error("CSRF validation failed"));
    const deleteResponse = await DELETE(new Request("http://localhost/api/me", { method: "DELETE" }));
    expect(deleteResponse.status).toBe(403);
  });
});
