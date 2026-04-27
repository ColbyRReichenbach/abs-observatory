"use client";

import Link from "next/link";
import { Fragment, type ReactNode, useMemo, useState } from "react";
import { ChevronDown, ChevronUp, ChevronsUpDown, RotateCcw } from "lucide-react";

import { TeamIcon } from "@/components/team-icon";
import { TrendSparkline } from "@/components/analytics/trend-sparkline";
import { ProfileBadge } from "@/components/ui/profile-badge";
import type { ConfidenceBand, RangeKey, TeamLeaderboardEntry, TeamTrendSparklinePoint } from "@/lib/types";
import { withViewModeHref } from "@/lib/view-mode-href";

type SortDirection = "asc" | "desc";
type TeamSortKey =
  | "default"
  | "name"
  | "profile"
  | "rate"
  | "success"
  | "lateClose"
  | "deployment"
  | "trend"
  | "reviewSurplus"
  | "value"
  | "volume";

type TeamLeaderboardTableProps = {
  range: RangeKey;
  viewMode: "fan" | "org";
  teams: TeamLeaderboardEntry[];
  trendlines: TeamTrendSparklinePoint[];
  profileHeader: string;
  volumeHeader: string;
};

const TEAM_SUCCESS_PRIOR_CHALLENGES = 20;

