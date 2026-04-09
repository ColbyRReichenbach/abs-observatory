"use client";

import { hasTrustedModelConfidenceBand } from "@/lib/server/run-environment";
import type { TeamDecisionValueReport, TeamDecisionWindowEntry } from "@/lib/types";
import type { ViewMode } from "@/lib/view-mode";

export function TeamDecisionWindowBoard({
  report,
  viewMode,
  teamColor,
}: {
  report: TeamDecisionValueReport;
  viewMode: ViewMode;
  teamColor: string;
}) {
  const strongest = report.strongestWindow;
  const weakest = report.weakestWindow;
  const weakestIsNegative = (weakest?.decisionSurplus ?? 0) < -0.0005;
  const negativeBottomWindows = report.bottomWindows.filter((entry) => (entry.decisionSurplus ?? 0) < -0.0005);
  const bottomWindowEntries = negativeBottomWindows.length > 0 ? negativeBottomWindows : report.bottomWindows;

  return (
    <section className="mt-8">
      <div className="panel p-8">
        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h4 className="mb-1 text-[10px] font-bold uppercase tracking-widest text-blue-500">Decision Windows</h4>
            <p className="text-2xl font-display leading-none text-gray-900">
              {viewMode === "org" ? (
                <>
                  Best And Worst <span className="text-gray-400">Decision Spots</span>
                </>
              ) : (
                <>
                  Where They Challenge <span className="text-gray-400">Well Or Poorly</span>
                </>
              )}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Chip label={`${report.positiveWindowCount} positive windows`} />
            <Chip label={`${report.negativeWindowCount} negative windows`} />
            <Chip label={`${report.neutralWindowCount} neutral windows`} />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <HighlightCard
            eyebrow={viewMode === "org" ? "Best Review Window" : "Best Challenge Window"}
            entry={strongest}
            teamColor={teamColor}
            fallback="No trusted positive decision window has stabilized yet."
          />
          <HighlightCard
            eyebrow={
              weakestIsNegative
                ? viewMode === "org"
                  ? "Most Wasteful Window"
                  : "Shakiest Challenge Window"
                : viewMode === "org"
                  ? "Softest Decision Window"
                  : "Least Efficient Window"
            }
            entry={weakest}
            teamColor={teamColor}
            fallback="No clearly negative decision window has separated from the pack yet."
          />
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <WindowList
            title={viewMode === "org" ? "Value-Capturing Windows" : "Strong Challenge Windows"}
            entries={report.topWindows}
            empty="No positive windows have stabilized yet."
            tone="emerald"
          />
          <WindowList
            title={
              negativeBottomWindows.length > 0
                ? viewMode === "org"
                  ? "Value-Leaking Windows"
                  : "Riskier Challenge Windows"
                : viewMode === "org"
                  ? "Lower-Yield Windows"
                  : "Softer Challenge Windows"
            }
            entries={bottomWindowEntries}
            empty="No costly windows have stabilized yet."
            tone="amber"
          />
        </div>
      </div>
    </section>
  );
}

function HighlightCard({
  eyebrow,
  entry,
  teamColor,
  fallback,
}: {
  eyebrow: string;
  entry: TeamDecisionWindowEntry | null;
  teamColor: string;
  fallback: string;
}) {
  const trusted = entry ? hasTrustedModelConfidenceBand(entry.modelConfidence) : false;

  return (
    <div className="rounded-[1.5rem] border border-gray-100 bg-white p-5">
      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--ink-3)]">{eyebrow}</p>
      {entry ? (
        <>
          <p className="mt-3 text-xl font-display leading-tight text-[var(--ink-0)]" style={{ color: teamColor }}>
            {entry.label}
          </p>
          <p className="mt-2 text-sm leading-7 text-[var(--ink-2)]">
            {trusted
              ? `${entry.challenges} trusted reviews. ${formatWinValue(entry.decisionSurplus)} decision surplus with ${formatShare(entry.capturedValueShare)} higher-value share.`
              : `${entry.challenges} trusted reviews so far, but this window still needs a larger sample before it becomes a hard decision read.`}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Chip label={`${entry.challenges} trusted reviews`} />
            <Chip label={`${formatWinValue(entry.averageExpectedChallengeValue)} expected`} />
            <Chip label={`${formatWinValue(entry.averageRealizedChallengeValue)} realized`} />
          </div>
        </>
      ) : (
        <p className="mt-3 text-sm leading-7 text-[var(--ink-2)]">{fallback}</p>
      )}
    </div>
  );
}

function WindowList({
  title,
  entries,
  empty,
  tone,
}: {
  title: string;
  entries: TeamDecisionWindowEntry[];
  empty: string;
  tone: "emerald" | "amber";
}) {
  return (
    <div className="rounded-[1.5rem] border border-gray-100 bg-[var(--surface-infield)] p-5">
      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--ink-3)]">{title}</p>
      <div className="mt-4 space-y-3">
        {entries.length === 0 ? (
          <p className="text-sm text-[var(--ink-3)]">{empty}</p>
        ) : (
          entries.map((entry) => (
            <div key={entry.label} className="rounded-[1rem] border border-gray-100 bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-[var(--ink-0)]">{entry.label}</p>
                  <p className="mt-1 text-[11px] text-[var(--ink-3)]">
                    {entry.challenges} trusted reviews · {formatShare(entry.capturedValueShare)} higher-value · {formatShare(entry.wastedValueShare)} lower-value
                  </p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.16em] ${
                    tone === "emerald" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                  }`}
                >
                  {formatWinValue(entry.decisionSurplus)}
                </span>
              </div>
              <div className="mt-3 grid gap-2 text-[10px] font-black uppercase tracking-[0.14em] text-[var(--ink-3)] md:grid-cols-4">
                <span>{formatWinValue(entry.averageExpectedChallengeValue)} expected</span>
                <span>{formatWinValue(entry.averageRealizedChallengeValue)} realized</span>
                <span>{formatShare(entry.challengeRecommendationRate)} challenge</span>
                <span>{formatShare(entry.holdRecommendationRate)} hold</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function Chip({ label }: { label: string }) {
  return (
    <span className="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-gray-500">
      {label}
    </span>
  );
}

function formatShare(value: number) {
  return `${Math.round(value * 100)}%`;
}

function formatWinValue(value: number | null) {
  if (value === null) return "N/A";
  return `${value >= 0 ? "+" : ""}${(value * 100).toFixed(2)}%`;
}
