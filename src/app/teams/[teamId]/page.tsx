import { notFound } from "next/navigation";
import { Suspense, type CSSProperties } from "react";

import { MotionIn } from "@/components/motion-in";
import { RangeSelector } from "@/components/range-selector";
import {
  getTeamAggression,
  getTeamChallengeScenarioMatrix,
  getTeamDecisionValueReport,
  getTeamChallengeValueSummary,
  getTeamHitterEyeHeatmap,
  getTeamIdentity,
  getTeamInningEfficiency,
  getTeamLeaderboardModel,
  getTeamPitchingBailouts,
  getTeamSchedule,
  getTeamSummary,
  getTeamTrend,
  getTeamUmpireMatchups,
} from "@/lib/data";
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
import type { RangeKey, SituationalFilters, TeamLeaderboardEntry, TeamScheduleGame } from "@/lib/types";
import { TeamMotifBackdrop } from "@/components/team-motif-backdrop";
import { BackPill } from "@/components/ui/back-pill";
import { getTeamDetailViewCopy } from "@/lib/view-mode-contract";
import { TeamChallengeValueMatrix } from "@/components/analytics/team-challenge-value-matrix";
import { TeamDecisionValueSummaryCard } from "@/components/analytics/team-decision-value-summary";
import { TeamDecisionWindowBoard } from "@/components/analytics/team-decision-window-board";
import { TeamDecisionBreakdownBoard } from "@/components/analytics/team-decision-breakdown-board";
import { TeamOrgCommandCenter } from "@/components/analytics/team-org-command-center";
import { hasTrustedModelConfidenceBand } from "@/lib/server/run-environment";
import { TeamDecisionValueScatter } from "@/components/analytics/team-decision-value-scatter";
import { TeamInventoryDeploymentChart } from "@/components/analytics/team-inventory-deployment-chart";

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

  const [summary, identity, leaderboard] = await Promise.all([
    getTeamSummary(Number(teamId), range, filters),
    getTeamIdentity(Number(teamId)),
    getTeamLeaderboardModel(range, { includeDecisionMetrics: viewMode === "org" }),
  ]);
  if (!summary) return notFound();
  const currentTeam = leaderboard.find((entry) => entry.teamId === summary.teamId) ?? null;
  const teamPrimary = identity?.primaryColor ?? "#007aff";
  const teamSecondary = identity?.secondaryColor ?? "#0040dd";
  const copy = getTeamDetailViewCopy(viewMode);
  const showLateSchedule = copy.schedulePlacement !== "early";

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
        <div className="relative z-20 mb-6">
          <BackPill label="Teams" href="/teams" />
        </div>
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

        {copy.schedulePlacement === "early" ? (
          <Suspense fallback={<SectionPanelFallback title="Schedule Flow" heightClass="min-h-[220px]" className="mt-8" />}>
            <TeamScheduleSection teamId={summary.teamId} teamPrimary={teamPrimary} />
          </Suspense>
        ) : null}

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
                label="Late/Close Share"
                value={`${(currentTeam.lateLeverageShare * 100).toFixed(0)}%`}
                subLabel="Late-or-close challenge mix"
                highlight
              />
            ) : null}
          </div>
        </MotionIn>

        <Suspense fallback={<TeamPrimaryAnalyticsFallback scheduleLate={showLateSchedule} />}>
          <TeamPrimaryAnalyticsSections
            teamId={summary.teamId}
            range={range}
            filters={filters}
            teamPrimary={teamPrimary}
            viewMode={viewMode}
            copy={copy}
            currentTeam={currentTeam}
            schedulePlacement={copy.schedulePlacement}
          />
        </Suspense>

        <Suspense fallback={<SectionPanelFallback title="Inning Efficiency" heightClass="min-h-[320px]" className="mt-8" />}>
          <TeamEfficiencySection
            teamId={summary.teamId}
            range={range}
            filters={filters}
            teamPrimary={teamPrimary}
            teamSecondary={teamSecondary}
            copy={copy}
          />
        </Suspense>

        {viewMode === "org" ? (
          <Suspense fallback={<SectionPanelFallback title="Decision Operations" heightClass="min-h-[520px]" className="mt-8" />}>
            <TeamOrgCommandCenterSection
              teamId={summary.teamId}
              range={range}
              filters={filters}
              teamPrimary={teamPrimary}
            />
          </Suspense>
        ) : (
          <>
            <Suspense fallback={<SectionPanelFallback title="Challenge Value Matrix" heightClass="min-h-[360px]" className="mt-8" />}>
              <TeamChallengeValueSection
                teamId={summary.teamId}
                range={range}
                filters={filters}
                teamPrimary={teamPrimary}
                viewMode={viewMode}
              />
            </Suspense>

            <Suspense fallback={<TeamDecisionSectionsFallback viewMode={viewMode} />}>
              <TeamDecisionSections
                teamId={summary.teamId}
                range={range}
                filters={filters}
                teamPrimary={teamPrimary}
                viewMode={viewMode}
              />
            </Suspense>
          </>
        )}

        <Suspense fallback={<TeamLowerSectionsFallback />}>
          <TeamLowerSections
            teamId={summary.teamId}
            range={range}
            filters={filters}
            teamPrimary={teamPrimary}
            teamSecondary={teamSecondary}
            viewMode={viewMode}
            currentTeam={currentTeam}
            copy={copy}
          />
        </Suspense>
      </main>
    </>
  );
}

