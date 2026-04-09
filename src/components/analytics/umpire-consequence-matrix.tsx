"use client";

import { useMemo, useState } from "react";

import { ChartTooltip } from "@/components/ui/chart-tooltip";
import { DirectionalCaution } from "@/components/analytics/directional-caution";
import type { ChallengeEvent } from "@/lib/types";

type MatrixCell = {
  pitchFamily: string;
  countBucket: string;
  challenges: number;
  overturned: number;
  overturnRate: number;
  avgAbsWin: number | null;
  avgAbsRun: number | null;
  avgExpected: number | null;
  avgVelocity: number | null;
  avgSpin: number | null;
};

const COUNT_BUCKETS = ["Pitcher Ahead", "Even", "Hitter Ahead", "Full Count"];

export function UmpireConsequenceMatrix({ challenges }: { challenges: ChallengeEvent[] }) {
  const { rows, cells, defaultPitchFamily, selectedFallback } = useMemo(() => buildMatrix(challenges), [challenges]);
  const [selectedPitchFamily, setSelectedPitchFamily] = useState<string>(defaultPitchFamily ?? "Unknown");
  const rowCells = useMemo(
    () =>
      COUNT_BUCKETS.map((bucket) => cells.find((entry) => entry.pitchFamily === selectedPitchFamily && entry.countBucket === bucket) ?? null),
    [cells, selectedPitchFamily],
  );
  const [selectedKey, setSelectedKey] = useState<string | null>(selectedFallback);
  const directionalOnly = challenges.length < 10 || cells.filter((cell) => cell.challenges >= 2).length < 2;

  const selected = selectedKey ? cells.find((cell) => keyFor(cell.pitchFamily, cell.countBucket) === selectedKey) ?? null : null;

  return (
    <section className="mb-12">
      <div className="panel p-8">
        <div className="mb-6 flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <h4 className="mb-1 text-[10px] font-bold uppercase tracking-widest text-blue-500">Consequence Matrix</h4>
            <p className="text-3xl font-display leading-none text-gray-900">
              Count-State <span className="text-gray-400">WE / RE Damage by Pitch Family</span>
            </p>
          </div>
          <p className="max-w-xl text-sm leading-6 text-[var(--ink-2)]">
            This is the first org question: when this umpire gets challenged, which count environments and pitch families are carrying the biggest expected review value, and which overturned samples have produced the largest actual swings?
          </p>
          {directionalOnly ? (
            <div className="xl:ml-4 xl:shrink-0">
              <DirectionalCaution
                message={`Only ${challenges.length} challenged pitches are available here. Read this matrix as directional until repeated reviewed pitches stabilize the WE / RE signal.`}
              />
            </div>
          ) : null}
        </div>

        <div className="mb-5 flex flex-wrap gap-2">
          {rows.map((row) => (
            <button
              key={row}
              type="button"
              onClick={() => {
                setSelectedPitchFamily(row);
                const firstCell = COUNT_BUCKETS.map((bucket) => cells.find((entry) => entry.pitchFamily === row && entry.countBucket === bucket) ?? null).find(Boolean);
                if (firstCell) setSelectedKey(keyFor(firstCell.pitchFamily, firstCell.countBucket));
              }}
              className={`rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] transition ${
                row === selectedPitchFamily ? "border-blue-300 bg-blue-50 text-blue-700" : "border-gray-200 bg-white text-gray-500"
              }`}
            >
              {row}
            </button>
          ))}
        </div>

        <div className="overflow-x-auto">
          <div className="min-w-[720px]">
            <div className="grid grid-cols-[180px_repeat(4,minmax(0,1fr))] gap-3">
              <div className="rounded-[1rem] border border-gray-100 bg-white px-4 py-4">
                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--ink-3)]">Pitch Family</p>
                <p className="mt-2 text-sm font-semibold text-[var(--ink-0)]">{selectedPitchFamily}</p>
              </div>
              {COUNT_BUCKETS.map((bucket) => (
                <div key={bucket} className="rounded-[1rem] border border-gray-100 bg-gray-50 px-4 py-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--ink-3)]">{bucket}</p>
                </div>
              ))}

              {rowCells.map((cell, index) => {
                const bucket = COUNT_BUCKETS[index];
                const active = cell && selectedKey === keyFor(cell.pitchFamily, cell.countBucket);
                const fill = consequenceColor(cell?.avgAbsWin ?? null, cell?.challenges ?? 0);
                return (
                  <button
                    key={`${selectedPitchFamily}-${bucket}`}
                    type="button"
                    onClick={() => cell && setSelectedKey(keyFor(cell.pitchFamily, cell.countBucket))}
                    className={`min-h-[112px] rounded-[1.25rem] border p-4 text-left transition ${
                      active ? "border-blue-300 shadow-md" : "border-gray-100 hover:border-blue-200"
                    }`}
                    style={{ backgroundColor: fill }}
                  >
                    {cell && cell.challenges > 0 ? (
                      <>
                        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--ink-3)]">{cell.challenges} challenges</p>
                        <p className="mt-3 text-2xl font-display leading-none text-[var(--ink-0)]">{formatPercent(cell.avgAbsWin ?? cell.avgExpected)}</p>
                        <p className="mt-2 text-[11px] text-[var(--ink-2)]">{(cell.overturnRate * 100).toFixed(1)}% overturned</p>
                        <p className="mt-1 text-[10px] font-black uppercase tracking-[0.14em] text-[var(--ink-3)]">
                          {cell.avgAbsWin !== null ? "Overturned swing" : "Expected review value"}
                        </p>
                        {cell.challenges < 3 ? (
                          <p className="mt-1 text-[10px] font-black uppercase tracking-[0.14em] text-[var(--ink-3)]">Directional</p>
                        ) : null}
                      </>
                    ) : (
                      <div className="flex h-full items-center justify-center text-[11px] font-medium text-[var(--ink-3)]">No sample</div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-[1.5rem] border border-gray-100 bg-white p-5">
          {selected ? (
            <>
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--ink-3)]">Selected Cell</p>
                  <p className="mt-2 text-2xl font-display text-[var(--ink-0)]">
                    {selected.pitchFamily} · {selected.countBucket}
                  </p>
                  <p className="mt-2 text-sm leading-7 text-[var(--ink-2)]">
                    This bucket is carrying {formatPercent(selected.avgAbsWin ?? selected.avgExpected)} {selected.avgAbsWin !== null ? "average absolute WE swing on overturned calls" : "average expected review value"}, and {formatRun(selected.avgAbsRun)} average RE swing on the overturned sample across {selected.challenges} challenged pitches.
                    {selected.challenges < 3 ? " The sample is still too thin for a hard read." : ""}
                  </p>
                </div>
                <ChartTooltip
                  title="WE / RE Read"
                  extra={[
                    { label: "Challenges", value: selected.challenges },
                    { label: "Overturn Rate", value: `${(selected.overturnRate * 100).toFixed(1)}%` },
                    { label: "Abs WE / WPA (overturned)", value: formatPercent(selected.avgAbsWin) },
                    { label: "Abs RE (overturned)", value: formatRun(selected.avgAbsRun) },
                    { label: "Expected WE", value: formatPercent(selected.avgExpected) },
                    { label: "Avg Velo", value: selected.avgVelocity ? `${selected.avgVelocity.toFixed(1)} mph` : "N/A", mono: false },
                    { label: "Avg Spin", value: selected.avgSpin ? `${Math.round(selected.avgSpin)} rpm` : "N/A", mono: false },
                  ]}
                />
              </div>
            </>
          ) : (
            <p className="text-sm text-[var(--ink-3)]">Modeled consequence cells will appear once a stable reviewed pitch sample exists.</p>
          )}
        </div>
      </div>
    </section>
  );
}

