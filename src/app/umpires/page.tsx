import Link from "next/link";

import { RangeSelector } from "@/components/range-selector";
import { getUmpireLeaderboardModel } from "@/lib/data";
import { parseRange } from "@/lib/range";
import { resolveViewMode } from "@/lib/view-mode";
import { withViewModeHref } from "@/lib/view-mode-href";
import { UmpireDistributionHistogram } from "@/components/analytics/umpire-distribution-histogram";
import { UmpireRiskScatter } from "@/components/analytics/umpire-risk-scatter";
import { UmpireLeaderboardTable } from "@/components/umpires/umpire-leaderboard-table";
import { getUmpiresPageViewCopy } from "@/lib/view-mode-contract";


export const dynamic = "force-dynamic";

export default async function UmpiresPage({ searchParams }: { searchParams: Promise<{ range?: string; view?: string }> }) {
  const sp = await searchParams;
  const range = parseRange(sp.range);
  const viewMode = await resolveViewMode(sp);
  const umpires = await getUmpireLeaderboardModel(range);

  const sorted = [...umpires].sort((left, right) =>
    viewMode === "org" ? compareOrgUmpires(left, right) : compareFanUmpires(left, right),
  );

  // Compute league averages
  const totalChallenged = umpires.reduce((s, u) => s + u.challengedCalls, 0);
  const totalOverturned = umpires.reduce((s, u) => s + u.overturnedCalls, 0);
  const totalGames = umpires.reduce((s, u) => s + u.gamesWorked, 0);
  const leagueAvgRate = totalChallenged > 0 ? totalOverturned / totalChallenged : 0;
  const avgOrgValue =
    umpires.length > 0
      ? umpires.reduce((sum, umpire) => sum + getOrgRankingValue(umpire), 0) / umpires.length
      : 0;
  const avgFanValue = umpires.length > 0 ? umpires.reduce((sum, umpire) => sum + umpire.overturnRate, 0) / umpires.length : 0;

  // S4-2: Find insert position for floating avg row
  const avgInsertIdx = sorted.findIndex((umpire) =>
    viewMode === "org" ? getOrgRankingValue(umpire) < avgOrgValue : umpire.overturnRate < avgFanValue,
  );
  const insertAt = avgInsertIdx === -1 ? sorted.length : avgInsertIdx;

  const histogramData = umpires.map((u) => ({
    umpireName: u.umpireName,
    overturnRate: u.overturnRate,
  }));
  const riskScatterData = umpires.map((u) => ({
    umpireId: u.umpireId,
    umpireName: u.umpireName,
    overturnRate: u.overturnRate,
    overturnRateVariance: u.overturnRateVariance,
    riskTier: u.riskTier,
  }));
  const watchList = [...umpires].sort((left, right) => getOrgWatchPriority(right) - getOrgWatchPriority(left)).slice(0, 3);
  const copy = getUmpiresPageViewCopy(viewMode);
  const leaderboardSection = (
    <UmpireLeaderboardTable
      range={range}
      viewMode={viewMode}
      umpires={sorted}
      insertAt={insertAt}
      totalChallenged={totalChallenged}
      totalOverturned={totalOverturned}
      totalGames={totalGames}
      leagueAvgRate={leagueAvgRate}
    />
  );

  return (
    <main className="mx-auto max-w-7xl px-6 py-24 lg:py-40">
      <div className="flex flex-col items-center text-center mb-20">
        <h1 className="w-full text-6xl md:text-8xl font-display uppercase tracking-[-0.04em] text-[var(--ink-0)] leading-[1.2] mb-8 py-4 px-12 overflow-visible">
          Umpire <br />
          <span className="opacity-20 italic px-2 pr-5">{copy.heroTitle.replace("Umpire ", "")}</span>
        </h1>
        <p className="max-w-xl text-[var(--ink-2)] font-medium text-lg leading-tight tracking-tight text-balance">
          {copy.heroDeck}
        </p>
      </div>

      <div className="mt-12 flex items-center justify-center gap-4">
        <RangeSelector basePath="/umpires" range={range} searchParams={sp} />
      </div>

      {copy.leaderboardPlacement === "early" ? <div className="mt-10">{leaderboardSection}</div> : null}

      {viewMode === "org" ? (
        <div className="mt-8 mb-8 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <UmpireRiskScatter data={riskScatterData} />
          <div className="panel h-full flex flex-col border-gray-100 bg-white p-6 shadow-2xl shadow-black/[0.03]">
            <div className="mb-4">
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-blue-500 mb-1">
                This Week&apos;s Review Watch
              </h4>
              <p className="text-2xl font-display leading-none text-gray-900">
                {copy.watchTitle.split(" ").slice(0, 1).join(" ")} <span className="text-gray-400 italic">{copy.watchTitle.split(" ").slice(1).join(" ")}</span>
              </p>
            </div>
            <div className="space-y-3">
              {watchList.map((umpire) => (
                <Link
                  key={umpire.umpireId}
                  href={withViewModeHref(`/umpires/${umpire.umpireId}?range=${range}`, viewMode)}
                  className="block rounded-2xl border border-gray-100 bg-[var(--surface-infield)] p-4 transition hover:border-blue-100 hover:bg-white"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-[var(--ink-0)]">{umpire.umpireName}</p>
                      <p className="mt-1 text-xs text-[var(--ink-3)]">
                        {buildWatchCopy(umpire)}
                      </p>
                    </div>
                    <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[9px] font-bold uppercase tracking-widest text-blue-700">
                      {buildWatchLabel(umpire)}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-12">
          <UmpireDistributionHistogram data={histogramData} />
        </div>
      )}

      {copy.leaderboardPlacement === "late" ? <div className="mt-10">{leaderboardSection}</div> : null}
    </main>
  );
}

function getOrgRankingValue(umpire: Awaited<ReturnType<typeof getUmpireLeaderboardModel>>[number]) {
  if (typeof umpire.averageWinExpectancyDelta === "number") return umpire.averageWinExpectancyDelta;
  if (typeof umpire.averageRunExpectancyDelta === "number") return umpire.averageRunExpectancyDelta;
  return umpire.overturnRate;
}

function compareFanUmpires(
  left: Awaited<ReturnType<typeof getUmpireLeaderboardModel>>[number],
  right: Awaited<ReturnType<typeof getUmpireLeaderboardModel>>[number],
) {
  if (right.overturnRate !== left.overturnRate) return right.overturnRate - left.overturnRate;
  if (right.challengedCalls !== left.challengedCalls) return right.challengedCalls - left.challengedCalls;
  return right.gamesWorked - left.gamesWorked;
}

function compareOrgUmpires(
  left: Awaited<ReturnType<typeof getUmpireLeaderboardModel>>[number],
  right: Awaited<ReturnType<typeof getUmpireLeaderboardModel>>[number],
) {
  const valueGap = getOrgRankingValue(right) - getOrgRankingValue(left);
  if (valueGap !== 0) return valueGap;
  if (right.overturnRateVariance !== left.overturnRateVariance) {
    return right.overturnRateVariance - left.overturnRateVariance;
  }
  return right.challengedCalls - left.challengedCalls;
}

function getOrgWatchPriority(umpire: Awaited<ReturnType<typeof getUmpireLeaderboardModel>>[number]) {
  const drift =
    typeof umpire.recentOverturnRate === "number" ? Math.abs(umpire.recentOverturnRate - umpire.overturnRate) : 0;
  return (
    Math.abs(umpire.averageWinExpectancyDelta ?? 0) * 100 +
    Math.abs(umpire.averageRunExpectancyDelta ?? 0) * 10 +
    umpire.overturnRateVariance * 100 +
    drift * 100
  );
}

function buildWatchCopy(umpire: {
  orgDescriptor: string;
  overturnRateVariance: number;
  recentOverturnRate: number | null;
  overturnRate: number;
}) {
  const drift =
    umpire.recentOverturnRate === null ? null : umpire.recentOverturnRate - umpire.overturnRate;
  if (drift !== null && drift >= 0.05) {
    return `${umpire.orgDescriptor} · recent overturn rate is running ${(drift * 100).toFixed(1)} pts above baseline`;
  }
  if (drift !== null && drift <= -0.05) {
    return `${umpire.orgDescriptor} · recent overturn rate is ${(Math.abs(drift) * 100).toFixed(1)} pts below baseline`;
  }
  return `${umpire.orgDescriptor} · variance ${umpire.overturnRateVariance.toFixed(2)}`;
}

function buildWatchLabel(umpire: {
  recentOverturnRate: number | null;
  overturnRate: number;
  overturnRateVariance: number;
  riskTier: string;
}) {
  const drift =
    umpire.recentOverturnRate === null ? 0 : umpire.recentOverturnRate - umpire.overturnRate;
  if ((umpire.riskTier === "High" || umpire.overturnRateVariance >= 0.2) && drift >= 0.05) return "Escalating";
  if (umpire.riskTier === "High" || umpire.overturnRateVariance >= 0.2) return "Elevated Watch";
  if (drift >= 0.05) return "Trend Up";
  return umpire.riskTier;
}
