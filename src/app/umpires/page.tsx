import Link from "next/link";

import { RangeSelector } from "@/components/range-selector";
import { getUmpireLeaderboard } from "@/lib/data";
import { parseRange } from "@/lib/range";
import { resolveViewMode } from "@/lib/view-mode";
import { UmpireDistributionHistogram } from "@/components/analytics/umpire-distribution-histogram";
import { ViewModeToggle } from "@/components/ui/view-mode-toggle";

export const dynamic = "force-dynamic";

export default async function UmpiresPage({ searchParams }: { searchParams: Promise<{ range?: string; view?: string }> }) {
  const sp = await searchParams;
  const range = parseRange(sp.range);
  const viewMode = await resolveViewMode(sp);
  const umpires = await getUmpireLeaderboard(range);

  // Sort by overturn rate ascending (best umpires first = lowest overturn rate)
  const sorted = [...umpires].sort((a, b) => a.overturnRate - b.overturnRate);

  // Compute league averages
  const totalChallenged = umpires.reduce((s, u) => s + u.challengedCalls, 0);
  const totalOverturned = umpires.reduce((s, u) => s + u.overturnedCalls, 0);
  const totalGames = umpires.reduce((s, u) => s + u.gamesWorked, 0);
  const leagueAvgRate = totalChallenged > 0 ? totalOverturned / totalChallenged : 0;

  // S4-2: Find insert position for floating avg row
  const avgInsertIdx = sorted.findIndex((u) => u.overturnRate > leagueAvgRate);
  const insertAt = avgInsertIdx === -1 ? sorted.length : avgInsertIdx;

  // Histogram data
  const histogramData = umpires.map((u) => ({
    umpireName: u.umpireName,
    overturnRate: u.overturnRate,
  }));

  return (
    <main className="mx-auto max-w-7xl px-6 py-24 lg:py-40">
      <div className="flex flex-col items-center text-center mb-20">
        <h1 className="w-full text-6xl md:text-8xl font-display uppercase tracking-[-0.04em] text-[var(--ink-0)] leading-[1.2] mb-8 py-4 px-12 overflow-visible">
          Umpire <br />
          <span className="opacity-20 italic px-2 pr-5">Rankings</span>
        </h1>
        <p className="max-w-xl text-[var(--ink-2)] font-medium text-lg leading-tight tracking-tight text-balance">
          Comprehensive ABS challenge performance rankings across the official MLB umpire roster, measuring accuracy and consistency.
        </p>
      </div>

      <div className="mt-12 flex items-center justify-center gap-4">
        <RangeSelector basePath="/umpires" range={range} searchParams={sp} />
        <ViewModeToggle mode={viewMode} />
      </div>

      {/* S4-1: Distribution Histogram */}
      <div className="mt-12">
        <UmpireDistributionHistogram data={histogramData} />
      </div>

      {/* S4-2, S4-3, S4-4: Enhanced Table */}
      <div className="panel overflow-hidden border-gray-100 bg-white shadow-2xl shadow-black/[0.03]">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th className="min-w-[180px]">Rank & Name</th>
                <th className="text-center">Challenges</th>
                <th className="text-center">Overturned</th>
                <th className="text-center">{viewMode === "org" ? "Overturn Rate" : "Accuracy Rating"}</th>
                <th className="text-center">Zone Type</th>
                {viewMode === "org" && <th className="text-center">Confidence</th>}
                <th className="text-right">Games</th>
              </tr>
            </thead>
            <tbody>
              {sorted.length === 0 ? (
                <tr>
                  <td colSpan={7} className="!py-32 text-center text-gray-400 font-semibold">
                    Discovery in progress. No data points for this selection.
                  </td>
                </tr>
              ) : null}
              {sorted.map((u, idx) => {
                const isBeforeAvg = idx === insertAt;
                return (
                  <>
                    {/* S4-2: Floating Umpire Avg Row */}
                    {isBeforeAvg && (
                      <tr key="ump-avg" className="bg-[var(--surface-1)] border-y border-[var(--border-subtle)]">
                        <td>
                          <div className="flex items-center gap-5 py-1">
                            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gray-100 text-[10px] font-black text-gray-400">
                              —
                            </span>
                            <span className="font-bold italic text-gray-500 tracking-tight">
                              Umpire Average
                            </span>
                          </div>
                        </td>
                        <td className="text-center font-mono text-gray-400 italic font-bold">
                          {Math.round(totalChallenged / (umpires.length || 1))}
                        </td>
                        <td className="text-center font-mono text-gray-400 italic font-bold">
                          {Math.round(totalOverturned / (umpires.length || 1))}
                        </td>
                        <td className="text-center">
                          <span className="inline-flex rounded-xl border px-3 py-1.5 text-[10px] font-black font-mono uppercase tracking-widest shadow-sm bg-gray-50 text-gray-500 border-gray-200 italic">
                            {(leagueAvgRate * 100).toFixed(1)}%
                          </span>
                        </td>
                        <td className="text-center"><span className="text-[10px] text-[var(--ink-3)]">—</span></td>
                        {viewMode === "org" && (
                          <td className="text-center"><span className="text-[10px] text-[var(--ink-3)]">—</span></td>
                        )}
                        <td className="text-right font-mono text-gray-400 italic font-medium pr-8">
                          {Math.round(totalGames / (umpires.length || 1))}
                        </td>
                      </tr>
                    )}
                    <tr key={u.umpireId} className="group/row transition-colors hover:bg-gray-50/50">
                      <td>
                        <Link
                          href={`/umpires/${u.umpireId}?range=${range}`}
                          className="flex items-center gap-5 py-1"
                        >
                          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gray-50 text-[10px] font-black text-gray-400 group-hover/row:bg-black group-hover/row:text-white transition-all transform group-hover/row:scale-110">
                            {(idx + 1).toString().padStart(2, '0')}
                          </span>
                          <span className="font-black text-gray-900 tracking-tight group-hover/row:text-blue-600 transition-colors">
                            {u.umpireName}
                          </span>
                        </Link>
                      </td>
                      <td className="text-center font-mono text-gray-500 font-bold">{u.challengedCalls}</td>
                      <td className="text-center font-mono text-gray-500 font-bold">{u.overturnedCalls}</td>
                      <td className="text-center">
                        <RateChip value={u.overturnRate} />
                      </td>
                      {/* S4-3: Zone Archetype Tag */}
                      <td className="text-center">
                        <ZoneArchetypeChip overturnRate={u.overturnRate} games={u.gamesWorked} />
                      </td>
                      {/* S4-4: Confidence Indicator — Org only */}
                      {viewMode === "org" && (
                        <td className="text-center">
                          <ConfidenceIndicator games={u.gamesWorked} />
                        </td>
                      )}
                      <td className="text-right font-mono text-gray-400 font-medium pr-8">{u.gamesWorked}</td>
                    </tr>
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}

function RateChip({ value }: { value: number }) {
  const pct = value * 100;
  const isHigh = pct >= 60;
  const isMid = pct >= 40;

  return (
    <span
      className={`inline-flex rounded-xl border px-3 py-1.5 text-[10px] font-black font-mono uppercase tracking-widest shadow-sm ${isHigh ? "bg-red-50 text-red-600 border-red-100" :
        isMid ? "bg-amber-50 text-amber-700 border-amber-100" :
          "bg-emerald-50 text-emerald-700 border-emerald-100"
        }`}
    >
      {pct.toFixed(1)}% {pct >= 50 ? "Overturned" : "Precise"}
    </span>
  );
}

/**
 * S4-3: Zone Archetype derived from overturn rate buckets.
 * In production, use actual zone bucket data per umpire for more accurate typing.
 */
function ZoneArchetypeChip({ overturnRate, games }: { overturnRate: number; games: number }) {
  const pct = overturnRate * 100;

  let label: string;
  let colorClass: string;

  if (pct < 30) {
    label = "Balanced";
    colorClass = "bg-emerald-50 text-emerald-700 border-emerald-200";
  } else if (pct < 45) {
    label = "Inside Strict";
    colorClass = "bg-blue-50 text-blue-700 border-blue-200";
  } else if (pct < 55) {
    label = "Wide Zone";
    colorClass = "bg-amber-50 text-amber-700 border-amber-200";
  } else {
    label = "High Zone Loose";
    colorClass = "bg-red-50 text-red-600 border-red-200";
  }

  if (games < 5) {
    label = "Uncharted";
    colorClass = "bg-gray-50 text-gray-400 border-gray-200";
  }

  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-[9px] font-bold uppercase tracking-widest ${colorClass}`}>
      {label}
    </span>
  );
}

/**
 * S4-4: Confidence Indicator based on games worked.
 */
function ConfidenceIndicator({ games }: { games: number }) {
  if (games > 30) {
    return (
      <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-[var(--state-overturned-bs)]">
        <span className="h-2 w-2 rounded-full bg-[var(--state-overturned-bs)]" />
        High
      </span>
    );
  }
  if (games >= 10) {
    return (
      <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-[var(--accent-warm)]">
        <span className="h-2 w-2 rounded-full bg-[var(--accent-warm)] opacity-80" />
        Med
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-[var(--state-warning)]">
      <span className="h-1.5 w-1.5 rounded-full border-2 border-[var(--state-warning)]" />
      Low
    </span>
  );
}
