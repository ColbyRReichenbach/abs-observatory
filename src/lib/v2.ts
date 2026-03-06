import { z } from "zod";

export const challengeValueRequestSchema = z.object({
  inning: z.number().int().min(1).max(20),
  balls: z.number().int().min(0).max(3),
  strikes: z.number().int().min(0).max(2),
  outs: z.number().int().min(0).max(2),
  scoreDiffBattingTeam: z.number().int().min(-15).max(15),
  runnersOnBase: z.number().int().min(0).max(3),
  estimatedOverturnProbability: z.number().min(0).max(1),
  challengesRemaining: z.number().int().min(0).max(2),
});

export type ChallengeValueRequest = z.infer<typeof challengeValueRequestSchema>;

export type ChallengeValueResponse = {
  leverageIndexApprox: number;
  wpDeltaIfSuccess: number;
  wpDeltaIfFail: number;
  expectedWpDelta: number;
  recommendation: "challenge" | "hold" | "cannot_challenge";
  rationale: string;
};

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function leverageApprox(req: ChallengeValueRequest): number {
  const inningFactor = clamp(req.inning / 9, 0.1, 1.7);
  const closeGameFactor = clamp(1.5 - Math.abs(req.scoreDiffBattingTeam) * 0.15, 0.3, 1.5);
  const countFactor = req.balls === 3 && req.strikes === 2 ? 1.2 : req.strikes === 2 ? 1.1 : 1.0;
  const baseOutFactor = req.runnersOnBase > 0 ? 1 + req.runnersOnBase * 0.12 : 0.95;
  return Number(clamp(inningFactor * closeGameFactor * countFactor * baseOutFactor, 0.2, 3.0).toFixed(3));
}

export function estimateChallengeValue(req: ChallengeValueRequest): ChallengeValueResponse {
  if (req.challengesRemaining <= 0) {
    return {
      leverageIndexApprox: leverageApprox(req),
      wpDeltaIfSuccess: 0,
      wpDeltaIfFail: 0,
      expectedWpDelta: 0,
      recommendation: "cannot_challenge",
      rationale: "No ABS challenges remaining.",
    };
  }

  const li = leverageApprox(req);
  const baseSwing = 0.012;
  const successBoost = baseSwing * li;
  const failureCost = -0.0025 * li;
  const expected = req.estimatedOverturnProbability * successBoost + (1 - req.estimatedOverturnProbability) * failureCost;

  const buffer = req.challengesRemaining === 1 ? 0.0015 : 0.0005;
  const recommendation = expected > buffer ? "challenge" : "hold";
  const rationale =
    recommendation === "challenge"
      ? "Positive expected WP swing in current leverage context."
      : "Expected value is too small or negative given leverage and remaining challenges.";

  return {
    leverageIndexApprox: li,
    wpDeltaIfSuccess: Number(successBoost.toFixed(4)),
    wpDeltaIfFail: Number(failureCost.toFixed(4)),
    expectedWpDelta: Number(expected.toFixed(4)),
    recommendation,
    rationale,
  };
}
