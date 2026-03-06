import type { RangeKey } from "@/lib/types";

export const RANGE_OPTIONS: Array<{ key: RangeKey; label: string }> = [
  { key: "7d", label: "Last 7D" },
  { key: "30d", label: "Last 30D" },
  { key: "season", label: "Season" },
  { key: "all", label: "All" },
];

export function parseRange(value: string | undefined): RangeKey {
  if (value === "7d" || value === "30d" || value === "season" || value === "all") return value;
  return "season";
}

export function buildRangeHref(
  basePath: string,
  range: RangeKey,
  currentParams?: Record<string, string | undefined>,
): string {
  const params = new URLSearchParams();
  if (currentParams) {
    for (const [key, value] of Object.entries(currentParams)) {
      if (value && key !== "range") params.set(key, value);
    }
  }
  params.set("range", range);
  return `${basePath}?${params.toString()}`;
}

