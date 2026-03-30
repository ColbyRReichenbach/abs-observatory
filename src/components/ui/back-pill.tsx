"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { resolveClientViewMode } from "@/lib/view-mode-client";
import { withViewModeHref } from "@/lib/view-mode-href";

type BackPillProps = {
    /** Label text shown after the chevron, e.g. "Teams" */
    label: string;
    /** Hard link destination. Mutually exclusive with useHistory. */
    href?: string;
    /** If true, calls router.back() instead of navigating to href. */
    useHistory?: boolean;
};

/**
 * Contextual back-navigation pill.
 * Positioned `absolute top-6 left-6` by the consuming page.
 *
 * Styling matches the mandatory design spec:
 * - bg-white/70, backdrop-blur, rounded-full
 * - text-[10px] font-black uppercase tracking-[0.08em]
 * - ChevronLeft icon animates translateX(-2px) on hover
 */
export function BackPill({ label, href, useHistory }: BackPillProps) {
    const searchParams = useSearchParams();
    const activeMode = resolveClientViewMode(searchParams);

    const inner = (
        <>
            <ChevronLeft
                size={12}
                className="transition-transform duration-[var(--motion-fast)] ease-[var(--motion-apple-ease)] group-hover:-translate-x-0.5"
                aria-hidden
            />
            <span>{label}</span>
        </>
    );

    const className =
        "group inline-flex items-center gap-1.5 rounded-full border border-[var(--border-subtle)] bg-white/70 px-4 py-2 text-[10px] font-black uppercase tracking-[0.08em] text-[var(--ink-2)] backdrop-blur-sm transition-all duration-[var(--motion-fast)] ease-[var(--motion-apple-ease)] hover:border-[var(--border-medium)] hover:bg-white hover:text-[var(--ink-0)]";

    if (useHistory) {
        return (
            <button
                type="button"
                onClick={() => {
                    if (typeof window !== "undefined") {
                        window.history.back();
                    }
                }}
                className={className}
            >
                {inner}
            </button>
        );
    }

    return (
        <Link href={withViewModeHref(href ?? "/", activeMode)} className={className}>
            {inner}
        </Link>
    );
}
