"use client";

import type { ComponentProps } from "react";
import Link, { type LinkProps } from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo } from "react";

import { resolveClientViewMode } from "@/lib/view-mode-client";
import { withViewModeHref } from "@/lib/view-mode-href";

type ModeAwareLinkProps = Omit<ComponentProps<typeof Link>, "href"> & {
  href: string;
};

export function ModeAwareLink({ href, ...props }: ModeAwareLinkProps) {
  const searchParams = useSearchParams();
  const mode = resolveClientViewMode(searchParams);

  const resolvedHref = useMemo(() => {
    if (!href.startsWith("/") || href.startsWith("//")) return href;
    return withViewModeHref(href, mode);
  }, [href, mode]);

  return <Link href={resolvedHref as LinkProps["href"]} {...props} />;
}
