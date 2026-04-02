"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";

type DataFreshnessSnapshot = {
  lastFinishedAt: string | null;
  lastStatus: "success" | "failed" | "running" | "unknown";
  liveGameCount: number;
  dataVersion: string;
  pollIntervalMinutes: number;
};

const DATA_ROUTE_PREFIXES = ["/umpires", "/teams", "/game", "/reports", "/query"];
const EXCLUDED_ROUTE_PREFIXES = ["/about", "/articles", "/profile", "/login", "/welcome", "/dev-auth", "/admin", "/u", "/v"];

function isDataRoute(pathname: string) {
  if (pathname === "/") return true;
  if (EXCLUDED_ROUTE_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return false;
  return DATA_ROUTE_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function formatRelative(lastFinishedAt: string | null, nowTick: number) {
  if (!lastFinishedAt) return "No poll yet";
  const diffMs = Math.max(0, nowTick - new Date(lastFinishedAt).getTime());
  const diffMinutes = Math.round(diffMs / 60000);
  if (diffMinutes < 1) return "Updated just now";
  if (diffMinutes === 1) return "Updated 1m ago";
  if (diffMinutes < 60) return `Updated ${diffMinutes}m ago`;
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours === 1) return "Updated 1h ago";
  return `Updated ${diffHours}h ago`;
}

function formatNextUpdate(liveGameCount: number, pollIntervalMinutes: number, nowTick: number) {
  if (liveGameCount < 1) return "Idle until live games";

  const now = new Date(nowTick);
  const next = new Date(now);
  next.setSeconds(0, 0);
  const interval = Math.max(1, Math.floor(pollIntervalMinutes || 5));
  const nextMinute = (Math.floor(now.getMinutes() / interval) + 1) * interval;
  if (nextMinute >= 60) {
    next.setHours(next.getHours() + Math.floor(nextMinute / 60), nextMinute % 60, 0, 0);
  } else {
    next.setMinutes(nextMinute, 0, 0);
  }

  return `Next ${next.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/New_York",
    timeZoneName: "short",
  })}`;
}

export function DataFreshnessBadge() {
  const pathname = usePathname();
  const [snapshot, setSnapshot] = useState<DataFreshnessSnapshot | null>(null);
  const [nowTick, setNowTick] = useState(() => Date.now());

  const enabled = isDataRoute(pathname);

  useEffect(() => {
    if (!enabled) return undefined;

    let cancelled = false;

    const load = async () => {
      try {
        const response = await fetch("/api/data-freshness", { cache: "no-store" });
        if (!response.ok) return;
        const payload = (await response.json()) as DataFreshnessSnapshot;
        if (!cancelled) {
          setSnapshot(payload);
          setNowTick(Date.now());
        }
      } catch {
        // Silent fallback: the rest of the page should not care if freshness metadata fails.
      }
    };

    void load();
    const refreshInterval = window.setInterval(load, 60_000);
    const tickInterval = window.setInterval(() => setNowTick(Date.now()), 30_000);

    return () => {
      cancelled = true;
      window.clearInterval(refreshInterval);
      window.clearInterval(tickInterval);
    };
  }, [enabled]);

  const content = useMemo(() => {
    if (!snapshot) return null;
    return {
      primary: formatRelative(snapshot.lastFinishedAt, nowTick),
      secondary: formatNextUpdate(snapshot.liveGameCount, snapshot.pollIntervalMinutes, nowTick),
      tone:
        snapshot.lastStatus === "failed"
          ? "bg-amber-500"
          : snapshot.liveGameCount > 0
            ? "bg-emerald-500"
            : "bg-slate-400",
    };
  }, [nowTick, snapshot]);

  if (!enabled || !content) return null;

  return (
    <div className="hidden xl:flex items-center gap-3 rounded-full border border-gray-200/80 bg-white/80 px-3 py-2 shadow-sm">
      <span className={`h-2 w-2 rounded-full ${content.tone}`} />
      <div className="flex flex-col leading-tight">
        <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-gray-700">
          {content.primary}
        </span>
        <span className="text-[10px] font-medium uppercase tracking-[0.08em] text-gray-400">
          {content.secondary}
        </span>
      </div>
    </div>
  );
}
