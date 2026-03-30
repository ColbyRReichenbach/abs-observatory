"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";

import { readCookieViewMode, writeCookieViewMode } from "@/lib/view-mode-client";

export function ViewModeSync() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    const current = params.get("view");
    if (current === "fan" || current === "org") {
      writeCookieViewMode(current);
      return;
    }

    const cookieMode = readCookieViewMode();
    if (!cookieMode) return;

    params.set("view", cookieMode);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [pathname, router, searchParams]);

  return null;
}
