"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

import { readCookieViewMode, writeCookieViewMode } from "@/lib/view-mode-client";

export function ViewModeSync() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const current = params.get("view");
    if (current === "fan" || current === "org") {
      if (readCookieViewMode() !== current) {
        writeCookieViewMode(current);
      }
      return;
    }

    const cookieMode = readCookieViewMode();
    if (!cookieMode) return;

    params.set("view", cookieMode);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [pathname, router]);

  return null;
}
