import type { ReadonlyURLSearchParams } from "next/navigation";

import type { ViewMode } from "@/lib/view-mode";

const COOKIE_NAME = "aibs_view_mode";

export function readCookieViewMode(): ViewMode | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=(fan|org)(?:;|$)`));
  return match?.[1] === "fan" || match?.[1] === "org" ? match[1] : null;
}

export function writeCookieViewMode(mode: ViewMode) {
  if (typeof document === "undefined") return;
  document.cookie = `${COOKIE_NAME}=${mode};path=/;max-age=${60 * 60 * 24 * 365};SameSite=Lax`;
}

export function resolveClientViewMode(
  searchParams?: URLSearchParams | ReadonlyURLSearchParams | null,
): ViewMode | null {
  const requestedMode = searchParams?.get("view");
  if (requestedMode === "fan" || requestedMode === "org") return requestedMode;
  return readCookieViewMode();
}