async function TeamScheduleSection({
  teamId,
  teamPrimary,
}: {
  teamId: number;
  teamPrimary: string;
}) {
  const schedule = await getTeamSchedule(teamId);

  return (
    <MotionIn delay={0.05}>
      <section className="mt-8">
        <TeamScheduleMorph schedule={schedule as TeamScheduleGame[]} teamId={teamId} primaryColor={teamPrimary} />
      </section>
    </MotionIn>
  );
}

async function TeamPrimaryAnalyticsSections({
  teamId,
  range,
  filters,
  teamPrimary,
  viewMode,
  copy,
  currentTeam,
  schedulePlacement,
}: {
  teamId: number;
  range: RangeKey;
  filters: SituationalFilters;
  teamPrimary: string;
  viewMode: "fan" | "org";
  copy: ReturnType<typeof getTeamDetailViewCopy>;
  currentTeam: TeamLeaderboardEntry | null;
  schedulePlacement: "early" | "late";
}) {
  const [
    trend,
    aggression,
    schedule,
    hittersEyeAll,
    hittersEyeOffense,
    hittersEyeDefense,
    decisionValueReport,
  ] = await Promise.all([
    getTeamTrend(teamId, range, filters),
    getTeamAggression(teamId, range, filters),
    schedulePlacement === "late" ? getTeamSchedule(teamId) : Promise.resolve(null),
    getTeamHitterEyeHeatmap(teamId, range, { ...filters, side: undefined }),
    getTeamHitterEyeHeatmap(teamId, range, { ...filters, side: "offense" }),
    getTeamHitterEyeHeatmap(teamId, range, { ...filters, side: "defense" }),
    viewMode === "org" ? getTeamDecisionValueReport(teamId, range, filters) : Promise.resolve(null),
  ]);
  const showLateSchedule = schedulePlacement !== "early";

  return (
    <>
      {viewMode === "org" && decisionValueReport ? (
        <>
          <MotionIn delay={0.2}>
            <TeamDecisionValueScatter report={decisionValueReport} />
          </MotionIn>
          <MotionIn delay={0.22}>
            <TeamInventoryDeploymentChart report={decisionValueReport} />
          </MotionIn>
        </>
      ) : (
        <MotionIn delay={0.2}>
          <section className="mt-8 grid gap-6 lg:grid-cols-3">
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
                  data={{ all: hittersEyeAll, offense: hittersEyeOffense, defense: hittersEyeDefense }}
                  teamColor={teamPrimary}
                  viewMode={viewMode}
                />
              </div>
            </div>
          </section>
        </MotionIn>
      )}

      {showLateSchedule && schedule ? (
        <MotionIn delay={0.05}>
          <section className="mt-8">
            <TeamScheduleMorph schedule={schedule as TeamScheduleGame[]} teamId={teamId} primaryColor={teamPrimary} />
          </section>
        </MotionIn>
      ) : null}
    </>
  );
}

async function TeamEfficiencySection({
  teamId,
  range,
  filters,
  teamPrimary,
  teamSecondary,
  copy,
}: {
  teamId: number;
  range: RangeKey;
  filters: SituationalFilters;
  teamPrimary: string;
  teamSecondary: string;
  copy: ReturnType<typeof getTeamDetailViewCopy>;
}) {
  const inningEfficiency = await getTeamInningEfficiency(teamId, range, filters);

  return (
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
  );
}

