import { notFound } from "next/navigation";
import type { CSSProperties } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";


import { MotionIn } from "@/components/motion-in";
import { RangeSelector } from "@/components/range-selector";
import { getTeamAggression, getTeamHitterEyeHeatmap, getTeamIdentity, getTeamInningEfficiency, getTeamPitchingBailouts, getTeamSchedule, getTeamSideSplits, getTeamSummary, getTeamTrend, getTeamUmpireMatchups } from "@/lib/data";
import { TeamMotifHero } from "@/components/team-motif-hero";
import { TeamIcon } from "@/components/team-icon";
import { TeamTrendChart } from "@/components/analytics-charts";
import { FilterStrip } from "@/components/analytics/filter-strip";
import { ChallengeAggressionRadial } from "@/components/analytics/challenge-aggression-radial";
import { TeamScheduleMorph } from "@/components/analytics/team-schedule-morph";
import { UmpireMatchupMatrix } from "@/components/analytics/umpire-matchup-matrix";
import { HittersEyeHeatmap } from "@/components/analytics/hitters-eye-heatmap";
import { PitchingBailoutsLeaderboard } from "@/components/analytics/pitching-bailouts-leaderboard";
import { InningEfficiencyHeatmap } from "@/components/analytics/inning-efficiency-heatmap";
import { parseRange } from "@/lib/range";
import { resolveViewMode } from "@/lib/view-mode";
import type { SituationalFilters, TeamScheduleGame } from "@/lib/types";
import { TeamMotifBackdrop } from "@/components/team-motif-backdrop";
import { AIBSVisualizerChat } from "@/components/analytics/ai-bs-visualizer-chat";
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

