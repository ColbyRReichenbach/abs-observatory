import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { StrikeZonePlot } from "@/components/strike-zone-plot";
import type { ChallengeEvent } from "@/lib/types";

const challenge: ChallengeEvent = {
  challengeId: "cz-1",
  gamePk: 1,
  challengedAt: "2026-03-05T19:20:00Z",
  inning: 3,
  halfInning: "Top",
  balls: 2,
  strikes: 1,
  outs: 1,
  basesState: "010",
  homeScore: 1,
  awayScore: 2,
  challengeTeamId: 147,
  challengeTeamName: "New York Yankees",
  challengePlayerName: "Aaron Judge",
  batterName: "Aaron Judge",
  pitcherName: "Brayan Bello",
  calledDescription: "Called Strike",
  pitchNumber: 5,
  pitchType: "Slider",
  startSpeed: 87.2,
  spinRate: 2450,
  isOverturned: true,
  px: 0.2,
  pz: 3.3,
  strikeZoneTop: 3.5,
  strikeZoneBottom: 1.5,
  countBefore: "0-1",
  umpireCount: "1-1",
  countAfter: "0-2",
};

describe("StrikeZonePlot", () => {
  it("renders non-color legend labels and corrected-strike marker short code", () => {
    const html = renderToStaticMarkup(<StrikeZonePlot challenges={[challenge]} />);
    expect(html).toContain("Strike (Corrected)");
    expect(html).toContain("Ball (Corrected)");
    expect(html).toContain("Confirmed");
    expect(html).toContain("Overturned");
    expect(html).toContain(">K<");
  });

  it("classifies corrected balls from the count transition", () => {
    const html = renderToStaticMarkup(
      <StrikeZonePlot
        challenges={[
          {
            ...challenge,
            calledDescription: "Ball",
            umpireCount: "0-2",
            countAfter: "1-1",
          },
        ]}
      />,
    );
    expect(html).toContain(">B<");
  });

  it("renders optional count and pitch overlays", () => {
    const html = renderToStaticMarkup(<StrikeZonePlot challenges={[challenge]} showCountOverlay showPitchOverlay />);
    expect(html).toContain("1-1");
    expect(html).toContain("Slider");
  });
});
