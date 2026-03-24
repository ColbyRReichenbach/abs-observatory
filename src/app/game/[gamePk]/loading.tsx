import { ChartLoadingPanel, StatCardLoading, StrikeZoneLoading } from "@/components/baseball-loading";

export default function Loading() {
  return (
    <main className="mx-auto max-w-7xl px-6 py-8">
      {/* Hero skeleton */}
      <div className="panel relative overflow-hidden p-8">
        <div className="h-2.5 w-20 rounded bg-[var(--surface-3)]" />
        <div className="mt-3 h-10 w-80 max-w-full rounded bg-[var(--surface-3)]" />
        <div className="mt-3 h-3 w-48 rounded bg-[var(--surface-3)]" />
      </div>

      {/* Scoreboard skeleton */}
      <div className="mt-4 panel overflow-hidden">
        <div className="h-[3px] animate-shimmer" />
        <div className="px-5 py-3 border-b border-[var(--border-subtle)] flex items-center gap-3">
          <div className="h-5 w-12 rounded-full bg-[var(--surface-3)]" />
          <div className="h-3 w-24 rounded bg-[var(--surface-3)]" />
        </div>
        <div className="px-4 py-4 space-y-3">
          <div className="h-8 rounded bg-[var(--surface-infield)]" />
          <div className="h-8 rounded bg-[var(--surface-infield)]" />
        </div>
      </div>

      {/* Explorer skeleton */}
      <section className="mt-6 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <StrikeZoneLoading />
        <ChartLoadingPanel />
      </section>

      {/* Preview skeleton */}
      <section className="mt-6 grid gap-3 md:grid-cols-2">
        <StatCardLoading />
        <StatCardLoading />
      </section>
    </main>
  );
}
