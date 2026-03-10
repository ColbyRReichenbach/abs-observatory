import type { ConfidenceBand } from "@/lib/types";

export const RUN_EXPECTANCY_HIGH_CONFIDENCE_SAMPLE = 500;
export const RUN_EXPECTANCY_MEDIUM_CONFIDENCE_SAMPLE = 150;
export const WIN_EXPECTANCY_HIGH_CONFIDENCE_SAMPLE = 2000;
export const WIN_EXPECTANCY_MEDIUM_CONFIDENCE_SAMPLE = 500;
export const OVERTURN_PROBABILITY_HIGH_CONFIDENCE_SAMPLE = 100;
export const OVERTURN_PROBABILITY_MEDIUM_CONFIDENCE_SAMPLE = 25;

export function getRunEnvironmentConfidenceBand(sampleSize: number | null | undefined): ConfidenceBand {
  const resolved = sampleSize ?? 0;
  if (resolved >= RUN_EXPECTANCY_HIGH_CONFIDENCE_SAMPLE) return "high";
  if (resolved >= RUN_EXPECTANCY_MEDIUM_CONFIDENCE_SAMPLE) return "medium";
  return "low";
}

export function getWinExpectancyConfidenceBand(sampleSize: number | null | undefined): ConfidenceBand {
  const resolved = sampleSize ?? 0;
  if (resolved >= WIN_EXPECTANCY_HIGH_CONFIDENCE_SAMPLE) return "high";
  if (resolved >= WIN_EXPECTANCY_MEDIUM_CONFIDENCE_SAMPLE) return "medium";
  return "low";
}

export function getOverturnProbabilityConfidenceBand(sampleSize: number | null | undefined): ConfidenceBand {
  const resolved = sampleSize ?? 0;
  if (resolved >= OVERTURN_PROBABILITY_HIGH_CONFIDENCE_SAMPLE) return "high";
  if (resolved >= OVERTURN_PROBABILITY_MEDIUM_CONFIDENCE_SAMPLE) return "medium";
  return "low";
}

export function hasTrustedModelConfidenceBand(confidenceBand: ConfidenceBand | null | undefined) {
  return confidenceBand === "high" || confidenceBand === "medium";
}

export function confidenceBandFromRank(rank: number | null | undefined): ConfidenceBand | null {
  if (!rank || rank <= 0) return null;
  if (rank >= 3) return "high";
  if (rank === 2) return "medium";
  return "low";
}

export function roundRunExpectancy(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) return null;
  return Math.round(value * 1000) / 1000;
}

export function roundWinExpectancy(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) return null;
  return Math.round(value * 10000) / 10000;
}
