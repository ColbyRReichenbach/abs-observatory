"use client";

import type { PregameIntel } from "@/lib/types";
import type { ViewMode } from "@/lib/view-mode";

const BUCKET_LABELS = {
  up_glove: "Up / Glove",
  up_arm: "Up / Arm",
  down_glove: "Down / Glove",
  down_arm: "Down / Arm",
} as const;

export function PregameUmpireScoutCard({
  intel,
  viewMode,
}: {
  intel: PregameIntel | null;
  viewMode: ViewMode;
}) {
  if (!intel) return null;

  const hottestZone =
    [...intel.zoneBriefing].sort((left, right) => {
      if (right.overturnRate !== left.overturnRate) return right.overturnRate - left.overturnRate;
      return right.challenges - left.challenges;
    })[0] ?? null;

  const homePeakInning = peakInning(intel.challengeTiming.home);
  const awayPeakInning = peakInning(intel.challengeTiming.away);

  return (
    <section className="panel p-6 shadow-2xl shadow-black/[0.02] border border-gray-50 bg-white">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h4 className="text-[10px] font-bold uppercase tracking-widest text-purple-500 mb-1">
            {viewMode === "org" ? "Pregame Umpire Scout" : "Umpire Watch"}
          </h4>
          <p className="text-2xl font-display leading-none text-gray-900">
            Tonight’s <span className="text-gray-400">Read</span>
          </p>
          <p className="mt-2 text-[11px] font-medium leading-relaxed text-[var(--ink-2)]">
            {intel.umpireName ?? "Unknown umpire"} enters with {(Math.round((1 - intel.umpireTendency.overallAccuracy) * 100))}% review volatility.
          </p>
        </div>
        <div className="rounded-2xl border border-purple-100 bg-purple-50/70 px-4 py-3">
          <p className="text-[9px] font-black uppercase tracking-widest text-purple-500">Hottest Zone</p>
          <p className="mt-2 text-lg font-display text-gray-900">
            {hottestZone ? BUCKET_LABELS[hottestZone.bucket] : "Directional only"}
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <ScoutMetric
          label="Overall Risk"
          value={`${Math.round((1 - intel.umpireTendency.overallAccuracy) * 100)}%`}
          detail={viewMode === "org" ? "Challenge overturn profile" : "Review volatility"}
        />
        <ScoutMetric
          label="Home Timing Lean"
          value={homePeakInning ? `Inning ${homePeakInning}` : "Flat"}
          detail={`${intel.teamHistoryVsUmpire.home.challenges} tracked challenges`}
        />
        <ScoutMetric
          label="Away Timing Lean"
          value={awayPeakInning ? `Inning ${awayPeakInning}` : "Flat"}
          detail={`${intel.teamHistoryVsUmpire.away.challenges} tracked challenges`}
        />
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <NarrativeCard
          label="Home vs Umpire"
          value={`${Math.round(intel.teamHistoryVsUmpire.home.overturnRate * 100)}%`}
          detail={`${intel.teamHistoryVsUmpire.home.games} games • ${intel.teamHistoryVsUmpire.home.challenges} challenges`}
        />
        <NarrativeCard
          label="Away vs Umpire"
          value={`${Math.round(intel.teamHistoryVsUmpire.away.overturnRate * 100)}%`}
          detail={`${intel.teamHistoryVsUmpire.away.games} games • ${intel.teamHistoryVsUmpire.away.challenges} challenges`}
        />
      </div>
    </section>
  );
}

function peakInning(values: number[]) {
  let bestIndex = -1;
  let bestValue = 0;
  values.forEach((value, index) => {
    if (value > bestValue) {
      bestValue = value;
      bestIndex = index;
    }
  });
  return bestIndex >= 0 ? bestIndex + 1 : null;
}

function ScoutMetric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-gray-50/60 px-4 py-4">
      <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">{label}</p>
      <p className="mt-2 text-2xl font-display text-gray-900">{value}</p>
      <p className="mt-2 text-[11px] font-medium leading-relaxed text-gray-600">{detail}</p>
    </div>
  );
}

function NarrativeCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white px-4 py-4">
      <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">{label}</p>
      <p className="mt-2 text-lg font-display text-gray-900">{value}</p>
      <p className="mt-2 text-[11px] font-medium leading-relaxed text-gray-600">{detail}</p>
    </div>
  );
}
