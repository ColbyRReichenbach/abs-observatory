import { describe, expect, it } from "vitest";

const shouldRun = process.env.RUN_DECISION_VALUE_DB_PARITY === "true";

type ParityRow = {
  challenge_id: string;
  challenge_direction: "ball_to_strike" | "strike_to_ball";
  balls_before: number;
  strikes_before: number;
  inning: number;
  half_inning: "Top" | "Bottom";
  outs: number;
  bases_state: string;
  home_score: number;
  away_score: number;
  edge_bucket: "strong_confirm" | "lean_confirm" | "borderline" | "lean_overturn" | "strong_overturn";
  estimated_challenges_remaining: number;
  expected_challenge_value: string;
};

describe.skipIf(!shouldRun)("challenge decision SQL/TypeScript parity", () => {
  it("matches warehouse mart values for nonterminal batter and fielding challenge examples", async () => {
    const databaseUrl = process.env.MODEL_AUDIT_DATABASE_URL || process.env.DATABASE_URL;
    expect(databaseUrl).toBeTruthy();
    process.env.DATABASE_URL = databaseUrl;
    process.env.DATABASE_SSL = process.env.DATABASE_SSL ?? "true";

    const [{ pool }, { estimateChallengeDecisionValue }] = await Promise.all([
      import("@/lib/db"),
      import("@/lib/server/challenge-decision-value"),
    ]);

    const { rows } = await pool.query<ParityRow>(`
      (
        SELECT
          cv.challenge_id,
          c.challenge_direction,
          c.balls_before,
          c.strikes_before,
          cv.inning,
          cv.half_inning,
          cv.outs,
          cv.bases_state,
          cv.home_score,
          cv.away_score,
          c.edge_bucket,
          cv.estimated_challenges_remaining,
          cv.expected_challenge_value
        FROM mart_game_abs_challenge_values cv
        JOIN mart_abs_challenge_classification c
          ON c.challenge_id = cv.challenge_id
        WHERE c.challenge_direction = 'ball_to_strike'
          AND cv.held_terminal_type IS NULL
          AND cv.corrected_terminal_type IS NULL
          AND cv.estimated_challenges_remaining > 0
          AND c.edge_bucket IS NOT NULL
          AND cv.expected_challenge_value IS NOT NULL
        LIMIT 3
      )
      UNION ALL
      (
        SELECT
          cv.challenge_id,
          c.challenge_direction,
          c.balls_before,
          c.strikes_before,
          cv.inning,
          cv.half_inning,
          cv.outs,
          cv.bases_state,
          cv.home_score,
          cv.away_score,
          c.edge_bucket,
          cv.estimated_challenges_remaining,
          cv.expected_challenge_value
        FROM mart_game_abs_challenge_values cv
        JOIN mart_abs_challenge_classification c
          ON c.challenge_id = cv.challenge_id
        WHERE c.challenge_direction = 'strike_to_ball'
          AND cv.held_terminal_type IS NULL
          AND cv.corrected_terminal_type IS NULL
          AND cv.estimated_challenges_remaining > 0
          AND c.edge_bucket IS NOT NULL
          AND cv.expected_challenge_value IS NOT NULL
        LIMIT 3
      )
    `);

    try {
      expect(rows.length).toBeGreaterThanOrEqual(2);

      for (const row of rows) {
        const scoreDiffBattingTeam =
          row.half_inning === "Top"
            ? Number(row.away_score) - Number(row.home_score)
            : Number(row.home_score) - Number(row.away_score);
        const calledPitch = row.challenge_direction === "strike_to_ball" ? "called_strike" : "ball";
        const estimate = await estimateChallengeDecisionValue({
          inning: Number(row.inning),
          halfInning: row.half_inning,
          balls: Number(row.balls_before),
          strikes: Number(row.strikes_before),
          outs: Number(row.outs),
          scoreDiffBattingTeam,
          basesState: row.bases_state,
          calledPitch,
          edgeBucket: row.edge_bucket,
          challengesRemaining: Number(row.estimated_challenges_remaining),
        });

        expect(
          Math.abs(estimate.expectedChallengeValue - Number(row.expected_challenge_value)),
          row.challenge_id,
        ).toBeLessThanOrEqual(0.0002);
      }
    } finally {
      await pool.end();
    }
  }, 30_000);
});
