import { notFound } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { MotionIn } from "@/components/motion-in";
import { RangeSelector } from "@/components/range-selector";
import { TeamIcon } from "@/components/team-icon";
import { UmpireAccuracyChart } from "@/components/analytics-charts";
import { UmpireHeadshot } from "@/components/umpire-headshot";
import { FilterStrip } from "@/components/analytics/filter-strip";
import { AIInsightBubble } from "@/components/analytics/ai-insight-bubble";
import { UmpireHeatmap } from "@/components/analytics/umpire-heatmap";
import { HeatmapDeepDive } from "@/components/analytics/heatmap-deep-dive";
import { getUmpireChallenges, getUmpireLeaderboard, getUmpirePerformanceDNA, getUmpirePitchTypeBreakdown, getUmpireProfile, getUmpireSeasonTrend, getUmpireSummary, getUmpireTrend } from "@/lib/data";
import { UmpireRhythmChart } from "@/components/analytics/umpire-rhythm-chart";
import { ExtremeMissesSection } from "@/components/analytics/extreme-misses-section";
import { PitchTypeBreakdownChart } from "@/components/analytics/pitch-type-breakdown-chart";
import { SeasonOverSeasonChart } from "@/components/analytics/season-over-season-chart";
import { AIBSVisualizerChat } from "@/components/analytics/ai-bs-visualizer-chat";
import { parseRange } from "@/lib/range";
import { resolveViewMode } from "@/lib/view-mode";
import type { SituationalFilters, UmpireTrendPoint } from "@/lib/types";
import Link from "next/link";
import { BackPill } from "@/components/ui/back-pill";
import { ViewModeToggle } from "@/components/ui/view-mode-toggle";

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

  const [summary, profile, trend, challenges, dna, allUmpires, pitchTypes, seasonTrend] = await Promise.all([
    getUmpireSummary(Number(umpireId), range, filters),
    getUmpireProfile(Number(umpireId), range, filters),
    getUmpireTrend(Number(umpireId), range, filters),
    getUmpireChallenges(Number(umpireId), range, filters),
    getUmpirePerformanceDNA(Number(umpireId), range),
    getUmpireLeaderboard(range),
    getUmpirePitchTypeBreakdown(Number(umpireId), range, filters),
    getUmpireSeasonTrend(Number(umpireId)),
  ]);

  if (!summary) return notFound();

  return (
    <main className="mx-auto max-w-7xl px-6 py-12 lg:py-24 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.02),transparent)]">
      <BackPill label="Umpires" href="/umpires" />
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
              Consolidated ABS tracking and analytics for MLB Umpire {summary.umpireName}. Granular breakdown of strike zone personality, directional bias, and historical event efficiency.
            </p>
          </div>
        </header>
      </MotionIn>

      {/* Historical Stream */}
      <MotionIn delay={0.05}>
        <section className="mb-20">
          <div className="mb-8 flex items-end justify-between border-b border-gray-100 pb-8">
            <div>
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-blue-500 mb-1">
                Historical Assignments
              </h4>
              <p className="text-3xl font-display leading-none text-gray-900">
                Recent <span className="text-gray-400 italic">Gameday Feed</span>
              </p>
            </div>
            <div className="flex gap-2">
              <button className="p-3 rounded-2xl bg-white border border-gray-200 text-gray-400 hover:text-black hover:border-black transition-all shadow-sm">
                <ChevronLeft size={20} />
              </button>
              <button className="p-3 rounded-2xl bg-white border border-gray-200 text-gray-400 hover:text-black hover:border-black transition-all shadow-sm">
                <ChevronRight size={20} />
              </button>
            </div>
          </div>

          <div className="flex gap-6 overflow-x-auto pb-6 scrollbar-hide">
            {trend.map((g: UmpireTrendPoint) => (
              <Link href={`/game/${g.gamePk}`} key={g.gamePk} className="block flex-shrink-0 w-72 p-6 rounded-[2.5rem] bg-white border border-gray-100 shadow-xl shadow-black/[0.02] transition-all hover:shadow-black/[0.05] hover:-translate-y-1 hover:border-blue-200 group">
                <div className="flex justify-between items-start mb-6">
                  <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                    {new Date(g.gameDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </span>
                  <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${g.accuracy >= 0.95 ? 'bg-emerald-50 text-emerald-600' : 'bg-orange-50 text-orange-600'}`}>
                    {(g.accuracy * 100).toFixed(1)}% Acc
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3 mb-6">
                  <div className="flex flex-col items-center gap-2 flex-1">
                    <TeamIcon teamId={g.awayTeamId} name={g.awayTeamAbbr} size={40} className="shadow-lg group-hover:scale-110 group-hover:shadow-[0_0_15px_rgba(37,99,235,0.2)]" />
                    <span className="text-[10px] font-black text-gray-400 group-hover:text-blue-600 transition-colors">{g.awayTeamAbbr}</span>
                  </div>

                  <span className="text-[10px] font-black text-gray-200 italic mt-[-14px]">vs</span>

                  <div className="flex flex-col items-center gap-2 flex-1">
                    <TeamIcon teamId={g.homeTeamId} name={g.homeTeamAbbr} size={40} className="shadow-lg group-hover:scale-110 group-hover:shadow-[0_0_15px_rgba(37,99,235,0.2)]" />
                    <span className="text-[10px] font-black text-gray-400 group-hover:text-blue-600 transition-colors">{g.homeTeamAbbr}</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 border-t border-gray-50 pt-5">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1">Overturns</p>
                    <p className="text-2xl font-display text-gray-900">{g.overturnedCount}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1">Challenges</p>
                    <p className="text-2xl font-display text-blue-600">{g.challengedCount}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </MotionIn>

      <div className="mb-12 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <RangeSelector basePath={`/umpires/${summary.umpireId}`} range={range} searchParams={sanitizedParams} />
          <ViewModeToggle mode={viewMode} />
        </div>
        {viewMode === "org" && <FilterStrip filters={filters} />}
      </div>

      {/* KPI Row */}
      <MotionIn delay={0.1}>
        <div className="grid gap-6 grid-cols-2 lg:grid-cols-4 mb-12">
          <StatCard label={viewMode === "org" ? "Challenged Calls" : "Challenges"} value={summary.challengedCalls.toString()} />
          <StatCard label={viewMode === "org" ? "Overturned Calls" : "Overturned"} value={summary.overturnedCalls.toString()} highlight />
          {/* S4-5: Percentile Rank KPI replaces raw Confirmed count */}
          <StatCard
            label="Percentile Rank"
            value={(() => {
              const sorted = [...allUmpires].sort((a, b) => a.overturnRate - b.overturnRate);
              const rank = sorted.findIndex((u) => u.umpireId === summary.umpireId);
              const pctile = rank >= 0 ? Math.round(((rank + 1) / sorted.length) * 100) : 0;
              const suffix = pctile === 1 ? 'st' : pctile === 2 ? 'nd' : pctile === 3 ? 'rd' : 'th';
              return `${pctile}${suffix}`;
            })()}
            subLabel="vs. All Umpires"
          />
          <StatCard label="Overturn Rate" value={`${(summary.overturnRate * 100).toFixed(1)}%`} highlight />
        </div>
      </MotionIn>

      <MotionIn delay={0.15}>
        <section className="grid gap-8 lg:grid-cols-3 mb-12">
          {/* Accuracy Trajectory */}
          <div className="lg:col-span-2 panel p-8 shadow-2xl shadow-black/[0.02] border border-gray-50 flex flex-col justify-between">
            <div>
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-emerald-500 mb-1">
                Accuracy Trajectory
              </h4>
              <p className="text-2xl font-display leading-none text-gray-900 flex items-center gap-3">
                Call <span className="text-gray-400 italic">Correctness</span> Over Time
                <AIInsightBubble insight={buildRhythmInsight(summary.umpireName, dna.rhythm)} />
              </p>
            </div>
            <div className="flex-1 w-full mt-4">
              <UmpireAccuracyChart data={trend} />
            </div>
          </div>

          {/* Umpire Rhythm / Fatigue */}
          <div className="lg:col-span-1 panel p-8 shadow-2xl shadow-black/[0.02] border border-gray-50 flex flex-col">
            <div>
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-blue-500 mb-1">
                Performance DNA
              </h4>
              <p className="text-2xl font-display leading-none text-gray-900">
                Umpire <span className="text-gray-400 italic">Rhythm</span>
              </p>
            </div>
            <UmpireRhythmChart data={dna.rhythm} />
            {/* S4-8: Late-Inning Fatigue Detection */}
            {dna.rhythm.length >= 7 && (() => {
              const earlyAvg = dna.rhythm.slice(0, 3).reduce((sum, rhythmPoint) => sum + (rhythmPoint.accuracy || 0), 0) / 3;
              const lateAvg = dna.rhythm.slice(-3).reduce((sum, rhythmPoint) => sum + (rhythmPoint.accuracy || 0), 0) / 3;
              const drop = earlyAvg - lateAvg;
              if (drop > 0.05) {
                return (
                  <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-[11px] font-black text-amber-700">
                    Accuracy drops {(drop * 100).toFixed(1)} percentage points from the first three innings to the last three tracked innings.
                  </div>
                );
              }
              return null;
            })()}
          </div>

          {/* S4-7: Peer Comparison Percentile Bar */}
          <div className="panel p-6 shadow-2xl shadow-black/[0.02] border border-gray-50 flex flex-col justify-center">
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-emerald-500 mb-1">
              Peer Comparison
            </h4>
            <p className="text-xl font-display leading-none text-gray-900 mb-6">
              League <span className="text-gray-400 italic">Standing</span>
            </p>
            {(() => {
              const sorted = [...allUmpires].sort((a, b) => a.overturnRate - b.overturnRate);
              const rank = sorted.findIndex((u) => u.umpireId === summary.umpireId);
              const pctile = rank >= 0 ? Math.round(((rank + 1) / sorted.length) * 100) : 50;
              const isGood = pctile <= 50;
              return (
                <div>
                  <div className="relative h-5 w-full overflow-hidden rounded-full bg-gray-100 mb-3">
                    <div
                      className="h-full rounded-full transition-all duration-700 ease-out"
                      style={{
                        width: `${pctile}%`,
                        backgroundColor: isGood ? "#2d5a27" : "#d70015",
                      }}
                    />
                  </div>
                  <p className="text-[10px] font-bold text-[var(--ink-2)] text-center">
                    Better accuracy than <strong className="text-[var(--ink-0)]">{100 - pctile}%</strong> of umpires
                  </p>
                  <p className="text-[10px] text-[var(--ink-3)] text-center mt-1">
                    Overturn Rate: {(summary.overturnRate * 100).toFixed(1)}% · Rank {rank + 1} of {sorted.length}
                  </p>
                </div>
              );
            })()}
          </div>
        </section>
      </MotionIn>

      <MotionIn delay={0.2}>
        <section className="grid gap-8 lg:grid-cols-2">
          {/* Zone Personality */}
          <div className="panel p-8 shadow-2xl shadow-black/[0.02]">
            <div className="mb-8 pb-4 border-b border-gray-50 flex items-center justify-between">
              <div>
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-emerald-500 mb-1">
                  Zone Personality
                </h4>
                <p className="text-2xl font-display leading-none text-gray-900">
                  Strike <span className="text-gray-400 italic">Concentration</span>
                </p>
              </div>
              <AIInsightBubble insight={buildZoneInsight(profile.zoneBuckets)} />
            </div>
            <div className="mt-8">
              <UmpireHeatmap zoneBuckets={profile.zoneBuckets} />
              <HeatmapDeepDive challenges={challenges} umpireName={summary.umpireName} />
            </div>
          </div>

          {/* Directional Bias */}
          <div className="panel p-8 shadow-2xl shadow-black/[0.02] flex flex-col">
            <div className="mb-8 pb-4 border-b border-gray-50">
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-blue-500 mb-1">
                Directional Bias
              </h4>
              <p className="text-2xl font-display leading-none text-gray-900">
                Overturn <span className="text-gray-400 italic">Skew</span>
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-12">
              <BiasCard label="S->B Overturns" value={profile.directionalBias.strikeToBall} color="#f59e0b" total={summary.challengedCalls} />
              <BiasCard label="B->S Overturns" value={profile.directionalBias.ballToStrike} color="#10b981" total={summary.challengedCalls} />
              <BiasCard label="Other Overturns" value={profile.directionalBias.otherOverturns} color="#06b6d4" total={summary.challengedCalls} />
              <BiasCard label="Confirmed" value={profile.directionalBias.confirmed} color="#ef4444" total={summary.challengedCalls} />
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
          </div>
        </section>
      </MotionIn>

      <MotionIn delay={0.25}>
        <ExtremeMissesSection extremes={dna.extremes} />
      </MotionIn>

      <MotionIn delay={0.3}>
        <div className="grid gap-8 md:grid-cols-2 mb-8">
          <PitchTypeBreakdownChart data={pitchTypes} />
          <SeasonOverSeasonChart data={seasonTrend} />
        </div>
      </MotionIn>

      <MotionIn delay={0.35}>
        <AIBSVisualizerChat context={`${summary.umpireName} Umpiring`} />
      </MotionIn>
    </main >
  );
}

function buildRhythmInsight(
  umpireName: string,
  rhythm: Array<{ inning: number; total: number; overturned: number; accuracy: number }>,
) {
  if (rhythm.length < 2) {
    return `${umpireName} does not have enough inning-level challenge samples to summarize rhythm trends yet.`;
  }

  const sorted = [...rhythm].sort((a, b) => a.accuracy - b.accuracy);
  const best = sorted.at(-1);
  const worst = sorted[0];

  if (!best || !worst) {
    return `${umpireName} does not have enough inning-level challenge samples to summarize rhythm trends yet.`;
  }

  return `Best tracked inning: ${best.inning} (${(best.accuracy * 100).toFixed(1)}% accuracy across ${best.total} challenges). Lowest tracked inning: ${worst.inning} (${(worst.accuracy * 100).toFixed(1)}% across ${worst.total}).`;
}

function buildZoneInsight(zoneBuckets: Array<{ zone: string; challenges: number; overturnRate: number }>) {
  const ranked = [...zoneBuckets].sort((a, b) => b.challenges - a.challenges);
  const busiest = ranked[0];
  if (!busiest || busiest.challenges === 0) {
    return "No recorded zone buckets are available for this umpire yet.";
  }

  return `Most challenged zone: ${formatZoneLabel(busiest.zone)} with ${busiest.challenges} challenges and a ${(busiest.overturnRate * 100).toFixed(0)}% overturn rate.`;
}

function formatZoneLabel(zone: string) {
  switch (zone) {
    case "up":
      return "upper edge";
    case "down":
      return "lower edge";
    case "glove":
      return "glove side";
    case "arm":
      return "arm side";
    default:
      return zone;
  }
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
