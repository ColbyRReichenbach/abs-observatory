import type { ConfidenceBand } from "@/lib/types";

export const RUN_EXPECTANCY_HIGH_CONFIDENCE_SAMPLE = 500;
export const RUN_EXPECTANCY_MEDIUM_CONFIDENCE_SAMPLE = 150;

export function getRunEnvironmentConfidenceBand(sampleSize: number | null | undefined): ConfidenceBand {
  const resolved = sampleSize ?? 0;
  if (resolved >= RUN_EXPECTANCY_HIGH_CONFIDENCE_SAMPLE) return "high";
  if (resolved >= RUN_EXPECTANCY_MEDIUM_CONFIDENCE_SAMPLE) return "medium";
  return "low";
}

export function roundRunExpectancy(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) return null;
  return Math.round(value * 1000) / 1000;
}
