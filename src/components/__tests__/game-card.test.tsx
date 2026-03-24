import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { GameCard } from "@/components/game-card";
import type { LiveGameCard } from "@/lib/types";

const baseGame: LiveGameCard = {
  gamePk: 555,
  gameDate: "2026-03-05T18:00:00Z",
  status: "Preview",
  detailedState: "Scheduled",
  homeTeamId: 111,
  homeTeamName: "Boston Red Sox",
  homeTeamAbbreviation: "BOS",
  homeTeamLogoUrl: "https://example.com/bos.svg",
  homeScore: null,
  awayTeamId: 147,
  awayTeamName: "New York Yankees",
  awayTeamAbbreviation: "NYY",
  awayTeamLogoUrl: "https://example.com/nyy.svg",
  awayScore: null,
  homeAbsRemaining: 2,
  awayAbsRemaining: 2,
  challengeCount: 0,
};

describe("GameCard", () => {
  it("renders preview scoreboard state", () => {
    const html = renderToStaticMarkup(<GameCard game={baseGame} />);
    expect(html).toContain("Preview");
    expect(html).toContain("Mar 5");
    expect(html).toContain("New York Yankees");
    expect(html).toContain("Boston Red Sox");
    expect(html).toContain("0 Challenges");
  });

  it("renders live scoreboard state", () => {
    const html = renderToStaticMarkup(
      <GameCard
        game={{
          ...baseGame,
          status: "Live",
          detailedState: "Top 5th",
          awayScore: 4,
          homeScore: 3,
          awayAbsRemaining: 1,
          challengeCount: 3,
        }}
      />,
    );
    expect(html).toContain("Live");
    expect(html).toContain("Top 5th");
    expect(html).toContain(">4<");
    expect(html).toContain(">3<");
  });

  it("renders final scoreboard state", () => {
    const html = renderToStaticMarkup(
      <GameCard
        game={{
          ...baseGame,
          status: "Final",
          detailedState: "Final",
          awayScore: 2,
          homeScore: 6,
          homeAbsRemaining: 0,
          awayAbsRemaining: 0,
          challengeCount: 5,
        }}
      />,
    );
    expect(html).toContain("Final");
    expect(html).toContain("5 Challenges");
    expect(html).toContain(">6<");
  });
});