function buildMatrix(challenges: ChallengeEvent[]) {
  const familyCounts = new Map<string, number>();
  for (const challenge of challenges) {
    const family = normalizePitchFamily(challenge.pitchType);
    familyCounts.set(family, (familyCounts.get(family) ?? 0) + 1);
  }

  const rows = [...familyCounts.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, 5)
    .map(([family]) => family);

  const rowSet = new Set(rows);
  const grouped = new Map<string, ChallengeEvent[]>();

  for (const challenge of challenges) {
    const pitchFamily = normalizePitchFamily(challenge.pitchType);
    if (!rowSet.has(pitchFamily)) continue;
    const countBucket = classifyCountBucket(challenge.countBefore, challenge.umpireCount, challenge.countAfter);
    const key = keyFor(pitchFamily, countBucket);
    const existing = grouped.get(key) ?? [];
    existing.push(challenge);
    grouped.set(key, existing);
  }

  const cells = [...grouped.entries()].map(([key, bucket]) => {
    const [pitchFamily, countBucket] = key.split("::");
    const overturned = bucket.filter((challenge) => challenge.isOverturned);
    const expected = bucket
      .filter((challenge) => challenge.decisionValueMode === "win_expectancy")
      .map((challenge) => challenge.expectedChallengeValue)
      .filter((value): value is number => typeof value === "number");
    const velocities = bucket
      .map((challenge) => challenge.startSpeed)
      .filter((value): value is number => typeof value === "number");
    const spins = bucket
      .map((challenge) => challenge.spinRate)
      .filter((value): value is number => typeof value === "number");

    return {
      pitchFamily,
      countBucket,
      challenges: bucket.length,
      overturned: overturned.length,
      overturnRate: bucket.length > 0 ? overturned.length / bucket.length : 0,
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
          avgExpected: average(expected),
      avgVelocity: average(velocities),
      avgSpin: average(spins),
    };
  });

  const topCell = [...cells].sort((left, right) => {
    const winDiff = ((right.avgAbsWin ?? right.avgExpected) ?? -1) - ((left.avgAbsWin ?? left.avgExpected) ?? -1);
    if (winDiff !== 0) return winDiff;
    return right.challenges - left.challenges;
  })[0];
  const defaultPitchFamily = topCell?.pitchFamily ?? rows[0] ?? null;
  const selectedFallback = topCell ? keyFor(topCell.pitchFamily, topCell.countBucket) : null;

  return { rows, cells, defaultPitchFamily, selectedFallback };
}

