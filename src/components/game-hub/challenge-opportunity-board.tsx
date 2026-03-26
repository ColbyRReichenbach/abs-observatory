"use client";

import { Fragment, useMemo, useState } from "react";
import { AnimatePresence } from "framer-motion";

import { ChartTooltip } from "@/components/ui/chart-tooltip";
import type { GameChallengeOpportunityBoard } from "@/lib/types";

export function ChallengeOpportunityBoard({
  board,
  viewMode,
}: {
  board: GameChallengeOpportunityBoard;
  viewMode: "fan" | "org";
}) {
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const rowLabels = useMemo(() => Array.from(new Set(board.cells.map((cell) => cell.rowLabel))), [board.cells]);
  const colLabels = useMemo(() => Array.from(new Set(board.cells.map((cell) => cell.colLabel))), [board.cells]);
  const cellMap = useMemo(() => new Map(board.cells.map((cell) => [`${cell.rowLabel}:${cell.colLabel}`, cell])), [board.cells]);
  const hovered = hoveredKey ? cellMap.get(hoveredKey) ?? null : null;
  const populatedCells = useMemo(
    () => board.cells.filter((cell) => cell.homeChallenges + cell.awayChallenges > 0),
    [board.cells],
  );
  const flashpointCell = useMemo(
    () =>
      [...populatedCells].sort((left, right) => {
        const usageDiff =
          right.homeChallenges + right.awayChallenges - (left.homeChallenges + left.awayChallenges);
        if (usageDiff !== 0) return usageDiff;
        return (
          Math.max(right.homeAvgEstimatedLeverage, right.awayAvgEstimatedLeverage) -
          Math.max(left.homeAvgEstimatedLeverage, left.awayAvgEstimatedLeverage)
        );
      })[0] ?? null,
    [populatedCells],
  );
  const homeWindow = useMemo(
    () =>
      [...board.cells]
        .filter((cell) => cell.homeChallenges > 0)
        .sort((left, right) => {
          if (right.homeChallenges !== left.homeChallenges) {
            return right.homeChallenges - left.homeChallenges;
          }
          return right.homeAvgEstimatedLeverage - left.homeAvgEstimatedLeverage;
        })[0] ?? null,
    [board.cells],
  );
  const awayWindow = useMemo(
    () =>
      [...board.cells]
        .filter((cell) => cell.awayChallenges > 0)
        .sort((left, right) => {
          if (right.awayChallenges !== left.awayChallenges) {
            return right.awayChallenges - left.awayChallenges;
          }
          return right.awayAvgEstimatedLeverage - left.awayAvgEstimatedLeverage;
        })[0] ?? null,
    [board.cells],
  );

  return (
    <div className="panel p-8 shadow-2xl shadow-black/[0.02] border border-gray-50 bg-white">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h4 className="text-[10px] font-bold uppercase tracking-widest text-blue-500 mb-1">
            {viewMode === "org" ? "Pregame Decision Windows" : "Where Tonight Could Swing"}
          </h4>
          <p className="text-2xl font-display leading-none text-gray-900">
            Challenge <span className="text-gray-400">Opportunity Board</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-[10px] font-black uppercase tracking-widest text-gray-400">
          <LegendSwatch color={board.homePrimaryColor ?? "#3b82f6"} label={board.homeAbbreviation ?? "HOME"} />
          <LegendSwatch color={board.awayPrimaryColor ?? "#8b5cf6"} label={board.awayAbbreviation ?? "AWAY"} />
        </div>
      </div>

      <div className="mb-6 grid gap-3 lg:grid-cols-3">
        <InsightCard
          eyebrow={viewMode === "org" ? "Most Used Shared Window" : "Most Common Shared Window"}
          title={flashpointCell ? `${flashpointCell.rowLabel} • ${flashpointCell.colLabel}` : "Window pending"}
          detail={
            flashpointCell
              ? `${flashpointCell.homeChallenges + flashpointCell.awayChallenges} combined reviews tracked`
              : "Historical challenge windows will fill in as sample grows."
          }
        />
        <InsightCard
          eyebrow={`${board.homeAbbreviation ?? "HOME"} Usage Lean`}
          title={homeWindow ? `${homeWindow.rowLabel} • ${homeWindow.colLabel}` : "No clear lean"}
          detail={
            homeWindow
              ? `${homeWindow.homeChallenges} tracked reviews, avg ELI ${homeWindow.homeAvgEstimatedLeverage.toFixed(1)}`
              : "No tracked reviews in this matchup sample."
          }
          accent={board.homePrimaryColor ?? "#3b82f6"}
        />
        <InsightCard
          eyebrow={`${board.awayAbbreviation ?? "AWAY"} Usage Lean`}
          title={awayWindow ? `${awayWindow.rowLabel} • ${awayWindow.colLabel}` : "No clear lean"}
          detail={
            awayWindow
              ? `${awayWindow.awayChallenges} tracked reviews, avg ELI ${awayWindow.awayAvgEstimatedLeverage.toFixed(1)}`
              : "No tracked reviews in this matchup sample."
          }
          accent={board.awayPrimaryColor ?? "#8b5cf6"}
        />
      </div>

      <div className="overflow-x-auto" onMouseMove={(event) => setMousePos({ x: event.clientX, y: event.clientY })}>
        <div
          className="grid min-w-[760px] gap-2"
          style={{ gridTemplateColumns: `180px repeat(${colLabels.length}, minmax(130px, 1fr))` }}
        >
          <div className="px-3 py-2" />
          {colLabels.map((label) => (
            <div key={label} className="px-3 py-2 text-center text-[10px] font-black uppercase tracking-widest text-gray-400">
              {label}
            </div>
          ))}

          {rowLabels.map((rowLabel) => (
            <Fragment key={rowLabel}>
              <div className="flex items-center px-3 py-4 text-[10px] font-black uppercase tracking-widest text-gray-500">
                {rowLabel}
              </div>
              {colLabels.map((colLabel) => {
                const cell = cellMap.get(`${rowLabel}:${colLabel}`);
                const intensity = Math.max(
                  (cell?.homeAvgEstimatedLeverage ?? 0) / 100,
                  (cell?.awayAvgEstimatedLeverage ?? 0) / 100,
                );
                return (
                  <button
                    key={`${rowLabel}:${colLabel}`}
                    type="button"
                    onMouseEnter={() => setHoveredKey(`${rowLabel}:${colLabel}`)}
                    onMouseLeave={() => setHoveredKey(null)}
                    className="rounded-2xl border border-gray-100 px-4 py-4 text-left transition-transform hover:-translate-y-0.5"
                    style={{
                      background: `linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(243,244,246,${
                        0.72 + intensity * 0.18
                      }) 100%)`,
                    }}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <MiniTeamValue
                        label={board.homeAbbreviation ?? "HOME"}
                        color={board.homePrimaryColor ?? "#3b82f6"}
                        count={cell?.homeChallenges ?? 0}
                      />
                      <MiniTeamValue
                        label={board.awayAbbreviation ?? "AWAY"}
                        color={board.awayPrimaryColor ?? "#8b5cf6"}
                        count={cell?.awayChallenges ?? 0}
                        align="right"
                      />
                    </div>
                    <p className="mt-4 text-[9px] font-black uppercase tracking-widest text-gray-400">
                      {viewMode === "org" ? "Combined Usage" : "Total Challenges"}
                    </p>
                    <p className="mt-1 text-lg font-display text-gray-900">
                      {(cell?.homeChallenges ?? 0) + (cell?.awayChallenges ?? 0)}
                    </p>
                    <p className="mt-3 text-[9px] font-black uppercase tracking-widest text-gray-400">
                      {viewMode === "org" ? "Avg ELI" : "Leverage"}
                    </p>
                    <p className="mt-1 text-sm font-medium text-gray-700">
                      H {cell?.homeAvgEstimatedLeverage.toFixed(1) ?? "0.0"} • A {cell?.awayAvgEstimatedLeverage.toFixed(1) ?? "0.0"}
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
          ? "Cells compare where each club historically spends reviews and how leveraged those windows usually are."
          : "Cells compare where each club tends to challenge and which situations usually carry higher estimated leverage."}
      </p>

      <AnimatePresence>
        {hovered ? (
          <ChartTooltip
            usePortal
            portalProps={mousePos}
            title={`${hovered.rowLabel} • ${hovered.colLabel}`}
            extra={[
              {
                label: `${board.homeAbbreviation ?? "HOME"} Uses`,
                value: hovered.homeChallenges,
                color: board.homePrimaryColor ?? "#3b82f6",
              },
              {
                label: `${board.awayAbbreviation ?? "AWAY"} Uses`,
                value: hovered.awayChallenges,
                color: board.awayPrimaryColor ?? "#8b5cf6",
              },
              {
                label: `${board.homeAbbreviation ?? "HOME"} Avg ELI`,
                value: hovered.homeAvgEstimatedLeverage.toFixed(1),
              },
              {
                label: `${board.awayAbbreviation ?? "AWAY"} Avg ELI`,
                value: hovered.awayAvgEstimatedLeverage.toFixed(1),
              },
              {
                label: `${board.homeAbbreviation ?? "HOME"} High Leverage`,
                value: `${(hovered.homeHighPressureShare * 100).toFixed(0)}%`,
              },
              {
                label: `${board.awayAbbreviation ?? "AWAY"} High Leverage`,
                value: `${(hovered.awayHighPressureShare * 100).toFixed(0)}%`,
              },
            ]}
          />
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function MiniTeamValue({
  label,
  color,
  count,
  align = "left",
}: {
  label: string;
  color: string;
  count: number;
  align?: "left" | "right";
}) {
  return (
    <div className={`flex flex-col ${align === "right" ? "items-end text-right" : "items-start"}`}>
      <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">{label}</span>
      <span className="mt-1 text-xl font-display leading-none" style={{ color }}>
        {count}
      </span>
    </div>
  );
}

function LegendSwatch({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-3 w-3 rounded-full" style={{ backgroundColor: color }} />
      <span>{label}</span>
    </div>
  );
}

function InsightCard({
  eyebrow,
  title,
  detail,
  accent = "#111827",
}: {
  eyebrow: string;
  title: string;
  detail: string;
  accent?: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-gray-50/60 px-4 py-4">
      <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">{eyebrow}</p>
      <p className="mt-2 text-base font-display leading-tight text-gray-900">{title}</p>
      <p className="mt-2 text-[11px] font-medium leading-relaxed text-gray-600">
        <span className="font-black" style={{ color: accent }}>
          {detail}
        </span>
      </p>
    </div>
  );
}
