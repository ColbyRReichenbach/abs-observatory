import { describe, expect, it, vi } from "vitest";

const getGameReportMock = vi.fn();
const getGamePostgameAuditMock = vi.fn();

vi.mock("@/lib/data", () => ({
  getGameReport: getGameReportMock,
  getGamePostgameAudit: getGamePostgameAuditMock,
}));

describe("/api/reports/[gamePk]", () => {
  it("returns 404 when neither report nor audit exists", async () => {
    const { GET } = await import("./route");
    getGameReportMock.mockResolvedValueOnce(null);
    getGamePostgameAuditMock.mockResolvedValueOnce(null);

    const response = await GET(new Request("http://localhost/api/reports/1"), {
      params: Promise.resolve({ gamePk: "1" }),
    });

    expect(response.status).toBe(404);
  });

  it("returns audit payloads even when markdown report is missing", async () => {
    const { GET } = await import("./route");
    getGameReportMock.mockResolvedValueOnce(null);
    getGamePostgameAuditMock.mockResolvedValueOnce({
      gamePk: 1,
      totalChallenges: 2,
    });

    const response = await GET(new Request("http://localhost/api/reports/1"), {
      params: Promise.resolve({ gamePk: "1" }),
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.audit?.gamePk).toBe(1);
    expect(body.report).toBeNull();
  });
});
