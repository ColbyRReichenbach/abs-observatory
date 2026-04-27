import Link from "next/link";
import { Suspense } from "react";

import { RangeSelector } from "@/components/range-selector";
import { TeamIcon } from "@/components/team-icon";
import { getTeamLeaderboardModel, getTeamTrendSparklines } from "@/lib/data";
import { parseRange } from "@/lib/range";
import { resolveViewMode } from "@/lib/view-mode";
import { withViewModeHref } from "@/lib/view-mode-href";
import { TeamScatterPlot } from "@/components/analytics/team-scatter-plot";
import { TrendSparkline } from "@/components/analytics/trend-sparkline";
import { ProfileBadge } from "@/components/ui/profile-badge";
import { getTeamsPageViewCopy } from "@/lib/view-mode-contract";
import { hasTrustedModelConfidenceBand } from "@/lib/server/run-environment";
import { TeamLeaderboardTable } from "@/components/teams/team-leaderboard-table";

export const dynamic = "force-dynamic";

export default async function TeamsPage({ searchParams }: { searchParams: Promise<{ range?: string; view?: string }> }) {
  const sp = await searchParams;
  const range = parseRange(sp.range);
  const viewMode = await resolveViewMode(sp);
  const copy = getTeamsPageViewCopy(viewMode);

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

      <Suspense fallback={<TeamsPageFallback copy={copy} />}>
        <TeamsPageBody range={range} viewMode={viewMode} copy={copy} />
      </Suspense>
    </main>
  );
}