export function TeamLeaderboardTable({
  range,
  viewMode,
  teams,
  trendlines,
  profileHeader,
  volumeHeader,
}: TeamLeaderboardTableProps) {
  const [sort, setSort] = useState<{ key: TeamSortKey; direction: SortDirection }>({
    key: "default",
    direction: "desc",
  });
  const trendlineMap = useMemo(() => new Map(trendlines.map((entry) => [entry.teamId, entry.values])), [trendlines]);

  const totalChallenges = teams.reduce((sum, team) => sum + team.challengesTotal, 0);
  const totalSuccessful = teams.reduce((sum, team) => sum + team.usedSuccessful, 0);
  const leagueAvgRate = totalChallenges > 0 ? totalSuccessful / totalChallenges : 0;
  const leagueAvgRemaining = teams.length > 0 ? teams.reduce((sum, team) => sum + team.avgRemaining, 0) / teams.length : 0;
  const leagueAvgChallengeRatePerGame =
    teams.length > 0 ? teams.reduce((sum, team) => sum + team.challengeRatePerGame, 0) / teams.length : 0;
  const leagueAvgLatePressureShare =
    teams.length > 0 ? teams.reduce((sum, team) => sum + team.lateLeverageShare, 0) / teams.length : 0;
  const leagueAvgEarlyBurnShare =
    teams.length > 0 ? teams.reduce((sum, team) => sum + team.earlyLowLeverageShare, 0) / teams.length : 0;
  const teamsWithRunValue = teams.filter((team) => team.avgRunExpectancyDelta !== null);
  const leagueAvgRunExpectancyDelta =
    teamsWithRunValue.length > 0
      ? teamsWithRunValue.reduce((sum, team) => sum + (team.avgRunExpectancyDelta ?? 0), 0) / teamsWithRunValue.length
      : null;
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
  const showDecisionValueColumns = viewMode === "org" && teamsWithDecisionValue.length > 0;
  const useWinValue = viewMode === "org" && leagueAvgWinExpectancyDelta !== null;
  const useDecisionValue = viewMode === "org" && leagueAvgDecisionSurplus !== null;

  const sorted = useMemo(
    () =>
      sortTeams({
        teams,
        sortKey: sort.key,
        direction: sort.direction,
        viewMode,
        leagueAvgRate,
        useWinValue,
        useDecisionValue,
        trendlineMap,
      }),
    [leagueAvgRate, sort.direction, sort.key, teams, trendlineMap, useDecisionValue, useWinValue, viewMode],
  );

  const activeAverage = getAverageForSort({
    key: sort.key,
    teams,
    viewMode,
    leagueAvgRate,
    leagueAvgChallengeRatePerGame,
    leagueAvgLatePressureShare,
    leagueAvgEarlyBurnShare,
    leagueAvgDecisionSurplus,
    leagueAvgWinExpectancyDelta,
    leagueAvgRunExpectancyDelta,
    leagueAvgRemaining,
    useWinValue,
    useDecisionValue,
    trendlineMap,
  });
  const insertAt =
    activeAverage === null
      ? -1
      : getAverageInsertIndex({
          rows: sorted,
          key: sort.key,
          direction: sort.direction,
          viewMode,
          average: activeAverage,
          leagueAvgRate,
          useWinValue,
          useDecisionValue,
          trendlineMap,
        });
  const showAverageRow = insertAt >= 0;
  const columnCount = 8 + (viewMode === "fan" ? 1 : 0) + (showDecisionValueColumns ? 1 : 0);

  const applySort = (key: TeamSortKey) => {
    setSort((current) => {
      if (current.key === key) {
        return { key, direction: current.direction === "asc" ? "desc" : "asc" };
      }
      return { key, direction: getInitialDirection(key) };
    });
  };

  return (
    <div className="panel overflow-hidden border-gray-100 bg-white shadow-2xl shadow-black/[0.03]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-black/5 px-6 py-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-blue-600">Default Sort</p>
          <p className="mt-1 text-sm font-semibold text-[var(--ink-2)]">
            {viewMode === "org"
              ? "Decision value first when trusted, then modeled review impact."
              : "Sample-adjusted success rate, so every club stays qualified without low-volume noise."}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setSort({ key: "default", direction: "desc" })}
          className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-[10px] font-black uppercase tracking-widest text-[var(--ink-2)] shadow-sm transition hover:border-blue-200 hover:text-blue-700"
        >
          <RotateCcw size={12} />
          Default Sort
        </button>
      </div>
      <div className="divide-y divide-black/5 lg:hidden">
        {sorted.length === 0 ? (
          <div className="px-6 py-20 text-center font-semibold text-gray-400">
            No data points match the selected criteria.
          </div>
        ) : null}
        {sorted.map((team, idx) => (
          <TeamLeaderboardMobileCard
            key={team.teamId}
            team={team}
            rank={idx + 1}
            range={range}
            viewMode={viewMode}
            trendline={trendlineMap.get(team.teamId) ?? []}
            showDecisionValueColumns={showDecisionValueColumns}
            useWinValue={useWinValue}
            leagueAvgLatePressureShare={leagueAvgLatePressureShare}
            leagueAvgEarlyBurnShare={leagueAvgEarlyBurnShare}
          />
        ))}
      </div>
      <div className="hidden overflow-x-auto lg:block">
        <table className="data-table">
          <thead>
            <tr>
              <SortableHeader label="Rank & Team" sortKey="name" activeSort={sort} onSort={applySort} className="min-w-[220px]" />
              <SortableHeader label={profileHeader} sortKey="profile" activeSort={sort} onSort={applySort} className="w-36" />
              <SortableHeader label="Rate / Game" sortKey="rate" activeSort={sort} onSort={applySort} align="center" />
              {viewMode === "fan" ? (
                <SortableHeader label="Success" sortKey="success" activeSort={sort} onSort={applySort} align="center" />
              ) : null}
              <SortableHeader label="Late/Close" sortKey="lateClose" activeSort={sort} onSort={applySort} align="center" />
              <SortableHeader
                label={viewMode === "org" ? "Deployment" : "Timing"}
                sortKey="deployment"
                activeSort={sort}
                onSort={applySort}
                align="center"
              />
              <SortableHeader label="Trend" sortKey="trend" activeSort={sort} onSort={applySort} align="center" />
              {showDecisionValueColumns ? (
                <SortableHeader label="Review Surplus" sortKey="reviewSurplus" activeSort={sort} onSort={applySort} align="right" />
              ) : null}
              <SortableHeader
                label={viewMode === "org" ? (leagueAvgWinExpectancyDelta !== null ? "Avg WE Δ" : "Avg RE Δ") : "Avg Rem"}
                sortKey="value"
                activeSort={sort}
                onSort={applySort}
                align="right"
              />
              <SortableHeader label={volumeHeader} sortKey="volume" activeSort={sort} onSort={applySort} align="right" />
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={columnCount} className="!py-32 text-center font-semibold text-gray-400">
                  No data points match the selected criteria.
                </td>
              </tr>
            ) : null}
            {sorted.map((team, idx) => {
              const isBeforeAvg = showAverageRow && idx === insertAt;
              return (
                <Fragment key={team.teamId}>
                  {isBeforeAvg ? (
                    <AverageRow
                      teams={teams}
                      viewMode={viewMode}
                      showDecisionValueColumns={showDecisionValueColumns}
                      leagueAvgChallengeRatePerGame={leagueAvgChallengeRatePerGame}
                      leagueAvgRate={leagueAvgRate}
                      leagueAvgLatePressureShare={leagueAvgLatePressureShare}
                      leagueAvgEarlyBurnShare={leagueAvgEarlyBurnShare}
                      leagueAvgDecisionSurplus={leagueAvgDecisionSurplus}
                      leagueAvgWinExpectancyDelta={leagueAvgWinExpectancyDelta}
                      leagueAvgRunExpectancyDelta={leagueAvgRunExpectancyDelta}
                      leagueAvgRemaining={leagueAvgRemaining}
                    />
                  ) : null}
                  <tr className="group/row transition-colors hover:bg-gray-50/50">
                    <td>
                      <Link
                        href={withViewModeHref(`/teams/${team.teamId}?range=${range}`, viewMode)}
                        className="flex items-center gap-5 py-1"
                      >
                        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gray-50 text-[10px] font-black text-gray-400 transition-all group-hover/row:scale-110 group-hover/row:bg-black group-hover/row:text-white">
                          {(idx + 1).toString().padStart(2, "0")}
                        </span>
                        <TeamIcon
                          teamId={team.teamId}
                          name={team.teamName}
                          size={32}
                          variant="flat"
                          className="shrink-0 group-hover/row:scale-110"
                        />
                        <span className="font-black tracking-tight text-gray-900 transition-colors group-hover/row:text-blue-600">
                          {team.teamName}
                        </span>
                      </Link>
                    </td>
                    <td className="text-left">
                      <ProfileBadge
                        label={viewMode === "org" ? team.orgStyleLabel : team.style}
                        variant={viewMode === "org" ? "blue" : "emerald"}
                      />
                    </td>
                    <td className="text-center font-mono font-bold text-gray-500">{team.challengeRatePerGame.toFixed(2)}</td>
                    {viewMode === "fan" ? (
                      <td className="text-center">
                        <SuccessRateChip value={team.overturnRate} />
                      </td>
                    ) : null}
                    <td className="text-center">
                      <PressureShareChip value={team.lateLeverageShare} />
                    </td>
                    <td className="text-center">
                      <StrategyChip
                        label={
                          viewMode === "org"
                            ? getDecisionReadLabel(team.decisionSurplus, team.capturedValueShare, team.wastedValueShare)
                            : getTimingReadLabel(
                                team.lateLeverageShare,
                                team.earlyLowLeverageShare,
                                leagueAvgLatePressureShare,
                                leagueAvgEarlyBurnShare,
                              )
                        }
                        tone={
                          viewMode === "org"
                            ? getDecisionReadTone(team.decisionSurplus, team.capturedValueShare, team.wastedValueShare)
                            : getTimingReadTone(
                                team.lateLeverageShare,
                                team.earlyLowLeverageShare,
                                leagueAvgLatePressureShare,
                                leagueAvgEarlyBurnShare,
                              )
                        }
                      />
                    </td>
                    <td className="text-center">
                      <div className="flex justify-center">
                        <TrendSparkline data={trendlineMap.get(team.teamId) ?? []} />
                      </div>
                    </td>
                    {showDecisionValueColumns ? (
                      <td className="pr-8 text-right font-mono font-medium text-gray-400">
                        {team.decisionSurplus === null || !hasTrustedModelConfidenceBand(team.decisionValueConfidence)
                          ? "N/A"
                          : `${team.decisionSurplus >= 0 ? "+" : ""}${(team.decisionSurplus * 100).toFixed(2)}%`}
                      </td>
                    ) : null}
                    <td className="pr-8 text-right font-mono font-medium text-gray-400">
                      {viewMode === "org"
                        ? useWinValue && hasTrustedModelConfidenceBand(team.winValueConfidence) && team.avgWinExpectancyDelta !== null
                          ? `${team.avgWinExpectancyDelta >= 0 ? "+" : ""}${(team.avgWinExpectancyDelta * 100).toFixed(2)}%`
                          : team.avgRunExpectancyDelta === null
                            ? "N/A"
                            : `${team.avgRunExpectancyDelta >= 0 ? "+" : ""}${team.avgRunExpectancyDelta.toFixed(3)}`
                        : team.avgRemaining.toFixed(2)}
                    </td>
                    <td className="pr-8 text-right font-mono font-medium text-gray-400">
                      {viewMode === "org" ? team.gamesTracked : team.challengesTotal}
                    </td>
                  </tr>
                </Fragment>
              );
            })}
            {showAverageRow && insertAt === sorted.length && sorted.length > 0 ? (
              <AverageRow
                teams={teams}
                viewMode={viewMode}
                showDecisionValueColumns={showDecisionValueColumns}
                leagueAvgChallengeRatePerGame={leagueAvgChallengeRatePerGame}
                leagueAvgRate={leagueAvgRate}
                leagueAvgLatePressureShare={leagueAvgLatePressureShare}
                leagueAvgEarlyBurnShare={leagueAvgEarlyBurnShare}
                leagueAvgDecisionSurplus={leagueAvgDecisionSurplus}
                leagueAvgWinExpectancyDelta={leagueAvgWinExpectancyDelta}
                leagueAvgRunExpectancyDelta={leagueAvgRunExpectancyDelta}
                leagueAvgRemaining={leagueAvgRemaining}
              />
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SortableHeader({
  label,
  sortKey,
  activeSort,
  onSort,
  align = "left",
  className = "",
}: {
  label: string;
  sortKey: TeamSortKey;
  activeSort: { key: TeamSortKey; direction: SortDirection };
  onSort: (key: TeamSortKey) => void;
  align?: "left" | "center" | "right";
  className?: string;
}) {
  const active = activeSort.key === sortKey;
  const justify = align === "right" ? "justify-end" : align === "center" ? "justify-center" : "justify-start";
  const textAlign = align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left";

  return (
    <th className={`${className} ${textAlign}`}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={`inline-flex w-full items-center gap-1.5 ${justify} text-inherit transition hover:text-blue-600`}
      >
        <span>{label}</span>
        {active ? (
          activeSort.direction === "asc" ? <ChevronUp size={12} /> : <ChevronDown size={12} />
        ) : (
          <ChevronsUpDown size={12} className="opacity-35" />
        )}
      </button>
    </th>
  );
}

function AverageRow({
  teams,
  viewMode,
  showDecisionValueColumns,
  leagueAvgChallengeRatePerGame,
  leagueAvgRate,
  leagueAvgLatePressureShare,
  leagueAvgEarlyBurnShare,
  leagueAvgDecisionSurplus,
  leagueAvgWinExpectancyDelta,
  leagueAvgRunExpectancyDelta,
  leagueAvgRemaining,
}: {
  teams: TeamLeaderboardEntry[];
  viewMode: "fan" | "org";
  showDecisionValueColumns: boolean;
  leagueAvgChallengeRatePerGame: number;
  leagueAvgRate: number;
  leagueAvgLatePressureShare: number;
  leagueAvgEarlyBurnShare: number;
  leagueAvgDecisionSurplus: number | null;
  leagueAvgWinExpectancyDelta: number | null;
  leagueAvgRunExpectancyDelta: number | null;
  leagueAvgRemaining: number;
}) {
  return (
    <tr className="border-y border-[var(--border-subtle)] bg-[var(--surface-1)]">
      <td>
        <div className="flex items-center gap-5 py-1">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gray-100 text-[10px] font-black text-gray-400">
            —
          </span>
          <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-100 text-[10px] font-black">
            <span className="text-[9px] font-black tracking-[0.14em] text-gray-400">MLB</span>
          </span>
          <span className="font-bold italic tracking-tight text-gray-500">MLB Average</span>
        </div>
      </td>
      <td className="text-left">
        <span className="text-[10px] text-[var(--ink-3)]">—</span>
      </td>
      <td className="text-center font-mono font-bold italic text-gray-400">{leagueAvgChallengeRatePerGame.toFixed(2)}</td>
      {viewMode === "fan" ? (
        <td className="text-center">
          <SuccessRateChip value={leagueAvgRate} italic />
        </td>
      ) : null}
      <td className="text-center font-mono font-bold italic text-gray-400">{`${Math.round(leagueAvgLatePressureShare * 100)}%`}</td>
      <td className="text-center">
        <StrategyChip
          label={
            viewMode === "org"
              ? getDecisionReadLabel(leagueAvgDecisionSurplus, 0.5, 0.5)
              : getTimingReadLabel(
                  leagueAvgLatePressureShare,
                  leagueAvgEarlyBurnShare,
                  leagueAvgLatePressureShare,
                  leagueAvgEarlyBurnShare,
                )
          }
          tone={
            viewMode === "org"
              ? getDecisionReadTone(leagueAvgDecisionSurplus, 0.5, 0.5)
              : getTimingReadTone(
                  leagueAvgLatePressureShare,
                  leagueAvgEarlyBurnShare,
                  leagueAvgLatePressureShare,
                  leagueAvgEarlyBurnShare,
                )
          }
        />
      </td>
      <td className="text-center">
        <span className="text-[10px] text-[var(--ink-3)]">—</span>
      </td>
      {showDecisionValueColumns ? (
        <td className="pr-8 text-right font-mono font-medium italic text-gray-400">
          {leagueAvgDecisionSurplus === null
            ? "N/A"
            : `${leagueAvgDecisionSurplus >= 0 ? "+" : ""}${(leagueAvgDecisionSurplus * 100).toFixed(2)}%`}
        </td>
      ) : null}
      <td className="pr-8 text-right font-mono font-medium italic text-gray-400">
        {viewMode === "org"
          ? leagueAvgWinExpectancyDelta !== null
            ? `${leagueAvgWinExpectancyDelta >= 0 ? "+" : ""}${(leagueAvgWinExpectancyDelta * 100).toFixed(2)}%`
            : leagueAvgRunExpectancyDelta === null
              ? "N/A"
              : `${leagueAvgRunExpectancyDelta >= 0 ? "+" : ""}${leagueAvgRunExpectancyDelta.toFixed(3)}`
          : leagueAvgRemaining.toFixed(2)}
      </td>
      <td className="pr-8 text-right font-mono font-medium italic text-gray-400">
        {viewMode === "org"
          ? (teams.length > 0 ? teams.reduce((sum, team) => sum + team.gamesTracked, 0) / teams.length : 0).toFixed(1)
          : (teams.length > 0 ? teams.reduce((sum, team) => sum + team.challengesTotal, 0) / teams.length : 0).toFixed(1)}
      </td>
    </tr>
  );
}

function TeamLeaderboardMobileCard({
  team,
  rank,
  range,
  viewMode,
  trendline,
  showDecisionValueColumns,
  useWinValue,
  leagueAvgLatePressureShare,
  leagueAvgEarlyBurnShare,
}: {
  team: TeamLeaderboardEntry;
  rank: number;
  range: RangeKey;
  viewMode: "fan" | "org";
  trendline: number[];
  showDecisionValueColumns: boolean;
  useWinValue: boolean;
  leagueAvgLatePressureShare: number;
  leagueAvgEarlyBurnShare: number;
}) {
  const valueLabel = formatTeamValueMetric(team, viewMode, useWinValue);
  const surplusLabel =
    team.decisionSurplus === null || !hasTrustedModelConfidenceBand(team.decisionValueConfidence)
      ? "N/A"
      : `${team.decisionSurplus >= 0 ? "+" : ""}${(team.decisionSurplus * 100).toFixed(2)}%`;
  const deploymentLabel =
    viewMode === "org"
      ? getDecisionReadLabel(team.decisionSurplus, team.capturedValueShare, team.wastedValueShare)
      : getTimingReadLabel(
          team.lateLeverageShare,
          team.earlyLowLeverageShare,
          leagueAvgLatePressureShare,
          leagueAvgEarlyBurnShare,
        );
  const deploymentTone =
    viewMode === "org"
      ? getDecisionReadTone(team.decisionSurplus, team.capturedValueShare, team.wastedValueShare)
      : getTimingReadTone(
          team.lateLeverageShare,
          team.earlyLowLeverageShare,
          leagueAvgLatePressureShare,
          leagueAvgEarlyBurnShare,
        );

  return (
    <Link
      href={withViewModeHref(`/teams/${team.teamId}?range=${range}`, viewMode)}
      className="block px-5 py-5 transition hover:bg-gray-50/70"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gray-50 text-[10px] font-black text-gray-400">
            {rank.toString().padStart(2, "0")}
          </span>
          <TeamIcon teamId={team.teamId} name={team.teamName} size={34} variant="flat" className="shrink-0" />
          <div className="min-w-0">
            <p className="truncate font-black tracking-tight text-gray-900">{team.teamName}</p>
            <div className="mt-2">
              <ProfileBadge label={viewMode === "org" ? team.orgStyleLabel : team.style} variant={viewMode === "org" ? "blue" : "emerald"} />
            </div>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[9px] font-black uppercase tracking-[0.14em] text-gray-400">
            {viewMode === "fan" ? "Success" : useWinValue ? "Avg WE" : "Avg RE"}
          </p>
          <p className="mt-1 font-mono text-sm font-black text-gray-900">
            {viewMode === "fan" ? `${(team.overturnRate * 100).toFixed(1)}%` : valueLabel}
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <MobileMetric label="Rate / Game">{team.challengeRatePerGame.toFixed(2)}</MobileMetric>
        <MobileMetric label={viewMode === "org" ? "Games" : "Challenges"}>
          {viewMode === "org" ? team.gamesTracked : team.challengesTotal}
        </MobileMetric>
        <MobileMetric label="Late / Close">{`${Math.round(team.lateLeverageShare * 100)}%`}</MobileMetric>
        <MobileMetric label={viewMode === "org" ? "Deployment" : "Timing"}>
          <StrategyChip label={deploymentLabel} tone={deploymentTone} />
        </MobileMetric>
        {showDecisionValueColumns ? (
          <MobileMetric label="Review Surplus">{surplusLabel}</MobileMetric>
        ) : null}
        <MobileMetric label={viewMode === "org" ? (useWinValue ? "Avg WE Delta" : "Avg RE Delta") : "Avg Remaining"}>
          {valueLabel}
        </MobileMetric>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-gray-100 bg-white px-4 py-3">
        <span className="text-[9px] font-black uppercase tracking-[0.14em] text-gray-400">Trend</span>
        <TrendSparkline data={trendline} />
      </div>
    </Link>
  );
}

function MobileMetric({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0 rounded-2xl border border-gray-100 bg-white px-3 py-3">
      <p className="text-[9px] font-black uppercase tracking-[0.14em] text-gray-400">{label}</p>
      <div className="mt-2 min-w-0 text-sm font-black text-gray-900">{children}</div>
    </div>
  );
}

function formatTeamValueMetric(team: TeamLeaderboardEntry, viewMode: "fan" | "org", useWinValue: boolean) {
  if (viewMode === "fan") return team.avgRemaining.toFixed(2);
  if (useWinValue && hasTrustedModelConfidenceBand(team.winValueConfidence) && team.avgWinExpectancyDelta !== null) {
    return `${team.avgWinExpectancyDelta >= 0 ? "+" : ""}${(team.avgWinExpectancyDelta * 100).toFixed(2)}%`;
  }
  if (team.avgRunExpectancyDelta === null) return "N/A";
  return `${team.avgRunExpectancyDelta >= 0 ? "+" : ""}${team.avgRunExpectancyDelta.toFixed(3)}`;
}

function sortTeams({
  teams,
  sortKey,
  direction,
  viewMode,
  leagueAvgRate,
  useWinValue,
  useDecisionValue,
  trendlineMap,
}: {
  teams: TeamLeaderboardEntry[];
  sortKey: TeamSortKey;
  direction: SortDirection;
  viewMode: "fan" | "org";
  leagueAvgRate: number;
  useWinValue: boolean;
  useDecisionValue: boolean;
  trendlineMap: Map<number, number[]>;
}) {
  return [...teams].sort((left, right) => {
    if (sortKey === "default") {
      return compareTeamsForDefault(left, right, viewMode, leagueAvgRate, useWinValue, useDecisionValue);
    }

    const compared = compareSortValues(
      getSortValue(left, sortKey, viewMode, leagueAvgRate, useWinValue, useDecisionValue, trendlineMap),
      getSortValue(right, sortKey, viewMode, leagueAvgRate, useWinValue, useDecisionValue, trendlineMap),
    );
    if (compared !== 0) return direction === "asc" ? compared : -compared;
    return compareTeamsForDefault(left, right, viewMode, leagueAvgRate, useWinValue, useDecisionValue);
  });
}

function compareTeamsForDefault(
  left: TeamLeaderboardEntry,
  right: TeamLeaderboardEntry,
  viewMode: "fan" | "org",
  leagueAvgRate: number,
  useWinValue: boolean,
  useDecisionValue: boolean,
) {
  if (viewMode !== "org") {
    const rightAdjusted = getAdjustedOverturnRate(right, leagueAvgRate);
    const leftAdjusted = getAdjustedOverturnRate(left, leagueAvgRate);
    if (rightAdjusted !== leftAdjusted) return rightAdjusted - leftAdjusted;
    if (right.overturnRate !== left.overturnRate) return right.overturnRate - left.overturnRate;
    return right.challengesTotal - left.challengesTotal;
  }

  if (useDecisionValue) {
    const leftDecision = hasTrustedModelConfidenceBand(left.decisionValueConfidence) ? left.decisionSurplus : null;
    const rightDecision = hasTrustedModelConfidenceBand(right.decisionValueConfidence) ? right.decisionSurplus : null;
    if (leftDecision !== null || rightDecision !== null) {
      if (leftDecision === null) return 1;
      if (rightDecision === null) return -1;
      if (rightDecision !== leftDecision) return rightDecision - leftDecision;
    }
  }

  const leftMetric =
    useWinValue && hasTrustedModelConfidenceBand(left.winValueConfidence) ? left.avgWinExpectancyDelta : left.avgRunExpectancyDelta;
  const rightMetric =
    useWinValue && hasTrustedModelConfidenceBand(right.winValueConfidence) ? right.avgWinExpectancyDelta : right.avgRunExpectancyDelta;

  if (leftMetric === null && rightMetric === null) {
    return right.overturnRate - left.overturnRate;
  }
  if (leftMetric === null) return 1;
  if (rightMetric === null) return -1;
  if (rightMetric !== leftMetric) return rightMetric - leftMetric;

  const leftShare =
    useWinValue && hasTrustedModelConfidenceBand(left.winValueConfidence) ? left.highWinValueShare : left.highRunValueShare;
  const rightShare =
    useWinValue && hasTrustedModelConfidenceBand(right.winValueConfidence) ? right.highWinValueShare : right.highRunValueShare;
  if (rightShare !== leftShare) return rightShare - leftShare;

  return right.overturnRate - left.overturnRate;
}

function compareSortValues(left: string | number | null, right: string | number | null) {
  if (left === null && right === null) return 0;
  if (left === null) return -1;
  if (right === null) return 1;
  if (typeof left === "string" || typeof right === "string") return String(left).localeCompare(String(right));
  return left - right;
}

function getSortValue(
  team: TeamLeaderboardEntry,
  key: TeamSortKey,
  viewMode: "fan" | "org",
  leagueAvgRate: number,
  useWinValue: boolean,
  useDecisionValue: boolean,
  trendlineMap: Map<number, number[]>,
): string | number | null {
  if (key === "name") return team.teamName;
  if (key === "profile") return viewMode === "org" ? team.orgStyleLabel : team.style;
  if (key === "rate") return team.challengeRatePerGame;
  if (key === "success" || key === "default") return getAdjustedOverturnRate(team, leagueAvgRate);
  if (key === "lateClose") return team.lateLeverageShare;
  if (key === "deployment") {
    if (viewMode === "org") {
      if (useDecisionValue && hasTrustedModelConfidenceBand(team.decisionValueConfidence)) return team.decisionSurplus;
      return team.capturedValueShare - team.wastedValueShare;
    }
    return team.lateLeverageShare - team.earlyLowLeverageShare;
  }
  if (key === "trend") return getTrendDelta(trendlineMap.get(team.teamId) ?? []);
  if (key === "reviewSurplus") return hasTrustedModelConfidenceBand(team.decisionValueConfidence) ? team.decisionSurplus : null;
  if (key === "value") {
    if (viewMode === "org") {
      if (useWinValue && hasTrustedModelConfidenceBand(team.winValueConfidence)) return team.avgWinExpectancyDelta;
      return team.avgRunExpectancyDelta;
    }
    return team.avgRemaining;
  }
  if (key === "volume") return viewMode === "org" ? team.gamesTracked : team.challengesTotal;
  return null;
}

function getAverageForSort({
  key,
  teams,
  viewMode,
  leagueAvgRate,
  leagueAvgChallengeRatePerGame,
  leagueAvgLatePressureShare,
  leagueAvgEarlyBurnShare,
  leagueAvgDecisionSurplus,
  leagueAvgWinExpectancyDelta,
  leagueAvgRunExpectancyDelta,
  leagueAvgRemaining,
  useWinValue,
  useDecisionValue,
  trendlineMap,
}: {
  key: TeamSortKey;
  teams: TeamLeaderboardEntry[];
  viewMode: "fan" | "org";
  leagueAvgRate: number;
  leagueAvgChallengeRatePerGame: number;
  leagueAvgLatePressureShare: number;
  leagueAvgEarlyBurnShare: number;
  leagueAvgDecisionSurplus: number | null;
  leagueAvgWinExpectancyDelta: number | null;
  leagueAvgRunExpectancyDelta: number | null;
  leagueAvgRemaining: number;
  useWinValue: boolean;
  useDecisionValue: boolean;
  trendlineMap: Map<number, number[]>;
}) {
  if (key === "default") {
    return viewMode === "org"
      ? useDecisionValue
        ? leagueAvgDecisionSurplus
        : useWinValue
          ? leagueAvgWinExpectancyDelta
          : leagueAvgRunExpectancyDelta
      : leagueAvgRate;
  }
  if (key === "rate") return leagueAvgChallengeRatePerGame;
  if (key === "success") return leagueAvgRate;
  if (key === "lateClose") return leagueAvgLatePressureShare;
  if (key === "deployment") {
    return viewMode === "org"
      ? leagueAvgDecisionSurplus
      : leagueAvgLatePressureShare - leagueAvgEarlyBurnShare;
  }
  if (key === "trend") return averageMetric(teams.map((team) => getTrendDelta(trendlineMap.get(team.teamId) ?? [])));
  if (key === "reviewSurplus") return leagueAvgDecisionSurplus;
  if (key === "value") {
    return viewMode === "org"
      ? leagueAvgWinExpectancyDelta !== null
        ? leagueAvgWinExpectancyDelta
        : leagueAvgRunExpectancyDelta
      : leagueAvgRemaining;
  }
  if (key === "volume") {
    return viewMode === "org"
      ? averageMetric(teams.map((team) => team.gamesTracked))
      : averageMetric(teams.map((team) => team.challengesTotal));
  }
  return null;
}

function getAverageInsertIndex({
  rows,
  key,
  direction,
  viewMode,
  average,
  leagueAvgRate,
  useWinValue,
  useDecisionValue,
  trendlineMap,
}: {
  rows: TeamLeaderboardEntry[];
  key: TeamSortKey;
  direction: SortDirection;
  viewMode: "fan" | "org";
  average: number;
  leagueAvgRate: number;
  useWinValue: boolean;
  useDecisionValue: boolean;
  trendlineMap: Map<number, number[]>;
}) {
  const metricKey =
    key === "default"
      ? viewMode === "org"
        ? useDecisionValue
          ? "reviewSurplus"
          : "value"
        : "success"
      : key;
  const index = rows.findIndex((team) => {
    const value = getSortValue(team, metricKey, viewMode, leagueAvgRate, useWinValue, useDecisionValue, trendlineMap);
    if (typeof value !== "number") return false;
    return direction === "asc" ? value > average : value < average;
  });
  return index === -1 ? rows.length : index;
}

function getInitialDirection(key: TeamSortKey): SortDirection {
  return key === "name" || key === "profile" ? "asc" : "desc";
}

function getAdjustedOverturnRate(team: TeamLeaderboardEntry, leagueAvgRate: number) {
  return (
    (team.usedSuccessful + leagueAvgRate * TEAM_SUCCESS_PRIOR_CHALLENGES) /
    Math.max(1, team.challengesTotal + TEAM_SUCCESS_PRIOR_CHALLENGES)
  );
}

function getTrendDelta(values: number[]) {
  return values.length >= 2 ? values[values.length - 1] - values[0] : 0;
}

function hasTrustedModelConfidenceBand(confidenceBand: ConfidenceBand | null | undefined) {
  return confidenceBand === "high" || confidenceBand === "medium";
}

function SuccessRateChip({ value, italic = false }: { value: number; italic?: boolean }) {
  const pct = value * 100;
  const tone =
    pct >= 60
      ? "border-emerald-100 bg-emerald-50 text-emerald-700"
      : pct >= 45
        ? "border-gray-200 bg-gray-50 text-gray-600"
        : "border-amber-100 bg-amber-50 text-amber-700";

  return (
    <span
      className={`inline-flex rounded-xl border px-3 py-1.5 font-mono text-[10px] font-black uppercase tracking-widest shadow-sm ${italic ? "italic" : ""} ${tone}`}
    >
      {pct.toFixed(1)}%
    </span>
  );
}

function PressureShareChip({ value }: { value: number }) {
  const pct = value * 100;
  const tone =
    pct >= 45
      ? "border-emerald-100 bg-emerald-50 text-emerald-700"
      : pct >= 30
        ? "border-amber-100 bg-amber-50 text-amber-700"
        : "border-gray-200 bg-gray-50 text-gray-600";

  return (
    <span className={`inline-flex rounded-xl border px-3 py-1.5 font-mono text-[10px] font-black uppercase tracking-widest shadow-sm ${tone}`}>
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
      ? "border-emerald-100 bg-emerald-50 text-emerald-700"
      : tone === "amber"
        ? "border-amber-100 bg-amber-50 text-amber-700"
        : "border-gray-200 bg-gray-50 text-gray-600";

  return (
    <span className={`inline-flex rounded-xl border px-3 py-1.5 text-[10px] font-black uppercase tracking-widest shadow-sm ${classes}`}>
      {label}
    </span>
  );
}

function getDecisionReadLabel(
  decisionSurplus: number | null,
  capturedValueShare: number,
  wastedValueShare: number,
) {
  if (decisionSurplus !== null && decisionSurplus >= 0.001) return "High-Value Usage";
  if (decisionSurplus !== null && decisionSurplus <= -0.001) return "Low-Value Usage Risk";
  if (capturedValueShare > wastedValueShare) return "High-Value Usage";
  if (wastedValueShare > capturedValueShare) return "Low-Value Usage Risk";
  return "Neutral";
}

function getDecisionReadTone(
  decisionSurplus: number | null,
  capturedValueShare: number,
  wastedValueShare: number,
): "emerald" | "amber" | "gray" {
  const label = getDecisionReadLabel(decisionSurplus, capturedValueShare, wastedValueShare);
  if (label === "High-Value Usage") return "emerald";
  if (label === "Low-Value Usage Risk") return "amber";
  return "gray";
}

function getTimingReadLabel(
  lateShare: number,
  earlyBurnShare: number,
  leagueLateShare: number,
  leagueEarlyBurnShare: number,
) {
  const lateDelta = lateShare - leagueLateShare;
  const earlyDelta = earlyBurnShare - leagueEarlyBurnShare;

  if (lateDelta >= 0.08 && earlyDelta <= 0.03) return "Pressure-Hunting";
  if (earlyDelta >= 0.08) return "Early Burn Risk";
  if (lateDelta <= -0.08) return "Low Pressure Mix";
  return "Balanced";
}

function getTimingReadTone(
  lateShare: number,
  earlyBurnShare: number,
  leagueLateShare: number,
  leagueEarlyBurnShare: number,
): "emerald" | "amber" | "gray" {
  const label = getTimingReadLabel(lateShare, earlyBurnShare, leagueLateShare, leagueEarlyBurnShare);
  if (label === "Pressure-Hunting") return "emerald";
  if (label === "Early Burn Risk" || label === "Low Pressure Mix") return "amber";
  return "gray";
}

function averageMetric(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}
