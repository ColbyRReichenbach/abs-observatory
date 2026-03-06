import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { TeamMotifHero } from "@/components/team-motif-hero";

describe("TeamMotifHero", () => {
  it("renders branded hero copy and motif labels", () => {
    const html = renderToStaticMarkup(
      <TeamMotifHero
        teamId={111}
        teamName="Boston Red Sox"
        abbreviation="BOS"
        primaryColor="#BD3039"
        secondaryColor="#0C2340"
        eyebrow="Game 123"
        title="NYY at BOS"
        subtitle="Fenway Park"
      />,
    );

    expect(html).toContain("Game 123");
    expect(html).toContain("NYY at BOS");
    expect(html).toContain("Fenway Park");
    expect(html).toContain("Green Monster");
  });
});

