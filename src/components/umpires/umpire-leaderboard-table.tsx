"use client";

import Link from "next/link";
import { Fragment, useMemo, useState } from "react";
import { ChevronDown, ChevronUp, ChevronsUpDown, RotateCcw } from "lucide-react";

import { ProfileBadge } from "../ui/profile-badge";
import {
  compareUmpiresForDefaultSort,
  getUmpireSampleTierLabel,
  getUmpireSampleTierRank,
} from "@/lib/umpire-ranking";
import type { RangeKey } from "@/lib/types";
import { withViewModeHref } from "@/lib/view-mode-href";

type UmpireLeaderboardRow = {
  umpireId: number;
  umpireName: string;
  challengedCalls: number;
  overturnedCalls: number;
  overturnRate: number;
  overturnRateVariance: number;
  recentOverturnRate: number | null;
  riskTier: string;
  fanDescriptor: string;
  gamesWorked: number;
  reportCardScore: number;
  averageRunExpectancyDelta: number | null;
  averageWinExpectancyDelta: number | null;
};

type SortDirection = "asc" | "desc";
type UmpireSortKey = "default" | "name" | "challenges" | "otRate" | "variance" | "read" | "avgRe" | "avgWe" | "games";

type UmpireLeaderboardTableProps = {
  range: RangeKey;
  viewMode: "org" | "fan";
  umpires: UmpireLeaderboardRow[];
};

const DEFAULT_VISIBLE_ROWS = 10;

