"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useCallback, useTransition } from "react";
import type { ViewMode } from "@/lib/view-mode";
import { resolveClientViewMode, writeCookieViewMode } from "@/lib/view-mode-client";

const VIEW_MODE_EVENT = "aibs:view-mode-change";

/**
 * S8: Client toggle for Fan/Org mode.
 * Updates the cookie and the URL param so the server resolves the new mode on next request.
 */
export function ViewModeToggle({
    initialMode,
    compact = false,
}: {
    initialMode?: ViewMode;
    compact?: boolean;
}) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [isPending, startTransition] = useTransition();

    // Deduce active mode: URL param > initialMode > cookie > "fan"
    const activeMode: ViewMode = resolveClientViewMode(searchParams) ?? initialMode ?? "fan";

    const setMode = useCallback((next: ViewMode) => {
        if (next === activeMode) return;

        writeCookieViewMode(next);
        window.dispatchEvent(new CustomEvent(VIEW_MODE_EVENT, { detail: next }));

        const params = new URLSearchParams(searchParams.toString());
        params.set("view", next);
        startTransition(() => {
            router.push(`${pathname}?${params.toString()}`);
        });
    }, [activeMode, pathname, searchParams, router]);

    const toggle = useCallback(() => {
        const next: ViewMode = activeMode === "fan" ? "org" : "fan";
        setMode(next);
    }, [activeMode, setMode]);

    const mode = activeMode;

    return (
        <div
            className={`group relative flex items-center rounded-full border border-gray-200 bg-white px-1 py-1 font-black uppercase tracking-widest shadow-sm transition-all hover:border-gray-300 hover:shadow-md ${
                compact ? "gap-1 text-[9px]" : "gap-1 text-[9px] sm:gap-2 sm:text-[10px]"
            }`}
            aria-label="View mode"
            role="tablist"
        >
            <button
                type="button"
                role="tab"
                aria-selected={mode === "fan"}
                onClick={() => setMode("fan")}
                disabled={isPending}
                className={`rounded-full py-1.5 transition-all disabled:opacity-50 ${
                    compact ? "px-2.5" : "px-2.5 sm:px-3"
                } ${mode === "fan"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-gray-400 hover:text-gray-600"
                    }`}
                title="Switch to Fan mode"
            >
                Fan
            </button>
            <button
                type="button"
                role="tab"
                aria-selected={mode === "org"}
                onClick={() => setMode("org")}
                disabled={isPending}
                className={`rounded-full py-1.5 transition-all disabled:opacity-50 ${
                    compact ? "px-2.5" : "px-2.5 sm:px-3"
                } ${mode === "org"
                    ? "bg-gray-900 text-white shadow-sm"
                    : "text-gray-400 hover:text-gray-600"
                    }`}
                title="Switch to Org mode"
            >
                Org
            </button>
        </div>
    );
}
