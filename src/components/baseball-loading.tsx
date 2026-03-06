export function ScoreboardLoadingCard() {
  return (
    <div className="panel p-0 overflow-hidden">
      <div className="h-[3px] animate-shimmer" />
      <div className="border-b border-[var(--border-subtle)] px-4 py-2.5 flex items-center justify-between">
        <div className="h-2.5 w-16 rounded bg-[var(--surface-3)]" />
        <div className="h-4 w-12 rounded-full bg-[var(--surface-3)]" />
      </div>
      <div className="px-3 py-3 space-y-3">
        <div className="flex items-center gap-3">
          <div className="h-5 w-5 rounded bg-[var(--surface-3)]" />
          <div className="h-4 w-16 rounded bg-[var(--surface-3)]" />
          <div className="ml-auto h-6 w-6 rounded bg-[var(--surface-3)]" />
        </div>
        <div className="h-px bg-[var(--border-subtle)]" />
        <div className="flex items-center gap-3">
          <div className="h-5 w-5 rounded bg-[var(--surface-3)]" />
          <div className="h-4 w-16 rounded bg-[var(--surface-3)]" />
          <div className="ml-auto h-6 w-6 rounded bg-[var(--surface-3)]" />
        </div>
      </div>
      <div className="border-t border-[var(--border-subtle)] px-4 py-2.5">
        <div className="h-2.5 w-28 rounded bg-[var(--surface-3)]" />
      </div>
    </div>
  );
}

export function StrikeZoneLoading() {
  return (
    <div className="panel overflow-hidden">
      <div className="border-b border-[var(--border-subtle)] px-4 py-3">
        <div className="h-2.5 w-32 rounded bg-[var(--surface-3)]" />
      </div>
      <div className="p-4">
        <div className="h-[360px] rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface-infield)] animate-shimmer" />
      </div>
      <div className="border-t border-[var(--border-subtle)] px-4 py-3 flex gap-4">
        <div className="h-2.5 w-20 rounded bg-[var(--surface-3)]" />
        <div className="h-2.5 w-20 rounded bg-[var(--surface-3)]" />
        <div className="h-2.5 w-20 rounded bg-[var(--surface-3)]" />
      </div>
    </div>
  );
}

export function ChartLoadingPanel() {
  return (
    <div className="panel p-5">
      <div className="h-2.5 w-36 rounded bg-[var(--surface-3)]" />
      <div className="mt-4 space-y-2">
        <div className="h-16 rounded-[var(--radius-md)] bg-[var(--surface-infield)] animate-shimmer" />
        <div className="h-16 rounded-[var(--radius-md)] bg-[var(--surface-infield)] animate-shimmer" style={{ animationDelay: "200ms" }} />
        <div className="h-16 rounded-[var(--radius-md)] bg-[var(--surface-infield)] animate-shimmer" style={{ animationDelay: "400ms" }} />
      </div>
    </div>
  );
}

export function StatCardLoading() {
  return (
    <div className="panel p-4">
      <div className="h-2 w-16 rounded bg-[var(--surface-3)]" />
      <div className="mt-3 h-8 w-14 rounded bg-[var(--surface-3)]" />
    </div>
  );
}
