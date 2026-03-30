"use client";

import type { ComponentProps } from "react";
import Link, { type LinkProps } from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo } from "react";

import type { ViewMode } from "@/lib/view-mode";
import { withViewModeHref } from "@/lib/view-mode-href";

type ModeAwareLinkProps = Omit<ComponentProps<typeof Link>, "href"> & {
  href: string;
};

function readCookieMode(): ViewMode | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|;\s*)aibs_view_mode=(fan|org)(?:;|$)/);
  return match?.[1] === "fan" || match?.[1] === "org" ? match[1] : null;
}

export function ModeAwareLink({ href, ...props }: ModeAwareLinkProps) {
  const searchParams = useSearchParams();
  const mode = (searchParams?.get("view") as ViewMode | null) ?? readCookieMode();

  const resolvedHref = useMemo(() => {
    if (!href.startsWith("/") || href.startsWith("//")) return href;
    return withViewModeHref(href, mode);
  }, [href, mode]);

  return <Link href={resolvedHref as LinkProps["href"]} {...props} />;
}