function classifyCountBucket(
  countBefore: string | null | undefined,
  umpireCount?: string | null,
  countAfter?: string | null,
) {
  const countKey = countBefore ?? umpireCount ?? countAfter;
  if (!countKey) return "Even";
  if (countKey === "3-2") return "Full Count";
  const [ballsRaw, strikesRaw] = countKey.split("-");
  const balls = Number(ballsRaw);
  const strikes = Number(strikesRaw);
  if (!Number.isFinite(balls) || !Number.isFinite(strikes)) return "Even";
  if (balls > strikes) return "Hitter Ahead";
  if (strikes > balls) return "Pitcher Ahead";
  return "Even";
}

function normalizePitchFamily(pitchType: string | null) {
  if (!pitchType) return "Unknown";
  return pitchType.trim();
}

function keyFor(pitchFamily: string, countBucket: string) {
  return `${pitchFamily}::${countBucket}`;
}

function average(values: number[]) {
  return values.length > 0 ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}

function formatPercent(value: number | null) {
  return value === null ? "N/A" : `${(value * 100).toFixed(1)} pts`;
}

function formatRun(value: number | null) {
  return value === null ? "N/A" : `${value.toFixed(2)} runs`;
}

function consequenceColor(value: number | null, sample: number) {
  if (sample === 0 || value === null) return "rgba(255,255,255,1)";
  if (sample < 3) return "rgba(59, 130, 246, 0.08)";
  if (value >= 0.035) return "rgba(220, 38, 38, 0.18)";
  if (value >= 0.025) return "rgba(245, 158, 11, 0.16)";
  if (value >= 0.015) return "rgba(59, 130, 246, 0.14)";
  return "rgba(16, 185, 129, 0.12)";
}
