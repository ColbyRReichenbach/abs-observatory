import { notFound } from "next/navigation";
import type { CSSProperties } from "react";


import { MotionIn } from "@/components/motion-in";
import { RangeSelector } from "@/components/range-selector";
import { getTeamAggression, getTeamHitterEyeHeatmap, getTeamIdentity, getTeamInningEfficiency, getTeamLeaderboardModel, getTeamSchedule, getTeamSideSplits, getTeamSummary, getTeamTrend, getTeamUmpireMatchups } from "@/lib/data";
import { TeamMotifHero } from "@/components/team-motif-hero";
import { TeamTrendChart } from "@/components/analytics-charts";
import { FilterStrip } from "@/components/analytics/filter-strip";
import { ChallengeAggressionRadial } from "@/components/analytics/challenge-aggression-radial";
import { TeamScheduleMorph } from "@/components/analytics/team-schedule-morph";
import { UmpireMatchupMatrix } from "@/components/analytics/umpire-matchup-matrix";
import { HittersEyeHeatmap } from "@/components/analytics/hitters-eye-heatmap";
import { InningEfficiencyHeatmap } from "@/components/analytics/inning-efficiency-heatmap";
import { parseRange } from "@/lib/range";
import { resolveViewMode } from "@/lib/view-mode";
import type { SituationalFilters, TeamLeaderboardEntry, TeamScheduleGame } from "@/lib/types";
import { TeamMotifBackdrop } from "@/components/team-motif-backdrop";
import { AIBSVisualizerChat } from "@/components/analytics/ai-bs-visualizer-chat";
import { BackPill } from "@/components/ui/back-pill";
import { getTeamDetailViewCopy } from "@/lib/view-mode-contract";

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

  const [summary, trend, splits, identity, aggression, schedule, umpires, hittersEyeAll, hittersEyeOffense, hittersEyeDefense, inningEfficiency, leaderboard] = await Promise.all([
    getTeamSummary(Number(teamId), range, filters),
    getTeamTrend(Number(teamId), range, filters),
    getTeamSideSplits(Number(teamId), range, filters),
    getTeamIdentity(Number(teamId)),
    getTeamAggression(Number(teamId), range, filters),
    getTeamSchedule(Number(teamId)),
    getTeamUmpireMatchups(Number(teamId), range, filters),
    getTeamHitterEyeHeatmap(Number(teamId), range, { ...filters, side: undefined }),
    getTeamHitterEyeHeatmap(Number(teamId), range, { ...filters, side: "offense" }),
    getTeamHitterEyeHeatmap(Number(teamId), range, { ...filters, side: "defense" }),
    getTeamInningEfficiency(Number(teamId), range, filters),
    getTeamLeaderboardModel(range),
  ]);
  if (!summary) return notFound();
  const currentTeam = leaderboard.find((entry) => entry.teamId === summary.teamId) ?? null;
  const teamPrimary = identity?.primaryColor ?? "#007aff";
  const teamSecondary = identity?.secondaryColor ?? "#0040dd";
  const copy = getTeamDetailViewCopy(viewMode);
  const scheduleSection = (
    <MotionIn delay={0.05}>
      <TeamScheduleMorph schedule={schedule as TeamScheduleGame[]} teamId={summary.teamId} primaryColor={teamPrimary} />
    </MotionIn>
  );
  const lowerSections = {
    splits: (
      <div className="panel p-8 h-fit">
        <div className="mb-6">
          <h4 className="text-[10px] font-bold uppercase tracking-widest text-blue-500 mb-1">
            Location Variance
          </h4>
          <p className="text-xl font-display leading-none text-gray-900">
            {viewMode === "org" ? (
              <>Context <span className="text-gray-400">Split</span></>
            ) : (
              <>Home / Away <span className="text-gray-400">Split</span></>
            )}
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
    ),
    umpires: (
      <div className="panel p-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-blue-500 mb-1">
              Officiating History
            </h4>
            <p className="text-xl font-display leading-none text-gray-900">
              {viewMode === "org" ? (
                <>Prep <span className="text-gray-400 italic">Matrix</span></>
              ) : (
                <>Umpire Matchup <span className="text-gray-400 italic">Matrix</span></>
              )}
            </p>
          </div>
        </div>
        <div className="overflow-hidden">
          <UmpireMatchupMatrix data={umpires} teamColor={teamPrimary} />
        </div>
      </div>
    ),
    style: (
      <div className="panel p-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-blue-500 mb-1">
              {viewMode === "org" ? "Strategic Identity" : "Club Personality"}
            </h4>
            <p className="text-xl font-display leading-none text-gray-900">
              {viewMode === "org" ? (
                <>Challenge <span className="text-gray-400 italic">Style</span></>
              ) : (
                <>ABS <span className="text-gray-400 italic">Archetype</span></>
              )}
            </p>
          </div>
        </div>
        <div className="overflow-hidden mt-4">
          <TeamStyleSummaryCard entry={currentTeam} viewMode={viewMode} teamPrimary={teamPrimary} />
        </div>
      </div>
    ),
  } as const;

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
            subtitle={`${summary.teamName}. ${copy.heroSubtitle}`}
          />
        </MotionIn>

        {copy.schedulePlacement === "early" ? scheduleSection : null}

        <div className="mt-12 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <RangeSelector basePath={`/teams/${summary.teamId}`} range={range} searchParams={sanitizedParams} />
          </div>
          {viewMode === "org" && <FilterStrip filters={filters} />}
        </div>


        {/* KPI Row */}
        <MotionIn delay={0.1}>
          <div className={`mt-8 grid gap-4 grid-cols-2 ${viewMode === "org" && currentTeam ? "md:grid-cols-6" : "md:grid-cols-5"}`}>
            <StatCard label={viewMode === "org" ? "Games Tracked" : "Games"} value={summary.gamesTracked.toString()} />
            <StatCard label={viewMode === "org" ? "Total Challenges" : "Challenges"} value={summary.challengesTotal.toString()} />
            <StatCard label={viewMode === "org" ? "Overturned" : "Successful"} value={summary.usedSuccessful.toString()} />
            <StatCard label={viewMode === "org" ? "Upheld" : "Failed"} value={summary.usedFailed.toString()} />
            <StatCard
              label={viewMode === "org" ? "Overturn Rate" : "Success Rate"}
              value={`${(summary.overturnRate * 100).toFixed(1)}%`}
              subLabel={viewMode === "org" ? `${summary.challengesTotal} sample` : undefined}
            />
            {viewMode === "org" && currentTeam ? (
              <StatCard
                label="High-Pressure Share"
                value={`${(currentTeam.lateLeverageShare * 100).toFixed(0)}%`}
                subLabel="Late leverage mix"
                highlight
              />
            ) : null}
          </div>
        </MotionIn>

        <MotionIn delay={0.2}>
          <section className="mt-8 grid gap-6 lg:grid-cols-3">
            {/* Trend Chart */}
            <div className="panel p-6 shadow-2xl shadow-black/[0.02] border border-gray-50 flex flex-col justify-between">
              <div>
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-blue-500 mb-1">
                  {copy.trendEyebrow}
                </h4>
                <p className="text-2xl font-display leading-none text-gray-900">
                  {copy.trendTitle.split(" ").slice(0, 1).join(" ")} <span className="text-gray-400">{copy.trendTitle.split(" ").slice(1).join(" ")}</span>
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
                  {copy.aggressionEyebrow}
                </h4>
                <p className="text-2xl font-display leading-none text-gray-900">
                  {copy.aggressionTitle.split(" ").slice(0, -1).join(" ")} <span className="text-gray-400">{copy.aggressionTitle.split(" ").slice(-1).join(" ")}</span>
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
                  {copy.heatmapEyebrow}
                </h4>
                <p className="text-2xl font-display leading-none text-gray-900">
                  {copy.heatmapTitle.split(" ").slice(0, -2).join(" ")} <span className="text-gray-400">{copy.heatmapTitle.split(" ").slice(-2).join(" ")}</span>
                </p>
              </div>
              <div className="flex-1 w-full mt-6 mb-2">
                <HittersEyeHeatmap
                  data={{
                    all: hittersEyeAll,
                    offense: hittersEyeOffense,
                    defense: hittersEyeDefense
                  }}
                  teamColor={teamPrimary}
                  viewMode={viewMode}
                />
              </div>
            </div>
          </section>
        </MotionIn>

        {copy.schedulePlacement === "late" ? <section className="mt-8">{scheduleSection}</section> : null}

        {/* S3-6: Inning Efficiency Heatmap */}
        <MotionIn delay={0.25}>
          <section className="mt-8">
            <InningEfficiencyHeatmap
              data={inningEfficiency}
              teamPrimary={teamPrimary}
              teamSecondary={teamSecondary}
              title={copy.efficiencyTitle}
              accent={copy.efficiencyAccent}
            />
          </section>
        </MotionIn>



        {/* Splits & Umpire Matchups */}
        <MotionIn delay={0.3}>
          <section className="mt-8 grid gap-6 lg:grid-cols-[1fr_1fr_1fr]">
            {copy.lowerSectionOrder.map((section) => (
              <div key={section}>{lowerSections[section]}</div>
            ))}
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

