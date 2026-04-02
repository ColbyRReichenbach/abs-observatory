"use client";
import { useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import { AiBSIcon } from "@/components/ui/aibs-icon";
import { DataFreshnessBadge } from "@/components/data-freshness-badge";
import { ViewModeToggle } from "@/components/ui/view-mode-toggle";
import type { ViewMode } from "@/lib/view-mode";
import { resolveClientViewMode } from "@/lib/view-mode-client";
import { withViewModeHref } from "@/lib/view-mode-href";

const VIEW_MODE_EVENT = "aibs:view-mode-change";

function readClientMode(): ViewMode | undefined {
  if (typeof window === "undefined") return undefined;
  return resolveClientViewMode(new URLSearchParams(window.location.search)) ?? undefined;
}

const links = [
  { href: "/", label: "Live Feed", match: "/" },
  { href: "/umpires", label: "Umpire Stats", match: "/umpires" },
  { href: "/teams", label: "Team Stats", match: "/teams" },
  { href: "/articles", label: "Articles", match: "/articles" },
  { href: "/about", label: "About", match: "/about" },
];

export function Nav({ initialMode, canAccessAdmin = false }: { initialMode?: ViewMode; canAccessAdmin?: boolean }) {
  const pathname = usePathname();
  const activeMode = useSyncExternalStore(
    (onStoreChange) => {
      if (typeof window === "undefined") return () => {};

      const handleViewModeChange = () => onStoreChange();
      window.addEventListener(VIEW_MODE_EVENT, handleViewModeChange as EventListener);
      window.addEventListener("popstate", onStoreChange);

      return () => {
        window.removeEventListener(VIEW_MODE_EVENT, handleViewModeChange as EventListener);
        window.removeEventListener("popstate", onStoreChange);
      };
    },
    () => readClientMode() ?? initialMode,
    () => initialMode,
  );
  const navLinks = canAccessAdmin
    ? [...links, { href: "/admin/ai", label: "Admin", match: "/admin" }]
    : links;

  return (
    <header className="fixed top-8 left-0 right-0 z-50 px-6 pointer-events-none">
      <div className="mx-auto max-w-4xl bg-white/70 backdrop-blur-3xl border border-white/50 rounded-2xl shadow-[0_4px_12px_rgba(0,0,0,0.02),0_24px_48px_rgba(0,0,0,0.06)] pointer-events-auto flex items-center justify-between px-3 py-2 transition-all hover:shadow-[0_4px_12px_rgba(0,0,0,0.04),0_32px_64px_rgba(0,0,0,0.1)]">
        <div className="flex items-center gap-8">
          <Link
            href={withViewModeHref("/", activeMode)}
            className="flex items-center gap-4 px-3 py-2 text-[var(--ink-0)] transition-all hover:opacity-70"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-black text-white shadow-xl shadow-black/10 -ml-1">
              <AiBSIcon size={18} color="#ffffff" />
            </div>
            <span className="font-black text-[11px] uppercase tracking-widest hidden lg:block text-gray-900 border-l border-gray-200 pl-4 py-1">
              ABS Observatory
            </span>
          </Link>

          <nav className="flex items-center gap-1">
            {navLinks.map((link) => {
              const isActive =
                link.match === "/"
                  ? pathname === "/"
                  : pathname.startsWith(link.match);

              return (
                <Link
                  key={link.href}
                  href={withViewModeHref(link.href, activeMode)}
                  className={`relative px-4 py-2 text-[10px] uppercase tracking-[0.1em] transition-all rounded-lg ${isActive
                    ? "text-black font-black"
                    : "text-gray-400 hover:text-black font-bold"
                    }`}
                >
                  <span className="relative z-10">{link.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-4 pr-1">
          <DataFreshnessBadge />
          <Suspense fallback={<div className="w-20 h-8 bg-gray-100 animate-pulse rounded-full" />}>
            <ViewModeToggle initialMode={activeMode} />
          </Suspense>
        </div>
      </div>
    </header>
  );
}
