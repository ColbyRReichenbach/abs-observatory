"use client";

import Link from "next/link";
import { Fragment, useMemo, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { ProfileBadge } from "../ui/profile-badge";
import { withViewModeHref } from "@/lib/view-mode-href";

type UmpireLeaderboardRow = {
  umpireId: number;
  umpireName: string;
  challengedCalls: number;
  overturnedCalls: number;
  overturnRate: number;
  overturnRateVariance: number;
  recentOverturnRate: number | null;
  reportCardScore: number;
  grade: string;
  riskTier: string;
  orgDescriptor: string;
  fanDescriptor: string;
  confidence: "low" | "medium" | "high";
  gamesWorked: number;
};

type UmpireLeaderboardTableProps = {
  range: string;
  viewMode: "org" | "fan";
  umpires: UmpireLeaderboardRow[];
  insertAt: number;
  totalChallenged: number;
  totalOverturned: number;
  totalGames: number;
  leagueAvgRate: number;
};

const DEFAULT_VISIBLE_ROWS = 10;

export function UmpireLeaderboardTable({
  range,
  viewMode,
  umpires,
  insertAt,
  totalChallenged,
  totalOverturned,
  totalGames,
  leagueAvgRate,
}: UmpireLeaderboardTableProps) {
  const [showAll, setShowAll] = useState(false);

  const visibleUmpires = useMemo(
    () => (showAll ? umpires : umpires.slice(0, DEFAULT_VISIBLE_ROWS)),
    [showAll, umpires],
  );
  const showToggle = umpires.length > DEFAULT_VISIBLE_ROWS;
  const showAverageRow = insertAt <= visibleUmpires.length;
  const columnCount = 6;
  const avgVariance =
    umpires.length > 0 ? umpires.reduce((sum, umpire) => sum + umpire.overturnRateVariance, 0) / umpires.length : 0;
  const recentRates = umpires.filter((umpire) => umpire.recentOverturnRate !== null);
  const avgRecentOverturnRate =
    recentRates.length > 0
      ? recentRates.reduce((sum, umpire) => sum + (umpire.recentOverturnRate ?? 0), 0) / recentRates.length
      : null;
  const avgRecentDrift = avgRecentOverturnRate === null ? null : avgRecentOverturnRate - leagueAvgRate;

  return (
    <div className="panel overflow-hidden border-gray-100 bg-white shadow-2xl shadow-black/[0.03]">
      <div className="overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th className="min-w-[180px]">Rank & Name</th>
              <th className="text-center">Challenges</th>
              <th className="text-center">{viewMode === "org" ? "Variance" : "Volatility"}</th>
              <th className="text-center">OT Rate</th>
              <th className="text-center">{viewMode === "org" ? "Recent Drift" : "Read"}</th>
              <th className="text-right">Games</th>
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
                        {Math.round(totalChallenged / (umpires.length || 1))}
                      </td>
                      <td className="text-center font-mono font-bold italic text-gray-400">
                        {viewMode === "org" ? avgVariance.toFixed(2) : "Moderate"}
                      </td>
                      <td className="text-center">
                        <OverturnRateChip value={leagueAvgRate} italic={viewMode === "org"} />
                      </td>
                      <td className="text-center">
                        {viewMode === "org" ? (
                          <DriftChip drift={avgRecentDrift} italic />
                        ) : (
                          <span className="text-[10px] text-[var(--ink-3)]">—</span>
                        )}
                      </td>
                      <td className="pr-8 text-right font-mono font-medium italic text-gray-400">
                        {Math.round(totalGames / (umpires.length || 1))}
                      </td>
                    </tr>
                  ) : null}
                  <tr className="group/row transition-colors hover:bg-gray-50/50">
                    <td>
                      <Link href={withViewModeHref(`/umpires/${umpire.umpireId}?range=${range}`, viewMode)} className="flex items-center gap-5 py-1">
                        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gray-50 text-[10px] font-black text-gray-400 transition-all transform group-hover/row:scale-110 group-hover/row:bg-black group-hover/row:text-white">
                          {(idx + 1).toString().padStart(2, "0")}
                        </span>
                        <span className="font-black tracking-tight text-gray-900 transition-colors group-hover/row:text-blue-600">
                          {umpire.umpireName}
                        </span>
                      </Link>
                    </td>
                    <td className="text-center font-mono font-bold text-gray-500">
                      {umpire.challengedCalls}
                    </td>
                    <td className="text-center font-mono font-bold text-gray-500">
                      {viewMode === "org" ? umpire.overturnRateVariance.toFixed(2) : umpire.riskTier}
                    </td>
                    <td className="text-center">
                      <OverturnRateChip value={umpire.overturnRate} />
                    </td>
                    <td className="text-center">
                      {viewMode === "org" ? (
                        <DriftChip
                          drift={
                            umpire.recentOverturnRate === null
                              ? null
                              : umpire.recentOverturnRate - umpire.overturnRate
                          }
                        />
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
                  {Math.round(totalChallenged / (umpires.length || 1))}
                </td>
                <td className="text-center font-mono font-bold italic text-gray-400">
                  {viewMode === "org" ? avgVariance.toFixed(2) : "Moderate"}
                </td>
                <td className="text-center">
                  <OverturnRateChip value={leagueAvgRate} italic={viewMode === "org"} />
                </td>
                <td className="text-center">
                  {viewMode === "org" ? (
                    <DriftChip drift={avgRecentDrift} italic />
                  ) : (
                    <span className="text-[10px] text-[var(--ink-3)]">—</span>
                  )}
                </td>
                <td className="pr-8 text-right font-mono font-medium italic text-gray-400">
                  {Math.round(totalGames / (umpires.length || 1))}
                </td>
              </tr>
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
            {showAll ? "Show Less" : `View All Umpires (${umpires.length})`}
            {showAll ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
        </div>
      ) : null}
    </div>
  );
}

function OverturnRateChip({ value, italic = false }: { value: number; italic?: boolean }) {
  const pct = value * 100;
  const isHigh = pct >= 55;
  const isMiddle = pct >= 45;

  return (
    <span
      className={`inline-flex rounded-xl border px-3 py-1.5 text-[10px] font-black font-mono uppercase tracking-widest shadow-sm ${italic ? "italic" : ""} ${
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
      <ProfileBadge
        label={label}
        variant="blue"
      />
    </div>
  );
}

function DriftChip({ drift, italic = false }: { drift: number | null; italic?: boolean }) {
  if (drift === null) {
    return <span className="text-[10px] text-[var(--ink-3)]">No recent split</span>;
  }

  const driftPct = drift * 100;
  const absDrift = Math.abs(driftPct);
  const tone =
    driftPct >= 5
      ? "border-amber-100 bg-amber-50 text-amber-700"
      : driftPct <= -5
        ? "border-emerald-100 bg-emerald-50 text-emerald-700"
        : "border-gray-200 bg-gray-50 text-gray-600";

  return (
    <span
      className={`inline-flex rounded-xl border px-3 py-1.5 text-[10px] font-black font-mono uppercase tracking-widest shadow-sm ${italic ? "italic" : ""} ${tone}`}
    >
      {driftPct > 0 ? "+" : driftPct < 0 ? "−" : "±"}
      {absDrift.toFixed(1)} pts
    </span>
  );
}