export function UmpireLeaderboardTable({ range, viewMode, umpires }: UmpireLeaderboardTableProps) {
  const [showAll, setShowAll] = useState(false);
  const [sort, setSort] = useState<{ key: UmpireSortKey; direction: SortDirection }>({
    key: "default",
    direction: "desc",
  });

  const sortedUmpires = useMemo(
    () => sortUmpires(umpires, range, viewMode, sort.key, sort.direction),
    [range, sort.direction, sort.key, umpires, viewMode],
  );
  const visibleUmpires = useMemo(
    () => (showAll ? sortedUmpires : sortedUmpires.slice(0, DEFAULT_VISIBLE_ROWS)),
    [showAll, sortedUmpires],
  );
  const showToggle = sortedUmpires.length > DEFAULT_VISIBLE_ROWS;

  const totalChallenged = umpires.reduce((sum, umpire) => sum + umpire.challengedCalls, 0);
  const totalOverturned = umpires.reduce((sum, umpire) => sum + umpire.overturnedCalls, 0);
  const totalGames = umpires.reduce((sum, umpire) => sum + umpire.gamesWorked, 0);
  const leagueAvgRate = totalChallenged > 0 ? totalOverturned / totalChallenged : 0;
  const avgRunValue = averageNullableMetric(umpires.map((umpire) => umpire.averageRunExpectancyDelta));
  const avgWinValue = averageNullableMetric(umpires.map((umpire) => umpire.averageWinExpectancyDelta));
  const avgVariance = averageMetric(umpires.map((umpire) => umpire.overturnRateVariance));
  const averageMetricValue = getAverageForSort(sort.key, umpires, viewMode, leagueAvgRate);
  const insertAt = averageMetricValue === null ? -1 : getAverageInsertIndex(sortedUmpires, sort.key, sort.direction, viewMode, averageMetricValue);
  const showAverageRow = insertAt >= 0 && insertAt <= visibleUmpires.length;
  const columnCount = 6;

  const applySort = (key: UmpireSortKey) => {
    setSort((current) => {
      if (current.key === key) {
        return { key, direction: current.direction === "asc" ? "desc" : "asc" };
      }
      return { key, direction: getInitialDirection(key) };
    });
  };

  return (
    <div className="panel overflow-hidden border-gray-100 bg-white shadow-2xl shadow-black/[0.03]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-black/5 px-6 py-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-blue-600">Default Sort</p>
          <p className="mt-1 text-sm font-semibold text-[var(--ink-2)]">
            Qualified samples first, then the umpires with the most challenge evidence.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setSort({ key: "default", direction: "desc" })}
          className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-[10px] font-black uppercase tracking-widest text-[var(--ink-2)] shadow-sm transition hover:border-blue-200 hover:text-blue-700"
        >
          <RotateCcw size={12} />
          Meaningful Samples
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <SortableHeader label="Rank & Name" sortKey="name" activeSort={sort} onSort={applySort} className="min-w-[220px]" />
              <SortableHeader label="Challenges" sortKey="challenges" activeSort={sort} onSort={applySort} align="center" />
              <SortableHeader label="OT Rate" sortKey="otRate" activeSort={sort} onSort={applySort} align="center" />
              <SortableHeader
                label={viewMode === "org" ? "Avg RE Δ" : "Volatility"}
                sortKey={viewMode === "org" ? "avgRe" : "variance"}
                activeSort={sort}
                onSort={applySort}
                align="center"
              />
              <SortableHeader
                label={viewMode === "org" ? "Avg WE Δ" : "Read"}
                sortKey={viewMode === "org" ? "avgWe" : "read"}
                activeSort={sort}
                onSort={applySort}
                align="center"
              />
              <SortableHeader label="Games" sortKey="games" activeSort={sort} onSort={applySort} align="right" />
            </tr>
          </thead>
          <tbody>
            {umpires.length === 0 ? (
              <tr>
                <td colSpan={columnCount} className="!py-32 text-center font-semibold text-gray-400">
                  Discovery in progress. No data points for this selection.
                </td>
              </tr>
            ) : null}
            {visibleUmpires.map((umpire, idx) => {
              const isBeforeAvg = showAverageRow && idx === insertAt;
              return (
                <Fragment key={umpire.umpireId}>
                  {isBeforeAvg ? (
                    <AverageRow
                      umpireCount={umpires.length}
                      totalChallenged={totalChallenged}
                      totalGames={totalGames}
                      leagueAvgRate={leagueAvgRate}
                      avgRunValue={avgRunValue}
                      avgWinValue={avgWinValue}
                      avgVariance={avgVariance}
                      viewMode={viewMode}
                    />
                  ) : null}
                  <tr className="group/row transition-colors hover:bg-gray-50/50">
                    <td>
                      <Link
                        href={withViewModeHref(`/umpires/${umpire.umpireId}?range=${range}`, viewMode)}
                        className="flex items-center gap-5 py-1"
                      >
                        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gray-50 text-[10px] font-black text-gray-400 transition-all group-hover/row:scale-110 group-hover/row:bg-black group-hover/row:text-white">
                          {(idx + 1).toString().padStart(2, "0")}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate font-black tracking-tight text-gray-900 transition-colors group-hover/row:text-blue-600">
                            {umpire.umpireName}
                          </span>
                          <span className="mt-1 block text-[9px] font-black uppercase tracking-[0.12em] text-[var(--ink-3)]">
                            {getUmpireSampleTierLabel(umpire.challengedCalls, range)}
                          </span>
                        </span>
                      </Link>
                    </td>
                    <td className="text-center font-mono font-bold text-gray-500">{umpire.challengedCalls}</td>
                    <td className="text-center">
                      <OverturnRateChip value={umpire.overturnRate} />
                    </td>
                    <td className="text-center">
                      {viewMode === "org" ? (
                        <ValueDeltaChip value={umpire.averageRunExpectancyDelta} kind="re" />
                      ) : (
                        <DescriptorChip label={umpire.riskTier} />
                      )}
                    </td>
                    <td className="text-center">
                      {viewMode === "org" ? (
                        <ValueDeltaChip value={umpire.averageWinExpectancyDelta} kind="we" />
                      ) : (
                        <DescriptorChip label={umpire.fanDescriptor} />
                      )}
                    </td>
                    <td className="pr-8 text-right font-mono font-medium text-gray-400">{umpire.gamesWorked}</td>
                  </tr>
                </Fragment>
              );
            })}
            {showAverageRow && insertAt === visibleUmpires.length && umpires.length > 0 ? (
              <AverageRow
                umpireCount={umpires.length}
                totalChallenged={totalChallenged}
                totalGames={totalGames}
                leagueAvgRate={leagueAvgRate}
                avgRunValue={avgRunValue}
                avgWinValue={avgWinValue}
                avgVariance={avgVariance}
                viewMode={viewMode}
              />
            ) : null}
          </tbody>
        </table>
      </div>

      {showToggle ? (
        <div className="border-t border-black/5 px-6 py-5 text-center">
          <button
            type="button"
            onClick={() => setShowAll((current) => !current)}
            className="inline-flex items-center gap-2 rounded-full bg-black px-6 py-2 text-[10px] font-black uppercase tracking-widest text-white shadow-xl shadow-black/10 transition-all hover:scale-105 active:scale-95"
          >
            {showAll ? "Show Less" : `View All Umpires (${sortedUmpires.length})`}
            {showAll ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
        </div>
      ) : null}
    </div>
  );
}

