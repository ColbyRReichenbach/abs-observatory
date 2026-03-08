import { describe, expect, it, vi } from "vitest";

const { getGamePitchTimelineMock } = vi.hoisted(() => ({
  getGamePitchTimelineMock: vi.fn(),
}));

vi.mock("@/lib/data", () => ({
  getGamePitchTimeline: getGamePitchTimelineMock,
}));

import { GET } from "@/app/api/games/[gamePk]/timeline/route";

describe("GET /api/games/[gamePk]/timeline", () => {
  it("passes bounded filters to the game pitch timeline loader", async () => {
    getGamePitchTimelineMock.mockResolvedValueOnce([{ pitchNumber: 2 }]);

    const request = new Request(
      "http://localhost/api/games/831638/timeline?atBatIndex=12&batterId=6001&pitcherId=7001&challengedOnly=true&limit=300",
    );
    const response = await GET(request, { params: Promise.resolve({ gamePk: "831638" }) });
    const payload = await response.json();

    expect(getGamePitchTimelineMock).toHaveBeenCalledWith(831638, {
      atBatIndex: 12,
      batterId: 6001,
      pitcherId: 7001,
      challengedOnly: true,
      limit: 300,
    });
    expect(payload).toEqual({ timeline: [{ pitchNumber: 2 }] });
  });
});
