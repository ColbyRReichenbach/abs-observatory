"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/admin/users", label: "Users" },
  { href: "/admin/ai", label: "AI Analytics" },
  { href: "/admin/ai/review", label: "AI Review" },
  { href: "/admin/editorial", label: "Editorial Ops" },
  { href: "/admin/community", label: "Community" },
  { href: "/admin/access", label: "Access" },
];

export function AdminTabs() {
  const pathname = usePathname();
  const activeHref =
    tabs
      .filter((tab) => pathname === tab.href || pathname.startsWith(`${tab.href}/`))
      .sort((left, right) => right.href.length - left.href.length)[0]?.href ?? null;

  return (
    <nav className="flex flex-wrap gap-2 border-b border-black/10 pb-4">
      {tabs.map((tab) => {
        const active = activeHref === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`rounded-full border px-4 py-2 text-[11px] font-black uppercase tracking-[0.14em] transition ${
              active
                ? "border-black bg-black text-white shadow-lg shadow-black/15"
                : "border-black/10 bg-white text-[var(--ink-2)] hover:border-black/20 hover:text-black"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
