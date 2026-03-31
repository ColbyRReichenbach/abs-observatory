import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const redirectMock = vi.fn(() => {
  throw new Error("NEXT_REDIRECT");
});
const resolveViewModeMock = vi.fn();
const canAccessPrivateAiMock = vi.fn();

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

vi.mock("@/lib/server/admin", () => ({
  canAccessPrivateAi: canAccessPrivateAiMock,
}));

vi.mock("@/lib/view-mode", () => ({
  resolveViewMode: resolveViewModeMock,
}));

vi.mock("@/components/query/query-explorer-client", () => ({
  QueryExplorerClient: ({ mode }: { mode: string }) => <div>QueryExplorer:{mode}</div>,
}));

describe("/query page", () => {
  it("redirects public users while query lab is launch-gated", async () => {
    canAccessPrivateAiMock.mockResolvedValueOnce(false);

    const { default: QueryPage } = await import("./page");
    await expect(
      QueryPage({
        searchParams: Promise.resolve({ view: "org", tourExtra: "query" }),
      }),
    ).rejects.toThrow("NEXT_REDIRECT");
    expect(redirectMock).toHaveBeenCalledWith("/about/how-aibs-works");
  });

  it("passes the resolved view mode into the query explorer for admins", async () => {
    canAccessPrivateAiMock.mockResolvedValueOnce(true);
    resolveViewModeMock.mockResolvedValueOnce("org");

    const { default: QueryPage } = await import("./page");
    const html = renderToStaticMarkup(await QueryPage({
      searchParams: Promise.resolve({ view: "org", tourExtra: "query" }),
    }));

    expect(resolveViewModeMock).toHaveBeenCalledWith({ view: "org", tourExtra: "query" });
    expect(html).toContain("Extra Innings");
    expect(html).toContain("Ask The Query Lab");
    expect(html).toContain("Step Goal");
    expect(html).toContain("Run One Question Through The Desk");
    expect(html).toContain("Then Open Query Lab");
    expect(html).toContain("QueryExplorer:org");
  });
});
