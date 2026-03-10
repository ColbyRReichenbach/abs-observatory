import Link from "next/link";

import { RangeSelector } from "@/components/range-selector";
import { TeamIcon } from "@/components/team-icon";
import { getTeamLeaderboardModel, getTeamTrendSparklines } from "@/lib/data";
import { parseRange } from "@/lib/range";
import { resolveViewMode } from "@/lib/view-mode";
import { TeamScatterPlot } from "@/components/analytics/team-scatter-plot";
import { TrendSparkline } from "@/components/analytics/trend-sparkline";
import { ProfileBadge } from "@/components/ui/profile-badge";
import { getTeamsPageViewCopy } from "@/lib/view-mode-contract";

export const dynamic = "force-dynamic";

export default async function TeamsPage({ searchParams }: { searchParams: Promise<{ range?: string; view?: string }> }) {
  const sp = await searchParams;
  const range = parseRange(sp.range);
  const viewMode = await resolveViewMode(sp);
  const [teams, trendlines] = await Promise.all([
    getTeamLeaderboardModel(range),
    getTeamTrendSparklines(range),
  ]);
  const trendlineMap = new Map(trendlines.map((entry) => [entry.teamId, entry.values]));
  const biggestMover =
    [...teams]
      .sort((a, b) => {
        const aTrend = trendlineMap.get(a.teamId) ?? [];
        const bTrend = trendlineMap.get(b.teamId) ?? [];
        const aDelta = aTrend.length >= 2 ? aTrend[aTrend.length - 1] - aTrend[0] : 0;
        const bDelta = bTrend.length >= 2 ? bTrend[bTrend.length - 1] - bTrend[0] : 0;
        return Math.abs(bDelta) - Math.abs(aDelta);
      })[0] ?? null;

  // Sort by overturn rate for table display
  const sorted = [...teams].sort((a, b) => b.overturnRate - a.overturnRate);

  // Compute league averages for floating avg row insertion
  const totalChallenges = teams.reduce((s, t) => s + t.challengesTotal, 0);
  const totalSuccessful = teams.reduce((s, t) => s + t.usedSuccessful, 0);
  const leagueAvgRate = totalChallenges > 0 ? totalSuccessful / totalChallenges : 0;
  const leagueAvgRemaining = teams.length > 0 ? teams.reduce((s, t) => s + t.avgRemaining, 0) / teams.length : 0;
  const leagueAvgLatePressureShare =
    teams.length > 0 ? teams.reduce((sum, team) => sum + team.lateLeverageShare, 0) / teams.length : 0;
  const leagueAvgEarlyBurnShare =
    teams.length > 0 ? teams.reduce((sum, team) => sum + team.earlyLowLeverageShare, 0) / teams.length : 0;

  // Find the position where league avg row should be inserted (between teams above and below league avg overturn rate)
  const avgInsertIdx = sorted.findIndex((t) => t.overturnRate < leagueAvgRate);
  const insertAt = avgInsertIdx === -1 ? sorted.length : avgInsertIdx;

  // Scatter plot data
  const scatterData = teams.map((t) => ({
    teamId: t.teamId,
    teamName: t.teamName,
    logoUrl: `https://www.mlbstatic.com/team-logos/team-cap-on-dark/${t.teamId}.svg`,
    challengeRatePerGame: t.challengeRatePerGame,
    overturnRate: t.overturnRate,
  }));
  const copy = getTeamsPageViewCopy(viewMode);
  const spotlightSection = biggestMover ? (
    <div className="mb-8 panel border-gray-100 bg-white p-5 shadow-2xl shadow-black/[0.03]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-blue-500">
            {copy.spotlightEyebrow}
          </p>
          <p className="mt-1 text-lg font-display uppercase tracking-[0.04em] text-[var(--ink-0)]">
            {biggestMover.teamName}
          </p>
          <p className="mt-1 text-xs text-[var(--ink-3)]">
            {viewMode === "org"
              ? `${biggestMover.orgStyleLabel} with ${(biggestMover.lateLeverageShare * 100).toFixed(0)}% of reviews in higher-pressure windows and ${biggestMover.challengeRatePerGame.toFixed(2)} challenges per game.`
              : `${biggestMover.style} profile with ${(biggestMover.lateLeverageShare * 100).toFixed(0)}% of reviews coming in bigger spots and a visible trend swing.`}
          </p>
        </div>
        <ProfileBadge
          label={viewMode === "org" ? biggestMover.orgStyleLabel : biggestMover.style}
          variant={viewMode === "org" ? "blue" : "emerald"}
          className="mt-0"
        />
      </div>
    </div>
  ) : null;

  const scatterSection = (
    <div className="mt-12">
      <TeamScatterPlot data={scatterData} mode={viewMode} />
    </div>
  );

  const tableSection = (
    <div className="panel overflow-hidden border-gray-100 bg-white shadow-2xl shadow-black/[0.03]">
      <div className="overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th className="min-w-[180px]">Rank & Team</th>
              <th className="text-left w-36">{copy.tableProfileHeader}</th>
              <th className="text-center">Rate / Game</th>
              <th className="text-center">{viewMode === "org" ? "Pressure Share" : "Big-Spot Share"}</th>
              <th className="text-center">{viewMode === "org" ? "Discipline" : "Timing"}</th>
              <th className="text-center">Trend</th>
              <th className="text-right">{viewMode === "org" ? "Avg Remaining" : "Avg Rem"}</th>
              <th className="text-right">{copy.tableVolumeHeader}</th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={8} className="!py-32 text-center text-gray-400 font-semibold">
                  No data points match the selected criteria.
                </td>
              </tr>
            ) : null}
            {sorted.map((t, idx) => {
              const isBeforeAvg = idx === insertAt;
              return (
                <>
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
                      <td className="text-left">
                        <span className="text-[10px] text-[var(--ink-3)]">—</span>
                      </td>
                      <td className="text-center font-mono text-gray-400 italic font-bold">
                        {(teams.length > 0 ? totalChallenges / Math.max(1, teams.reduce((sum, team) => sum + team.gamesTracked, 0) / teams.length) : 0).toFixed(2)}
                      </td>
                      <td className="text-center font-mono text-gray-400 italic font-bold">
                        {`${Math.round(leagueAvgLatePressureShare * 100)}%`}
                      </td>
                      <td className="text-center">
                        <StrategyChip
                          label={getStrategyLabel(leagueAvgLatePressureShare, leagueAvgEarlyBurnShare, viewMode)}
                          tone={getStrategyTone(leagueAvgLatePressureShare, leagueAvgEarlyBurnShare)}
                        />
                      </td>
                      <td className="text-center">
                        <span className="text-[10px] text-[var(--ink-3)]">—</span>
                      </td>
                      <td className="text-right font-mono text-gray-400 italic font-medium pr-8">
                        {leagueAvgRemaining.toFixed(2)}
                      </td>
                      <td className="text-right font-mono text-gray-400 italic font-medium pr-8">
                        {viewMode === "org"
                          ? (teams.length > 0
                              ? teams.reduce((sum, team) => sum + team.gamesTracked, 0) / teams.length
                              : 0
                            ).toFixed(1)
                          : (teams.length > 0
                              ? teams.reduce((sum, team) => sum + team.challengesTotal, 0) / teams.length
                              : 0
                            ).toFixed(1)}
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
                    <td className="text-left">
                      <ProfileBadge
                        label={viewMode === "org" ? t.orgStyleLabel : t.style}
                        variant={viewMode === "org" ? "blue" : "emerald"}
                      />
                    </td>

                    <td className="text-center font-mono text-gray-500 font-bold">
                      {t.challengeRatePerGame.toFixed(2)}
                    </td>
                    <td className="text-center">
                      <PressureShareChip value={t.lateLeverageShare} />
                    </td>
                    <td className="text-center">
                      <StrategyChip
                        label={getStrategyLabel(t.lateLeverageShare, t.earlyLowLeverageShare, viewMode)}
                        tone={getStrategyTone(t.lateLeverageShare, t.earlyLowLeverageShare)}
                      />
                    </td>
                    <td className="text-center">
                      <div className="flex justify-center">
                        <TrendSparkline data={trendlineMap.get(t.teamId) ?? []} />
                      </div>
                    </td>
                    <td className="text-right font-mono text-gray-400 font-medium pr-8">{t.avgRemaining.toFixed(2)}</td>
                    <td className="text-right font-mono text-gray-400 font-medium pr-8">{viewMode === "org" ? t.gamesTracked : t.challengesTotal}</td>
                  </tr>
                </>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <main className="mx-auto max-w-7xl px-6 pt-32 lg:pt-48 pb-40">
      <div className="flex flex-col items-center text-center mb-20">
        <h1 className="w-full text-6xl md:text-8xl font-display uppercase tracking-[-0.04em] text-gray-900 leading-[1.2] mb-8 py-4 px-12 overflow-visible">
          Team <br />
          <span className="opacity-20 italic px-2 pr-5">{copy.heroTitle.replace("Team ", "")}</span>
        </h1>
        <p className="max-w-xl text-[var(--ink-2)] font-medium text-lg leading-tight tracking-tight text-balance">
          {copy.heroDeck}
        </p>
      </div>

      <div className="mt-12 mb-8 flex items-center justify-center gap-4">
        <RangeSelector basePath="/teams" range={range} searchParams={sp} />
      </div>

      {copy.sectionOrder.map((section) => (
        <div key={section}>
          {section === "spotlight" ? spotlightSection : section === "scatter" ? scatterSection : tableSection}
        </div>
      ))}
    </main>
  );
}

function PressureShareChip({ value }: { value: number }) {
  const pct = value * 100;
  const tone =
    pct >= 45
      ? "bg-emerald-50 text-emerald-700 border-emerald-100"
      : pct >= 30
        ? "bg-amber-50 text-amber-700 border-amber-100"
        : "bg-gray-50 text-gray-600 border-gray-200";

  return (
    <span
      className={`inline-flex rounded-xl border px-3 py-1.5 text-[10px] font-black font-mono uppercase tracking-widest shadow-sm ${tone}`}
    >
      {pct.toFixed(0)}%
    </span>
  );
}

function StrategyChip({
  label,
  tone,
}: {
  label: string;
  tone: "emerald" | "amber" | "gray";
}) {
  const classes =
    tone === "emerald"
      ? "bg-emerald-50 text-emerald-700 border-emerald-100"
      : tone === "amber"
        ? "bg-amber-50 text-amber-700 border-amber-100"
        : "bg-gray-50 text-gray-600 border-gray-200";

  return (
    <span
      className={`inline-flex rounded-xl border px-3 py-1.5 text-[10px] font-black uppercase tracking-widest shadow-sm ${classes}`}
    >
      {label}
    </span>
  );
}

function getStrategyLabel(lateShare: number, earlyBurnShare: number, viewMode: "fan" | "org") {
  if (lateShare >= 0.45 && earlyBurnShare <= 0.2) {
    return viewMode === "org" ? "Disciplined" : "Clutch";
  }
  if (earlyBurnShare >= 0.3) {
    return viewMode === "org" ? "Early Burn" : "Loose";
  }
  if (lateShare >= 0.35) {
    return viewMode === "org" ? "Pressure Smart" : "Opportunistic";
  }
  return viewMode === "org" ? "Mixed" : "Mixed";
}

function getStrategyTone(lateShare: number, earlyBurnShare: number) {
  if (lateShare >= 0.45 && earlyBurnShare <= 0.2) return "emerald" as const;
  if (earlyBurnShare >= 0.3) return "amber" as const;
  return "gray" as const;
}
