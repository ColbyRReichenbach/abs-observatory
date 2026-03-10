"use client";

import { Fragment, useMemo, useState } from "react";
import { AnimatePresence } from "framer-motion";

import { ChartTooltip } from "@/components/ui/chart-tooltip";
import type { TeamChallengeScenarioCell, TeamChallengeValueSummary } from "@/lib/types";

export function TeamChallengeValueMatrix({
  cells,
  summary,
  teamColor,
  viewMode,
}: {
  cells: TeamChallengeScenarioCell[];
  summary: TeamChallengeValueSummary;
  teamColor: string;
  viewMode: "fan" | "org";
}) {
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const rowLabels = useMemo(() => Array.from(new Set(cells.map((cell) => cell.rowLabel))), [cells]);
  const colLabels = useMemo(() => Array.from(new Set(cells.map((cell) => cell.colLabel))), [cells]);
  const cellMap = useMemo(() => new Map(cells.map((cell) => [`${cell.rowLabel}:${cell.colLabel}`, cell])), [cells]);
  const preferredCell = useMemo(
    () =>
      [...cells].sort((left, right) => {
        if (right.challenges !== left.challenges) return right.challenges - left.challenges;
        return right.avgEstimatedLeverage - left.avgEstimatedLeverage;
      })[0] ?? null,
    [cells],
  );
  const deploymentRead =
    summary.totalChallenges === 0
      ? "Challenge timing profile will appear once the club has a larger tracked sample."
      : summary.highPressureShare >= 0.5
        ? viewMode === "org"
          ? "This club is already spending a healthy share of reviews in genuine pressure pockets."
          : "This team usually saves challenges for spots that actually feel big."
        : viewMode === "org"
          ? "This club still spends too many reviews outside of its highest-value windows."
          : "This team still burns too many challenges before the biggest moments arrive.";

  const hoveredCell = hoveredKey ? cellMap.get(hoveredKey) ?? null : null;

  return (
    <div className="panel p-8 shadow-2xl shadow-black/[0.02] border border-gray-50 bg-white">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h4 className="text-[10px] font-bold uppercase tracking-widest text-blue-500 mb-1">
            {viewMode === "org" ? "Scenario Deployment" : "Challenge Timing"}
          </h4>
          <p className="text-2xl font-display leading-none text-gray-900">
            Challenge <span className="text-gray-400">Value Matrix</span>
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <SummaryPill label="High-Pressure Share" value={`${(summary.highPressureShare * 100).toFixed(0)}%`} />
          <SummaryPill label="RISP <2 Outs" value={`${(summary.rispLessThanTwoOutsShare * 100).toFixed(0)}%`} />
          <SummaryPill label="Avg ELI" value={summary.averageEstimatedLeverage.toFixed(1)} />
          <SummaryPill
            label={viewMode === "org" ? "Avg RE Delta" : "Smart Count Gain"}
            value={
              viewMode === "org"
                ? summary.averageRunExpectancyDelta === null
                  ? "N/A"
                  : `${summary.averageRunExpectancyDelta >= 0 ? "+" : ""}${summary.averageRunExpectancyDelta.toFixed(3)}`
                : summary.averagePositiveOutcomeDelta === null
                  ? "N/A"
                  : `${summary.averagePositiveOutcomeDelta >= 0 ? "+" : ""}${(summary.averagePositiveOutcomeDelta * 100).toFixed(1)}`
            }
          />
        </div>
      </div>

      <div className="mb-4 grid gap-3 lg:grid-cols-[1.4fr_1fr]">
        <div className="rounded-2xl border border-gray-100 bg-gray-50/60 px-4 py-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
            {viewMode === "org" ? "Best Realized Window" : "Best Challenge Window"}
          </p>
          <p className="mt-1 text-sm font-medium text-gray-700">
            {summary.bestScenarioLabel
              ? `${summary.bestScenarioLabel} across ${summary.bestScenarioChallenges} tracked challenges`
              : "Scenario window will appear once tracked challenges accumulate."}
          </p>
          <p className="mt-3 text-[11px] font-medium leading-relaxed text-gray-600">{deploymentRead}</p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-gray-50/60 px-4 py-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
            {viewMode === "org" ? "Preferred Window" : "Favorite Spot"}
          </p>
          <p className="mt-1 text-sm font-medium text-gray-700">
            {preferredCell ? `${preferredCell.rowLabel} • ${preferredCell.colLabel}` : "No clear favorite yet"}
          </p>
          <p className="mt-3 text-[11px] font-medium leading-relaxed text-gray-600">
            {preferredCell
              ? `${preferredCell.challenges} tracked reviews with avg ELI ${preferredCell.avgEstimatedLeverage.toFixed(1)}${preferredCell.avgRunExpectancyDelta !== null ? ` and ${preferredCell.avgRunExpectancyDelta >= 0 ? "+" : ""}${preferredCell.avgRunExpectancyDelta.toFixed(3)} RE` : ""}`
              : "No scenario trend yet."}
          </p>
        </div>
      </div>

      <div className="overflow-x-auto" onMouseMove={(event) => setMousePos({ x: event.clientX, y: event.clientY })}>
        <div
          className="grid min-w-[720px] gap-2"
          style={{ gridTemplateColumns: `180px repeat(${colLabels.length}, minmax(120px, 1fr))` }}
        >
          <div className="px-3 py-2" />
          {colLabels.map((label) => (
            <div key={label} className="px-3 py-2 text-center text-[10px] font-black uppercase tracking-widest text-gray-400">
              {label}
            </div>
          ))}

          {rowLabels.map((rowLabel) => (
            <Fragment key={rowLabel}>
              <div
                key={`${rowLabel}-header`}
                className="flex items-center px-3 py-4 text-[10px] font-black uppercase tracking-widest text-gray-500"
              >
                {rowLabel}
              </div>
              {colLabels.map((colLabel) => {
                const cell = cellMap.get(`${rowLabel}:${colLabel}`) ?? {
                  rowKey: "",
                  rowLabel,
                  colKey: "",
                  colLabel,
                  challenges: 0,
                  overturned: 0,
                  overturnRate: 0,
                  avgEstimatedLeverage: 0,
                  avgPositiveOutcomeDelta: null,
                  avgRunExpectancyDelta: null,
                  highPressureShare: 0,
                };
                const key = `${rowLabel}:${colLabel}`;
                const intensity = Math.min(1, cell.avgEstimatedLeverage / 100);

                return (
                  <button
                    key={key}
                    type="button"
                    onMouseEnter={() => setHoveredKey(key)}
                    onMouseLeave={() => setHoveredKey(null)}
                    className="rounded-2xl border border-gray-100 px-4 py-5 text-left transition-transform hover:-translate-y-0.5"
                    style={{
                      background: `linear-gradient(180deg, rgba(255,255,255,0.98) 0%, color-mix(in srgb, ${teamColor} ${
                        Math.max(8, Math.round(intensity * 42))
                      }%, white) 100%)`,
                    }}
                  >
                    <p className="text-2xl font-display leading-none text-gray-900">{cell.challenges}</p>
                    <p className="mt-2 text-[9px] font-black uppercase tracking-widest text-gray-500">
                      {cell.challenges === 1 ? "Challenge" : "Challenges"}
                    </p>
                    <p className="mt-3 text-xs font-medium text-gray-600">ELI {cell.avgEstimatedLeverage.toFixed(1)}</p>
                    <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-gray-400">
                      {(cell.overturnRate * 100).toFixed(0)}% overturned
                    </p>
                  </button>
                );
              })}
            </Fragment>
          ))}
        </div>
      </div>

      <p className="mt-5 text-[10px] font-medium uppercase tracking-[0.16em] text-gray-400">
        {viewMode === "org"
          ? "Cells show how often this club challenges in each scenario window. Color intensity follows average estimated leverage."
          : "Cells show where this team tends to use challenges. Darker cells indicate more pressure-packed spots."}
      </p>

      <AnimatePresence>
        {hoveredCell ? (
          <ChartTooltip
            usePortal
            portalProps={mousePos}
            title={`${hoveredCell.rowLabel} • ${hoveredCell.colLabel}`}
            value={hoveredCell.challenges}
            subValueLabel="Challenges"
            extra={[
              { label: "Overturned", value: hoveredCell.overturned },
              { label: "Overturn Rate", value: `${(hoveredCell.overturnRate * 100).toFixed(1)}%` },
              { label: "Avg ELI", value: hoveredCell.avgEstimatedLeverage.toFixed(1) },
              {
                label: viewMode === "org" ? "Avg RE Delta" : "Count Gain",
                value:
                  viewMode === "org"
                    ? hoveredCell.avgRunExpectancyDelta === null
                      ? "N/A"
                      : `${hoveredCell.avgRunExpectancyDelta >= 0 ? "+" : ""}${hoveredCell.avgRunExpectancyDelta.toFixed(3)} RE`
                    : hoveredCell.avgPositiveOutcomeDelta === null
                      ? "N/A"
                      : `${hoveredCell.avgPositiveOutcomeDelta >= 0 ? "+" : ""}${(hoveredCell.avgPositiveOutcomeDelta * 100).toFixed(1)} pts`,
              },
              {
                label: viewMode === "org" ? "Count Edge" : "Count Gain",
                value:
                  hoveredCell.avgPositiveOutcomeDelta === null
                    ? "N/A"
                    : `${hoveredCell.avgPositiveOutcomeDelta >= 0 ? "+" : ""}${(hoveredCell.avgPositiveOutcomeDelta * 100).toFixed(1)} pts`,
              },
              { label: "High Pressure", value: `${(hoveredCell.highPressureShare * 100).toFixed(0)}%` },
            ]}
          />
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function SummaryPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-gray-50/60 px-4 py-3">
      <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">{label}</p>
      <p className="mt-1 text-lg font-display text-gray-900">{value}</p>
    </div>
  );
}
