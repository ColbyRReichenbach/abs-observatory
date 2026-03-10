"use client";

import { BaseStateDiamond } from "@/components/game-hub/base-state-diamond";
import type { LiveChallengeWindow } from "@/lib/types";

export function CurrentChallengeWindowCard({
  snapshot,
  viewMode,
  homeColor,
}: {
  snapshot: LiveChallengeWindow | null;
  viewMode: "fan" | "org";
  homeColor: string;
}) {
  if (!snapshot) return null;

  return (
    <div className="panel p-6 shadow-xl border border-gray-100 bg-white overflow-hidden">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h4 className="text-[10px] font-bold uppercase tracking-widest text-orange-500 mb-1">
            {viewMode === "org" ? "Current Challenge Window" : "Current Pressure Spot"}
          </h4>
          <p className="text-2xl font-display leading-none text-gray-900">
            Live <span className="text-gray-400 italic">Scenario</span>
          </p>
        </div>
        <div className="rounded-2xl border border-orange-100 bg-orange-50/60 px-4 py-3 text-right">
          <p className="text-[9px] font-black uppercase tracking-widest text-orange-500">Estimated Leverage</p>
          <p className="mt-1 text-3xl font-display text-gray-900">{snapshot.estimatedLeverageIndex}</p>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-4 lg:flex-row lg:items-center">
        <div className="flex items-center gap-4 rounded-2xl border border-gray-100 bg-gray-50/60 px-4 py-4">
          <BaseStateDiamond basesState={snapshot.basesState} accent={homeColor} />
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">Game State</p>
            <p className="mt-1 text-sm font-bold text-gray-900">{snapshot.baseStateLabel}</p>
            <p className="mt-1 text-[11px] font-medium text-gray-600">
              {snapshot.halfInning === "Top" ? "Top" : snapshot.halfInning === "Bottom" ? "Bot" : "?"}{" "}
              {snapshot.inning ?? "-"} • {snapshot.scoreStateLabel} • {snapshot.outs ?? 0} out
              {(snapshot.outs ?? 0) === 1 ? "" : "s"}
            </p>
          </div>
        </div>

        <div className="grid flex-1 gap-3 md:grid-cols-3">
          <MetricCard label="Current Count" value={snapshot.currentCountKey ?? "N/A"} />
          <MetricCard
            label={viewMode === "org" ? "Current Outcome Edge" : "Current Count Value"}
            value={
              snapshot.currentPositiveOutcomeRate === null
                ? "N/A"
                : `${(snapshot.currentPositiveOutcomeRate * 100).toFixed(1)}%`
            }
          />
          <MetricCard label="Pressure Band" value={snapshot.leverageBucket.toUpperCase()} />
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <ProjectionCard
          label="If Strike Flips To Ball"
          countKey={snapshot.nextBallCountKey}
          delta={snapshot.nextBallPositiveOutcomeDelta}
          tone="emerald"
        />
        <ProjectionCard
          label="If Ball Flips To Strike"
          countKey={snapshot.nextStrikeCountKey}
          delta={snapshot.nextStrikePositiveOutcomeDelta}
          tone="rose"
        />
      </div>

      {snapshot.scenarioTags.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {snapshot.scenarioTags.map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-gray-500"
            >
              {tag}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white px-4 py-3">
      <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">{label}</p>
      <p className="mt-1 text-lg font-display text-gray-900">{value}</p>
    </div>
  );
}

function ProjectionCard({
  label,
  countKey,
  delta,
  tone,
}: {
  label: string;
  countKey: string | null;
  delta: number | null;
  tone: "emerald" | "rose";
}) {
  const toneClasses =
    tone === "emerald"
      ? "border-emerald-100 bg-emerald-50/60 text-emerald-700"
      : "border-rose-100 bg-rose-50/60 text-rose-700";

  return (
    <div className={`rounded-2xl border px-4 py-4 ${toneClasses}`}>
      <p className="text-[9px] font-black uppercase tracking-widest opacity-80">{label}</p>
      <p className="mt-2 text-sm font-bold">{countKey ?? "Terminal swing / N/A"}</p>
      <p className="mt-1 text-[11px] font-medium">
        {delta === null ? "No comparable count-state delta" : `${delta >= 0 ? "+" : ""}${(delta * 100).toFixed(1)} pts positive outcome rate`}
      </p>
    </div>
  );
}
