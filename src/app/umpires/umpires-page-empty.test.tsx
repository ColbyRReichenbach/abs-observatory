import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), back: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/umpires",
}));

vi.mock("@/lib/data", () => ({
  getUmpireLeaderboardModel: vi.fn(async () => []),
}));

import UmpiresPage from "@/app/umpires/page";

describe("umpires page empty state", () => {
  it("renders retry hint when no umpire rows exist", async () => {
    const page = await UmpiresPage({ searchParams: Promise.resolve({ range: "all" }) });
    const html = renderToStaticMarkup(page);
    expect(html).toContain("Discovery in progress. No data points for this selection.");
    expect(html).toContain("Rankings");
  });
});
