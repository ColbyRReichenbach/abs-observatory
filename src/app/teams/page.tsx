import Link from "next/link";

import { RangeSelector } from "@/components/range-selector";
import { TeamIcon } from "@/components/team-icon";
import { getTeamLeaderboard, getTeamTrendSparklines } from "@/lib/data";
import { parseRange } from "@/lib/range";
import { resolveViewMode } from "@/lib/view-mode";
import { TeamScatterPlot } from "@/components/analytics/team-scatter-plot";
import { TrendSparkline } from "@/components/analytics/trend-sparkline";
import { ViewModeToggle } from "@/components/ui/view-mode-toggle";

export const dynamic = "force-dynamic";

export default async function TeamsPage({ searchParams }: { searchParams: Promise<{ range?: string; view?: string }> }) {
  const sp = await searchParams;
  const range = parseRange(sp.range);
  const viewMode = await resolveViewMode(sp);
  const [teams, trendlines] = await Promise.all([
    getTeamLeaderboard(range),
    getTeamTrendSparklines(range),
  ]);
  const trendlineMap = new Map(trendlines.map((entry) => [entry.teamId, entry.values]));

  // Sort by overturn rate for table display
  const sorted = [...teams].sort((a, b) => b.overturnRate - a.overturnRate);

  // Compute league averages for floating avg row insertion
  const totalChallenges = teams.reduce((s, t) => s + t.challengesTotal, 0);
  const totalSuccessful = teams.reduce((s, t) => s + t.usedSuccessful, 0);
  const totalFailed = teams.reduce((s, t) => s + t.usedFailed, 0);
  const totalGames = teams.reduce((s, t) => s + t.gamesTracked, 0);
  const leagueAvgRate = totalChallenges > 0 ? totalSuccessful / totalChallenges : 0;
  const leagueAvgRemaining = teams.length > 0 ? teams.reduce((s, t) => s + t.avgRemaining, 0) / teams.length : 0;

  // Find the position where league avg row should be inserted (between teams above and below league avg overturn rate)
  const avgInsertIdx = sorted.findIndex((t) => t.overturnRate < leagueAvgRate);
  const insertAt = avgInsertIdx === -1 ? sorted.length : avgInsertIdx;

  // Scatter plot data
  const scatterData = teams.map((t) => ({
    teamId: t.teamId,
    teamName: t.teamName,
    logoUrl: `https://www.mlbstatic.com/team-logos/team-cap-on-light/${t.teamId}.svg`,
    challenges: t.challengesTotal,
    overturnRate: t.overturnRate,
  }));

  return (
    <main className="mx-auto max-w-7xl px-6 pt-32 lg:pt-48 pb-40">
      <div className="flex flex-col items-center text-center mb-20">
        <h1 className="w-full text-6xl md:text-8xl font-display uppercase tracking-[-0.04em] text-gray-900 leading-[1.2] mb-8 py-4 px-12 overflow-visible">
          Team <br />
          <span className="opacity-20 italic px-2 pr-5">Leaderboard</span>
        </h1>
        <p className="max-w-xl text-[var(--ink-2)] font-medium text-lg leading-tight tracking-tight text-balance">
          Aggregated ABS challenge data across all 30 MLB franchises, evaluating success rates and strategic management of the challenge window.
        </p>
      </div>

      <div className="mt-12 flex items-center justify-center gap-4">
        <RangeSelector basePath="/teams" range={range} searchParams={sp} />
        <ViewModeToggle mode={viewMode} />
      </div>

      {/* S3-1 + S3-2: Scatter Plot with Team Logos + Crosshair */}
      <div className="mt-12">
        <TeamScatterPlot data={scatterData} />
      </div>

      {/* S3-3 + S3-4: Table with Floating MLB Avg Row + Trend Sparkline Column */}
      <div className="panel overflow-hidden border-gray-100 bg-white shadow-2xl shadow-black/[0.03]">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th className="min-w-[180px]">Rank & Team</th>
                <th className="text-center">Challenges</th>
                <th className="text-center">{viewMode === "org" ? "Overturned" : "Successful"}</th>
                <th className="text-center">{viewMode === "org" ? "Overturn Rate" : "Effectiveness"}</th>
                <th className="text-center">Trend</th>
                <th className="text-right">{viewMode === "org" ? "Avg Remaining" : "Avg Rem"}</th>
                {viewMode === "org" && <th className="text-right">Games</th>}
              </tr>
            </thead>
            <tbody>
              {sorted.length === 0 ? (
                <tr>
                  <td colSpan={6} className="!py-32 text-center text-gray-400 font-semibold">
                    No data points match the selected criteria.
                  </td>
                </tr>
              ) : null}
              {sorted.map((t, idx) => {
                const isBeforeAvg = idx === insertAt;
                return (
                  <>
                    {/* S3-3: Insert floating MLB Avg row at the correct position */}
                    {isBeforeAvg && (
                      <tr key="mlb-avg" className="bg-[var(--surface-1)] border-y border-[var(--border-subtle)]">
                        <td>
                          <div className="flex items-center gap-5 py-1">
                            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gray-100 text-[10px] font-black text-gray-400">
                              —
                            </span>
                            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-[10px] font-black shrink-0 relative overflow-hidden">
                              <img src="https://www.mlbstatic.com/team-logos/league-on-light/1.svg" alt="MLB Logo" className="w-[18px] opacity-80" />
                            </span>
                            <span className="font-bold italic text-gray-500 tracking-tight">
                              MLB Average
                            </span>
                          </div>
                        </td>
                        <td className="text-center font-mono text-gray-400 italic font-bold">
                          {Math.round(totalChallenges / (teams.length || 1))}
                        </td>
                        <td className="text-center font-mono text-gray-400 italic font-bold">
                          {Math.round(totalSuccessful / (teams.length || 1))}
                        </td>
                        <td className="text-center">
                          <span className="inline-flex rounded-xl border px-3 py-1.5 text-[10px] font-black font-mono uppercase tracking-widest shadow-sm bg-gray-50 text-gray-500 border-gray-200 italic">
                            {(leagueAvgRate * 100).toFixed(1)}%
                          </span>
                        </td>
                        <td className="text-center">
                          <span className="text-[10px] text-[var(--ink-3)]">—</span>
                        </td>
                        <td className="text-right font-mono text-gray-400 italic font-medium pr-8">
                          {leagueAvgRemaining.toFixed(2)}
                        </td>
                      </tr>
                    )}
                    <tr key={t.teamId} className="group/row transition-colors hover:bg-gray-50/50">
                      <td>
                        <Link
                          href={`/teams/${t.teamId}?range=${range}`}
                          className="flex items-center gap-5 py-1"
                        >
                          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gray-50 text-[10px] font-black text-gray-400 group-hover/row:bg-black group-hover/row:text-white transition-all transform group-hover/row:scale-110">
                            {(idx + 1).toString().padStart(2, '0')}
                          </span>
                          <TeamIcon teamId={t.teamId} name={t.teamName} size={32} className="shadow-sm border-white/5 group-hover/row:scale-110" />
                          <span className="font-black text-gray-900 tracking-tight group-hover/row:text-blue-600 transition-colors">
                            {t.teamName}
                          </span>
                        </Link>
                      </td>

                      <td className="text-center font-mono text-gray-500 font-bold">{t.challengesTotal}</td>
                      <td className="text-center font-mono text-gray-500 font-bold">{t.usedSuccessful}</td>
                      <td className="text-center">
                        <RateChip value={t.overturnRate} />
                      </td>
                      <td className="text-center">
                        <div className="flex justify-center">
                          <TrendSparkline data={trendlineMap.get(t.teamId) ?? []} />
                        </div>
                      </td>
                      <td className="text-right font-mono text-gray-400 font-medium pr-8">{t.avgRemaining.toFixed(2)}</td>
                      {viewMode === "org" && <td className="text-right font-mono text-gray-400 font-medium pr-8">{t.gamesTracked}</td>}
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
      className={`inline-flex rounded-xl border px-3 py-1.5 text-[10px] font-black font-mono uppercase tracking-widest shadow-sm ${isHigh ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
        isMid ? "bg-amber-50 text-amber-700 border-amber-100" :
          "bg-blue-50 text-blue-700 border-blue-100"
        }`}
    >
      {pct.toFixed(1)}%
    </span>
  );
}
