"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useCallback, useTransition } from "react";
import type { ViewMode } from "@/lib/view-mode";

/**
 * S8: Client toggle for Fan/Org mode.
 * Updates the cookie and the URL param so the server resolves the new mode on next request.
 */
export function ViewModeToggle({ initialMode }: { initialMode?: ViewMode }) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [isPending, startTransition] = useTransition();

    // Deduce active mode: URL param > initialMode > cookie > "fan"
    const paramMode = searchParams.get("view");
    const activeMode: ViewMode = (paramMode === "fan" || paramMode === "org")
        ? paramMode
        : initialMode || "fan";

    const toggle = useCallback(() => {
        const next: ViewMode = activeMode === "fan" ? "org" : "fan";

        // Update cookie
        document.cookie = `aibs_view_mode=${next};path=/;max-age=${60 * 60 * 24 * 365};SameSite=Lax`;

        // Update URL to include ?view=
        const params = new URLSearchParams(searchParams.toString());
        params.set("view", next);
        startTransition(() => {
            router.push(`${pathname}?${params.toString()}`);
        });
    }, [activeMode, pathname, searchParams, router]);

    const mode = activeMode;

    return (
        <button
            onClick={toggle}
            disabled={isPending}
            className="group relative flex items-center gap-2 rounded-full border border-gray-200 bg-white px-1 py-1 text-[10px] font-black uppercase tracking-widest shadow-sm transition-all hover:shadow-md hover:border-gray-300 disabled:opacity-50"
            title={`Switch to ${mode === "fan" ? "Org" : "Fan"} mode`}
        >
            <span
                className={`rounded-full px-3 py-1.5 transition-all ${mode === "fan"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-gray-400 hover:text-gray-600"
                    }`}
            >
                Fan
            </span>
            <span
                className={`rounded-full px-3 py-1.5 transition-all ${mode === "org"
                    ? "bg-gray-900 text-white shadow-sm"
                    : "text-gray-400 hover:text-gray-600"
                    }`}
            >
                Org
            </span>
        </button>
    );
}
