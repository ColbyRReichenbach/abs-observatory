"use client";

import type { GameUmpireInGameSummary } from "@/lib/types";
import type { ViewMode } from "@/lib/view-mode";

function formatMatchupLabel(pitcherThrows: "R" | "L", batterStand: "R" | "L") {
  return `${pitcherThrows}HP vs ${batterStand}HB`;
}

function formatLaneLabel(lane: string) {
  return lane
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function signedPercent(value: number | null | undefined) {
  if (value === null || value === undefined) return "N/A";
  return `${value >= 0 ? "+" : ""}${(value * 100).toFixed(2)}%`;
}

function signedRun(value: number | null | undefined) {
  if (value === null || value === undefined) return "N/A";
  return `${value >= 0 ? "+" : ""}${value.toFixed(3)}`;
}

export function UmpireInGameCard({
  summary,
  viewMode,
}: {
  summary: GameUmpireInGameSummary | null;
  viewMode: ViewMode;
}) {
  if (!summary) return null;

  return (
    <section className="panel p-6 shadow-2xl shadow-black/[0.02] border border-gray-50 bg-white">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h4 className="text-[10px] font-bold uppercase tracking-widest text-emerald-500 mb-1">
            {viewMode === "org" ? "Umpire In Game" : "Umpire Tonight"}
          </h4>
          <p className="text-2xl font-display leading-none text-gray-900">
            Tonight&apos;s <span className="text-gray-400">Review Pattern</span>
          </p>
          <p className="mt-2 text-[11px] font-medium leading-relaxed text-[var(--ink-2)]">
            {summary.totalChallenges} reviewed pitch{summary.totalChallenges === 1 ? "" : "es"} so far •{" "}
            {summary.overturnedChallenges} overturned
          </p>
        </div>
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 px-4 py-3">
          <p className="text-[9px] font-black uppercase tracking-widest text-emerald-600">Highest Risk Split</p>
          <p className="mt-2 text-lg font-display text-gray-900">
            {summary.highestRiskSplit
              ? formatMatchupLabel(summary.highestRiskSplit.pitcherThrows, summary.highestRiskSplit.batterStand)
              : "Directional only"}
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {summary.splits.length > 0 ? (
          summary.splits.slice(0, 4).map((split) => (
            <SplitCell
              key={`${split.pitcherThrows}-${split.batterStand}`}
              label={formatMatchupLabel(split.pitcherThrows, split.batterStand)}
              sample={`${split.sampleSize} review${split.sampleSize === 1 ? "" : "s"}`}
              overturnRate={split.overturnRate}
              detail={
                viewMode === "org"
                  ? split.averageWinDelta !== null
                    ? `${signedPercent(split.averageWinDelta)} WE`
                    : split.averageRunDelta !== null
                      ? `${signedRun(split.averageRunDelta)} RE`
                      : split.averageLeverage !== null
                        ? `ELI ${split.averageLeverage.toFixed(1)}`
                        : "Directional only"
                  : split.averageLeverage !== null
                    ? `ELI ${split.averageLeverage.toFixed(1)}`
                    : "Directional only"
              }
            />
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50/60 px-4 py-5 text-sm font-medium text-gray-500 md:col-span-4">
            No handedness split has separated in the live review sample yet.
          </div>
        )}
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <InfoCard
          label="Most Targeted Pitch"
          value={summary.topPitchType ? summary.topPitchType.pitchType : "No clear pitch family"}
          detail={
            summary.topPitchType
              ? `${summary.topPitchType.sampleSize} reviews • ${(summary.topPitchType.overturnRate * 100).toFixed(0)}% overturned`
              : "Pitch-type separation needs more sample."
          }
        />
        <InfoCard
          label="Most Active Lane"
          value={summary.topLane ? formatLaneLabel(summary.topLane.lane) : "No clear lane"}
          detail={
            summary.topLane
              ? `${summary.topLane.sampleSize} reviews • ${(summary.topLane.overturnRate * 100).toFixed(0)}% overturned`
              : "Lane separation needs more sample."
          }
        />
      </div>
    </section>
  );
}

function SplitCell({
  label,
  sample,
  overturnRate,
  detail,
}: {
  label: string;
  sample: string;
  overturnRate: number;
  detail: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-gray-50/60 px-4 py-4">
      <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">{label}</p>
      <p className="mt-2 text-xl font-display text-gray-900">{(overturnRate * 100).toFixed(0)}%</p>
      <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-gray-400">{sample}</p>
      <p className="mt-2 text-[11px] font-medium leading-relaxed text-gray-600">{detail}</p>
    </div>
  );
}

function InfoCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-gray-50/60 px-4 py-4">
      <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">{label}</p>
      <p className="mt-2 text-base font-display text-gray-900">{value}</p>
      <p className="mt-2 text-[11px] font-medium leading-relaxed text-gray-600">{detail}</p>
    </div>
  );
}
