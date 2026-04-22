import { describe, expect, it, vi } from "vitest";

const getPublicProfileByUsernameMock = vi.fn();

vi.mock("@/lib/server/profiles", () => ({
  getPublicProfileByUsername: getPublicProfileByUsernameMock,
}));

describe("/api/public-profiles/[username]", () => {
  it("returns 404 when a public profile is unavailable", async () => {
    const { GET } = await import("./route");
    getPublicProfileByUsernameMock.mockResolvedValueOnce(null);

    const response = await GET(new Request("http://localhost/api/public-profiles/missing"), {
      params: Promise.resolve({ username: "missing" }),
    });

    expect(response.status).toBe(404);
  });

  it("returns public profile payloads when found", async () => {
    const { GET } = await import("./route");
    getPublicProfileByUsernameMock.mockResolvedValueOnce({
      username: "zone_report",
      displayName: "Zone Report",
      bio: "Profile bio",
      favoriteTeamId: 136,
      favoriteTeamName: "Seattle Mariners",
      avatarPreset: null,
      avatarUrl: null,
      isVerified: true,
      createdAt: "2026-04-19T00:00:00.000Z",
      commentCount: 4,
      savedArtifactCount: 7,
    });

    const response = await GET(new Request("http://localhost/api/public-profiles/zone_report"), {
      params: Promise.resolve({ username: "zone_report" }),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
  });
});