async function TeamsPageBody({
  range,
  viewMode,
  copy,
}: {
  range: ReturnType<typeof parseRange>;
  viewMode: "fan" | "org";
  copy: ReturnType<typeof getTeamsPageViewCopy>;
}) {
  const [teams, trendlines] = await Promise.all([
    getTeamLeaderboardModel(range, {
      includeDecisionMetrics: viewMode === "org",
      includeValueMetrics: viewMode === "org",
    }),
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

  const teamsWithWinValue = teams.filter(
    (team) => team.avgWinExpectancyDelta !== null && hasTrustedModelConfidenceBand(team.winValueConfidence),
  );
  const leagueAvgWinExpectancyDelta =
    teamsWithWinValue.length > 0
      ? teamsWithWinValue.reduce((sum, team) => sum + (team.avgWinExpectancyDelta ?? 0), 0) / teamsWithWinValue.length
      : null;
  const teamsWithDecisionValue = teams.filter(
    (team) => team.decisionSurplus !== null && hasTrustedModelConfidenceBand(team.decisionValueConfidence),
  );
  const leagueAvgDecisionSurplus =
    teamsWithDecisionValue.length > 0
      ? teamsWithDecisionValue.reduce((sum, team) => sum + (team.decisionSurplus ?? 0), 0) / teamsWithDecisionValue.length
      : null;
  const useWinValue = viewMode === "org" && leagueAvgWinExpectancyDelta !== null;
  const useDecisionValue = viewMode === "org" && leagueAvgDecisionSurplus !== null;

  // Scatter plot data
  const scatterData = teams.map((t) => ({
    teamId: t.teamId,
    teamName: t.teamName,
    logoUrl: `https://www.mlbstatic.com/team-logos/team-cap-on-dark/${t.teamId}.svg`,
    challengeRatePerGame: t.challengeRatePerGame,
    overturnRate: t.overturnRate,
  }));
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
              ? `${biggestMover.orgStyleLabel} with ${(biggestMover.lateLeverageShare * 100).toFixed(0)}% of reviews in late-or-close windows${
                  formatOrgValueCopy(biggestMover, useDecisionValue, useWinValue)
                }. The deployment mix is separating from league average.`
              : `${biggestMover.style} profile with ${(biggestMover.lateLeverageShare * 100).toFixed(0)}% of reviews coming in late-or-close windows and a visible trend swing.`}
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

  const movers = [...teams]
    .map((team) => {
      const values = trendlineMap.get(team.teamId) ?? [];
      const delta = values.length >= 2 ? values[values.length - 1] - values[0] : 0;
      return { team, delta };
    })
    .filter((entry) => entry.delta !== 0)
    .sort((left, right) => Math.abs(right.delta) - Math.abs(left.delta))
    .slice(0, 4);

  const moversSection = movers.length > 0 ? (
    <div className="mt-8 panel border-gray-100 bg-white p-5 shadow-2xl shadow-black/[0.03]">
      <div className="mb-4 flex items-baseline justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-blue-500">
            {viewMode === "org" ? "Trend Movers" : "Who Is Moving"}
          </p>
          <p className="mt-1 text-2xl font-display leading-none text-[var(--ink-0)]">
            {viewMode === "org" ? (
              <>League <span className="text-gray-400">Movement</span></>
            ) : (
              <>Recent <span className="text-gray-400">Swings</span></>
            )}
          </p>
        </div>
        <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--ink-3)]">
          based on current trendlines
        </span>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {movers.map(({ team, delta }) => {
          const up = delta >= 0;
          const values = trendlineMap.get(team.teamId) ?? [];
          return (
            <Link
              key={team.teamId}
              href={withViewModeHref(`/teams/${team.teamId}?range=${range}`, viewMode)}
              className="rounded-2xl border border-gray-100 bg-[var(--surface-infield)] p-4 transition hover:border-blue-100 hover:bg-white"
            >
              <div className="flex items-center gap-3">
                <TeamIcon teamId={team.teamId} name={team.teamName} size={30} variant="flat" className="shrink-0" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[var(--ink-0)]">{team.teamName}</p>
                  <p className="mt-1 text-[10px] font-black uppercase tracking-[0.1em] text-[var(--ink-3)]">
                    {up ? "Trending up" : "Trending down"} · {Math.abs(delta).toFixed(1)} pts
                  </p>
                </div>
              </div>
              <div className="mt-4 flex justify-center">
                <TrendSparkline data={values} />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  ) : null;

  const deploymentSummarySection =
    viewMode === "org" ? (
      <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricSummaryCard
          eyebrow="Review Surplus"
          title={bestByMetric(teams, (team) => team.decisionSurplus ?? Number.NEGATIVE_INFINITY)?.teamName ?? "No signal"}
          body={bestByMetric(teams, (team) => team.decisionSurplus ?? Number.NEGATIVE_INFINITY)
            ? `${formatOrgValueCopy(bestByMetric(teams, (team) => team.decisionSurplus ?? Number.NEGATIVE_INFINITY)!, true, false).replace(/^ and /, "")}`
            : "Modeled surplus leaders will appear once enough trusted sample is available."}
        />
        <MetricSummaryCard
          eyebrow="Late-Close Usage"
          title={bestByMetric(teams, (team) => team.lateLeverageShare)?.teamName ?? "No signal"}
          body={bestByMetric(teams, (team) => team.lateLeverageShare)
            ? `${Math.round((bestByMetric(teams, (team) => team.lateLeverageShare)!.lateLeverageShare) * 100)}% of reviews land in late-or-close spots.`
            : "No late leverage leader is available yet."}
        />
        <MetricSummaryCard
          eyebrow="Early Burn Risk"
          title={bestByMetric(teams, (team) => team.earlyLowLeverageShare)?.teamName ?? "No signal"}
          body={bestByMetric(teams, (team) => team.earlyLowLeverageShare)
            ? `${Math.round((bestByMetric(teams, (team) => team.earlyLowLeverageShare)!.earlyLowLeverageShare) * 100)}% of reviews are spent in lower-leverage windows.`
            : "No early-burn signal is available yet."}
        />
        <MetricSummaryCard
          eyebrow="Usage Pressure"
          title={bestByMetric(teams, (team) => team.challengeRatePerGame)?.teamName ?? "No signal"}
          body={bestByMetric(teams, (team) => team.challengeRatePerGame)
            ? `${bestByMetric(teams, (team) => team.challengeRatePerGame)!.challengeRatePerGame.toFixed(2)} reviews per game, the heaviest current usage clip in the league.`
            : "No usage signal is available yet."}
        />
      </div>
    ) : null;

  const tableSection = (
    <TeamLeaderboardTable
      range={range}
      viewMode={viewMode}
      teams={teams}
      trendlines={trendlines}
      profileHeader={copy.tableProfileHeader}
      volumeHeader={copy.tableVolumeHeader}
    />
  );

  return (
    <>
      {spotlightSection}
      {scatterSection}
      {moversSection}
      {deploymentSummarySection}
      <div className="mt-8">{tableSection}</div>
    </>
  );
}

function TeamsPageFallback({ copy }: { copy: ReturnType<typeof getTeamsPageViewCopy> }) {
  return (
    <>
      {copy.sectionOrder.map((section) => (
        <div key={section}>
          {section === "spotlight" ? (
            <div className="mb-8 panel border-gray-100 bg-white p-5 shadow-2xl shadow-black/[0.03] min-h-[140px]" />
          ) : section === "scatter" ? (
            <div className="mt-12 panel border-gray-100 bg-white shadow-2xl shadow-black/[0.03] min-h-[420px]" />
          ) : (
            <div className="panel overflow-hidden border-gray-100 bg-white shadow-2xl shadow-black/[0.03] min-h-[720px]" />
          )}
        </div>
      ))}
    </>
  );
}

function formatOrgValueCopy(
  team: {
    decisionSurplus: number | null;
    decisionValueConfidence: "high" | "medium" | "low" | null;
    avgWinExpectancyDelta: number | null;
    winValueConfidence: "high" | "medium" | "low" | null;
    avgRunExpectancyDelta: number | null;
  },
  useDecisionValue: boolean,
  useWinValue: boolean,
) {
  if (useDecisionValue && team.decisionSurplus !== null && hasTrustedModelConfidenceBand(team.decisionValueConfidence)) {
    return ` and ${team.decisionSurplus >= 0 ? "+" : ""}${(team.decisionSurplus * 100).toFixed(2)}% decision surplus`;
  }
  if (useWinValue && team.avgWinExpectancyDelta !== null && hasTrustedModelConfidenceBand(team.winValueConfidence)) {
    return ` and ${team.avgWinExpectancyDelta >= 0 ? "+" : ""}${(team.avgWinExpectancyDelta * 100).toFixed(2)}% average WE per review`;
  }
  if (team.avgRunExpectancyDelta !== null) {
    return ` and ${team.avgRunExpectancyDelta >= 0 ? "+" : ""}${team.avgRunExpectancyDelta.toFixed(3)} average RE per review`;
  }
  return "";
}

function MetricSummaryCard({
  eyebrow,
  title,
  body,
}: {
  eyebrow: string;
  title: string;
  body: string;
}) {
  return (
    <div className="panel border-gray-100 bg-white p-5 shadow-2xl shadow-black/[0.03]">
      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-blue-500">{eyebrow}</p>
      <p className="mt-2 text-lg font-semibold text-[var(--ink-0)]">{title}</p>
      <p className="mt-1 text-xs leading-6 text-[var(--ink-3)]">{body}</p>
    </div>
  );
}

function bestByMetric<T>(items: T[], getValue: (item: T) => number) {
  if (items.length === 0) return null;
  return [...items].sort((left, right) => getValue(right) - getValue(left))[0] ?? null;
}
