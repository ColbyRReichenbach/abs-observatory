import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), back: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/teams",
}));

vi.mock("@/lib/data", () => ({
  getTeamLeaderboardModel: vi.fn(async () => []),
  getTeamTrendSparklines: vi.fn(async () => []),
}));

import TeamsPage from "@/app/teams/page";

describe("teams page empty state", () => {
  it("renders retry hint when no team rows exist", async () => {
    const page = await TeamsPage({ searchParams: Promise.resolve({ range: "season" }) });
    const html = renderToStaticMarkup(page);
    expect(html).toContain("No data points match the selected criteria.");
    expect(html).toContain("Leaderboard");
  });
});
