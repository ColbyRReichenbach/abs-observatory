import { notFound } from "next/navigation";
import { Suspense } from "react";
import type { ReactNode } from "react";

import { MotionIn } from "@/components/motion-in";
import { RangeSelector } from "@/components/range-selector";
import { UmpireAccuracyChart } from "@/components/analytics-charts";
import { UmpireHeadshot } from "@/components/umpire-headshot";
import { FilterStrip } from "@/components/analytics/filter-strip";
import { AIInsightBubble } from "@/components/analytics/ai-insight-bubble";
import { HeatmapDeepDive } from "@/components/analytics/heatmap-deep-dive";
import { getUmpireLeaderboardModel, getUmpireMatchupVulnerabilities, getUmpirePageChallengeEvents, getUmpirePerformanceDNA, getUmpireProfile, getUmpireSeasonTrend, getUmpireSummary, getUmpireTrend } from "@/lib/data";
import { ExtremeMissesSection } from "@/components/analytics/extreme-misses-section";
import { SeasonOverSeasonChart } from "@/components/analytics/season-over-season-chart";
import { parseRange } from "@/lib/range";
import { computeEstimatedLeverageIndex } from "@/lib/estimated-leverage";
import { resolveViewMode } from "@/lib/view-mode";
import type { ChallengeEvent, SituationalFilters } from "@/lib/types";
import { BackPill } from "@/components/ui/back-pill";
import { getUmpireDetailViewCopy } from "@/lib/view-mode-contract";
import { UmpireConsequenceBoard } from "@/components/analytics/umpire-consequence-board";
import { UmpireGamesMorph } from "@/components/analytics/umpire-games-morph";
import { UmpireConsequenceMatrix } from "@/components/analytics/umpire-consequence-matrix";
import { UmpireHandednessBoard } from "@/components/analytics/umpire-handedness-board";
import { UmpirePitchTraitScatter } from "@/components/analytics/umpire-pitch-trait-scatter";
import { buildUmpireZoneMapChartPayload } from "@/lib/chart-insight-payload";

function toInningRange(value?: string): SituationalFilters["inningRange"] {
  if (value === "early" || value === "middle" || value === "late" || value === "extras") return value;
  return undefined;
}

function toLeverage(value?: string): SituationalFilters["leverage"] {
  if (value === "low" || value === "medium" || value === "high") return value;
  return undefined;
}

function toSide(value?: string): SituationalFilters["side"] {
  if (value === "offense" || value === "defense") return value;
  return undefined;
}

function toResult(value?: string): SituationalFilters["result"] {
  if (value === "overturned" || value === "confirmed") return value;
  return undefined;
}

export const dynamic = "force-dynamic";

