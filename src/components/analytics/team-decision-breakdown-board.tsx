"use client";

import { useState } from "react";

import { hasTrustedModelConfidenceBand } from "@/lib/server/run-environment";
import type { TeamDecisionBreakdownEntry, TeamDecisionBreakdownSection, TeamDecisionValueReport } from "@/lib/types";

export function TeamDecisionBreakdownBoard({
  report,
  teamColor,
}: {
  report: TeamDecisionValueReport;
  teamColor: string;
}) {
  const [focus, setFocus] = useState<"all" | "edges" | "leaks">("all");
  const strongestBreakdown = report.breakdownSections.find((section) => (section.bestEntry?.decisionSurplus ?? 0) > 0.0005) ?? null;
  const weakestBreakdown = report.breakdownSections.find((section) => (section.weakestEntry?.decisionSurplus ?? 0) < -0.0005) ?? null;

  return (
    <section className="mt-8">
      <div className="panel p-8">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h4 className="mb-1 text-[10px] font-bold uppercase tracking-widest text-blue-500">Decision Breakdown</h4>
            <p className="text-2xl font-display leading-none text-gray-900">
              Where Value Is <span className="text-gray-400">Captured Or Leaked</span>
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <FilterChip label="All Reads" active={focus === "all"} onClick={() => setFocus("all")} />
            <FilterChip label="Best Edges" active={focus === "edges"} onClick={() => setFocus("edges")} />
            <FilterChip label="Leak Points" active={focus === "leaks"} onClick={() => setFocus("leaks")} />
          </div>
        </div>

        <div className="mb-6 rounded-[1.5rem] border border-gray-100 bg-gray-50/60 p-5">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--ink-3)]">Tactical Read</p>
          <p className="mt-2 text-sm leading-7 text-[var(--ink-2)]">
            {weakestBreakdown?.weakestEntry
              ? `The clearest value leak is in ${weakestBreakdown.title.toLowerCase()} when this club gets into ${weakestBreakdown.weakestEntry.label.toLowerCase()}. The strongest edge comes in ${strongestBreakdown?.title.toLowerCase() ?? "its best modeled window"} through ${strongestBreakdown?.bestEntry?.label.toLowerCase() ?? "the highest-surplus reads"}.`
              : strongestBreakdown?.bestEntry
                ? `This club is mostly positive across the board. The sharpest edge shows up in ${strongestBreakdown.title.toLowerCase()} through ${strongestBreakdown.bestEntry.label.toLowerCase()}, while weaker spots have not separated into a true leak yet.`
                : "The decision model is still stabilizing, so this breakdown should be treated as directional rather than definitive."}
          </p>
        </div>

        <div className="grid gap-6 xl:grid-cols-3">
          {report.breakdownSections.map((section) => (
            <BreakdownSectionCard key={section.key} section={section} teamColor={teamColor} focus={focus} />
          ))}
        </div>
      </div>
    </section>
  );
}

function BreakdownSectionCard({
  section,
  teamColor,
  focus,
}: {
  section: TeamDecisionBreakdownSection;
  teamColor: string;
  focus: "all" | "edges" | "leaks";
}) {
  const weakestIsNegative = (section.weakestEntry?.decisionSurplus ?? 0) < -0.0005;
  const filteredEntries =
    focus === "edges"
      ? section.entries.filter((entry) => (entry.decisionSurplus ?? 0) > 0.0005)
      : focus === "leaks"
        ? section.entries.filter((entry) => (entry.decisionSurplus ?? 0) < -0.0005)
        : section.entries;
  const displayEntries = (filteredEntries.length > 0 ? filteredEntries : section.entries).slice(0, 5);

  return (
    <div className="rounded-[1.5rem] border border-gray-100 bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--ink-3)]">{section.title}</p>
          <p className="mt-2 text-[11px] text-[var(--ink-3)]">
            {section.positiveCount} positive · {section.negativeCount} negative · {section.neutralCount} neutral
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        <MiniHighlight
          label="Best Read"
          entry={section.bestEntry}
          teamColor={teamColor}
          empty="No trusted edge yet."
        />
        <MiniHighlight
          label={weakestIsNegative ? "Leak Point" : "Soft Spot"}
          entry={section.weakestEntry}
          teamColor={teamColor}
          empty="No weak area has separated yet."
        />
      </div>

      <div className="mt-5 space-y-2">
        {displayEntries.length === 0 ? (
          <p className="text-sm text-[var(--ink-3)]">No stabilized breakdown entries yet.</p>
        ) : (
          displayEntries.map((entry) => (
            <div key={entry.label} className="rounded-[1rem] border border-gray-100 bg-[var(--surface-infield)] p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-[var(--ink-0)]">{entry.label}</p>
                  <p className="mt-1 text-[11px] text-[var(--ink-3)]">
                    {entry.challenges} trusted reviews · {formatShare(entry.capturedValueShare)} higher-value · {formatShare(entry.wastedValueShare)} lower-value
                  </p>
                </div>
                <span className="rounded-full bg-white px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-[var(--ink-0)]">
                  {formatWinValue(entry.decisionSurplus)}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function MiniHighlight({
  label,
  entry,
  teamColor,
  empty,
}: {
  label: string;
  entry: TeamDecisionBreakdownEntry | null;
  teamColor: string;
  empty: string;
}) {
  const trusted = entry ? hasTrustedModelConfidenceBand(entry.modelConfidence) : false;

  return (
    <div className="rounded-[1rem] border border-gray-100 bg-gray-50/60 p-4">
      <p className="text-[9px] font-black uppercase tracking-[0.14em] text-[var(--ink-3)]">{label}</p>
      {entry ? (
        <>
          <p className="mt-2 text-base font-display text-[var(--ink-0)]" style={{ color: teamColor }}>
            {entry.label}
          </p>
          <p className="mt-1 text-[11px] text-[var(--ink-2)]">
            {trusted
              ? `${formatWinValue(entry.decisionSurplus)} surplus on ${entry.challenges} trusted reviews.`
              : `${entry.challenges} trusted reviews so far, but this read still needs more sample.`}
          </p>
        </>
      ) : (
        <p className="mt-2 text-[11px] text-[var(--ink-3)]">{empty}</p>
      )}
    </div>
  );
}

function formatShare(value: number) {
  return `${Math.round(value * 100)}%`;
}

function formatWinValue(value: number | null) {
  if (value === null) return "N/A";
  return `${value >= 0 ? "+" : ""}${(value * 100).toFixed(2)}%`;
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.14em] transition ${
        active
          ? "border-blue-200 bg-blue-50 text-blue-700"
          : "border-gray-200 bg-white text-gray-500 hover:border-blue-100 hover:text-blue-600"
      }`}
    >
      {label}
    </button>
  );
}
