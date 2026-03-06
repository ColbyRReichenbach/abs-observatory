import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/data", () => ({
  getUmpireLeaderboard: vi.fn(async () => []),
}));

import UmpiresPage from "@/app/umpires/page";

describe("umpires page empty state", () => {
  it("renders retry hint when no umpire rows exist", async () => {
    const page = await UmpiresPage({ searchParams: Promise.resolve({ range: "all" }) });
    const html = renderToStaticMarkup(page);
    expect(html).toContain("No umpire summaries found for this range");
    expect(html).toContain("Retry");
  });
});

