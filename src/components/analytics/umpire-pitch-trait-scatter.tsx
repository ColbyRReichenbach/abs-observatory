"use client";

import { useMemo, useState } from "react";

import { DirectionalCaution } from "@/components/analytics/directional-caution";
import type { ChallengeEvent } from "@/lib/types";

type AxisMetric = "velocity" | "spin";

type TraitPoint = {
  pitchFamily: string;
  sample: number;
  overturnedCount: number;
  overturnRate: number;
  avgVelocity: number | null;
  avgSpin: number | null;
  avgAbsWin: number | null;
  avgAbsRun: number | null;
  avgExpected: number | null;
};

const PALETTE = ["#2563eb", "#dc2626", "#7c3aed", "#ea580c", "#0891b2", "#059669"];

export function UmpirePitchTraitScatter({ challenges }: { challenges: ChallengeEvent[] }) {
  const [axis, setAxis] = useState<AxisMetric>("velocity");
  const points = useMemo(() => buildPoints(challenges), [challenges]);
  const [selectedFamily, setSelectedFamily] = useState<string | null>(points[0]?.pitchFamily ?? null);
  const selected = points.find((point) => point.pitchFamily === selectedFamily) ?? points[0] ?? null;

  const domain = useMemo(() => buildDomain(points, axis), [points, axis]);
  const trustedPoints = points.filter((point) => point.sample >= 2);
  const directionalOnly = trustedPoints.length < 2;

  return (
    <section className="mb-12">
      <div className="panel p-5 sm:p-8">
        <div className="mb-6 flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <h4 className="mb-1 text-[10px] font-bold uppercase tracking-widest text-blue-500">Pitch-Trait View</h4>
            <p className="text-2xl font-display leading-none text-gray-900 sm:text-3xl">
              Pitch Trait <span className="text-gray-400">WE / RE Scatter</span>
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => setAxis("velocity")} className={chipClass(axis === "velocity")}>
              Velocity
            </button>
            <button type="button" onClick={() => setAxis("spin")} className={chipClass(axis === "spin")}>
              Spin
            </button>
            {directionalOnly ? (
              <div className="ml-1">
                <DirectionalCaution message="Pitch-family sample is still light. Use this view to spot candidate trait weaknesses, not to make a final judgment on umpire vulnerability." />
              </div>
            ) : null}
          </div>
        </div>

        <div className="rounded-[1.75rem] border border-gray-100 bg-[var(--surface-infield)] p-3 sm:p-5">
          <div className="relative h-[420px] overflow-hidden rounded-[1.5rem] border border-gray-100 bg-white sm:h-[360px]">
            <div className="absolute inset-x-4 top-4 flex justify-between gap-6 text-[9px] font-black uppercase leading-4 tracking-[0.12em] text-[var(--ink-3)] sm:inset-x-5 sm:text-[10px] sm:tracking-[0.14em]">
              <span>Higher overturn rate</span>
              <span className="text-right">Sample = point size</span>
            </div>
            <div className="absolute bottom-12 left-9 top-16 w-px bg-gray-100 sm:inset-y-10 sm:left-5" />
            <div className="absolute bottom-12 left-9 right-5 h-px bg-gray-100 sm:inset-x-5 sm:bottom-10" />
            <div className="absolute left-1 top-1/2 -translate-y-1/2 -rotate-90 text-[9px] font-black uppercase tracking-[0.12em] text-[var(--ink-3)] sm:left-7 sm:text-[10px] sm:tracking-[0.14em]">
              Overturn Rate
            </div>
            <div className="absolute inset-x-0 bottom-4 text-center text-[9px] font-black uppercase tracking-[0.12em] text-[var(--ink-3)] sm:bottom-3 sm:text-[10px] sm:tracking-[0.14em]">
              {axis === "velocity" ? "Average Velocity" : "Average Spin"}
            </div>

            {points.map((point, index) => {
              const xValue = axis === "velocity" ? point.avgVelocity : point.avgSpin;
              if (xValue === null) return null;
              const x = scale(xValue, domain.min, domain.max, 18, 88);
              const y = scale(point.overturnRate, domain.rateMin, domain.rateMax, 86, 22);
              const radius = Math.max(9, Math.min(24, 8 + point.sample * 1.5));
              const active = point.pitchFamily === selectedFamily;
              const trusted = point.sample >= 3;
              return (
                <button
                  key={point.pitchFamily}
                  type="button"
                  onClick={() => setSelectedFamily(point.pitchFamily)}
                  className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 transition"
                  style={{
                    left: `${x}%`,
                    top: `${y}%`,
                    width: radius * 2,
                    height: radius * 2,
                    backgroundColor: trusted ? `${PALETTE[index % PALETTE.length]}22` : "rgba(255,255,255,0.96)",
                    borderColor: active ? PALETTE[index % PALETTE.length] : trusted ? "#dbe3f0" : "#e5e7eb",
                    boxShadow: active ? `0 10px 24px -10px ${PALETTE[index % PALETTE.length]}80` : "none",
                  }}
                  aria-label={`${point.pitchFamily} trait point`}
                >
                  <span className="sr-only">{point.pitchFamily}</span>
                  <span className="flex h-full items-center justify-center text-[10px] font-black text-[var(--ink-0)]">
                    {trusted ? point.pitchFamily.slice(0, 2).toUpperCase() : "?"}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <div className="rounded-[1.5rem] border border-gray-100 bg-white p-5">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--ink-3)]">Pitch Families</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {points.map((point, index) => (
                <button
                  key={point.pitchFamily}
                  type="button"
                  onClick={() => setSelectedFamily(point.pitchFamily)}
                  className={`rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] whitespace-nowrap transition ${
                    point.pitchFamily === selectedFamily ? "border-blue-300 bg-blue-50 text-blue-700" : "border-gray-200 bg-white text-gray-500"
                  }`}
                >
                  <span className="mr-2 inline-block h-2 w-2 rounded-full" style={{ backgroundColor: PALETTE[index % PALETTE.length] }} />
                  {point.pitchFamily}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-gray-100 bg-white p-5">
            {selected ? (
              <>
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--ink-3)]">Selected Pitch Family</p>
                  <p className="mt-2 max-w-[16ch] text-2xl font-display leading-tight text-[var(--ink-0)] [text-wrap:balance] lg:text-[2rem]">
                    {selected.pitchFamily}
                  </p>
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <MiniStat label="Challenges" value={`${selected.sample}`} />
                  <MiniStat label="Overturn Rate" value={`${selected.overturnRate.toFixed(1)}%`} />
                  <MiniStat label="Abs WE" value={formatPercent(selected.avgAbsWin, selected.overturnedCount)} muted={selected.sample < 3} />
                  <MiniStat label="Exp. WE" value={formatPercent(selected.avgExpected)} muted={selected.sample < 3} />
                </div>
                <p className="mt-4 text-sm leading-7 text-[var(--ink-2)]">
                  {selected.pitchFamily} is sitting at {selected.avgVelocity ? `${selected.avgVelocity.toFixed(1)} mph` : "unknown velocity"} and{" "}
                  {selected.avgSpin ? `${Math.round(selected.avgSpin)} rpm` : "unknown spin"}, which makes it easier to judge whether this umpire’s review trouble is tied to shape, speed, or simple pitch-family exposure.
                  {selected.sample < 3 ? " This pitch family is still directional only." : ""}
                </p>
              </>
            ) : (
              <p className="text-sm text-[var(--ink-3)]">No pitch-trait sample has stabilized yet.</p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function buildPoints(challenges: ChallengeEvent[]) {
  const grouped = new Map<string, ChallengeEvent[]>();
  for (const challenge of challenges) {
    const family = challenge.pitchType?.trim() || "Unknown";
    const existing = grouped.get(family) ?? [];
    existing.push(challenge);
    grouped.set(family, existing);
  }

  return [...grouped.entries()]
    .map(([pitchFamily, sample]) => {
      const overturned = sample.filter((challenge) => challenge.isOverturned);
      return {
        pitchFamily,
        sample: sample.length,
        overturnedCount: overturned.length,
        overturnRate: sample.length > 0 ? (overturned.length / sample.length) * 100 : 0,
        avgVelocity: average(sample.map((challenge) => challenge.startSpeed).filter((value): value is number => typeof value === "number")),
        avgSpin: average(sample.map((challenge) => challenge.spinRate).filter((value): value is number => typeof value === "number")),
        avgAbsWin: average(
          overturned
            .map((challenge) => challenge.winExpectancyDelta)
            .filter((value): value is number => typeof value === "number")
            .map((value) => Math.abs(value)),
        ),
        avgAbsRun: average(
          overturned
            .map((challenge) => challenge.runExpectancyDelta)
            .filter((value): value is number => typeof value === "number")
            .map((value) => Math.abs(value)),
        ),
        avgExpected: average(
          sample
            .filter((challenge) => challenge.decisionValueMode === "win_expectancy")
            .map((challenge) => challenge.expectedChallengeValue)
            .filter((value): value is number => typeof value === "number"),
        ),
      };
    })
    .filter((point) => point.sample > 0)
    .sort((left, right) => right.sample - left.sample)
    .slice(0, 6);
}

function buildDomain(points: TraitPoint[], axis: AxisMetric) {
  const values = points
    .map((point) => (axis === "velocity" ? point.avgVelocity : point.avgSpin))
    .filter((value): value is number => typeof value === "number");
  const rates = points.map((point) => point.overturnRate);
  const min = values.length > 0 ? Math.min(...values) : 0;
  const max = values.length > 0 ? Math.max(...values) : 1;
  const xPadding = min === max ? 1 : (max - min) * 0.08;
  const rateMin = rates.length > 0 ? Math.min(...rates, 0) : 0;
  const rateMax = rates.length > 0 ? Math.max(...rates, 100) : 100;
  return {
    min: min - xPadding,
    max: max + xPadding,
    rateMin,
    rateMax,
  };
}

function scale(value: number, min: number, max: number, outMin: number, outMax: number) {
  if (max <= min) return (outMin + outMax) / 2;
  const ratio = (value - min) / (max - min);
  return outMin + ratio * (outMax - outMin);
}

function average(values: number[]) {
  return values.length > 0 ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}

function chipClass(active: boolean) {
  return `rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] transition ${
    active ? "border-blue-300 bg-blue-50 text-blue-700" : "border-gray-200 bg-white text-gray-500"
  }`;
}

function formatPercent(value: number | null, overturnedCount?: number) {
  if ((overturnedCount ?? 1) === 0) return "No OT";
  return value === null ? "N/A" : `${(value * 100).toFixed(1)} pts`;
}

function MiniStat({ label, value, muted = false }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className={`rounded-[1rem] border border-gray-100 px-3 py-3 ${muted ? "bg-white" : "bg-[var(--surface-infield)]"}`}>
      <p className="text-[9px] font-black uppercase tracking-[0.14em] text-[var(--ink-3)]">{label}</p>
      <p className="mt-2 text-base font-display text-[var(--ink-0)]">{value}</p>
    </div>
  );
}
