import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { GameScoreboard } from "@/components/game-scoreboard";

const awayBase = {
  id: 147,
  name: "New York Yankees",
  abbreviation: "NYY",
  runs: 3,
  hits: 8,
  errors: 1,
  challengesRemaining: 1,
};

const homeBase = {
  id: 111,
  name: "Boston Red Sox",
  abbreviation: "BOS",
  runs: 4,
  hits: 9,
  errors: 0,
  challengesRemaining: 2,
};

describe("GameScoreboard", () => {
  it("renders preview snapshot with fallback inning columns", () => {
    const html = renderToStaticMarkup(
      <GameScoreboard
        status="Preview"
        detailedState="Scheduled"
        away={{ ...awayBase, runs: null, hits: null, errors: null }}
        home={{ ...homeBase, runs: null, hits: null, errors: null }}
      />,
    );

    expect(html).toContain("Scheduled");
    expect(html).toContain("Count");
    expect(html).toContain("0-0");
    expect(html).toContain("Outs");
    expect(html).toContain("NYY");
    expect(html).toContain("BOS");
    expect(html).toContain("R");
    expect(html).toContain("H");
    expect(html).toContain("E");
  });

  it("renders live snapshot with inning state and provided linescore", () => {
    const html = renderToStaticMarkup(
      <GameScoreboard
        status="Live"
        detailedState="In Progress"
        inning={7}
        halfInning="Top"
        balls={2}
        strikes={1}
        outs={1}
        innings={[
          { inning: 1, awayRuns: 1, homeRuns: 0 },
          { inning: 2, awayRuns: 0, homeRuns: 1 },
          { inning: 3, awayRuns: 2, homeRuns: 0 },
        ]}
        away={awayBase}
        home={homeBase}
      />,
    );

    expect(html).toContain("Live");
    expect(html).toContain("In Progress");
    expect(html).toContain("Count");
    expect(html).toContain("2-1");
    expect(html).toContain("Outs");
    expect(html).toContain(">3<");
    expect(html).toContain(">4<");
  });

  it("renders final snapshot with extra innings columns", () => {
    const html = renderToStaticMarkup(
      <GameScoreboard
        status="Final"
        detailedState="Final"
        innings={Array.from({ length: 11 }, (_, idx) => ({
          inning: idx + 1,
          awayRuns: idx === 10 ? 1 : 0,
          homeRuns: 0,
        }))}
        away={{ ...awayBase, runs: 1, hits: 10, errors: 0 }}
        home={{ ...homeBase, runs: 0, hits: 7, errors: 1 }}
      />,
    );

    expect(html).toContain("Final");
    expect(html).toContain(">11<");
    expect(html).toContain("NYY");
    expect(html).toContain("BOS");
  });
});
