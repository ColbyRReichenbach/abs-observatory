"use client";

import { useMemo } from "react";

import { formatBasesStateLabel } from "@/lib/challenge-context";
import { summarizeEstimatedLeverage } from "@/lib/estimated-leverage";

export function DynamicLeverageMeter({
  homeScore = 0,
  awayScore = 0,
  inning = 1,
  balls = 0,
  strikes = 0,
  outs = 0,
  basesState = null,
  homeColor = "#3b82f6",
  awayColor = "#8b5cf6",
}: {
  homeScore?: number;
  awayScore?: number;
  inning?: number;
  balls?: number;
  strikes?: number;
  outs?: number;
  basesState?: string | null;
  homeColor?: string;
  awayColor?: string;
}) {
  const leverage = useMemo(
    () =>
      summarizeEstimatedLeverage({
        inning,
        balls,
        strikes,
        outs,
        basesState,
        homeScore,
        awayScore,
        isOverturned: true,
        impactType: "direct_count_impact",
      }),
    [awayScore, balls, basesState, homeScore, inning, outs, strikes],
  );

  const percentage = Math.max(0, Math.min(100, leverage.estimatedLeverageIndex));
  const pressureTone =
    leverage.leverageBucket === "high"
      ? "High pressure"
      : leverage.leverageBucket === "medium"
        ? "Medium pressure"
        : "Lower pressure";
  const gameStateLabel =
    homeScore === awayScore ? "Game tied" : homeScore > awayScore ? "Home leads" : "Away leads";

  return (
    <div className="flex h-full w-full flex-col justify-between px-2 py-3">
      <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[1.75rem] border border-gray-100 bg-white/95 px-6 py-6 shadow-lg shadow-black/[0.04]">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-gray-400">Estimated Leverage</p>
          <div className="mt-3 flex items-end gap-2">
            <span className="text-6xl font-display leading-none text-gray-900">{leverage.estimatedLeverageIndex}</span>
            <span className="pb-1 text-2xl font-black uppercase tracking-[0.12em] text-gray-300">ELI</span>
          </div>
          <p className="mt-3 text-sm font-semibold text-gray-600">{pressureTone} for inning {inning}</p>
          <p className="mt-1 text-[11px] font-black uppercase tracking-[0.14em] text-gray-400">
            {gameStateLabel} • Count {balls}-{strikes} • {outs} out{outs === 1 ? "" : "s"}
          </p>

          <div className="mt-6">
            <div className="mb-2 flex items-center justify-between text-[9px] font-black uppercase tracking-[0.18em] text-gray-400">
              <span>Low</span>
              <span>Medium</span>
              <span>High</span>
            </div>
            <div className="relative h-3 overflow-hidden rounded-full bg-gray-100">
              <div className="absolute inset-y-0 left-0 w-1/3 bg-emerald-100" />
              <div className="absolute inset-y-0 left-1/3 w-1/3 bg-amber-100" />
              <div className="absolute inset-y-0 right-0 w-1/3 bg-rose-100" />
              <div
                className="absolute inset-y-[2px] left-[2px] rounded-full"
                style={{
                  width: `calc(${percentage}% - 4px)`,
                  background: `linear-gradient(90deg, ${awayColor} 0%, ${homeColor} 100%)`,
                }}
              />
              <div
                className="absolute top-1/2 h-5 w-5 -translate-y-1/2 rounded-full border-4 border-white shadow-md"
                style={{
                  left: `calc(${percentage}% - 10px)`,
                  background: homeScore >= awayScore ? homeColor : awayColor,
                }}
              />
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
          <ScoreCard label="Away" score={awayScore} color={awayColor} />
          <ScoreCard label="Home" score={homeScore} color={homeColor} />
          <div className="rounded-[1.5rem] border border-gray-100 bg-[var(--surface-infield)] px-5 py-4 sm:col-span-2 lg:col-span-1">
            <p className="text-[9px] font-black uppercase tracking-[0.18em] text-gray-400">Current State</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <SnapshotMetric label="Bases" value={formatBasesStateLabel(basesState)} />
              <SnapshotMetric label="Count" value={`${balls}-${strikes}`} />
              <SnapshotMetric label="Outs" value={`${outs}`} />
              <SnapshotMetric label="Bucket" value={leverage.leverageBucket.toUpperCase()} />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5 rounded-[1.5rem] border border-gray-100 bg-white/90 px-5 py-4 shadow-md shadow-black/[0.03]">
        <p className="text-[9px] font-black uppercase tracking-[0.18em] text-gray-400">Decision Read</p>
        <p className="mt-2 text-sm font-medium leading-6 text-gray-600">
          {pressureTone} in a {homeScore === awayScore ? "tied" : "live-score"} spot with {formatBasesStateLabel(basesState).toLowerCase()} and a{" "}
          {balls}-{strikes} count. This card is here to orient the moment, not to compete with the decision panel.
        </p>
      </div>
    </div>
  );
}

function ScoreCard({ label, score, color }: { label: string; score: number; color: string }) {
  return (
    <div className="rounded-[1.5rem] border border-gray-100 bg-white px-5 py-5 shadow-md shadow-black/[0.03]">
      <div className="flex items-center gap-3">
        <div className="h-3 w-3 rounded-full" style={{ backgroundColor: color }} />
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-gray-400">{label}</p>
      </div>
      <p className="mt-3 text-4xl font-display leading-none text-gray-900">{score}</p>
    </div>
  );
}

function SnapshotMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1rem] border border-gray-100 bg-white px-3 py-3">
      <p className="text-[9px] font-black uppercase tracking-[0.14em] text-gray-400">{label}</p>
      <p className="mt-2 text-base font-display text-gray-900">{value}</p>
    </div>
  );
}
