export function normalizeAuthNextHref(rawNextHref: string | null | undefined, fallback = "/profile"): string {
  if (!rawNextHref) return fallback;
  return rawNextHref.startsWith("/") && !rawNextHref.startsWith("//") ? rawNextHref : fallback;
}