export default async function UmpirePage({
  params,
  searchParams,
}: {
  params: Promise<{ umpireId: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { umpireId } = await params;
  const sp = await searchParams;
  const getParam = (val: string | string[] | undefined) => Array.isArray(val) ? val[0] : val;
  const range = parseRange(getParam(sp.range));
  const viewMode = await resolveViewMode(sp as Record<string, string | string[] | undefined>);

  const filters: SituationalFilters = {
    inningRange: toInningRange(getParam(sp.inningRange)),
    leverage: toLeverage(getParam(sp.leverage)),
    side: toSide(getParam(sp.side)),
    result: toResult(getParam(sp.result)),
  };

  const sanitizedParams: Record<string, string> = {};
  Object.entries(sp).forEach(([key, val]) => {
    const s = getParam(val);
    if (s) sanitizedParams[key] = s;
  });

  const [summary, allUmpires] = await Promise.all([
    getUmpireSummary(Number(umpireId), range, filters),
    getUmpireLeaderboardModel(range),
  ]);

  if (!summary) return notFound();
  const currentUmpire = allUmpires.find((umpire) => umpire.umpireId === summary.umpireId) ?? null;
  const rankedUmpires = [...allUmpires].sort((left, right) =>
    viewMode === "org" ? compareOrgUmpires(left, right) : compareFanUmpires(left, right),
  );
  const rankIndex = rankedUmpires.findIndex((umpire) => umpire.umpireId === summary.umpireId);
  const displayRank = rankIndex >= 0 ? rankIndex + 1 : null;
  const orgValueLabel =
    currentUmpire?.averageWinExpectancyDelta !== null && currentUmpire?.averageWinExpectancyDelta !== undefined
      ? "Avg WE Δ"
      : "Avg RE Δ";
  const orgValueDisplay =
    currentUmpire?.averageWinExpectancyDelta !== null && currentUmpire?.averageWinExpectancyDelta !== undefined
      ? `${currentUmpire.averageWinExpectancyDelta >= 0 ? "+" : ""}${(currentUmpire.averageWinExpectancyDelta * 100).toFixed(2)}%`
      : currentUmpire?.averageRunExpectancyDelta !== null && currentUmpire?.averageRunExpectancyDelta !== undefined
        ? `${currentUmpire.averageRunExpectancyDelta >= 0 ? "+" : ""}${currentUmpire.averageRunExpectancyDelta.toFixed(3)}`
        : "N/A";
  const copy = getUmpireDetailViewCopy(viewMode);
  return (
    <main className="mx-auto max-w-7xl px-6 py-12 lg:py-24 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.02),transparent)]">
      <div className="mb-6">
        <BackPill label="Umpires" href="/umpires" />
      </div>
      {/* Header */}
      <MotionIn>
        <header className="relative mb-20 bg-white p-12 lg:p-16 rounded-[3rem] border border-gray-100 shadow-2xl shadow-blue-900/[0.03] flex flex-col md:flex-row gap-10 items-center overflow-hidden">
          {/* subtle accent background */}
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.1)_0%,transparent_70%)] opacity-60 -translate-y-1/2 translate-x-1/4 pointer-events-none" />

          <div className="relative h-48 w-48 rounded-full bg-gray-100 overflow-hidden shrink-0 shadow-[0_20px_40px_-10px_rgba(0,0,0,0.1)] border-4 border-white z-10">
            <UmpireHeadshot umpireId={summary.umpireId} umpireName={summary.umpireName} />
          </div>
          <div className="text-center md:text-left z-10">
            <h1 className="text-6xl md:text-8xl font-display uppercase tracking-[-0.04em] text-gray-900 leading-[1.1] mb-6 overflow-visible">
              {summary.umpireName}
            </h1>
            <p className="max-w-2xl text-xl font-medium text-gray-500 leading-tight tracking-tight text-balance">
              {summary.umpireName}. {copy.heroSubtitle}
            </p>
            {currentUmpire && (
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <span className="rounded-full bg-blue-50 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-blue-700">
                  {(summary.overturnRate * 100).toFixed(1)}% OT
                </span>
                <span className="rounded-full bg-gray-100 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-gray-600">
                  {viewMode === "org" ? currentUmpire.orgDescriptor : currentUmpire.fanDescriptor}
                </span>
                <span className="rounded-full bg-white px-3 py-1 text-[10px] font-black uppercase tracking-widest text-gray-500 border border-gray-200">
                  {currentUmpire.confidence} confidence
                </span>
              </div>
            )}
          </div>
        </header>
      </MotionIn>

      <div className="mb-12 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <RangeSelector basePath={`/umpires/${summary.umpireId}`} range={range} searchParams={sanitizedParams} />
        </div>
        {viewMode === "org" && <FilterStrip filters={filters} />}
      </div>

      {/* KPI Row */}
      <MotionIn delay={0.1}>
        <div className={`grid gap-6 grid-cols-2 ${viewMode === "org" ? "lg:grid-cols-5" : "lg:grid-cols-4"} mb-12`}>
          <StatCard label={viewMode === "org" ? "Challenged Calls" : "Challenges"} value={summary.challengedCalls.toString()} />
          <StatCard label={viewMode === "org" ? "Overturned Calls" : "Overturned"} value={summary.overturnedCalls.toString()} highlight />
          <StatCard
            label={viewMode === "org" ? "Overturn Rate" : "Success Rate"}
            value={`${(summary.overturnRate * 100).toFixed(1)}%`}
            subLabel={currentUmpire ? (viewMode === "org" ? currentUmpire.orgDescriptor : currentUmpire.fanDescriptor) : "Monitor"}
          />
          <StatCard
              label={viewMode === "org" ? orgValueLabel : "League Rank"}
              value={
                viewMode === "org"
                  ? orgValueDisplay
                  : displayRank
                    ? `#${displayRank}`
                    : "—"
              }
              highlight={viewMode === "org"}
              subLabel={
                viewMode === "org"
                  ? currentUmpire?.averageRunExpectancyDelta === null || currentUmpire?.averageRunExpectancyDelta === undefined
                    ? `${currentUmpire?.confidence ?? "medium"} confidence`
                    : currentUmpire?.averageWinExpectancyDelta === null || currentUmpire?.averageWinExpectancyDelta === undefined
                      ? "Win-value coverage pending"
                      : `Avg RE Δ ${currentUmpire.averageRunExpectancyDelta >= 0 ? "+" : ""}${currentUmpire.averageRunExpectancyDelta.toFixed(3)}`
                  : `${(summary.overturnRate * 100).toFixed(1)}% OT`
              }
            />
          {viewMode === "org" ? (
            <Suspense fallback={<StatCard label="High-Leverage Share" value="…" subLabel="ELI 65+ share" highlight />}>
              <UmpireExposureStatCard umpireId={summary.umpireId} range={range} filters={filters} />
            </Suspense>
          ) : null}
        </div>
      </MotionIn>

      {viewMode === "fan" ? (
        <MotionIn delay={0.12}>
          <div className="mb-12">
            <FanUmpireSummaryCard currentUmpire={currentUmpire} umpireName={summary.umpireName} overturnRate={summary.overturnRate} />
          </div>
        </MotionIn>
      ) : null}

      <Suspense fallback={<UmpireAnalyticsFallback showHistory={copy.historyPlacement === "early"} />}>
        <UmpireAnalyticsSections
          umpireId={summary.umpireId}
          umpireName={summary.umpireName}
          range={range}
          filters={filters}
          viewMode={viewMode}
          copy={copy}
        />
      </Suspense>
    </main >
  );
}

