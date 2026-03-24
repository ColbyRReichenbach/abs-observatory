import { describe, expect, it, vi } from "vitest";

const getViewerProfileMock = vi.fn();
const updateViewerProfileMock = vi.fn();

vi.mock("@/lib/server/profiles", () => ({
  getViewerProfile: getViewerProfileMock,
  updateViewerProfile: updateViewerProfileMock,
}));

describe("/api/profile", () => {
  it("rejects unauthenticated reads", async () => {
    const { GET } = await import("./route");
    getViewerProfileMock.mockResolvedValueOnce(null);

    const response = await GET(new Request("http://localhost/api/profile"));

    expect(response.status).toBe(401);
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("returns validation errors for invalid profile payloads", async () => {
    const { PUT } = await import("./route");

    const response = await PUT(
      new Request("http://localhost/api/profile", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username: "ab" }),
      }),
    );

    expect(response.status).toBe(400);
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("maps verification failures to forbidden", async () => {
    const { PUT } = await import("./route");
    updateViewerProfileMock.mockRejectedValueOnce(new Error("Verified identity required"));

    const response = await PUT(
      new Request("http://localhost/api/profile", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username: "dodger_blue" }),
      }),
    );

    expect(response.status).toBe(403);
    expect(response.headers.get("cache-control")).toBe("no-store");
  });
});
