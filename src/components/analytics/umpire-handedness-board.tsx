"use client";

import { useMemo, useState } from "react";

import { DirectionalCaution } from "@/components/analytics/directional-caution";
import type { ChallengeEvent, UmpireMatchupVulnerability } from "@/lib/types";

type SplitCell = {
  pitcherThrows: "R" | "L";
  batterStand: "R" | "L";
  challengedCount: number;
  overturnRate: number;
  avgAbsWin: number | null;
  avgAbsRun: number | null;
  avgExpected: number | null;
  topPitchType: string | null;
  topCount: string | null;
  topZone: string | null;
};

const CELLS: Array<{ pitcherThrows: "R" | "L"; batterStand: "R" | "L" }> = [
  { pitcherThrows: "R", batterStand: "R" },
  { pitcherThrows: "R", batterStand: "L" },
  { pitcherThrows: "L", batterStand: "R" },
  { pitcherThrows: "L", batterStand: "L" },
];

export function UmpireHandednessBoard({
  challenges,
  matchupVulnerabilities,
}: {
  challenges: ChallengeEvent[];
  matchupVulnerabilities: UmpireMatchupVulnerability[];
}) {
  const cells = useMemo(() => buildCells(challenges, matchupVulnerabilities), [challenges, matchupVulnerabilities]);
  const [selectedKey, setSelectedKey] = useState<string>(cells[0] ? keyFor(cells[0].pitcherThrows, cells[0].batterStand) : "R-R");
  const selected = cells.find((cell) => keyFor(cell.pitcherThrows, cell.batterStand) === selectedKey) ?? cells[0] ?? null;
  const directionalOnly = challenges.length < 10 || cells.filter((cell) => cell.challengedCount >= 2).length < 2;

  return (
    <section className="mb-12">
      <div className="panel p-8">
        <div className="mb-6 flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <h4 className="mb-1 text-[10px] font-bold uppercase tracking-widest text-blue-500">Matchup Board</h4>
            <p className="text-3xl font-display leading-none text-gray-900">
              Handedness <span className="text-gray-400">Exposure Splits</span>
            </p>
          </div>
          <p className="max-w-xl text-sm leading-6 text-[var(--ink-2)]">
            This is the matchup layer a club would use before a series. The cells below show which pitcher-batter handedness combinations are carrying the heaviest review cost and where the exposure is concentrating.
          </p>
          {directionalOnly ? (
            <div className="xl:ml-4 xl:shrink-0">
              <DirectionalCaution message="Handedness exposure is still thin. Use these splits as directional prep until one or two matchup buckets build repeated reviewed pitches." />
            </div>
          ) : null}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {cells.map((cell) => {
            const active = selectedKey === keyFor(cell.pitcherThrows, cell.batterStand);
            const trusted = cell.challengedCount >= 4;
            const directional = cell.challengedCount > 0 && cell.challengedCount < 4;
            return (
              <button
                key={keyFor(cell.pitcherThrows, cell.batterStand)}
                type="button"
                onClick={() => setSelectedKey(keyFor(cell.pitcherThrows, cell.batterStand))}
                className={`rounded-[1.5rem] border p-5 text-left transition ${
                  active ? "border-blue-300 bg-blue-50/50 shadow-md" : "border-gray-100 bg-white hover:border-blue-200"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-[var(--ink-0)]">{cell.pitcherThrows}HP vs {cell.batterStand}HB</p>
                    <p className="mt-1 text-[11px] text-[var(--ink-3)]">{cell.challengedCount} challenges</p>
                  </div>
                  <span className="rounded-full bg-white px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-blue-700">
                    {trusted ? `${cell.overturnRate.toFixed(1)}%` : directional ? "dir." : "thin"}
                  </span>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <MiniStat label="Abs WE / WPA" value={formatPercent(cell.avgAbsWin)} muted={!trusted} />
                  <MiniStat label="Abs RE" value={formatRun(cell.avgAbsRun)} muted={!trusted} />
                  <MiniStat label="Expected WE" value={formatPercent(cell.avgExpected)} muted={!trusted} />
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-6 rounded-[1.5rem] border border-gray-100 bg-white p-5">
          {selected ? (
            <>
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--ink-3)]">Selected Matchup</p>
              <p className="mt-2 text-2xl font-display text-[var(--ink-0)]">
                {selected.pitcherThrows}HP vs {selected.batterStand}HB
              </p>
              <div className="mt-4 grid gap-4 lg:grid-cols-4">
                <MiniStat label="Overturn Rate" value={`${selected.overturnRate.toFixed(1)}%`} />
                <MiniStat label={selected.challengedCount < 4 ? "Current Pitch Lean" : "Top Pitch"} value={selected.topPitchType ?? "N/A"} />
                <MiniStat label={selected.challengedCount < 4 ? "Current Count Lean" : "Top Count"} value={selected.topCount ?? "N/A"} />
                <MiniStat label={selected.challengedCount < 4 ? "Current Zone Lean" : "Top Zone"} value={selected.topZone ?? "N/A"} />
              </div>
              <p className="mt-4 text-sm leading-7 text-[var(--ink-2)]">
                This bucket is the clearest place to test for repeatable matchup exposure. The current review sample leans toward {selected.topPitchType?.toLowerCase() ?? "mixed pitch"} traffic in {selected.topCount ?? "mixed counts"}, with the hottest zone read around {selected.topZone?.toLowerCase() ?? "mixed lanes"}.
                {selected.challengedCount < 4
                  ? " This is still directional review evidence, so treat the pitch, count, and zone reads as early leans rather than hard tendencies."
                  : ""}
              </p>
            </>
          ) : (
            <p className="text-sm text-[var(--ink-3)]">No handedness splits are available yet.</p>
          )}
        </div>
      </div>
    </section>
  );
}

function buildCells(challenges: ChallengeEvent[], matchupVulnerabilities: UmpireMatchupVulnerability[]) {
  return CELLS.map(({ pitcherThrows, batterStand }) => {
    const sample = challenges.filter((challenge) => challenge.pitcherThrows === pitcherThrows && challenge.batterStand === batterStand);
    const overturned = sample.filter((challenge) => challenge.isOverturned);
    const vuln = matchupVulnerabilities.find((entry) => entry.pitcherThrows === pitcherThrows && entry.batterStand === batterStand) ?? null;
    const topPitchType = mode(sample.map((challenge) => challenge.pitchType).filter((value): value is string => Boolean(value)));
    const topCount = mode(sample.map((challenge) => challenge.countBefore).filter((value): value is string => Boolean(value)));

    return {
      pitcherThrows,
      batterStand,
      challengedCount: sample.length,
      overturnRate: vuln ? vuln.overturnRate * 100 : sample.length > 0 ? (overturned.length / sample.length) * 100 : 0,
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
      avgExpected: average(sample.map((challenge) => challenge.expectedChallengeValue).filter((value): value is number => typeof value === "number")),
      topPitchType,
      topCount,
      topZone: vuln?.topZone ?? null,
    };
  });
}

function average(values: number[]) {
  return values.length > 0 ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}

function mode(values: string[]) {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return [...counts.entries()].sort((left, right) => right[1] - left[1])[0]?.[0] ?? null;
}

function keyFor(pitcherThrows: "R" | "L", batterStand: "R" | "L") {
  return `${pitcherThrows}-${batterStand}`;
}

function formatPercent(value: number | null) {
  return value === null ? "N/A" : `${(value * 100).toFixed(1)} pts`;
}

function formatRun(value: number | null) {
  return value === null ? "N/A" : `${value.toFixed(2)} runs`;
}

function MiniStat({ label, value, muted = false }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className={`rounded-[1rem] border border-gray-100 px-3 py-3 ${muted ? "bg-white" : "bg-[var(--surface-infield)]"}`}>
      <p className="text-[9px] font-black uppercase tracking-[0.14em] text-[var(--ink-3)]">{label}</p>
      <p className="mt-2 text-base font-display text-[var(--ink-0)]">{value}</p>
    </div>
  );
}
