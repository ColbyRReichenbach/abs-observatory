"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { formatDisplayTime, getDisplayTimeZone } from "@/lib/display-time";

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

function formatNextUpdate(liveGameCount: number, pollIntervalMinutes: number, nowTick: number, timeZone: string) {
  if (liveGameCount < 1) return "Idle until live games";

  const now = new Date(nowTick);
  const next = new Date(now);
  next.setSeconds(0, 0);
  const interval = Math.max(1, Math.floor(pollIntervalMinutes || 10));
  const nextMinute = (Math.floor(now.getMinutes() / interval) + 1) * interval;
  if (nextMinute >= 60) {
    next.setHours(next.getHours() + Math.floor(nextMinute / 60), nextMinute % 60, 0, 0);
  } else {
    next.setMinutes(nextMinute, 0, 0);
  }

  return `Next ${formatDisplayTime(next, {
    locale: undefined,
    timeZone,
    showDate: false,
    showTime: true,
  })}`;
}

export function DataFreshnessBadge() {
  const pathname = usePathname();
  const [snapshot, setSnapshot] = useState<DataFreshnessSnapshot | null>(null);
  const [nowTick, setNowTick] = useState(() => Date.now());
  const timeZone = getDisplayTimeZone();

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
    const activelyPolling = snapshot.liveGameCount > 0;
    const isFailed = snapshot.lastStatus === "failed";
    return {
      detail: activelyPolling
        ? `${formatRelative(snapshot.lastFinishedAt, nowTick)} · ${formatNextUpdate(snapshot.liveGameCount, snapshot.pollIntervalMinutes, nowTick, timeZone)}`
        : formatRelative(snapshot.lastFinishedAt, nowTick),
      dotTone: isFailed ? "bg-red-600" : activelyPolling ? "bg-emerald-500" : "bg-red-500",
    };
  }, [nowTick, snapshot, timeZone]);

  if (!enabled || !content) return null;

  return (
    <div className="pointer-events-none fixed right-5 top-[2.75rem] z-40 hidden xl:block">
      <p className="flex items-center gap-1.5 font-mono text-[7px] font-medium tracking-[0.05em] text-[rgba(17,24,39,0.52)]">
        <span className={`h-1.5 w-1.5 rounded-full ${content.dotTone}`} />
        <span suppressHydrationWarning>{content.detail}</span>
      </p>
    </div>
  );
}
