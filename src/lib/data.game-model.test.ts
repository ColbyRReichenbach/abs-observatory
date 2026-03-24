import { beforeEach, describe, expect, it, vi } from "vitest";

const { sqlMock } = vi.hoisted(() => ({
  sqlMock: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  sql: sqlMock,
}));

import { getGameChallenges, getGamePitchTimeline } from "@/lib/data";

describe("game data read models", () => {
  beforeEach(() => {
    sqlMock.mockReset();
  });

  it("maps challenge impact and count transitions from the full pitch model", async () => {
    sqlMock.mockResolvedValueOnce([
      {
        challenge_id: "challenge-1",
        game_pk: 831638,
        challenged_at: "2026-03-05T18:02:00Z",
        inning: 1,
        half_inning: "top",
        balls: 0,
        strikes: 2,
        outs: 0,
        bases_state: "000",
        home_score: 0,
        away_score: 0,
        challenge_team_id: 147,
        challenge_team_name: "Dodgers",
        challenge_player_name: "Will Smith",
        batter_name: "Mookie Betts",
        pitcher_name: "Paul Skenes",
        called_description: "Called Strike",
        pitchnumber: 3,
        location_source: "inferred_final_pitch_px_pz",
        inference_method: "at_bat_final_pitch_called_take",
        inference_confidence: "high",
        pitchtype: "Slider",
        startspeed: 90.3,
        spinrate: 2712,
        is_overturned: true,
        px: -0.71,
        pz: 1.42,
        strike_zone_top: 3.4,
        strike_zone_bottom: 1.4,
        balls_before: 0,
        strikes_before: 2,
        balls_after: 0,
        strikes_after: 3,
        impact_type: "direct_ending_impact",
        impact_summary: "The overturned call directly changed whether the plate appearance ended.",
      },
    ]);

    const rows = await getGameChallenges(831638);

    expect(rows).toEqual([
      expect.objectContaining({
        challengeId: "challenge-1",
        countBefore: "0-2",
        countAfter: "0-3",
        locationSource: "inferred_final_pitch_px_pz",
        inferenceMethod: "at_bat_final_pitch_called_take",
        inferenceConfidence: "high",
        impactType: "direct_ending_impact",
        impactSummary: "The overturned call directly changed whether the plate appearance ended.",
      }),
    ]);
  });

  it("bounds timeline queries and maps matchup-scoped pitch rows", async () => {
    sqlMock.mockResolvedValueOnce([
      {
        game_pk: 831638,
        at_bat_index: 12,
        pitch_number: 2,
        play_event_index: 2,
        inning: 1,
        half_inning: "top",
        batter_id: 6001,
        batter_name: "Mookie Betts",
        pitcher_id: 7001,
        pitcher_name: "Paul Skenes",
        called_code: "C",
        called_description: "Called Strike",
        play_description: "Called Strike",
        pitch_type_code: "FF",
        pitch_type_description: "4-Seam Fastball",
        start_speed: 99.1,
        spin_rate: 2450,
        px: 0.92,
        pz: 3.62,
        strike_zone_top: 3.5,
        strike_zone_bottom: 1.5,
        zone: 9,
        balls_before: 0,
        strikes_before: 1,
        outs_before: 0,
        balls_after: 0,
        strikes_after: 2,
        outs_after: 0,
        bases_state_before: "000",
        bases_state_after: "000",
        is_in_play: false,
        ended_plate_appearance: false,
        challenge_id: "challenge-2",
        challenge_player_name: "Will Smith",
        challenge_team_id: 147,
        is_overturned: true,
        impact_type: "direct_count_impact",
        impact_summary: "The overturned call changed the count before the plate appearance finished.",
      },
    ]);

    const rows = await getGamePitchTimeline(831638, {
      atBatIndex: 12,
      batterId: 6001,
      pitcherId: 7001,
      challengedOnly: true,
      limit: 9999,
    });

    expect(sqlMock).toHaveBeenCalledWith(expect.stringContaining("FROM mart_game_pitch_timeline"), [
      831638,
      12,
      6001,
      7001,
      500,
    ]);
    expect(rows).toEqual([
      expect.objectContaining({
        atBatIndex: 12,
        pitchNumber: 2,
        countBefore: "0-1",
        countAfter: "0-2",
        challengeId: "challenge-2",
        impactType: "direct_count_impact",
      }),
    ]);
  });
});
