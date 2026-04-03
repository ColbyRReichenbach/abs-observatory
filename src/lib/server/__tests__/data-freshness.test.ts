import { beforeEach, describe, expect, it, vi } from "vitest";

const sqlOneMock = vi.fn();
const getCandidateEtDatesMock = vi.fn();
const getLatestSuccessfulEtlDataVersionMock = vi.fn();
const getPollIntervalMinutesMock = vi.fn();

vi.mock("@/lib/db", () => ({
  sqlOne: sqlOneMock,
}));

vi.mock("@/lib/server/data-version", () => ({
  getCandidateEtDates: getCandidateEtDatesMock,
  getLatestSuccessfulEtlDataVersion: getLatestSuccessfulEtlDataVersionMock,
  getPollIntervalMinutes: getPollIntervalMinutesMock,
}));

describe("data-freshness", () => {
  beforeEach(() => {
    vi.resetModules();
    sqlOneMock.mockReset();
    getCandidateEtDatesMock.mockReset();
    getLatestSuccessfulEtlDataVersionMock.mockReset();
    getPollIntervalMinutesMock.mockReset();
    getCandidateEtDatesMock.mockReturnValue(["2026-04-02"]);
    getLatestSuccessfulEtlDataVersionMock.mockResolvedValue("2026-04-03T01:16:07.565590+00:00");
    getPollIntervalMinutesMock.mockReturnValue(5);
  });

  it("returns the latest poll snapshot with live-game metadata", async () => {
    sqlOneMock
      .mockResolvedValueOnce({
        status: "success",
        finished_at: "2026-04-03T01:16:07.565590+00:00",
      })
      .mockResolvedValueOnce({
        live_count: "3",
      });

    const { getDataFreshnessSnapshot } = await import("@/lib/server/data-freshness");
    const snapshot = await getDataFreshnessSnapshot();

    expect(snapshot).toEqual({
      lastFinishedAt: "2026-04-03T01:16:07.565590+00:00",
      lastStatus: "success",
      liveGameCount: 3,
      dataVersion: "2026-04-03T01:16:07.565590+00:00",
      pollIntervalMinutes: 5,
    });
    expect(sqlOneMock).toHaveBeenCalledTimes(2);
    expect(sqlOneMock.mock.calls[1]?.[1]).toEqual([["2026-04-02"]]);
  });

  it("falls back cleanly when there is no completed ETL run yet", async () => {
    sqlOneMock
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        live_count: "0",
      });
    getLatestSuccessfulEtlDataVersionMock.mockResolvedValueOnce("no-etl-success");

    const { getDataFreshnessSnapshot } = await import("@/lib/server/data-freshness");
    const snapshot = await getDataFreshnessSnapshot();

    expect(snapshot.lastFinishedAt).toBeNull();
    expect(snapshot.lastStatus).toBe("unknown");
    expect(snapshot.liveGameCount).toBe(0);
    expect(snapshot.dataVersion).toBe("no-etl-success");
  });
});
