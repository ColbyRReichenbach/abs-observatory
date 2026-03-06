import { notFound } from "next/navigation";
import type { CSSProperties } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";


import { MotionIn } from "@/components/motion-in";
import { RangeSelector } from "@/components/range-selector";
import { getTeamAggression, getTeamHitterEyeHeatmap, getTeamIdentity, getTeamPitchingBailouts, getTeamSchedule, getTeamSideSplits, getTeamSummary, getTeamTrend, getTeamUmpireMatchups } from "@/lib/data";
import { TeamMotifHero } from "@/components/team-motif-hero";
import { TeamIcon } from "@/components/team-icon";
import { TeamTrendChart } from "@/components/analytics-charts";
import { FilterStrip } from "@/components/analytics/filter-strip";
import { ChallengeAggressionRadial } from "@/components/analytics/challenge-aggression-radial";
import { TeamScheduleMorph } from "@/components/analytics/team-schedule-morph";
import { UmpireMatchupMatrix } from "@/components/analytics/umpire-matchup-matrix";
import { HittersEyeHeatmap } from "@/components/analytics/hitters-eye-heatmap";
import { PitchingBailoutsLeaderboard } from "@/components/analytics/pitching-bailouts-leaderboard";
import { parseRange } from "@/lib/range";
import { SituationalFilters } from "@/lib/types";
import { TeamMotifBackdrop } from "@/components/team-motif-backdrop";
import { AIBSVisualizerChat } from "@/components/analytics/ai-bs-visualizer-chat";
import Link from "next/link";

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

  const filters: SituationalFilters = {
    inningRange: getParam(sp.inningRange) as any,
    leverage: getParam(sp.leverage) as any,
    side: getParam(sp.side) as any,
    result: getParam(sp.result) as any,
  };

  const sanitizedParams: Record<string, string> = {};
  Object.entries(sp).forEach(([key, val]) => {
    const s = getParam(val);
    if (s) sanitizedParams[key] = s;
  });

  const [summary, trend, splits, identity, aggression, schedule, umpires, hittersEye, bailouts] = await Promise.all([
    getTeamSummary(Number(teamId), range, filters),
    getTeamTrend(Number(teamId), range, filters),
    getTeamSideSplits(Number(teamId), range, filters),
    getTeamIdentity(Number(teamId)),
    getTeamAggression(Number(teamId), range, filters),
    getTeamSchedule(Number(teamId)),
    getTeamUmpireMatchups(Number(teamId), range, filters),
    getTeamHitterEyeHeatmap(Number(teamId), range, filters),
    getTeamPitchingBailouts(Number(teamId), range, filters),
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
        <MotionIn>
          <TeamMotifHero
            teamId={summary.teamId}
            teamName={summary.teamName}
            abbreviation={identity?.abbreviation}
            primaryColor={identity?.primaryColor}
            secondaryColor={identity?.secondaryColor}
            logoSvgUrl={identity?.logoSvgUrl}
            subtitle={`Full ABS analytics breakdown for the ${summary.teamName}.`}
          />
        </MotionIn>

        {/* Interactive 5-Game Morphing Schedule */}
        <MotionIn delay={0.05}>
          <TeamScheduleMorph schedule={schedule as any} teamId={summary.teamId} primaryColor={teamPrimary} />
        </MotionIn>

        <div className="mt-12 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <RangeSelector basePath={`/teams/${summary.teamId}`} range={range} searchParams={sanitizedParams} />
          <FilterStrip filters={filters} />
        </div>


        {/* KPI Row */}
        <MotionIn delay={0.1}>
          <div className="mt-8 grid gap-4 grid-cols-2 md:grid-cols-5">
            <StatCard label="Games" value={summary.gamesTracked.toString()} />
            <StatCard label="Challenges" value={summary.challengesTotal.toString()} />
            <StatCard label="Successful" value={summary.usedSuccessful.toString()} highlight />
            <StatCard label="Failed" value={summary.usedFailed.toString()} />
            <StatCard label="Overturn Rate" value={`${(summary.overturnRate * 100).toFixed(1)}%`} highlight />
          </div>
        </MotionIn>

        <MotionIn delay={0.2}>
          <section className="mt-8 grid gap-6 lg:grid-cols-3">
            {/* Trend Chart */}
            <div className="panel p-6 shadow-2xl shadow-black/[0.02] border border-gray-50 flex flex-col justify-between">
              <div>
                <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 mb-1">
                  Overturn Success Over Time
                </h2>
                <h3 className="text-2xl font-display uppercase tracking-tight text-gray-900">
                  Challenge Trajectory
                </h3>
              </div>
              <div className="flex-1 min-h-[300px] w-full mt-4">
                <TeamTrendChart data={trend} teamColor={teamPrimary} />
              </div>
            </div>

            {/* Aggression Radial */}
            <div className="panel p-6 shadow-2xl shadow-black/[0.02] border border-gray-50 flex flex-col">
              <div>
                <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 mb-1">
                  Situational Density
                </h2>
                <h3 className="text-2xl font-display uppercase tracking-tight text-gray-900">
                  Challenge Aggression
                </h3>
              </div>
              <div className="flex-1 min-h-[300px] w-full mt-4">
                <ChallengeAggressionRadial data={aggression} teamColor={teamPrimary} />
              </div>
            </div>

            {/* Hitter's Eye Heatmap */}
            <div className="panel p-6 shadow-2xl shadow-black/[0.02] border border-gray-50 flex flex-col items-center">
              <div className="w-full">
                <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 mb-1">
                  Offensive Approach
                </h2>
                <h3 className="text-2xl font-display uppercase tracking-tight text-gray-900">
                  The Hitter's Eye
                </h3>
              </div>
              <div className="flex-1 w-full mt-6 mb-2">
                <HittersEyeHeatmap data={hittersEye as any} teamColor={teamPrimary} />
              </div>
              <p className="text-xs text-gray-400 text-center uppercase tracking-widest font-black mt-2">
                Pitch locations challenged while batting
              </p>
            </div>
          </section>
        </MotionIn>



        {/* Splits & Umpire Matchups */}
        <MotionIn delay={0.3}>
          <section className="mt-8 grid gap-6 lg:grid-cols-[1fr_1fr_1fr]">
            {/* Splits */}
            <div className="panel p-8 h-fit">
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--ink-3)]">
                Home / Away Split
              </h2>
              <div className="mt-6 overflow-hidden">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Side</th>
                      <th>Games</th>
                      <th>Challenges</th>
                      <th>Rate</th>
                      <th>Avg Rem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {splits.map((split) => (
                      <tr key={split.side}>
                        <td className="font-semibold uppercase text-[var(--ink-0)]">{split.side}</td>
                        <td className="font-mono">{split.games}</td>
                        <td className="font-mono">{split.challengesTotal}</td>
                        <td>
                          <span
                            className="inline-flex rounded-full border border-white/10 px-2 py-0.5 text-xs font-semibold font-mono bg-white/5 text-[var(--ink-0)]"
                          >
                            {(split.overturnRate * 100).toFixed(1)}%
                          </span>
                        </td>
                        <td className="font-mono">{split.avgRemaining.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Umpire Matchup Matrix */}
            <div className="panel p-8">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--ink-3)] mb-1">
                    Officiating History
                  </h2>
                  <h3 className="text-xl font-display uppercase tracking-tight text-gray-900">
                    Umpire Matchup Matrix
                  </h3>
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
                  <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--ink-3)] mb-1">
                    Staff Reliance
                  </h2>
                  <h3 className="text-xl font-display uppercase tracking-tight text-gray-900">
                    ABS Bailout Leaders
                  </h3>
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

function StatCard({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`panel p-6 relative overflow-hidden ${highlight ? "after:absolute after:inset-0 after:bg-[var(--team-primary)]/5" : ""}`}>
      <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--ink-3)]">{label}</p>
      <p className={`mt-3 font-display text-4xl tracking-tight ${highlight ? "text-[var(--ink-0)]" : "text-[var(--ink-1)]"}`}>
        {value}
      </p>
    </div>
  );
}