async function UmpireExposureStatCard({
  umpireId,
  range,
  filters,
}: {
  umpireId: number;
  range: ReturnType<typeof parseRange>;
  filters: SituationalFilters;
}) {
  const challenges = await getUmpirePageChallengeEvents(umpireId, range, filters);
  const highPressureExposure =
    challenges.length > 0
      ? challenges.filter((challenge) => computeEstimatedLeverageIndex(challenge) >= 65).length / challenges.length
      : 0;

  return (
    <StatCard
      label="High-Leverage Share"
      value={`${(highPressureExposure * 100).toFixed(0)}%`}
      subLabel="ELI 65+ share"
      highlight
    />
  );
}

async function UmpireAnalyticsSections({
  umpireId,
  umpireName,
  range,
  filters,
  viewMode,
  copy,
}: {
  umpireId: number;
  umpireName: string;
  range: ReturnType<typeof parseRange>;
  filters: SituationalFilters;
  viewMode: "fan" | "org";
  copy: ReturnType<typeof getUmpireDetailViewCopy>;
}) {
  const [profile, trend, challenges, dna, seasonTrend, matchupVulnerabilities] = await Promise.all([
    getUmpireProfile(umpireId, range, filters),
    getUmpireTrend(umpireId, range, filters),
    getUmpirePageChallengeEvents(umpireId, range, filters),
    viewMode === "fan" ? getUmpirePerformanceDNA(umpireId, range) : Promise.resolve({ rhythm: [], extremes: [] }),
    getUmpireSeasonTrend(umpireId),
    viewMode === "org" ? getUmpireMatchupVulnerabilities(umpireId, range, filters) : Promise.resolve([]),
  ]);

  const shouldShowSeasonTrend = seasonTrend.filter((point) => point.gamesWorked > 0).length >= 2;
  const zoneGrid = buildNineZoneGrid(challenges);
  const zoneChartContext = buildUmpireZoneMapChartPayload(umpireId, umpireName, zoneGrid);
  const showHistoryEarly = copy.historyPlacement === "early";
  const showHistoryLate = copy.historyPlacement !== "early";

  const historySection = (
    <MotionIn delay={0.05}>
      <UmpireGamesMorph games={trend} />
    </MotionIn>
  );

  return (
    <>
      {showHistoryEarly ? historySection : null}

      {viewMode === "org" ? (
        <>
          <MotionIn delay={0.15}>
            <UmpireConsequenceMatrix challenges={challenges} />
          </MotionIn>
          <MotionIn delay={0.18}>
            <div className="grid gap-8 xl:grid-cols-2">
              <UmpireHandednessBoard challenges={challenges} matchupVulnerabilities={matchupVulnerabilities} />
              <UmpirePitchTraitScatter challenges={challenges} />
            </div>
          </MotionIn>
          <MotionIn delay={0.19}>
            <UmpireConsequenceBoard challenges={challenges} />
          </MotionIn>
        </>
      ) : (
        <>
          <MotionIn delay={0.15}>
            <section className="mb-12 panel p-8 shadow-2xl shadow-black/[0.02] border border-gray-50 flex flex-col">
              <div>
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-emerald-500 mb-1">
                  Accuracy Trajectory
                </h4>
                <p className="text-3xl font-display leading-none text-gray-900">
                  Call <span className="text-gray-400 italic">Correctness</span> Over Time
                </p>
              </div>
              <div className="flex-1 w-full mt-6">
                <UmpireAccuracyChart data={trend} />
              </div>
            </section>
          </MotionIn>
        </>
      )}

      <MotionIn delay={0.2}>
        <section className={`grid gap-8 ${viewMode === "org" ? "lg:grid-cols-[1.1fr_0.9fr]" : "lg:grid-cols-2"}`}>
          <div className="panel p-8 shadow-2xl shadow-black/[0.02]">
            <div className="mb-8 pb-4 border-b border-gray-50 flex items-center justify-between">
              <div>
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-emerald-500 mb-1">
                  {viewMode === "org" ? "Zone Risk Map" : "Zone Review Pattern"}
                </h4>
                <p className="text-2xl font-display leading-none text-gray-900">
                  {viewMode === "org" ? (
                    <>Nine-Zone <span className="text-gray-400 italic">Profile</span></>
                  ) : (
                    <>Strike <span className="text-gray-400 italic">Concentration</span></>
                  )}
                </p>
              </div>
              <AIInsightBubble
                insight={buildZoneInsight(zoneGrid)}
                insightContent={buildZoneInsightContent(zoneGrid)}
                insightId={`umpire-zone:${umpireId}`}
                metadata={{ umpireId, surface: "umpire_zone" }}
                chartContext={zoneChartContext}
                spotlightTitle="Zone Map"
                spotlight={
                  <div className="space-y-6">
                    <UmpireNineZoneGrid cells={zoneGrid} />
                    <HeatmapDeepDive challenges={challenges} umpireName={umpireName} />
                  </div>
                }
              />
            </div>
            <div className="mt-8">
              <UmpireNineZoneGrid cells={zoneGrid} />
              <HeatmapDeepDive challenges={challenges} umpireName={umpireName} />
            </div>
          </div>

          <div className="panel p-8 shadow-2xl shadow-black/[0.02] flex flex-col">
            <div className="mb-8 pb-4 border-b border-gray-50">
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-blue-500 mb-1">
                {viewMode === "org" ? "Accuracy Trajectory" : "Directional Bias"}
              </h4>
              <p className="text-2xl font-display leading-none text-gray-900">
                {viewMode === "org" ? (
                  <>Call <span className="text-gray-400 italic">Correctness</span></>
                ) : (
                  <>Overturn <span className="text-gray-400 italic">Skew</span></>
                )}
              </p>
            </div>
            {viewMode === "org" ? (
              <div className="flex-1 w-full">
                <UmpireAccuracyChart data={trend} />
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4 mb-12">
                  <BiasCard label="S->B Overturns" value={profile.directionalBias.strikeToBall} color="#f59e0b" total={challenges.length} />
                  <BiasCard label="B->S Overturns" value={profile.directionalBias.ballToStrike} color="#10b981" total={challenges.length} />
                  <BiasCard label="Other Overturns" value={profile.directionalBias.otherOverturns} color="#06b6d4" total={challenges.length} />
                  <BiasCard label="Confirmed" value={profile.directionalBias.confirmed} color="#ef4444" total={challenges.length} />
                </div>

                <div className="mb-6">
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">
                    Situational Hotspots
                  </h4>
                  <p className="text-sm font-display leading-none text-gray-900">
                    Top <span className="text-gray-400 italic">Count Skew</span>
                  </p>
                </div>
                <div className="flex-1 overflow-hidden">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="pb-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Count</th>
                        <th className="pb-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Challenges</th>
                        <th className="pb-4 text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">Overturn</th>
                      </tr>
                    </thead>
                    <tbody>
                      {profile.countHotspots.map((hotspot) => (
                        <tr key={hotspot.countKey} className="group/row">
                          <td className="py-4 font-mono font-black text-gray-900 text-sm group-hover/row:text-blue-600 transition-colors">{hotspot.countKey}</td>
                          <td className="py-4 font-mono text-xs font-bold text-gray-500">{hotspot.challenges}</td>
                          <td className="py-4 text-right">
                            <span className="px-3 py-1 rounded-full bg-gray-50 border border-gray-100 text-gray-900 text-[10px] font-black">
                              {(hotspot.overturnRate * 100).toFixed(1)}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <UmpireChallengeOpportunityRead profile={profile} />
              </>
            )}
          </div>
        </section>
      </MotionIn>

      {viewMode === "fan" ? (
        <MotionIn delay={0.25}>
          <div className="mb-12">
            <ExtremeMissesSection extremes={dna.extremes} />
          </div>
        </MotionIn>
      ) : null}

      {showHistoryLate ? historySection : null}

      {viewMode === "fan" ? (
        <MotionIn delay={0.3}>
          {shouldShowSeasonTrend ? <div className="mb-8"><SeasonOverSeasonChart data={seasonTrend} /></div> : null}
        </MotionIn>
      ) : shouldShowSeasonTrend ? (
        <MotionIn delay={0.3}>
          <div className="mb-8">
            <SeasonOverSeasonChart data={seasonTrend} />
          </div>
        </MotionIn>
      ) : null}
    </>
  );
}

function UmpireAnalyticsFallback({ showHistory }: { showHistory: boolean }) {
  return (
    <>
      {showHistory ? (
        <section className="mb-12">
          <div className="panel p-8 shadow-2xl shadow-black/[0.02] border border-gray-50 min-h-[240px]">
            <div className="h-4 w-28 rounded bg-gray-100 animate-pulse mb-4" />
            <div className="flex gap-6 overflow-hidden">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="min-h-[180px] w-72 shrink-0 rounded-[2rem] bg-gradient-to-br from-gray-100 via-gray-50 to-white animate-pulse" />
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section className="mb-12">
        <div className="panel p-8 shadow-2xl shadow-black/[0.02] border border-gray-50 min-h-[320px]">
          <div className="h-4 w-32 rounded bg-gray-100 animate-pulse mb-4" />
          <div className="h-[240px] rounded-[1.5rem] bg-gradient-to-br from-gray-100 via-gray-50 to-white animate-pulse" />
        </div>
      </section>

      <section className="grid gap-8 lg:grid-cols-3 mb-12">
        <div className="panel p-8 min-h-[320px]">
          <div className="h-full w-full rounded-[1.5rem] bg-gradient-to-br from-gray-100 via-gray-50 to-white animate-pulse" />
        </div>
        <div className="panel p-8 min-h-[320px] lg:col-span-2">
          <div className="h-full w-full rounded-[1.5rem] bg-gradient-to-br from-gray-100 via-gray-50 to-white animate-pulse" />
        </div>
      </section>

      <section className="grid gap-8 lg:grid-cols-2">
        <div className="panel p-8 min-h-[420px]">
          <div className="h-full w-full rounded-[1.5rem] bg-gradient-to-br from-gray-100 via-gray-50 to-white animate-pulse" />
        </div>
        <div className="panel p-8 min-h-[420px]">
          <div className="h-full w-full rounded-[1.5rem] bg-gradient-to-br from-gray-100 via-gray-50 to-white animate-pulse" />
        </div>
      </section>

      <section className="mt-8">
        <div className="panel p-8 shadow-2xl shadow-black/[0.02] border border-gray-50 min-h-[220px]">
          <div className="h-full w-full rounded-[1.5rem] bg-gradient-to-br from-gray-100 via-gray-50 to-white animate-pulse" />
        </div>
      </section>
    </>
  );
}

function UmpireChallengeOpportunityRead({ profile }: { profile: Awaited<ReturnType<typeof getUmpireProfile>> }) {
  const topCount = profile.countHotspots[0] ?? null;
  const topZone = [...profile.zoneBuckets].sort((left, right) => right.overturnRate - left.overturnRate)[0] ?? null;
  const dominantBias =
    profile.directionalBias.strikeToBall > profile.directionalBias.ballToStrike
      ? "strike-to-ball overturns"
      : profile.directionalBias.ballToStrike > profile.directionalBias.strikeToBall
        ? "ball-to-strike overturns"
        : "balanced overturn mix";

  return (
    <div className="mt-6 rounded-[1.5rem] border border-gray-100 bg-gray-50/60 p-5">
      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--ink-3)]">Challenge Pattern Read</p>
      <p className="mt-2 text-sm leading-7 text-[var(--ink-2)]">
        {topCount || topZone
          ? `The clearest challenge traffic in this sample shows up ${topCount ? `in ${topCount.countKey} counts` : "in repeated count windows"}${
              topZone ? ` and in the ${topZone.zone} bucket` : ""
            }, where ${dominantBias} currently lead this umpire's overturned-call mix.`
          : "Challenge pattern notes will appear once more modeled count and zone sample is available."}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {topCount ? (
          <span className="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-gray-500">
            Top count {topCount.countKey}
          </span>
        ) : null}
        {topZone ? (
          <span className="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-gray-500">
            Top zone {topZone.zone}
          </span>
        ) : null}
        <span className="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-gray-500">
          {dominantBias}
        </span>
      </div>
    </div>
  );
}

function buildZoneInsight(zoneBuckets: ZoneNineCell[]) {
  const ranked = [...zoneBuckets].sort((a, b) => b.challenges - a.challenges);
  const busiest = ranked[0];
  if (!busiest || busiest.challenges === 0) {
    return "No recorded zone buckets are available for this umpire yet.";
  }

  return `Most challenged zone lane: ${busiest.label.toLowerCase()} with ${busiest.challenges} challenges and a ${(busiest.overturnRate * 100).toFixed(0)}% overturn rate.`;
}

function buildZoneInsightContent(zoneBuckets: ZoneNineCell[]): ReactNode {
  const rankedByChallenges = [...zoneBuckets]
    .filter((bucket) => bucket.challenges > 0)
    .sort((a, b) => b.challenges - a.challenges);
  const rankedByOverturn = [...zoneBuckets]
    .filter((bucket) => bucket.challenges > 0)
    .sort((a, b) => b.overturnRate - a.overturnRate || b.challenges - a.challenges);

  const busiest = rankedByChallenges[0];
  const mostVulnerable = rankedByOverturn[0];

  if (!busiest) {
    return (
      <InsightSections
        headline="No tracked zone buckets are available yet."
        sections={[
          {
            label: "What this chart shows",
            body: "Each cell is a nine-zone lane built from actual challenge coordinates, with challenge count and overturn rate layered together.",
          },
        ]}
      />
    );
  }

  const trafficRead =
    busiest.challenges >= 3
      ? `${busiest.label.toLowerCase()} is where the most challenge traffic is showing up right now with ${busiest.challenges} reviewed pitches.`
      : "Challenge traffic is still diffuse, so this map should be read directionally rather than as a stable location profile.";

  const vulnerabilityRead =
    mostVulnerable && mostVulnerable.challenges >= 2
      ? `${mostVulnerable.label.toLowerCase()} is the hottest overturn pocket at ${(mostVulnerable.overturnRate * 100).toFixed(0)}% across ${mostVulnerable.challenges} challenges.`
      : "No single zone lane has enough overturned sample yet to call it a durable vulnerability pocket.";

  return (
    <InsightSections
      headline="This chart is a location-risk map. It is trying to tell you where challenge traffic actually lands and which lanes are most likely to flip once reviewed."
      sections={[
        {
          label: "What the chart shows",
          body: trafficRead,
        },
        {
          label: "Baseball read",
          body: vulnerabilityRead,
        },
        {
          label: "How to use it",
          body: "For advance work, this is not about the whole strike zone equally. It tells you where a club is most likely to gain review leverage against this umpire, especially when location, count, and pitch shape keep pulling traffic into the same lane.",
        },
      ]}
    />
  );
}

function InsightSections({
  headline,
  sections,
}: {
  headline: string;
  sections: Array<{ label: string; body: string }>;
}) {
  return (
    <div className="space-y-5">
      <p className="text-base font-semibold leading-7 text-gray-900">{headline}</p>
      <div className="space-y-4">
        {sections.map((section) => (
          <div key={section.label} className="rounded-2xl border border-gray-100 bg-gray-50/60 px-4 py-4">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-600">{section.label}</p>
            <p className="mt-2 text-sm leading-7 text-gray-700">{section.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatCard({ label, value, highlight, subLabel }: { label: string; value: string; highlight?: boolean; subLabel?: string }) {
  return (
    <div className={`panel p-8 relative overflow-hidden transition-all hover:bg-white hover:shadow-2xl hover:-translate-y-1 ${highlight ? "border-blue-100" : "border-gray-50"}`}>
      {highlight && <div className="absolute top-4 right-4"><div className="h-2 w-2 rounded-full bg-blue-600 shadow-[0_0_12px_rgba(37,99,235,0.4)]" /></div>}
      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">{label}</p>
      <p className={`mt-6 font-display text-6xl tracking-tighter ${highlight ? "text-blue-600" : "text-gray-900"}`}>
        {value}
      </p>
      {subLabel && <p className="mt-2 text-[10px] font-medium text-[var(--ink-3)] uppercase tracking-widest">{subLabel}</p>}
    </div>
  );
}

function FanUmpireSummaryCard({
  currentUmpire,
  umpireName,
  overturnRate,
}: {
  currentUmpire: Awaited<ReturnType<typeof getUmpireLeaderboardModel>>[number] | null;
  umpireName: string;
  overturnRate: number;
}) {
  return (
    <div className="panel border-gray-100 bg-white p-6 shadow-2xl shadow-black/[0.03]">
      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-blue-500">Umpire Snapshot</p>
      <p className="mt-2 text-2xl font-display text-[var(--ink-0)]">
        What kind of <span className="text-gray-400">ABS umpire</span> is this?
      </p>
      <p className="mt-4 max-w-3xl text-sm leading-7 text-[var(--ink-2)]">
        {umpireName} is currently running a {(overturnRate * 100).toFixed(1)}% overturn rate
        {currentUmpire ? ` with a ${currentUmpire.fanDescriptor.toLowerCase()} read` : ""}. The public read here is simple:
        does this umpire stay steady game to game, and where do reviews actually find daylight once clubs challenge the call?
      </p>
    </div>
  );
}

function BiasCard({ label, value, color, total }: { label: string; value: number; color: string; total?: number }) {
  const rate = total && total > 0 ? ((value / total) * 100).toFixed(0) : null;
  return (
    <div className="rounded-3xl border border-gray-50 bg-gray-50/20 p-6 transition-all hover:bg-white hover:shadow-xl group/bias shadow-lg">
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 leading-tight mb-4">{label}</p>
      <div className="flex items-end justify-between">
        <div>
          <p className="font-display text-5xl font-black tracking-tight" style={{ color }}>{value}</p>
          {rate && (
            <p className="text-[10px] font-medium text-[var(--ink-3)] mt-1">{rate}% rate</p>
          )}
        </div>
        <div className="h-2.5 w-2.5 rounded-full opacity-20 group-hover/bias:opacity-100 transition-opacity ring-4 ring-offset-2 ring-transparent group-hover/bias:ring-gray-50" style={{ backgroundColor: color }} />
      </div>
    </div>
  );
}

type ZoneNineCell = {
  key: string;
  label: string;
  challenges: number;
  overturnRate: number;
};

function UmpireNineZoneGrid({ cells }: { cells: ZoneNineCell[] }) {
  return (
    <div className="relative flex flex-col items-center justify-center p-8 bg-slate-50/50 rounded-[2.5rem] border border-gray-100 shadow-inner overflow-hidden">
      <div className="grid grid-cols-3 gap-2 w-full max-w-[360px]">
        {cells.map((cell) => (
          <div
            key={cell.key}
            className="rounded-[1.25rem] border border-gray-100 bg-white p-4 text-center transition-all hover:shadow-md"
            style={{ backgroundColor: getNineZoneColor(cell.overturnRate, cell.challenges) }}
          >
            <p className="text-[9px] font-black uppercase tracking-[0.18em] text-gray-500">{cell.label}</p>
            <p className="mt-3 text-2xl font-display text-gray-900">{Math.round(cell.overturnRate * 100)}%</p>
            <p className="mt-1 text-[9px] font-medium text-gray-500">{cell.challenges} challenges</p>
          </div>
        ))}
      </div>
      <div className="mt-8 flex gap-6">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
          <span className="text-[9px] font-black uppercase text-gray-400 tracking-widest">High overturn</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
          <span className="text-[9px] font-black uppercase text-gray-400 tracking-widest">Lower overturn</span>
        </div>
      </div>
    </div>
  );
}

function buildNineZoneGrid(challenges: ChallengeEvent[]): ZoneNineCell[] {
  const labels = [
    ["Up-Glove", "Up-Mid", "Up-Arm"],
    ["Mid-Glove", "Heart", "Mid-Arm"],
    ["Low-Glove", "Low-Mid", "Low-Arm"],
  ];
  const cells = Array.from({ length: 3 }, (_, rowIndex) =>
    Array.from({ length: 3 }, (_, colIndex) => ({
      key: `${rowIndex}-${colIndex}`,
      label: labels[rowIndex][colIndex],
      challenges: 0,
      overturned: 0,
    })),
  ).flat();

  for (const challenge of challenges) {
    if (
      challenge.px == null ||
      challenge.pz == null ||
      challenge.strikeZoneTop == null ||
      challenge.strikeZoneBottom == null
    ) {
      continue;
    }

    const widthColumn = challenge.px < -0.28 ? 0 : challenge.px > 0.28 ? 2 : 1;
    const zoneHeight = Math.max(0.01, challenge.strikeZoneTop - challenge.strikeZoneBottom);
    const normalizedHeight = (challenge.pz - challenge.strikeZoneBottom) / zoneHeight;
    const heightRow = normalizedHeight < 1 / 3 ? 2 : normalizedHeight < 2 / 3 ? 1 : 0;
    const cell = cells.find((entry) => entry.key === `${heightRow}-${widthColumn}`);
    if (!cell) continue;
    cell.challenges += 1;
    if (challenge.isOverturned) cell.overturned += 1;
  }

  return cells.map((cell) => ({
    key: cell.key,
    label: cell.label,
    challenges: cell.challenges,
    overturnRate: cell.challenges > 0 ? cell.overturned / cell.challenges : 0,
  }));
}

function getNineZoneColor(overturnRate: number, sampleSize: number) {
  if (sampleSize === 0) return "rgba(255,255,255,1)";
  if (overturnRate >= 0.6) return "rgba(239, 68, 68, 0.28)";
  if (overturnRate >= 0.4) return "rgba(245, 158, 11, 0.22)";
  if (overturnRate >= 0.2) return "rgba(59, 130, 246, 0.18)";
  return "rgba(16, 185, 129, 0.14)";
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
  if (left.overturnRate !== right.overturnRate) return left.overturnRate - right.overturnRate;
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