function SortableHeader({
  label,
  sortKey,
  activeSort,
  onSort,
  align = "left",
  className = "",
}: {
  label: string;
  sortKey: UmpireSortKey;
  activeSort: { key: UmpireSortKey; direction: SortDirection };
  onSort: (key: UmpireSortKey) => void;
  align?: "left" | "center" | "right";
  className?: string;
}) {
  const active = activeSort.key === sortKey;
  const justify = align === "right" ? "justify-end" : align === "center" ? "justify-center" : "justify-start";
  const textAlign = align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left";

  return (
    <th className={`${className} ${textAlign}`}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={`inline-flex w-full items-center gap-1.5 ${justify} text-inherit transition hover:text-blue-600`}
      >
        <span>{label}</span>
        {active ? (
          activeSort.direction === "asc" ? <ChevronUp size={12} /> : <ChevronDown size={12} />
        ) : (
          <ChevronsUpDown size={12} className="opacity-35" />
        )}
      </button>
    </th>
  );
}

function AverageRow({
  umpireCount,
  totalChallenged,
  totalGames,
  leagueAvgRate,
  avgRunValue,
  avgWinValue,
  avgVariance,
  viewMode,
}: {
  umpireCount: number;
  totalChallenged: number;
  totalGames: number;
  leagueAvgRate: number;
  avgRunValue: number | null;
  avgWinValue: number | null;
  avgVariance: number;
  viewMode: "org" | "fan";
}) {
  return (
    <tr className="border-y border-[var(--border-subtle)] bg-[var(--surface-1)]">
      <td>
        <div className="flex items-center gap-5 py-1">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gray-100 text-[10px] font-black text-gray-400">
            —
          </span>
          <span className="font-bold italic tracking-tight text-gray-500">Umpire Average</span>
        </div>
      </td>
      <td className="text-center font-mono font-bold italic text-gray-400">
        {Math.round(totalChallenged / Math.max(1, umpireCount))}
      </td>
      <td className="text-center">
        <OverturnRateChip value={leagueAvgRate} italic />
      </td>
      <td className="text-center">
        {viewMode === "org" ? (
          <ValueDeltaChip value={avgRunValue} kind="re" italic />
        ) : (
          <span className="font-mono text-[10px] font-bold italic text-[var(--ink-3)]">{avgVariance.toFixed(2)}</span>
        )}
      </td>
      <td className="text-center">
        {viewMode === "org" ? (
          <ValueDeltaChip value={avgWinValue} kind="we" italic />
        ) : (
          <span className="text-[10px] italic text-[var(--ink-3)]">—</span>
        )}
      </td>
      <td className="pr-8 text-right font-mono font-medium italic text-gray-400">
        {Math.round(totalGames / Math.max(1, umpireCount))}
      </td>
    </tr>
  );
}

function sortUmpires(
  rows: UmpireLeaderboardRow[],
  range: RangeKey,
  viewMode: "fan" | "org",
  sortKey: UmpireSortKey,
  direction: SortDirection,
) {
  return [...rows].sort((left, right) => {
    if (sortKey === "default") {
      return compareUmpiresForDefaultSort(left, right, range, viewMode);
    }

    if (sortKey !== "name" && sortKey !== "challenges") {
      const leftTier = getUmpireSampleTierRank(left.challengedCalls, range);
      const rightTier = getUmpireSampleTierRank(right.challengedCalls, range);
      if (leftTier !== rightTier) return leftTier - rightTier;
    }

    const compared = compareSortValues(getSortValue(left, sortKey, viewMode), getSortValue(right, sortKey, viewMode));
    if (compared !== 0) return direction === "asc" ? compared : -compared;

    return compareUmpiresForDefaultSort(left, right, range, viewMode);
  });
}

function compareSortValues(left: string | number | null, right: string | number | null) {
  if (left === null && right === null) return 0;
  if (left === null) return -1;
  if (right === null) return 1;
  if (typeof left === "string" || typeof right === "string") {
    return String(left).localeCompare(String(right));
  }
  return left - right;
}

