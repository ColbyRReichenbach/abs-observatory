import { describe, expect, it, vi } from "vitest";

const getViewerProfileMock = vi.fn();
const updateViewerProfileMock = vi.fn();

vi.mock("@/lib/server/profiles", () => ({
  getViewerProfile: getViewerProfileMock,
  updateViewerProfile: updateViewerProfileMock,
}));

describe("/api/profile/onboarding", () => {
  it("rejects unauthenticated reads", async () => {
    const { GET } = await import("./route");
    getViewerProfileMock.mockResolvedValueOnce(null);

    const response = await GET(new Request("http://localhost/api/profile/onboarding"));

    expect(response.status).toBe(401);
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("maps verification failures to forbidden on write", async () => {
    const { POST } = await import("./route");
    updateViewerProfileMock.mockRejectedValueOnce(new Error("Verified identity required"));

    const response = await POST(
      new Request("http://localhost/api/profile/onboarding", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username: "zone_report" }),
      }),
    );

    expect(response.status).toBe(403);
    expect(response.headers.get("cache-control")).toBe("no-store");
  });
});
