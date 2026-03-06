import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/data", () => ({
  getUmpireSummary: vi.fn(async () => ({
    umpireId: 44,
    umpireName: "Test Umpire",
    challengedCalls: 18,
    overturnedCalls: 9,
    confirmedCalls: 9,
    overturnRate: 0.5,
    gamesWorked: 12,
  })),
  getUmpireProfile: vi.fn(async () => ({
    directionalBias: {
      strikeToBall: 4,
      ballToStrike: 3,
      otherOverturns: 2,
      confirmed: 9,
    },
    zoneBuckets: [
      { zone: "up", challenges: 5, overturnRate: 0.4 },
      { zone: "down", challenges: 6, overturnRate: 0.5 },
    ],
    countHotspots: [{ countKey: "3-2", challenges: 4, overturnRate: 0.5 }],
  })),
}));

import UmpirePage from "@/app/umpires/[umpireId]/page";

describe("umpire detail page", () => {
  it("renders personality card, directional bias, and hotspots", async () => {
    const page = await UmpirePage({
      params: Promise.resolve({ umpireId: "44" }),
      searchParams: Promise.resolve({ range: "all" }),
    });
    const html = renderToStaticMarkup(page);

    expect(html).toContain("Test Umpire");
    expect(html).toContain("Zone Personality");
    expect(html).toContain("Directional Bias");
    expect(html).toContain("Top Count Hotspots");
    expect(html).toContain("3-2");
  });
});

