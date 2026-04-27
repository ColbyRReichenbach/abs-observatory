"use client";
import { useState, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import { Menu, X } from "lucide-react";
import { AiBSIcon } from "@/components/ui/aibs-icon";
import { NavAuthControls } from "@/components/nav-auth-controls";
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

export function Nav({
  initialMode,
  canAccessAdmin = false,
  viewer = null,
}: {
  initialMode?: ViewMode;
  canAccessAdmin?: boolean;
  viewer?: {
    authProvider: string;
    displayName: string | null;
    avatarUrl: string | null;
    username: string | null;
    favoriteTeamId: number | null;
    isPublic: boolean;
    isVerified: boolean;
  } | null;
}) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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

  const isActiveLink = (match: string) =>
    match === "/"
      ? pathname === "/"
      : pathname.startsWith(match);

  return (
    <header className="fixed left-0 right-0 top-4 z-50 px-3 pointer-events-none sm:top-8 sm:px-6">
      <div className="mx-auto w-full max-w-4xl bg-white/75 backdrop-blur-3xl border border-white/50 rounded-[1.25rem] shadow-[0_4px_12px_rgba(0,0,0,0.02),0_24px_48px_rgba(0,0,0,0.06)] pointer-events-auto px-2 py-2 transition-all hover:shadow-[0_4px_12px_rgba(0,0,0,0.04),0_32px_64px_rgba(0,0,0,0.1)] sm:rounded-2xl sm:px-3">
        <div className="flex items-center justify-between gap-2">
          <Link
            href={withViewModeHref("/", activeMode)}
            className="flex min-w-0 items-center gap-3 px-2 py-2 text-[var(--ink-0)] transition-all hover:opacity-70 sm:gap-4 sm:px-3"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-black text-white shadow-xl shadow-black/10 -ml-1">
              <AiBSIcon size={18} color="#ffffff" />
            </div>
            <span className="hidden border-l border-gray-200 py-1 pl-4 text-[11px] font-black uppercase tracking-widest text-gray-900 sm:block">
              ABS Observatory
            </span>
          </Link>

          <nav className="hidden items-center gap-1 lg:flex">
            {navLinks.map((link) => {
              const isActive = isActiveLink(link.match);

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

          <div className="hidden items-center gap-4 pr-1 lg:flex">
            <NavAuthControls viewer={viewer} activeMode={activeMode} />
            <Suspense fallback={<div className="w-20 h-8 bg-gray-100 animate-pulse rounded-full" />}>
              <ViewModeToggle initialMode={activeMode} />
            </Suspense>
          </div>
          <div className="flex items-center gap-2 lg:hidden">
            <Suspense fallback={<div className="h-8 w-24 animate-pulse rounded-full bg-gray-100" />}>
              <ViewModeToggle initialMode={activeMode} compact />
            </Suspense>
            <button
              type="button"
              aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
              aria-expanded={mobileMenuOpen}
              onClick={() => setMobileMenuOpen((current) => !current)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 shadow-sm transition hover:border-gray-300 hover:text-black"
            >
              {mobileMenuOpen ? <X size={17} /> : <Menu size={17} />}
            </button>
          </div>
        </div>

        {mobileMenuOpen ? (
          <div className="mt-2 border-t border-gray-100 px-2 pb-2 pt-2 lg:hidden">
            <nav className="grid gap-1">
              {navLinks.map((link) => {
                const isActive = isActiveLink(link.match);
                return (
                  <Link
                    key={link.href}
                    href={withViewModeHref(link.href, activeMode)}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`rounded-xl px-3 py-3 text-[11px] font-black uppercase tracking-[0.14em] transition ${
                      isActive ? "bg-black text-white" : "text-gray-500 hover:bg-gray-50 hover:text-black"
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>
            <div className="mt-2 flex items-center justify-between rounded-xl bg-gray-50 px-3 py-3">
              <span className="text-[10px] font-black uppercase tracking-[0.14em] text-gray-400">Account</span>
              <NavAuthControls viewer={viewer} activeMode={activeMode} />
            </div>
          </div>
        ) : null}
      </div>
    </header>
  );
}
