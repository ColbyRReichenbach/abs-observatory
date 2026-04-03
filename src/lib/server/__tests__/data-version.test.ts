import { beforeEach, describe, expect, it, vi } from "vitest";

const sqlOneMock = vi.fn();
const getCacheKeyMock = vi.fn();
const getCachedValueMock = vi.fn();
const setCachedValueMock = vi.fn();

vi.mock("@/lib/db", () => ({
  sqlOne: sqlOneMock,
}));

vi.mock("@/lib/server/scale", () => ({
  getCacheKey: getCacheKeyMock,
  getCachedValue: getCachedValueMock,
  setCachedValue: setCachedValueMock,
}));

describe("data-version", () => {
  beforeEach(() => {
    vi.resetModules();
    sqlOneMock.mockReset();
    getCacheKeyMock.mockReset();
    getCachedValueMock.mockReset();
    setCachedValueMock.mockReset();
    getCacheKeyMock.mockImplementation((parts: unknown[]) => parts.join(":"));
    getCachedValueMock.mockReturnValue(undefined);
    delete process.env.POLL_INTERVAL_MINUTES;
  });

  it("defaults poll interval to five minutes when unset or invalid", async () => {
    const { getPollIntervalMinutes } = await import("@/lib/server/data-version");

    expect(getPollIntervalMinutes()).toBe(5);

    process.env.POLL_INTERVAL_MINUTES = "0";
    expect(getPollIntervalMinutes()).toBe(5);

    process.env.POLL_INTERVAL_MINUTES = "7";
    expect(getPollIntervalMinutes()).toBe(7);
  });

  it("includes yesterday before 4 AM Eastern in candidate dates", async () => {
    const { getCandidateEtDates } = await import("@/lib/server/data-version");

    expect(getCandidateEtDates(new Date("2026-04-03T06:30:00Z"))).toEqual(["2026-04-02", "2026-04-03"]);
    expect(getCandidateEtDates(new Date("2026-04-03T12:30:00Z"))).toEqual(["2026-04-03"]);
  });

  it("queries and caches per-game data versions", async () => {
    sqlOneMock.mockResolvedValueOnce({ version: "2026-04-03T01:11:58.774493+00:00" });

    const { getGameDataVersion } = await import("@/lib/server/data-version");
    const version = await getGameDataVersion(824133);

    expect(version).toBe("2026-04-03T01:11:58.774493+00:00");
    expect(sqlOneMock).toHaveBeenCalledOnce();
    expect(sqlOneMock.mock.calls[0]?.[0]).toContain("ops.game_linescores");
    expect(sqlOneMock.mock.calls[0]?.[1]).toEqual([824133]);
    expect(setCachedValueMock).toHaveBeenCalledWith(
      "data-version:game:824133",
      "2026-04-03T01:11:58.774493+00:00",
      15_000,
    );
  });

  it("queries and caches global live data versions", async () => {
    sqlOneMock.mockResolvedValueOnce({ version: "2026-04-03T01:16:07.565590+00:00" });

    const { getGlobalLiveDataVersion } = await import("@/lib/server/data-version");
    const version = await getGlobalLiveDataVersion();

    expect(version).toBe("2026-04-03T01:16:07.565590+00:00");
    expect(sqlOneMock).toHaveBeenCalledOnce();
    expect(sqlOneMock.mock.calls[0]?.[0]).toContain("candidate_games");
    expect(sqlOneMock.mock.calls[0]?.[0]).toContain("ops.game_linescores");
    expect(Array.isArray(sqlOneMock.mock.calls[0]?.[1]?.[0])).toBe(true);
    expect(setCachedValueMock).toHaveBeenCalledWith(
      "data-version:global-live",
      "2026-04-03T01:16:07.565590+00:00",
      15_000,
    );
  });
});
