import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ChartLoadingPanel, ScoreboardLoadingCard, StrikeZoneLoading } from "@/components/baseball-loading";

describe("baseball loading skeletons", () => {
  it("renders scoreboard, strike-zone, and chart loading surfaces", () => {
    const html = renderToStaticMarkup(
      <div>
        <ScoreboardLoadingCard />
        <StrikeZoneLoading />
        <ChartLoadingPanel />
      </div>,
    );
    expect(html).toContain("animate-shimmer");
  });
});

