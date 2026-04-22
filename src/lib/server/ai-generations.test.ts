import { beforeEach, describe, expect, it, vi } from "vitest";

const { sqlMock, sqlOneMock } = vi.hoisted(() => ({
  sqlMock: vi.fn(),
  sqlOneMock: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  sql: sqlMock,
  sqlOne: sqlOneMock,
}));

import { getPublicAiArtifactById, listViewerAiArtifacts, registerAiArtifact } from "@/lib/server/ai-generations";

describe("ai artifact persistence", () => {
  beforeEach(() => {
    sqlMock.mockReset();
    sqlOneMock.mockReset();
  });

  it("registers a saved artifact for a signed-in owner", async () => {
    sqlOneMock
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        artifactid: "artifact-1",
        userid: "user-1",
        generationid: "gen-1",
        surfacekey: "chart_insight",
        surfacedetail: "insight_bubble",
        targettype: "chart_insight",
        targetid: "zone:123",
        routescope: "/umpires/7",
        routeentityid: null,
        articleid: null,
        gamepk: null,
        title: "Zone Watch",
        summary: "Fastball edge summary.",
        artifactpayload: null,
        metadata: { bucket: "edge" },
        lastviewedat: "2026-04-20T00:00:00Z",
        createdat: "2026-04-20T00:00:00Z",
        updatedat: "2026-04-20T00:00:00Z",
      });
    sqlMock.mockResolvedValueOnce([{ generationid: "gen-1" }]);

    const result = await registerAiArtifact({
      userId: "user-1",
      surfaceKey: "chart_insight",
      surfaceDetail: "insight_bubble",
      targetType: "chart_insight",
      targetId: "zone:123",
      routeScope: "/umpires/7",
      title: "Zone Watch",
      summary: "Fastball edge summary.",
      metadata: { bucket: "edge" },
    });

    expect(result).toEqual({
      generationId: "gen-1",
      artifactId: "artifact-1",
      saved: true,
    });
  });

  it("returns only a generation id when no owner is present", async () => {
    sqlOneMock
      .mockResolvedValueOnce({ generationid: "gen-2" });

    const result = await registerAiArtifact({
      surfaceKey: "chart_insight",
      targetType: "challenge_summary",
      targetId: "challenge:1",
    });

    expect(result).toEqual({
      generationId: "gen-2",
      artifactId: null,
      saved: false,
    });
  });

  it("lists saved artifacts in recency order for a viewer", async () => {
    sqlMock.mockResolvedValueOnce([
      {
        artifactid: "artifact-2",
        userid: "user-1",
        generationid: "gen-2",
        surfacekey: "chart_insight",
        surfacedetail: "challenge_summary_card",
        targettype: "challenge_summary",
        targetid: "challenge:2",
        routescope: "/game/823727",
        routeentityid: null,
        articleid: null,
        gamepk: 823727,
        title: "Ninth-inning challenge",
        summary: "Late count swing.",
        artifactpayload: null,
        metadata: { verdict: "overturned" },
        lastviewedat: "2026-04-20T02:00:00Z",
        createdat: "2026-04-20T01:00:00Z",
        updatedat: "2026-04-20T02:00:00Z",
      },
    ]);

    const artifacts = await listViewerAiArtifacts("user-1", 5);

    expect(artifacts).toEqual([
      expect.objectContaining({
        artifactId: "artifact-2",
        userId: "user-1",
        targetId: "challenge:2",
        routeScope: "/game/823727",
        gamePk: 823727,
      }),
    ]);
  });

  it("returns a public shared artifact only when publicShare metadata is enabled", async () => {
    sqlOneMock.mockResolvedValueOnce({
      artifactid: "artifact-public",
      userid: "user-1",
      generationid: "gen-public",
      surfacekey: "visualizer",
      surfacedetail: "team_chart_builder",
      targettype: "visualizer_chart",
      targetid: "generation-1",
      routescope: "/teams/138",
      routeentityid: "138",
      articleid: null,
      gamepk: null,
      title: "Cardinals Count-State Overturn Rate",
      summary: "Compare overturn rate by count state.",
      artifactpayload: {
        structuredPlan: {
          chartType: "bar",
          chartTitle: "Cardinals Count-State Overturn Rate",
        },
      },
      metadata: { publicShare: true },
      lastviewedat: "2026-04-21T00:00:00Z",
      createdat: "2026-04-21T00:00:00Z",
      updatedat: "2026-04-21T00:00:00Z",
    });

    const artifact = await getPublicAiArtifactById("artifact-public");

    expect(artifact).toEqual(
      expect.objectContaining({
        artifactId: "artifact-public",
        surfaceKey: "visualizer",
        title: "Cardinals Count-State Overturn Rate",
      }),
    );
  });
});
