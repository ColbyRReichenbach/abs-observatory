import type { ViewMode } from "@/lib/view-mode";
import { withViewModeHref } from "@/lib/view-mode-href";

export function normalizeAuthNextHref(rawNextHref: string | null | undefined, fallback = "/profile"): string {
  if (!rawNextHref) return fallback;
  return rawNextHref.startsWith("/") && !rawNextHref.startsWith("//") ? rawNextHref : fallback;
}

export function resolveAuthNextHref(
  rawNextHref: string | null | undefined,
  viewMode?: ViewMode | null,
  fallback = "/profile",
): string {
  const nextHref = normalizeAuthNextHref(rawNextHref, fallback);

  try {
    const url = new URL(nextHref, "https://abs-observatory.local");
    if (url.searchParams.has("view")) {
      return nextHref;
    }
  } catch {
    return withViewModeHref(fallback, viewMode);
  }

  return withViewModeHref(nextHref, viewMode);
}
