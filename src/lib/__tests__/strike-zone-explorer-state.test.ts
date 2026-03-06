import { describe, expect, it } from "vitest";

import { applyExplorerFilters, resolveSelection } from "@/lib/strike-zone-explorer-state";
import type { ChallengeEvent } from "@/lib/types";

const baseEvent: ChallengeEvent = {
  challengeId: "c-1",
  gamePk: 1,
  challengedAt: null,
  inning: 1,
  halfInning: "Top",
  balls: 0,
  strikes: 0,
  outs: 0,
  basesState: "000",
  homeScore: 0,
  awayScore: 0,
  challengeTeamId: 111,
  challengeTeamName: "BOS",
  challengePlayerName: "Player",
  batterName: "Batter A",
  pitcherName: "Pitcher A",
  calledDescription: "Called Strike",
  pitchNumber: 1,
  pitchType: "4-Seam Fastball",
  startSpeed: 95,
  spinRate: 2200,
  isOverturned: true,
  px: 0.1,
  pz: 3.1,
  strikeZoneTop: 3.5,
  strikeZoneBottom: 1.5,
};

describe("strike-zone explorer state", () => {
  it("filters by pitch type, batter, and pitcher", () => {
    const events: ChallengeEvent[] = [
      baseEvent,
      { ...baseEvent, challengeId: "c-2", pitchType: "Slider", batterName: "Batter B", pitcherName: "Pitcher B" },
    ];
    const filtered = applyExplorerFilters(events, {
      pitchType: "Slider",
      batter: "Batter B",
      pitcher: "Pitcher B",
    });

    expect(filtered).toHaveLength(1);
    expect(filtered[0].challengeId).toBe("c-2");
  });

  it("preserves selection when still valid after filtering", () => {
    const events: ChallengeEvent[] = [baseEvent, { ...baseEvent, challengeId: "c-2" }];
    expect(resolveSelection("c-2", events)).toBe("c-2");
  });

  it("falls back to first filtered challenge if selection is no longer valid", () => {
    const events: ChallengeEvent[] = [{ ...baseEvent, challengeId: "c-9" }];
    expect(resolveSelection("c-2", events)).toBe("c-9");
  });
});

