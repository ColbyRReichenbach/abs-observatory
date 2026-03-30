"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

import type { ViewMode } from "@/lib/view-mode";

function readCookieMode(): ViewMode | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|;\s*)aibs_view_mode=(fan|org)(?:;|$)/);
  return match?.[1] === "fan" || match?.[1] === "org" ? match[1] : null;
}

export function ViewModeSync() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const current = params.get("view");
    if (current === "fan" || current === "org") return;

    const cookieMode = readCookieMode();
    if (!cookieMode) return;

    params.set("view", cookieMode);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [pathname, router]);

  return null;
}