async function TeamChallengeValueSection({
  teamId,
  range,
  filters,
  teamPrimary,
  viewMode,
}: {
  teamId: number;
  range: RangeKey;
  filters: SituationalFilters;
  teamPrimary: string;
  viewMode: "fan" | "org";
}) {
  const [challengeMatrix, challengeValueSummary] = await Promise.all([
    getTeamChallengeScenarioMatrix(teamId, range, filters),
    getTeamChallengeValueSummary(teamId, range, filters),
  ]);

  return (
    <MotionIn delay={0.28}>
      <section className="mt-8">
        <TeamChallengeValueMatrix
          cells={challengeMatrix}
          summary={challengeValueSummary}
          teamColor={teamPrimary}
          viewMode={viewMode}
        />
      </section>
    </MotionIn>
  );
}

async function TeamDecisionSections({
  teamId,
  range,
  filters,
  teamPrimary,
  viewMode,
}: {
  teamId: number;
  range: RangeKey;
  filters: SituationalFilters;
  teamPrimary: string;
  viewMode: "fan" | "org";
}) {
  const decisionValueReport = await getTeamDecisionValueReport(teamId, range, filters);

  return (
    <>
      <MotionIn delay={0.29}>
        <TeamDecisionValueSummaryCard summary={decisionValueReport.summary} teamColor={teamPrimary} viewMode={viewMode} />
      </MotionIn>

      {viewMode === "fan" ? (
        <MotionIn delay={0.295}>
          <TeamDecisionWindowBoard report={decisionValueReport} teamColor={teamPrimary} viewMode={viewMode} />
        </MotionIn>
      ) : null}

      {viewMode === "org" ? (
        <MotionIn delay={0.297}>
          <TeamDecisionBreakdownBoard report={decisionValueReport} teamColor={teamPrimary} />
        </MotionIn>
      ) : null}
    </>
  );
}

async function TeamOrgCommandCenterSection({
  teamId,
  range,
  filters,
  teamPrimary,
}: {
  teamId: number;
  range: RangeKey;
  filters: SituationalFilters;
  teamPrimary: string;
}) {
  const [decisionValueReport, challengeValueSummary, bailouts] = await Promise.all([
    getTeamDecisionValueReport(teamId, range, filters),
    getTeamChallengeValueSummary(teamId, range, filters),
    getTeamPitchingBailouts(teamId, range, filters),
  ]);

  return (
    <MotionIn delay={0.29}>
      <TeamOrgCommandCenter
        report={decisionValueReport}
        challengeSummary={challengeValueSummary}
        bailouts={bailouts}
        teamColor={teamPrimary}
      />
    </MotionIn>
  );
}

function SectionPanelFallback({
  title,
  heightClass,
  className,
}: {
  title: string;
  heightClass: string;
  className?: string;
}) {
  return (
    <section className={className}>
      <div className={`panel p-8 shadow-2xl shadow-black/[0.02] border border-gray-50 ${heightClass}`}>
        <p className="text-[10px] font-bold uppercase tracking-widest text-blue-500 mb-3">{title}</p>
        <div className="h-full w-full rounded-[1.5rem] bg-gradient-to-br from-gray-100 via-gray-50 to-white animate-pulse" />
      </div>
    </section>
  );
}

function TeamAnalyticsFallback({ scheduleLate }: { scheduleLate: boolean }) {
  return (
    <>
      <section className="mt-8 grid gap-6 lg:grid-cols-3">
        <SectionPanelFallback title="Trend Overview" heightClass="min-h-[360px]" />
        <SectionPanelFallback title="Aggression Profile" heightClass="min-h-[360px]" />
        <SectionPanelFallback title="Hitter's Eye" heightClass="min-h-[360px]" />
      </section>
      {scheduleLate ? <SectionPanelFallback title="Schedule Flow" heightClass="min-h-[220px]" className="mt-8" /> : null}
      <SectionPanelFallback title="Inning Efficiency" heightClass="min-h-[320px]" className="mt-8" />
      <SectionPanelFallback title="Challenge Value Matrix" heightClass="min-h-[360px]" className="mt-8" />
      <section className="mt-8 grid gap-6 lg:grid-cols-[1fr_1fr_1fr]">
        <SectionPanelFallback title="Timing Efficiency" heightClass="min-h-[280px]" />
        <SectionPanelFallback title="Umpire Matrix" heightClass="min-h-[280px]" />
        <SectionPanelFallback title="Challenge Style" heightClass="min-h-[280px]" />
      </section>
    </>
  );
}

function TeamPrimaryAnalyticsFallback({ scheduleLate }: { scheduleLate: boolean }) {
  return (
    <>
      <section className="mt-8 grid gap-6 lg:grid-cols-3">
        <SectionPanelFallback title="Trend Overview" heightClass="min-h-[360px]" />
        <SectionPanelFallback title="Aggression Profile" heightClass="min-h-[360px]" />
        <SectionPanelFallback title="Hitter's Eye" heightClass="min-h-[360px]" />
      </section>
      {scheduleLate ? <SectionPanelFallback title="Schedule Flow" heightClass="min-h-[220px]" className="mt-8" /> : null}
    </>
  );
}

