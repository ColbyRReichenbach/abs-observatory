"use client";

import Link from "next/link";
import { Fragment, useMemo, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { ProfileBadge } from "../ui/profile-badge";

type UmpireLeaderboardRow = {
  umpireId: number;
  umpireName: string;
  challengedCalls: number;
  overturnedCalls: number;
  overturnRate: number;
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
  const columnCount = viewMode === "org" ? 7 : 6;

  return (
    <div className="panel overflow-hidden border-gray-100 bg-white shadow-2xl shadow-black/[0.03]">
      <div className="overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th className="min-w-[180px]">Rank & Name</th>
              <th className="text-center">{viewMode === "org" ? "Challenges" : "Challenges"}</th>
              <th className="text-center">{viewMode === "org" ? "Overturned" : "Volatility"}</th>
              <th className="text-center">{viewMode === "org" ? "Report Card" : "OT Rate"}</th>
              <th className="text-center">{viewMode === "org" ? "Profile" : "Read"}</th>
              {viewMode === "org" ? <th className="text-center">Confidence</th> : null}
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
                        {viewMode === "org" ? Math.round(totalOverturned / (umpires.length || 1)) : "-"}
                      </td>
                      <td className="text-center">
                        <span className="inline-flex rounded-xl border border-gray-200 bg-gray-50 px-3 py-1.5 text-[10px] font-black font-mono uppercase tracking-widest text-gray-500 shadow-sm italic">
                          {(leagueAvgRate * 100).toFixed(1)}%
                        </span>
                      </td>
                      <td className="text-center">
                        <span className="text-[10px] text-[var(--ink-3)]">—</span>
                      </td>
                      {viewMode === "org" ? (
                        <td className="text-center">
                          <span className="text-[10px] text-[var(--ink-3)]">—</span>
                        </td>
                      ) : null}
                      <td className="pr-8 text-right font-mono font-medium italic text-gray-400">
                        {Math.round(totalGames / (umpires.length || 1))}
                      </td>
                    </tr>
                  ) : null}
                  <tr
                    className={`group/row transition-colors hover:bg-gray-50/50 ${viewMode === "fan" && umpire.confidence === "low" ? "opacity-70" : ""}`}
                  >
                    <td>
                      <Link href={`/umpires/${umpire.umpireId}?range=${range}`} className="flex items-center gap-5 py-1">
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
                      {viewMode === "org" ? umpire.overturnedCalls : umpire.riskTier}
                    </td>
                    <td className="text-center">
                      {viewMode === "org" ? (
                        <GradeChip grade={umpire.grade} value={umpire.overturnRate} />
                      ) : (
                        <OverturnRateChip value={umpire.overturnRate} />
                      )}
                    </td>
                    <td className="text-center">
                      <DescriptorChip
                        label={viewMode === "org" ? `${umpire.orgDescriptor} · ${umpire.riskTier}` : `${umpire.grade} ${umpire.fanDescriptor}`}
                      />
                    </td>
                    {viewMode === "org" ? (
                      <td className="text-center">
                        <ConfidenceIndicator label={umpire.confidence} />
                      </td>
                    ) : null}
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
                  {viewMode === "org" ? Math.round(totalOverturned / (umpires.length || 1)) : "-"}
                </td>
                <td className="text-center">
                  <span className="inline-flex rounded-xl border border-gray-200 bg-gray-50 px-3 py-1.5 text-[10px] font-black font-mono uppercase tracking-widest text-gray-500 shadow-sm italic">
                    {(leagueAvgRate * 100).toFixed(1)}%
                  </span>
                </td>
                <td className="text-center">
                  <span className="text-[10px] text-[var(--ink-3)]">—</span>
                </td>
                {viewMode === "org" ? (
                  <td className="text-center">
                    <span className="text-[10px] text-[var(--ink-3)]">—</span>
                  </td>
                ) : null}
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

function GradeChip({ grade, value }: { grade: string; value: number }) {
  const pct = value * 100;
  const isStrong = grade === "A" || grade === "B";
  const isMiddle = grade === "C";

  return (
    <span
      className={`inline-flex rounded-xl border px-3 py-1.5 text-[10px] font-black font-mono uppercase tracking-widest shadow-sm ${isStrong ? "border-emerald-100 bg-emerald-50 text-emerald-700" : isMiddle ? "border-amber-100 bg-amber-50 text-amber-700" : "border-red-100 bg-red-50 text-red-600"}`}
    >
      {grade} · {pct.toFixed(1)}%
    </span>
  );
}

function OverturnRateChip({ value }: { value: number }) {
  const pct = value * 100;
  const isHigh = pct >= 55;
  const isMiddle = pct >= 45;

  return (
    <span
      className={`inline-flex rounded-xl border px-3 py-1.5 text-[10px] font-black font-mono uppercase tracking-widest shadow-sm ${
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

function ConfidenceIndicator({ label }: { label: "low" | "medium" | "high" }) {
  if (label === "high") {
    return (
      <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-emerald-600">
        <span className="h-2 w-2 rounded-full bg-emerald-600" />
        High
      </span>
    );
  }
  if (label === "medium") {
    return (
      <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-amber-500">
        <span className="h-2 w-2 rounded-full bg-amber-500 opacity-80" />
        Med
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-red-500">
      <span className="h-2 w-2 rounded-full bg-red-500" />
      Low
    </span>
  );
}
