import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/data", () => ({
  getTeamLeaderboard: vi.fn(async () => []),
}));

import TeamsPage from "@/app/teams/page";

describe("teams page empty state", () => {
  it("renders retry hint when no team rows exist", async () => {
    const page = await TeamsPage({ searchParams: Promise.resolve({ range: "season" }) });
    const html = renderToStaticMarkup(page);
    expect(html).toContain("No team summaries found for this range");
    expect(html).toContain("Retry");
  });
});