export default async function TeamPage({
  params,
  searchParams,
}: {
  params: Promise<{ teamId: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { teamId } = await params;
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

  const [summary, trend, splits, identity, aggression, schedule, umpires, hittersEye, bailouts, inningEfficiency] = await Promise.all([
    getTeamSummary(Number(teamId), range, filters),
    getTeamTrend(Number(teamId), range, filters),
    getTeamSideSplits(Number(teamId), range, filters),
    getTeamIdentity(Number(teamId)),
    getTeamAggression(Number(teamId), range, filters),
    getTeamSchedule(Number(teamId)),
    getTeamUmpireMatchups(Number(teamId), range, filters),
    getTeamHitterEyeHeatmap(Number(teamId), range, filters),
    getTeamPitchingBailouts(Number(teamId), range, filters),
    getTeamInningEfficiency(Number(teamId), range, filters),
  ]);
  if (!summary) return notFound();
  const teamPrimary = identity?.primaryColor ?? "#007aff";
  const teamSecondary = identity?.secondaryColor ?? "#0040dd";

  return (
    <>
      <TeamMotifBackdrop teamId={summary.teamId} />
      <main
        className="relative mx-auto max-w-7xl px-6 pt-32 pb-40"
        style={
          {
            "--team-primary": teamPrimary,
            "--team-secondary": teamSecondary,
            "--team-primary-soft": `${teamPrimary}15`,
          } as CSSProperties
        }
      >
        <BackPill label="Teams" href="/teams" />
        <MotionIn>
          <TeamMotifHero
            teamId={summary.teamId}
            teamName={summary.teamName}
            abbreviation={identity?.abbreviation}
            primaryColor={identity?.primaryColor}
            secondaryColor={identity?.secondaryColor}
            logoSvgUrl={identity?.logoSvgUrl}
            wins={identity?.wins}
            losses={identity?.losses}
            divisionRank={identity?.divisionRank}
            wildCardRank={identity?.wildCardRank}
            divisionName={identity?.divisionName}
            leagueName={identity?.leagueName}
            subtitle={`Full ABS analytics breakdown for the ${summary.teamName}.`}
          />
        </MotionIn>

        {/* Interactive 5-Game Morphing Schedule */}
        <MotionIn delay={0.05}>
          <TeamScheduleMorph schedule={schedule as TeamScheduleGame[]} teamId={summary.teamId} primaryColor={teamPrimary} />
        </MotionIn>

        <div className="mt-12 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <RangeSelector basePath={`/teams/${summary.teamId}`} range={range} searchParams={sanitizedParams} />
            <ViewModeToggle mode={viewMode} />
          </div>
          {viewMode === "org" && <FilterStrip filters={filters} />}
        </div>


        {/* KPI Row */}
        <MotionIn delay={0.1}>
          <div className="mt-8 grid gap-4 grid-cols-2 md:grid-cols-5">
            <StatCard label={viewMode === "org" ? "Games Tracked" : "Games"} value={summary.gamesTracked.toString()} />
            <StatCard label={viewMode === "org" ? "Total Challenges" : "Challenges"} value={summary.challengesTotal.toString()} />
            <StatCard label={viewMode === "org" ? "Overturned" : "Successful"} value={summary.usedSuccessful.toString()} highlight />
            <StatCard label={viewMode === "org" ? "Upheld" : "Failed"} value={summary.usedFailed.toString()} />
            <StatCard
              label={viewMode === "org" ? "Overturn Rate" : "Success Rate"}
              value={`${(summary.overturnRate * 100).toFixed(1)}%`}
              highlight
              subLabel={viewMode === "org" ? `${summary.challengesTotal} sample` : undefined}
            />
          </div>
        </MotionIn>

        <MotionIn delay={0.2}>
          <section className="mt-8 grid gap-6 lg:grid-cols-3">
            {/* Trend Chart */}
            <div className="panel p-6 shadow-2xl shadow-black/[0.02] border border-gray-50 flex flex-col justify-between">
              <div>
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-blue-500 mb-1">
                  Overturn Success Over Time
                </h4>
                <p className="text-2xl font-display leading-none text-gray-900">
                  Challenge <span className="text-gray-400">Trajectory</span>
                </p>
              </div>
              <div className="flex-1 min-h-[300px] w-full mt-4">
                <TeamTrendChart data={trend} teamColor={teamPrimary} />
              </div>
            </div>

            {/* Aggression Radial */}
            <div className="panel p-6 shadow-2xl shadow-black/[0.02] border border-gray-50 flex flex-col">
              <div>
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-blue-500 mb-1">
                  Situational Density
                </h4>
                <p className="text-2xl font-display leading-none text-gray-900">
                  Challenge <span className="text-gray-400">Aggression</span>
                </p>
              </div>
              <div className="flex-1 min-h-[300px] w-full mt-4">
                <ChallengeAggressionRadial data={aggression} teamColor={teamPrimary} />
              </div>
            </div>

            {/* Hitter's Eye Heatmap */}
            <div className="panel p-6 shadow-2xl shadow-black/[0.02] border border-gray-50 flex flex-col items-center">
              <div className="w-full">
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-blue-500 mb-1">
                  Offensive Approach
                </h4>
                <p className="text-2xl font-display leading-none text-gray-900">
                  The <span className="text-gray-400">Hitter&apos;s Eye</span>
                </p>
              </div>
              <div className="flex-1 w-full mt-6 mb-2">
                <HittersEyeHeatmap data={hittersEye} teamColor={teamPrimary} />
              </div>
              <p className="text-xs text-gray-400 text-center uppercase tracking-widest font-black mt-2">
                Pitch locations challenged while batting
              </p>
            </div>
          </section>
        </MotionIn>

        {/* S3-6: Inning Efficiency Heatmap */}
        <MotionIn delay={0.25}>
          <section className="mt-8">
            <InningEfficiencyHeatmap
              data={inningEfficiency}
              teamPrimary={teamPrimary}
              teamSecondary={teamSecondary}
            />
          </section>
        </MotionIn>



        {/* Splits & Umpire Matchups */}
        <MotionIn delay={0.3}>
          <section className="mt-8 grid gap-6 lg:grid-cols-[1fr_1fr_1fr]">
            {/* S3-7: Home/Away Visual Bar Split */}
            <div className="panel p-8 h-fit">
              <div className="mb-6">
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-blue-500 mb-1">
                  Location Variance
                </h4>
                <p className="text-xl font-display leading-none text-gray-900">
                  Home / Away <span className="text-gray-400">Split</span>
                </p>
              </div>
              {splits.map((split) => {
                const rate = split.overturnRate * 100;
                const isHome = split.side === "home";
                return (
                  <div key={split.side} className="mb-5 last:mb-0">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--ink-2)]">
                        {isHome ? "🏠 Home" : "✈️ Away"}
                      </span>
                      <span className="text-xs font-mono font-bold text-[var(--ink-1)]">
                        {rate.toFixed(1)}%
                      </span>
                    </div>
                    <div className="relative h-3 w-full overflow-hidden rounded-full bg-gray-100">
                      <div
                        className="h-full rounded-full transition-all duration-700 ease-out"
                        style={{
                          width: `${Math.min(100, rate)}%`,
                          backgroundColor: isHome ? teamPrimary : teamSecondary,
                        }}
                      />
                    </div>
                    <div className="mt-1.5 flex gap-3 text-[10px] font-medium text-[var(--ink-3)]">
                      <span>{split.games} games</span>
                      <span>{split.challengesTotal} challenges</span>
                      <span>Avg rem: {split.avgRemaining.toFixed(2)}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Umpire Matchup Matrix */}
            <div className="panel p-8">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-blue-500 mb-1">
                    Officiating History
                  </h4>
                  <p className="text-xl font-display leading-none text-gray-900">
                    Umpire Matchup <span className="text-gray-400 italic">Matrix</span>
                  </p>
                </div>
              </div>
              <div className="overflow-hidden">
                <UmpireMatchupMatrix data={umpires} teamColor={teamPrimary} />
              </div>
            </div>

            {/* Pitching Bailout Leaderboard */}
            <div className="panel p-8">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-blue-500 mb-1">
                    Staff Reliance
                  </h4>
                  <p className="text-xl font-display leading-none text-gray-900">
                    ABS Bailout <span className="text-gray-400 italic">Leaders</span>
                  </p>
                </div>
              </div>
              <div className="overflow-hidden mt-4">
                <PitchingBailoutsLeaderboard data={bailouts} teamColor={teamPrimary} />
              </div>
            </div>
          </section>
        </MotionIn>

        <MotionIn delay={0.4}>
          <AIBSVisualizerChat context={`${summary.teamName} Strategy`} teamColor={teamPrimary} />
        </MotionIn>
      </main>
    </>
  );
}

function StatCard({ label, value, highlight, subLabel }: { label: string; value: string; highlight?: boolean; subLabel?: string }) {
  return (
    <div className={`panel p-6 relative overflow-hidden ${highlight ? "after:absolute after:inset-0 after:bg-[var(--team-primary)]/5" : ""}`}>
      <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--ink-3)]">{label}</p>
      <p className={`mt-3 font-display text-4xl tracking-tight ${highlight ? "text-[var(--ink-0)]" : "text-[var(--ink-1)]"}`}>
        {value}
      </p>
      {subLabel && <p className="mt-1 text-[9px] font-medium text-[var(--ink-3)]">{subLabel}</p>}
    </div>
  );
}
