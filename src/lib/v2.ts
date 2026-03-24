import { z } from "zod";

import {
  estimateChallengeDecisionValue,
  type ChallengeDecisionValueResponse,
  type CalledPitch,
  type EdgeBucket,
} from "@/lib/server/challenge-decision-value";

export const challengeValueRequestSchema = z.object({
  inning: z.number().int().min(1).max(20),
  halfInning: z.enum(["Top", "Bottom"]).optional().default("Top"),
  balls: z.number().int().min(0).max(3),
  strikes: z.number().int().min(0).max(2),
  outs: z.number().int().min(0).max(2),
  scoreDiffBattingTeam: z.number().int().min(-15).max(15),
  runnersOnBase: z.number().int().min(0).max(3),
  calledPitch: z.enum(["called_strike", "ball"]).optional().default("called_strike"),
  edgeBucket: z.enum(["edge", "near_edge", "clear_miss"]).optional(),
  edgeDistance: z.number().min(0).max(10).optional(),
  challengesRemaining: z.number().int().min(0).max(2),
});

export type ChallengeValueRequest = z.infer<typeof challengeValueRequestSchema>;
export type ChallengeValueResponse = ChallengeDecisionValueResponse;
export type ChallengeValueCalledPitch = CalledPitch;
export type ChallengeValueEdgeBucket = EdgeBucket;

export async function estimateChallengeValue(req: ChallengeValueRequest): Promise<ChallengeValueResponse> {
  return estimateChallengeDecisionValue(req);
}
