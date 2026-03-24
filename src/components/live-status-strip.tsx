"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import type { GameLiveStatus } from "@/lib/types";

export function LiveStatusStrip({ gamePk, initial }: { gamePk: number; initial: GameLiveStatus | null }) {
  const isAuditMode = typeof window !== "undefined" && window.location.search.includes("audit=1");
  const [status, setStatus] = useState<GameLiveStatus | null>(initial);
  const [now, setNow] = useState<number>(Date.now());
  const [isLoading, setIsLoading] = useState(!initial);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading((prev) => prev || !status);
    try {
      const res = await fetch(`/api/games/${gamePk}/live-status`, { cache: "no-store" });
      if (!res.ok) {
        setError(`Live feed unavailable (${res.status}).`);
        return;
      }
      const payload = (await res.json()) as { status: GameLiveStatus };
      setStatus(payload.status);
      setError(null);
    } catch {
      setError("Unable to refresh live feed.");
    } finally {
      setIsLoading(false);
    }
  }, [gamePk, status]);

  useEffect(() => {
    if (isAuditMode) return;
    refresh();
  }, [refresh, isAuditMode]);

  useEffect(() => {
    if (isAuditMode) return;
    const pollMs = status?.statusAbstract?.toLowerCase() === "live" ? 30_000 : 120_000;
    const interval = setInterval(refresh, pollMs);
    return () => {
      clearInterval(interval);
    };
  }, [refresh, status?.statusAbstract, isAuditMode]);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 5_000);
    return () => clearInterval(interval);
  }, []);

  const cadenceBuckets = useMemo(() => computeCadenceBuckets(status?.recentChallengeEvents ?? [], now), [status?.recentChallengeEvents, now]);

  if (isLoading && !status) {
    return (
      <div className="panel animate-shimmer px-5 py-4 text-sm text-[var(--ink-3)]">
        Pulling live game state...
      </div>
    );
  }

  if (!status) {
    return (
      <div className="panel border-[var(--accent-warm)]/30 bg-[var(--accent-warm-soft)] px-5 py-4 text-sm text-[var(--accent-warm)]">
        Live status unavailable.
        <button onClick={refresh} className="ml-3 chip-link text-[10px]">
          Retry
        </button>
      </div>
    );
  }

  const stale = isStaleFeed(status.updatedAt, now);

  return (
    <div className="panel overflow-hidden">
      {/* Alerts */}
      {error ? (
        <div className="border-b border-[var(--state-confirmed)]/20 bg-[var(--state-confirmed)]/8 px-5 py-2.5 text-xs text-[#fca5a5]">
          {error}
          <button onClick={refresh} className="ml-2 underline underline-offset-2 hover:no-underline">Retry</button>
        </div>
      ) : null}
      {stale ? (
        <div className="border-b border-[var(--accent-warm)]/20 bg-[var(--accent-warm-soft)] px-5 py-2.5 text-xs text-[var(--accent-warm)]">
          Feed delayed. Showing last known state.
        </div>
      ) : null}

      <div className="px-5 py-4">
        {/* Status row */}
        <div className="mb-3 flex flex-wrap items-center gap-3">
          {status.statusAbstract?.toLowerCase() === "live" ? (
            <span className="status-chip status-chip-live">
              <span className="h-1.5 w-1.5 rounded-full bg-current animate-live-pulse" />
              Live
            </span>
          ) : (
            <span className="status-chip status-chip-pending">
              {status.statusAbstract ?? "Unknown"}
            </span>
          )}
          <span className="text-[10px] uppercase tracking-[0.08em] text-[var(--ink-3)]">
            Updated {formatTimeAgo(status.updatedAt, now)}
          </span>
        </div>

        {/* Cadence sparkline */}
        <div className="mb-4">
          <CadenceSparkline buckets={cadenceBuckets} />
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          <Stat label="Inning" value={status.inning ? `${status.halfInning ?? ""} ${status.inning}` : "-"} />
          <Stat label="Count" value={`${status.balls ?? 0}-${status.strikes ?? 0}`} />
          <Stat label="Outs" value={`${status.outs ?? 0}`} />
          <Stat label="Score" value={`${status.awayScore ?? 0} - ${status.homeScore ?? 0}`} />
          <Stat label="Away ABS" value={`${status.awayRemaining}`} />
          <Stat label="Home ABS" value={`${status.homeRemaining}`} />
        </div>
      </div>
    </div>
  );
}

function CadenceSparkline({ buckets }: { buckets: number[] }) {
  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface-infield)] p-3">
      <div className="mb-2 text-[10px] uppercase tracking-[0.12em] text-[var(--ink-3)]">Challenge cadence (last 10m)</div>
      <div className="flex items-end gap-1">
        {buckets.map((v, i) => {
          const color = v === 2 ? "bg-[var(--accent-primary)]" : v === 1 ? "bg-[var(--state-confirmed)]" : "bg-[var(--border-medium)]";
          const height = v === 0 ? "h-2" : v === 1 ? "h-3" : "h-5";
          return (
            <span
              key={i}
              className={`flex-1 rounded-sm transition-all duration-[var(--motion-mid)] ${color} ${height}`}
            />
          );
        })}
      </div>
    </div>
  );
}

export function computeCadenceBuckets(events: Array<{ challengedAt: string | null; isOverturned: boolean }>, nowMs: number) {
  const buckets = Array.from({ length: 10 }, () => 0);
  if (nowMs <= 0) return buckets;
  for (const event of events) {
    if (!event.challengedAt) continue;
    const ts = new Date(event.challengedAt).getTime();
    if (Number.isNaN(ts)) continue;
    const deltaSec = Math.floor((nowMs - ts) / 1000);
    if (deltaSec < 0 || deltaSec > 600) continue;
    const bucket = 9 - Math.floor(deltaSec / 60);
    if (bucket < 0 || bucket > 9) continue;
    buckets[bucket] = Math.max(buckets[bucket], event.isOverturned ? 2 : 1);
  }
  return buckets;
}

export function isStaleFeed(updatedAt: string | null, nowMs: number) {
  if (!updatedAt) return true;
  const ts = new Date(updatedAt).getTime();
  if (Number.isNaN(ts) || nowMs <= 0) return true;
  return nowMs - ts > 180_000;
}

function formatTimeAgo(iso: string | null, nowMs: number): string {
  if (nowMs <= 0) return "syncing...";
  if (!iso) return "unknown";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "unknown";
  const delta = Math.max(0, Math.floor((nowMs - then) / 1000));
  if (delta < 5) return "just now";
  if (delta < 60) return `${delta}s ago`;
  const mins = Math.floor(delta / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  return `${hours}h ago`;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface-infield)] px-3 py-2">
      <span className="block text-[9px] uppercase tracking-[0.1em] text-[var(--ink-3)]">{label}</span>
      <strong className="block mt-0.5 font-display text-lg text-[var(--ink-0)]">{value}</strong>
    </div>
  );
}