function getSortValue(row: UmpireLeaderboardRow, key: UmpireSortKey, viewMode: "fan" | "org"): string | number | null {
  if (key === "name") return row.umpireName;
  if (key === "challenges" || key === "default") return row.challengedCalls;
  if (key === "otRate") return row.overturnRate;
  if (key === "variance") return row.overturnRateVariance;
  if (key === "read") return row.reportCardScore;
  if (key === "avgRe") return viewMode === "org" ? row.averageRunExpectancyDelta : null;
  if (key === "avgWe") return viewMode === "org" ? row.averageWinExpectancyDelta : null;
  if (key === "games") return row.gamesWorked;
  return null;
}

function getAverageForSort(
  key: UmpireSortKey,
  rows: UmpireLeaderboardRow[],
  viewMode: "fan" | "org",
  leagueAvgRate: number,
) {
  if (key === "default" || key === "challenges") return averageMetric(rows.map((row) => row.challengedCalls));
  if (key === "otRate") return leagueAvgRate;
  if (key === "variance") return averageMetric(rows.map((row) => row.overturnRateVariance));
  if (key === "avgRe" && viewMode === "org") return averageNullableMetric(rows.map((row) => row.averageRunExpectancyDelta));
  if (key === "avgWe" && viewMode === "org") return averageNullableMetric(rows.map((row) => row.averageWinExpectancyDelta));
  if (key === "games") return averageMetric(rows.map((row) => row.gamesWorked));
  return null;
}

function getAverageInsertIndex(
  rows: UmpireLeaderboardRow[],
  key: UmpireSortKey,
  direction: SortDirection,
  viewMode: "fan" | "org",
  average: number,
) {
  const index = rows.findIndex((row) => {
    const value = getSortValue(row, key === "default" ? "challenges" : key, viewMode);
    if (typeof value !== "number") return false;
    return direction === "asc" ? value > average : value < average;
  });
  return index === -1 ? rows.length : index;
}

function getInitialDirection(key: UmpireSortKey): SortDirection {
  return key === "name" ? "asc" : "desc";
}

function OverturnRateChip({ value, italic = false }: { value: number; italic?: boolean }) {
  const pct = value * 100;
  const isHigh = pct >= 55;
  const isMiddle = pct >= 45;

  return (
    <span
      className={`inline-flex rounded-xl border px-3 py-1.5 font-mono text-[10px] font-black uppercase tracking-widest shadow-sm ${italic ? "italic" : ""} ${
        isHigh
          ? "border-amber-100 bg-amber-50 text-amber-700"
          : isMiddle
            ? "border-gray-200 bg-gray-50 text-gray-600"
            : "border-emerald-100 bg-emerald-50 text-emerald-700"
      }`}
    >
      {pct.toFixed(1)}%
    </span>
  );
}

function DescriptorChip({ label }: { label: string }) {
  return (
    <div className="flex justify-center">
      <ProfileBadge label={label} variant="blue" />
    </div>
  );
}

function ValueDeltaChip({
  value,
  kind,
  italic = false,
}: {
  value: number | null;
  kind: "re" | "we";
  italic?: boolean;
}) {
  if (value === null) {
    return <span className="text-[10px] text-[var(--ink-3)]">N/A</span>;
  }

  const scaled = kind === "we" ? value * 100 : value;
  const tone =
    scaled >= (kind === "we" ? 0.5 : 0.02)
      ? "border-amber-100 bg-amber-50 text-amber-700"
      : scaled <= (kind === "we" ? -0.5 : -0.02)
        ? "border-emerald-100 bg-emerald-50 text-emerald-700"
        : "border-gray-200 bg-gray-50 text-gray-600";

  return (
    <span
      className={`inline-flex rounded-xl border px-3 py-1.5 font-mono text-[10px] font-black uppercase tracking-widest shadow-sm ${italic ? "italic" : ""} ${tone}`}
    >
      {kind === "we"
        ? `${scaled >= 0 ? "+" : ""}${scaled.toFixed(2)}%`
        : `${scaled >= 0 ? "+" : ""}${scaled.toFixed(3)}`}
    </span>
  );
}

function averageMetric(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function averageNullableMetric(values: Array<number | null>) {
  const present = values.filter((value): value is number => value !== null);
  if (present.length === 0) return null;
  return present.reduce((sum, value) => sum + value, 0) / present.length;
}
