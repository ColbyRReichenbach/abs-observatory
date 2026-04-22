import { beforeEach, describe, expect, it, vi } from "vitest";

const { assertValidCsrfMock } = vi.hoisted(() => ({
  assertValidCsrfMock: vi.fn(),
}));

const { getViewerProfileMock } = vi.hoisted(() => ({
  getViewerProfileMock: vi.fn(),
}));

const { registerAiArtifactMock, listViewerAiArtifactsMock } = vi.hoisted(() => ({
  registerAiArtifactMock: vi.fn(),
  listViewerAiArtifactsMock: vi.fn(),
}));

vi.mock("@/lib/server/csrf", () => ({
  assertValidCsrf: assertValidCsrfMock,
}));

vi.mock("@/lib/server/profiles", () => ({
  getViewerProfile: getViewerProfileMock,
}));

vi.mock("@/lib/server/ai-generations", () => ({
  registerAiArtifact: registerAiArtifactMock,
  listViewerAiArtifacts: listViewerAiArtifactsMock,
}));

describe("/api/ai/artifacts", () => {
  beforeEach(() => {
    assertValidCsrfMock.mockReset();
    getViewerProfileMock.mockReset();
    registerAiArtifactMock.mockReset();
    listViewerAiArtifactsMock.mockReset();
  });

  it("lists viewer-owned artifacts", async () => {
    const { GET } = await import("./route");
    getViewerProfileMock.mockResolvedValueOnce({
      userId: "user-1",
      aiHistoryEnabled: true,
    });
    listViewerAiArtifactsMock.mockResolvedValueOnce([{ artifactId: "artifact-1" }]);

    const response = await GET(new Request("http://localhost/api/ai/artifacts?limit=5"));

    expect(response.status).toBe(200);
    expect(listViewerAiArtifactsMock).toHaveBeenCalledWith("user-1", 5);
    expect(await response.json()).toEqual({
      enabled: true,
      artifacts: [{ artifactId: "artifact-1" }],
    });
  });

  it("returns 401 when listing without authentication", async () => {
    const { GET } = await import("./route");
    getViewerProfileMock.mockResolvedValueOnce(null);

    const response = await GET(new Request("http://localhost/api/ai/artifacts"));

    expect(response.status).toBe(401);
  });

  it("registers owned artifacts for a viewer with history enabled", async () => {
    const { POST } = await import("./route");
    getViewerProfileMock.mockResolvedValueOnce({
      userId: "user-2",
      aiHistoryEnabled: true,
    });
    registerAiArtifactMock.mockResolvedValueOnce({
      generationId: "gen-1",
      artifactId: "artifact-2",
      saved: true,
    });

    const response = await POST(
      new Request("http://localhost/api/ai/artifacts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          surfaceKey: "chart_insight",
          surfaceDetail: "insight_bubble",
          targetType: "chart_insight",
          targetId: "zone:123",
          title: "Zone Watch",
        }),
      }),
    );

    expect(assertValidCsrfMock).toHaveBeenCalledOnce();
    expect(registerAiArtifactMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-2",
        title: "Zone Watch",
      }),
    );
    expect(response.status).toBe(200);
  });

  it("registers anonymous generation links when history is paused", async () => {
    const { POST } = await import("./route");
    getViewerProfileMock.mockResolvedValueOnce({
      userId: "user-3",
      aiHistoryEnabled: false,
    });
    registerAiArtifactMock.mockResolvedValueOnce({
      generationId: "gen-2",
      artifactId: null,
      saved: false,
    });

    await POST(
      new Request("http://localhost/api/ai/artifacts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          surfaceKey: "chart_insight",
          targetType: "challenge_summary",
          targetId: "challenge:2",
        }),
      }),
    );

    expect(registerAiArtifactMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: null,
      }),
    );
  });

  it("accepts visualizer artifacts for shared charts", async () => {
    const { POST } = await import("./route");
    getViewerProfileMock.mockResolvedValueOnce({
      userId: "user-4",
      aiHistoryEnabled: true,
    });
    registerAiArtifactMock.mockResolvedValueOnce({
      generationId: "gen-3",
      artifactId: "artifact-visualizer",
      saved: true,
    });

    const response = await POST(
      new Request("http://localhost/api/ai/artifacts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          surfaceKey: "visualizer",
          surfaceDetail: "team_chart_builder",
          targetType: "visualizer_chart",
          targetId: "gen-3",
          title: "Cardinals Overturn Rate by Count State",
          artifactPayload: {
            structuredPlan: {
              chartTitle: "Cardinals Overturn Rate by Count State",
              chartType: "bar_chart",
              xAxis: "Count State",
              yAxis: "Overturn Rate",
              compareBy: null,
              filters: [],
              highlight: "Compare overturn rate by count state.",
              honorsUserChartRequest: true,
              dataPoints: [
                { x: "Pitcher Ahead", y: 0.59 },
                { x: "Even Count", y: 0.7 },
                { x: "Hitter Ahead", y: 0.8 },
              ],
            },
          },
          metadata: {
            publicShare: true,
          },
        }),
      }),
    );

    expect(response.status).toBe(200);
    expect(registerAiArtifactMock).toHaveBeenCalledWith(
      expect.objectContaining({
        surfaceKey: "visualizer",
        targetType: "visualizer_chart",
      }),
    );
  });

  it("drops non-internal routeScope values before persisting artifacts", async () => {
    const { POST } = await import("./route");
    getViewerProfileMock.mockResolvedValueOnce({
      userId: "user-5",
      aiHistoryEnabled: true,
    });
    registerAiArtifactMock.mockResolvedValueOnce({
      generationId: "gen-4",
      artifactId: "artifact-4",
      saved: true,
    });

    await POST(
      new Request("http://localhost/api/ai/artifacts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          surfaceKey: "visualizer",
          targetType: "visualizer_chart",
          targetId: "gen-4",
          routeScope: "https://evil.example/phish",
        }),
      }),
    );

    expect(registerAiArtifactMock).toHaveBeenCalledWith(
      expect.objectContaining({
        routeScope: null,
      }),
    );
  });
});