function TeamDecisionSectionsFallback({ viewMode }: { viewMode: "fan" | "org" }) {
  return (
    <>
      <SectionPanelFallback title="Decision Summary" heightClass="min-h-[200px]" className="mt-8" />
      {viewMode === "fan" ? <SectionPanelFallback title="Decision Window Board" heightClass="min-h-[280px]" className="mt-8" /> : null}
      {viewMode === "org" ? <SectionPanelFallback title="Decision Breakdown" heightClass="min-h-[280px]" className="mt-8" /> : null}
    </>
  );
}

async function TeamLowerSections({
  teamId,
  range,
  filters,
  teamPrimary,
  teamSecondary,
  viewMode,
  currentTeam,
  copy,
}: {
  teamId: number;
  range: RangeKey;
  filters: SituationalFilters;
  teamPrimary: string;
  teamSecondary: string;
  viewMode: "fan" | "org";
  currentTeam: TeamLeaderboardEntry | null;
  copy: ReturnType<typeof getTeamDetailViewCopy>;
}) {
  const [umpires, challengeValueSummary] = await Promise.all([
    getTeamUmpireMatchups(teamId, range, filters),
    getTeamChallengeValueSummary(teamId, range, filters),
  ]);

  const usesTrustedWinValue =
    challengeValueSummary.averageWinExpectancyDelta !== null &&
    hasTrustedModelConfidenceBand(challengeValueSummary.winExpectancyConfidence);
  const averageWinValue = usesTrustedWinValue ? challengeValueSummary.averageWinExpectancyDelta : null;

  const lowerSections = {
    splits: (
      <div className="panel p-8 h-fit">
        <div className="mb-6">
          <h4 className="text-[10px] font-bold uppercase tracking-widest text-blue-500 mb-1">
            {viewMode === "org" ? "Decision Quality" : "Challenge Timing"}
          </h4>
          <p className="text-xl font-display leading-none text-gray-900">
            {viewMode === "org" ? (
              <>Timing <span className="text-gray-400">Efficiency</span></>
            ) : (
              <>Leverage / Burn <span className="text-gray-400">Share</span></>
            )}
          </p>
        </div>
        <div className="space-y-4">
          <TimingMetric
            label={viewMode === "org" ? "High-Leverage Share" : "High-Leverage Share"}
            value={`${(challengeValueSummary.highPressureShare * 100).toFixed(0)}%`}
            meter={challengeValueSummary.highPressureShare}
            color={teamPrimary}
          />
          <TimingMetric
            label={viewMode === "org" ? "Low-Pressure Spend" : "Early Burn Share"}
            value={`${(challengeValueSummary.lowPressureShare * 100).toFixed(0)}%`}
            meter={challengeValueSummary.lowPressureShare}
            color={teamSecondary}
          />
          <TimingMetric
            label={viewMode === "org" ? "RISP, <2 Outs" : "Big Spot Usage"}
            value={`${(challengeValueSummary.rispLessThanTwoOutsShare * 100).toFixed(0)}%`}
            meter={challengeValueSummary.rispLessThanTwoOutsShare}
            color={teamPrimary}
          />
          {viewMode === "org" ? (
            <>
              <TimingMetric
                label={usesTrustedWinValue ? "High-WE Share" : "High-RE Share"}
                value={`${(
                  (usesTrustedWinValue ? challengeValueSummary.highWinValueShare : challengeValueSummary.highRunValueShare) * 100
                ).toFixed(0)}%`}
                meter={usesTrustedWinValue ? challengeValueSummary.highWinValueShare : challengeValueSummary.highRunValueShare}
                color={teamPrimary}
              />
              <TimingMetric
                label={usesTrustedWinValue ? "Late-Close WE Capture" : "Late-Close RE Share"}
                value={`${(
                  (usesTrustedWinValue
                    ? challengeValueSummary.lateCloseWinValueShare
                    : challengeValueSummary.lateCloseRunValueShare) * 100
                ).toFixed(0)}%`}
                meter={usesTrustedWinValue ? challengeValueSummary.lateCloseWinValueShare : challengeValueSummary.lateCloseRunValueShare}
                color={teamSecondary}
              />
            </>
          ) : null}
        </div>
        <div className="mt-6 rounded-[1.5rem] border border-gray-100 bg-gray-50/60 p-4">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--ink-3)]">
            {viewMode === "org" ? (usesTrustedWinValue ? "Average Win Value" : "Average Run Value") : "Challenge Payoff"}
          </p>
          <p className="mt-2 text-3xl font-display text-[var(--ink-0)]">
            {viewMode === "org"
              ? usesTrustedWinValue
                ? `${(averageWinValue ?? 0) >= 0 ? "+" : ""}${((averageWinValue ?? 0) * 100).toFixed(2)}%`
                : challengeValueSummary.averageRunExpectancyDelta === null
                  ? "N/A"
                  : `${challengeValueSummary.averageRunExpectancyDelta >= 0 ? "+" : ""}${challengeValueSummary.averageRunExpectancyDelta.toFixed(3)}`
              : challengeValueSummary.averagePositiveOutcomeDelta === null
                ? "N/A"
                : `${challengeValueSummary.averagePositiveOutcomeDelta >= 0 ? "+" : ""}${(
                    challengeValueSummary.averagePositiveOutcomeDelta * 100
                  ).toFixed(1)}`}
          </p>
          <p className="mt-2 text-[11px] font-medium text-[var(--ink-2)] leading-relaxed">
            {viewMode === "org"
              ? usesTrustedWinValue
                ? `This club is averaging ${(averageWinValue ?? 0) >= 0 ? "a positive" : "a negative"} win-expectancy swing per tracked review, with ${(challengeValueSummary.highWinValueShare * 100).toFixed(0)}% of reviews creating positive win value.`
                : challengeValueSummary.averageRunExpectancyDelta === null
                  ? "Run-value read will appear once this club builds enough modeled challenge sample."
                  : `This club is averaging ${challengeValueSummary.averageRunExpectancyDelta >= 0 ? "a positive" : "a negative"} run-expectancy swing per tracked review, with ${(challengeValueSummary.highRunValueShare * 100).toFixed(0)}% of reviews creating positive run value.${challengeValueSummary.averageWinExpectancyDelta !== null && !hasTrustedModelConfidenceBand(challengeValueSummary.winExpectancyConfidence) ? " Win-value coverage is still low-confidence in this slice, so this view stays on run value." : ""}`
              : challengeValueSummary.bestScenarioLabel
                ? `This club has done its best realized challenge work in ${challengeValueSummary.bestScenarioLabel.toLowerCase()}.`
                : "Best challenge window will appear once the club builds more scenario sample."}
          </p>
          {viewMode === "org" ? (
            <p className="mt-2 text-[10px] font-black uppercase tracking-[0.14em] text-[var(--ink-3)]">
              {usesTrustedWinValue
                ? `${challengeValueSummary.winExpectancyConfidence?.toUpperCase() ?? "N/A"} confidence WE model`
                : challengeValueSummary.runExpectancyConfidence
                  ? `${challengeValueSummary.runExpectancyConfidence.toUpperCase()} confidence RE fallback`
                  : "Model confidence unavailable"}
            </p>
          ) : null}
        </div>
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
              {viewMode === "org" ? "Strategic Review Pattern" : "Club Review Pattern"}
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
    <MotionIn delay={0.3}>
      {viewMode === "org" ? (
        <section className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div>{lowerSections.umpires}</div>
          <div>{lowerSections.style}</div>
        </section>
      ) : (
        <section className="mt-8 grid gap-6 lg:grid-cols-[1fr_1fr_1fr]">
          {copy.lowerSectionOrder.map((section) => (
            <div key={section}>{lowerSections[section]}</div>
          ))}
        </section>
      )}
    </MotionIn>
  );
}

function TeamLowerSectionsFallback() {
  return (
    <section className="mt-8 grid gap-6 lg:grid-cols-[1fr_1fr_1fr]">
      <SectionPanelFallback title="Timing Efficiency" heightClass="min-h-[280px]" />
      <SectionPanelFallback title="Umpire Matrix" heightClass="min-h-[280px]" />
      <SectionPanelFallback title="Challenge Style" heightClass="min-h-[280px]" />
    </section>
  );
}

function TimingMetric({ label, value, meter, color }: { label: string; value: string; meter: number; color: string }) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--ink-2)]">{label}</span>
        <span className="text-xs font-mono font-bold text-[var(--ink-1)]">{value}</span>
      </div>
      <div className="relative h-3 w-full overflow-hidden rounded-full bg-gray-100">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{ width: `${Math.min(100, meter * 100)}%`, backgroundColor: color }}
        />
      </div>
    </div>
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