function TeamStyleSummaryCard({
  entry,
  viewMode,
  teamPrimary,
}: {
  entry: TeamLeaderboardEntry | null;
  viewMode: "fan" | "org";
  teamPrimary: string;
}) {
  if (!entry) {
    return (
      <div className="rounded-[2rem] border border-dashed border-gray-200 bg-gray-50/60 p-6 text-sm font-medium text-gray-400">
        Team style identity will appear once challenge samples stabilize.
      </div>
    );
  }

  const topDimensions = Object.entries(entry.styleScores)
    .sort(([, left], [, right]) => right - left)
    .slice(0, 2);

  return (
    <div className="rounded-[2rem] border border-gray-100 bg-gray-50/30 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-4xl font-display tracking-tight text-[var(--ink-0)]">
            {viewMode === "org" ? entry.orgStyleLabel : entry.style}
          </p>
          <p className="mt-2 text-sm font-medium leading-relaxed text-[var(--ink-2)]">
            {viewMode === "org"
              ? `Current-season pattern points to a ${entry.orgStyleLabel.toLowerCase()} challenge profile with ${entry.styleConfidence} confidence.`
              : `${entry.teamName} currently profiles as ${withIndefiniteArticle(entry.style)} ABS team, with ${entry.styleConfidence} confidence in the current sample.`}
          </p>
        </div>
        <span
          className="rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest text-white"
          style={{ backgroundColor: teamPrimary }}
        >
          {entry.styleConfidence} confidence
        </span>
      </div>
      <div className="mt-6 grid gap-3 md:grid-cols-2">
        {topDimensions.map(([label, score]) => (
          <div key={label} className="rounded-2xl border border-gray-100 bg-white px-4 py-3">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--ink-3)]">{label}</p>
            <div className="mt-2 flex items-end justify-between gap-4">
              <span className="text-2xl font-display text-[var(--ink-0)]">{Math.round(score)}</span>
              <div className="h-2 flex-1 rounded-full bg-gray-100">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${Math.max(8, Math.round(score))}%`, backgroundColor: teamPrimary }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function withIndefiniteArticle(value: string) {
  return /^[aeiou]/i.test(value) ? `an ${value}` : `a ${value}`;
}
