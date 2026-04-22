import Link from "next/link";
import { Suspense } from "react";
import { BroadcastStrip } from "@/components/broadcast-strip";
import { ChallengeMomentCards } from "@/components/challenge-moment-cards";
import { HomeExpandableGrid } from "@/components/home-expandable-grid";
import { TeamIcon } from "@/components/team-icon";
import { getHomeChallengeMoments, getLiveGames, getTeamLeaderboardModel, getUmpireLeaderboardModel } from "@/lib/data";
import { resolveViewMode } from "@/lib/view-mode";
import { withViewModeHref } from "@/lib/view-mode-href";
import { ProfileBadge } from "@/components/ui/profile-badge";
import { getHomePageViewCopy } from "@/lib/view-mode-contract";
import { hasTrustedModelConfidenceBand } from "@/lib/server/run-environment";

export default async function HomePage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const sp = await searchParams;
  const viewMode = await resolveViewMode(sp);
  const copy = getHomePageViewCopy(viewMode);
  const momentsPromise = getHomeChallengeMoments(12);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.03),transparent)] pt-36">
      <Suspense fallback={null}>
        <HomeBroadcastSection viewMode={viewMode} momentsPromise={momentsPromise} />
      </Suspense>

      <div className="px-6 py-8 text-center">
        <h1 className="font-display text-5xl uppercase tracking-[-0.04em] text-[var(--ink-0)]">
          ABS Observatory
        </h1>
        <p className="mt-2 text-sm font-medium text-[var(--ink-3)]">
          {copy.heroDeck}
        </p>
      </div>

      <Suspense fallback={<HomePageFallback viewMode={viewMode} copy={copy} />}>
        <HomePageBody viewMode={viewMode} copy={copy} momentsPromise={momentsPromise} />
      </Suspense>
    </div>
  );
}

async function HomeBroadcastSection({
  viewMode,
  momentsPromise,
}: {
  viewMode: "fan" | "org";
  momentsPromise: Promise<Awaited<ReturnType<typeof getHomeChallengeMoments>>>;
}) {
  const moments = await momentsPromise;
  return (
    <div className="relative z-40 bg-white/50 border-b border-gray-100">
      <BroadcastStrip moments={moments} viewMode={viewMode} />
    </div>
  );
}

async function HomePageBody({
  viewMode,
  copy,
  momentsPromise,
}: {
  viewMode: "fan" | "org";
  copy: ReturnType<typeof getHomePageViewCopy>;
  momentsPromise: Promise<Awaited<ReturnType<typeof getHomeChallengeMoments>>>;
}) {
  const [games, moments, teams, umpires] = await Promise.all([
    getLiveGames(),
    momentsPromise,
    getTeamLeaderboardModel("season", {
      includeDecisionMetrics: viewMode === "org",
      includeValueMetrics: viewMode === "org",
    }),
    getUmpireLeaderboardModel("season"),
  ]);

  const todayGames = games.length;
  const todayChallenges = games.reduce((sum, g) => sum + (g.challengeCount ?? 0), 0);
  const allTeamChallenges = teams.reduce((s, t) => s + t.challengesTotal, 0);
  const allTeamSuccessful = teams.reduce((s, t) => s + t.usedSuccessful, 0);
  const seasonAvgRate = allTeamChallenges > 0 ? (allTeamSuccessful / allTeamChallenges) * 100 : 0;
  const topMoment = moments[0] ?? null;
  const highestRiskUmpire = umpires.length > 0
    ? [...umpires].sort((left, right) => getHomeUmpireWatchPriority(right) - getHomeUmpireWatchPriority(left))[0]
    : null;

  const topTeams =
    viewMode === "org"
      ? [...teams]
        .sort(compareOrgTeamOperators)
        .slice(0, 3)
      : [...teams].sort((a, b) => b.challengesTotal - a.challengesTotal).slice(0, 3);
  const bottomTeams =
    viewMode === "org"
      ? [...teams]
        .sort(compareOrgTeamOperators)
        .slice(-3)
      : [];
  const bestDecisionClub =
    viewMode === "org"
      ? [...teams]
          .filter((team) => team.decisionSurplus !== null && hasTrustedModelConfidenceBand(team.decisionValueConfidence))
          .sort((left, right) => (right.decisionSurplus ?? -Infinity) - (left.decisionSurplus ?? -Infinity))[0] ?? null
      : null;
  const mostWastefulClub =
    viewMode === "org"
      ? [...teams]
          .filter((team) => team.decisionSurplus !== null && hasTrustedModelConfidenceBand(team.decisionValueConfidence))
          .sort((left, right) => (left.decisionSurplus ?? Infinity) - (right.decisionSurplus ?? Infinity))[0] ?? null
      : null;
  const bigSpotDecisionClub =
    viewMode === "org"
      ? [...teams]
          .filter((team) => hasTrustedModelConfidenceBand(team.decisionValueConfidence))
          .sort((left, right) => right.lateCloseExpectedValueShare - left.lateCloseExpectedValueShare)[0] ?? null
      : null;
  const spotlightUmps = [...umpires]
    .sort((left, right) => getHomeUmpireWatchPriority(right) - getHomeUmpireWatchPriority(left))
    .slice(0, 3);
  const mostSelectiveTeam =
    [...teams].sort((a, b) => (b.avgRemaining * b.overturnRate) - (a.avgRemaining * a.overturnRate))[0] ?? null;
  return (
    <>
      <main className="mx-auto max-w-7xl px-6 pt-4 pb-40">
        <div className="mb-6 text-center">
          <p className="text-[11px] font-medium text-[var(--ink-3)]">
            {todayGames} games
            {" · "}
            {todayChallenges} challenges
            {" · "}
            {seasonAvgRate.toFixed(1)}% season success rate
            {viewMode === "fan" && topMoment && (
              <>
                {" · "}
                Top moment: {topMoment.challengeTeamName ?? "Challenge"} {topMoment.reasonChips?.[0] ? `(${topMoment.reasonChips[0]})` : ""}
              </>
            )}
            {viewMode === "org" && highestRiskUmpire && (
              <>
                {" · "}
                Watch: {highestRiskUmpire.umpireName} ({highestRiskUmpire.orgDescriptor})
              </>
            )}
          </p>
        </div>

        {viewMode === "fan" ? (
          <div className="mb-8 grid gap-6 lg:grid-cols-[1.35fr_0.95fr]">
            <div className="panel overflow-hidden border-gray-100 bg-white shadow-2xl shadow-black/[0.03]">
              <div className="border-b border-gray-100 px-6 py-5">
                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--accent-primary)]">
                  {copy.topMomentEyebrow}
                </p>
                <h2 className="mt-2 text-3xl font-display uppercase tracking-[0.04em] text-[var(--ink-0)]">
                  {topMoment?.gameLabel ?? copy.topMomentTitleFallback}
                </h2>
                <p className="mt-2 text-sm text-[var(--ink-2)]">
                  {topMoment
                    ? `${topMoment.challengeTeamName ?? "Challenge"} in ${topMoment.halfInning ?? ""} ${topMoment.inning ?? "-"} with ${topMoment.reasonChips?.slice(0, 2).join(" · ") ?? "high-drama context"
                    }.`
                    : "No challenge hero is available yet for the current slate."}
                </p>
              </div>
              <div className="px-6 py-5">
                {topMoment ? (
                  <Link
                    href={withViewModeHref(`/game/${topMoment.gamePk}?challengeId=${topMoment.challengeId}#abs-explorer`, viewMode)}
                    className="block rounded-2xl border border-gray-100 bg-[var(--surface-infield)] p-5 transition hover:border-blue-100 hover:bg-white"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      {(topMoment.reasonChips ?? []).slice(0, 4).map((chip) => (
                        <span key={chip} className="rounded-full bg-blue-50 px-2.5 py-1 text-[9px] font-bold uppercase tracking-widest text-blue-700">
                          {chip}
                        </span>
                      ))}
                    </div>
                    <p className="mt-4 text-lg font-semibold text-[var(--ink-0)]">
                      {topMoment.calledDescription ?? "Reviewed challenge moment"}
                    </p>
                    <p className="mt-2 text-xs text-[var(--ink-3)]">
                      {topMoment.leverageScore >= 65 ? "High leverage" : topMoment.leverageScore >= 40 ? "Medium leverage" : "Low leverage"} · {topMoment.playerName ?? "Unknown player"} · {topMoment.gameStatus}
                    </p>
                  </Link>
                ) : (
                  <div className="rounded-2xl border-2 border-dashed border-gray-200 p-8 text-center text-sm text-[var(--ink-3)]">
                    Challenge drama will appear here once the slate heats up.
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <div className="mb-3 flex items-baseline justify-between">
                  <h2 className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--ink-3)]">
                    {copy.teamsSectionTitle}
                  </h2>
                  <Link href={withViewModeHref("/teams", viewMode)} className="text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--accent-primary)] hover:underline">
                    See All Teams →
                  </Link>
                </div>
                <div className="flex flex-wrap gap-4">
                  {topTeams.map((team, idx) => (
                    <Link key={team.teamId} href={withViewModeHref(`/teams/${team.teamId}`, viewMode)} className="flex min-w-[160px] flex-1 items-center gap-3 rounded-2xl border border-gray-100 bg-white/50 p-4 transition-all hover:scale-105 hover:border-blue-100 hover:bg-white hover:shadow-2xl">
                      <TeamIcon teamId={team.teamId} name={team.teamName} size={28} variant="flat" className="shrink-0" />
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold text-[var(--ink-0)]">{team.teamName}</p>
                        <div className="mt-2 flex items-center justify-between gap-2">
                          <ProfileBadge
                            label={team.style}
                            variant="emerald"
                            className="min-w-0 flex-1 py-1"
                          />
                          <span className="text-[10px] font-black text-gray-300">#{idx + 1}</span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>

              <div>
                <div className="mb-3 flex items-baseline justify-between">
                  <h2 className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--ink-3)]">
                    {copy.umpiresSectionTitle}
                  </h2>
                  <Link href={withViewModeHref("/umpires", viewMode)} className="text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--accent-primary)] hover:underline">
                    See All Umpires →
                  </Link>
                </div>
                <div className="flex flex-wrap gap-4">
                  {spotlightUmps.map((u) => (
                    <Link key={u.umpireId} href={withViewModeHref(`/umpires/${u.umpireId}`, viewMode)} className="flex min-w-[160px] flex-1 items-center gap-3 rounded-2xl border border-gray-100 bg-white/50 p-4 transition-all hover:scale-105 hover:border-blue-100 hover:bg-white hover:shadow-2xl">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--accent-primary-soft)] text-[10px] font-bold text-[var(--accent-primary)]">U</div>
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold text-[var(--ink-0)]">{u.umpireName}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          <ProfileBadge
                            label={`${(u.overturnRate * 100).toFixed(1)}% OT · ${u.fanDescriptor}`}
                            variant="blue"
                            className="min-w-0 flex-1 py-1"
                          />
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="mb-8 space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="panel border-gray-100 bg-white p-5 shadow-2xl shadow-black/[0.03]">
                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-blue-500">League Signal</p>
                <p className="mt-2 text-3xl font-display text-[var(--ink-0)]">{seasonAvgRate.toFixed(1)}%</p>
                <p className="mt-1 text-xs text-[var(--ink-3)]">Current season overturn rate across tracked clubs.</p>
              </div>
              <div className="panel border-gray-100 bg-white p-5 shadow-2xl shadow-black/[0.03]">
                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-blue-500">Watch Umpire</p>
                <p className="mt-2 text-lg font-semibold text-[var(--ink-0)]">{highestRiskUmpire?.umpireName ?? "No signal"}</p>
                <p className="mt-1 text-xs text-[var(--ink-3)]">{highestRiskUmpire ? `${highestRiskUmpire.orgDescriptor} · ${highestRiskUmpire.riskTier}` : "No elevated risk profile available."}</p>
              </div>
              <div className="panel border-gray-100 bg-white p-5 shadow-2xl shadow-black/[0.03]">
                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-blue-500">Selective Use Signal</p>
                <p className="mt-2 text-lg font-semibold text-[var(--ink-0)]">{mostSelectiveTeam?.teamName ?? "No signal"}</p>
                <p className="mt-1 text-xs text-[var(--ink-3)]">
                  {mostSelectiveTeam
                    ? `${mostSelectiveTeam.orgStyleLabel} · ${formatOrgOperatorValue(mostSelectiveTeam) ?? `${mostSelectiveTeam.avgRemaining.toFixed(2)} avg challenges remaining`} · heuristic blend of retained challenges and overturn success`
                    : "No selective-use signal available yet."}
                </p>
              </div>
              <div className="panel border-gray-100 bg-white p-5 shadow-2xl shadow-black/[0.03]">
                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-blue-500">Best Review Surplus</p>
                <p className="mt-2 text-lg font-semibold text-[var(--ink-0)]">{bestDecisionClub?.teamName ?? "No signal"}</p>
                <p className="mt-1 text-xs text-[var(--ink-3)]">
                  {bestDecisionClub
                    ? `${formatOrgOperatorValue(bestDecisionClub)} · ${(bestDecisionClub.capturedValueShare * 100).toFixed(0)}% high-value window share`
                    : "Review-surplus leaders will appear once modeled samples stabilize."}
                </p>
              </div>
              <div className="panel border-gray-100 bg-white p-5 shadow-2xl shadow-black/[0.03]">
                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-blue-500">Highest Low-Value Usage Risk</p>
                <p className="mt-2 text-lg font-semibold text-[var(--ink-0)]">{mostWastefulClub?.teamName ?? "No signal"}</p>
                <p className="mt-1 text-xs text-[var(--ink-3)]">
                  {mostWastefulClub
                    ? `${formatOrgOperatorValue(mostWastefulClub)} · ${(mostWastefulClub.wastedValueShare * 100).toFixed(0)}% low-value window share`
                    : "Low-value review usage signals will appear once modeled samples stabilize."}
                </p>
              </div>
              <div className="panel border-gray-100 bg-white p-5 shadow-2xl shadow-black/[0.03]">
                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-blue-500">Best High-Leverage Review Profile</p>
                <p className="mt-2 text-lg font-semibold text-[var(--ink-0)]">{bigSpotDecisionClub?.teamName ?? "No signal"}</p>
                <p className="mt-1 text-xs text-[var(--ink-3)]">
                  {bigSpotDecisionClub
                    ? `${formatOrgOperatorValue(bigSpotDecisionClub)} · ${formatCompactShare(bigSpotDecisionClub.lateCloseExpectedValueShare)} late-close positive EV share`
                    : "High-leverage review signals will appear once modeled samples stabilize."}
                </p>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <div className="mb-3 flex items-baseline justify-between">
                  <h2 className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--ink-3)]">
                    Umpire Watch List
                  </h2>
                  <Link href={withViewModeHref("/umpires", viewMode)} className="text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--accent-primary)] hover:underline">
                    See All Umpires →
                  </Link>
                </div>
                <div className="space-y-3">
                  {spotlightUmps.map((u) => (
                    <Link key={u.umpireId} href={withViewModeHref(`/umpires/${u.umpireId}`, viewMode)} className="flex items-center justify-between rounded-2xl border border-gray-100 bg-white/50 p-4 transition hover:border-blue-100 hover:bg-white hover:shadow-xl">
                      <div>
                        <p className="text-sm font-semibold text-[var(--ink-0)]">{u.umpireName}</p>
                        <p className="mt-1 text-xs text-[var(--ink-3)]">{u.orgDescriptor} · {(u.overturnRate * 100).toFixed(1)}% OT</p>
                      </div>
                      <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[9px] font-bold uppercase tracking-widest text-blue-700">{u.riskTier}</span>
                    </Link>
                  ))}
                </div>
              </div>

              <div>
                <div className="mb-3 flex items-baseline justify-between">
                  <h2 className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--ink-3)]">
                    Team Review Patterns
                  </h2>
                  <Link href={withViewModeHref("/teams", viewMode)} className="text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--accent-primary)] hover:underline">
                    See All Teams →
                  </Link>
                </div>
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-4">
                    {topTeams.map((team, idx) => (
                      <Link key={team.teamId} href={withViewModeHref(`/teams/${team.teamId}`, viewMode)} className="flex min-w-[160px] flex-1 items-center gap-3 rounded-2xl border border-gray-100 bg-white/50 p-4 transition-all hover:scale-105 hover:border-blue-100 hover:bg-white hover:shadow-2xl">
                        <TeamIcon teamId={team.teamId} name={team.teamName} size={28} variant="flat" className="shrink-0" />
                        <div className="min-w-0">
                          <p className="truncate text-xs font-semibold text-[var(--ink-0)]">{team.teamName}</p>
                              <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--ink-3)]">
                                {team.orgStyleLabel} · {formatOrgOperatorValue(team) ?? `#${idx + 1}`}
                              </p>
                        </div>
                      </Link>
                    ))}
                  </div>

                  {viewMode === "org" ? (
                    <div className="flex flex-wrap gap-4">
                      {bottomTeams.map((team, idx) => {
                        const rank = teams.length - bottomTeams.length + idx + 1;
                        return (
                          <Link key={team.teamId} href={withViewModeHref(`/teams/${team.teamId}`, viewMode)} className="flex min-w-[160px] flex-1 items-center gap-3 rounded-2xl border border-gray-100 bg-white/50 p-4 transition-all hover:scale-105 hover:border-blue-100 hover:bg-white hover:shadow-2xl">
                            <TeamIcon teamId={team.teamId} name={team.teamName} size={28} variant="flat" className="shrink-0" />
                            <div className="min-w-0">
                              <p className="truncate text-xs font-semibold text-[var(--ink-0)]">{team.teamName}</p>
                              <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--ink-3)]">
                                {team.orgStyleLabel} · {formatOrgOperatorValue(team) ?? `#${rank}`}
                              </p>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        )}

        <HomeExpandableGrid games={games} viewMode={viewMode} />

        {/* S2-5: Reduced gap (mt-16 instead of mt-32) */}
        <section className="mt-10">
          <div className="mb-14 flex flex-col items-center text-center">
            <div className="mb-6 h-10 w-px bg-blue-200" />
            <h2 className="w-full overflow-visible px-12 py-2 text-5xl font-display uppercase tracking-tight text-gray-900 md:text-7xl leading-[1.2] mb-5">
              Most <span className="opacity-20 italic px-2 pr-5">Consequential</span> Calls
            </h2>
            <p className="text-gray-500 text-lg max-w-xl font-medium text-balance">
              Review the most consequential overturned calls and notable zone assessments from the last 24 hours.
            </p>
          </div>
          <ChallengeMomentCards moments={moments} viewMode={viewMode} />
        </section>

        {/* S2-6: Latest Debrief Bar */}
        <div className="mt-24">
          <Link
            href={withViewModeHref("/articles", viewMode)}
            className="block w-full rounded-2xl bg-[var(--ink-0)] px-8 py-4 text-center transition-all hover:opacity-90"
          >
            <span className="text-[11px] font-black uppercase tracking-widest text-white">
              📰 The Daily Debrief · Read the latest →
            </span>
          </Link>
        </div>
      </main>
    </>
  );
}

function getHomeUmpireWatchPriority(
  umpire: Awaited<ReturnType<typeof getUmpireLeaderboardModel>>[number],
) {
  const drift =
    typeof umpire.recentOverturnRate === "number" ? Math.abs(umpire.recentOverturnRate - umpire.overturnRate) : 0;
  return (
    Math.abs(umpire.averageWinExpectancyDelta ?? 0) * 100 +
    Math.abs(umpire.averageRunExpectancyDelta ?? 0) * 10 +
    umpire.overturnRateVariance * 100 +
    drift * 100
  );
}

function HomePageFallback({
  viewMode,
  copy,
}: {
  viewMode: "fan" | "org";
  copy: ReturnType<typeof getHomePageViewCopy>;
}) {
  return (
    <>
      <main className="mx-auto max-w-7xl px-6 pt-4 pb-40">
        <div className="mb-6 text-center">
          <p className="text-[11px] font-medium text-[var(--ink-3)]">
            Loading today&apos;s ABS slate...
          </p>
        </div>

        {viewMode === "fan" ? (
          <div className="mb-8 grid gap-6 lg:grid-cols-[1.35fr_0.95fr]">
            <div className="panel min-h-[280px] border-gray-100 bg-white shadow-2xl shadow-black/[0.03]" />
            <div className="space-y-6">
              <div className="panel min-h-[136px] border-gray-100 bg-white/50 shadow-2xl shadow-black/[0.03]" />
              <div className="panel min-h-[136px] border-gray-100 bg-white/50 shadow-2xl shadow-black/[0.03]" />
            </div>
          </div>
        ) : (
          <div className="mb-8 grid gap-4 md:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="panel min-h-[120px] border-gray-100 bg-white shadow-2xl shadow-black/[0.03]" />
            ))}
          </div>
        )}

        <section className="mt-16">
          <div className="mb-20 flex flex-col items-center text-center">
            <div className="h-12 w-px bg-blue-200 mb-8" />
            <h2 className="w-full text-5xl md:text-7xl font-display uppercase tracking-tight text-gray-900 mb-6 leading-[1.2] py-4 px-12 overflow-visible">
              Most <span className="opacity-20 italic px-2 pr-5">Consequential</span> Calls
            </h2>
            <p className="text-gray-500 text-lg max-w-xl font-medium text-balance">
              {copy.heroDeck}
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="panel min-h-[180px] border-gray-100 bg-white shadow-2xl shadow-black/[0.03]" />
            ))}
          </div>
        </section>
      </main>
    </>
  );
}

function compareOrgTeamOperators(
  left: {
    overturnRate: number;
    avgRemaining: number;
    decisionSurplus: number | null;
    capturedValueShare: number;
    decisionValueConfidence: "high" | "medium" | "low" | null;
    avgWinExpectancyDelta: number | null;
    highWinValueShare: number;
    winValueConfidence: "high" | "medium" | "low" | null;
    avgRunExpectancyDelta: number | null;
    highRunValueShare: number;
    runValueConfidence: "high" | "medium" | "low" | null;
  },
  right: {
    overturnRate: number;
    avgRemaining: number;
    decisionSurplus: number | null;
    capturedValueShare: number;
    decisionValueConfidence: "high" | "medium" | "low" | null;
    avgWinExpectancyDelta: number | null;
    highWinValueShare: number;
    winValueConfidence: "high" | "medium" | "low" | null;
    avgRunExpectancyDelta: number | null;
    highRunValueShare: number;
    runValueConfidence: "high" | "medium" | "low" | null;
  },
) {
  const leftDecision =
    left.decisionSurplus !== null && hasTrustedModelConfidenceBand(left.decisionValueConfidence) ? left.decisionSurplus : null;
  const rightDecision =
    right.decisionSurplus !== null && hasTrustedModelConfidenceBand(right.decisionValueConfidence) ? right.decisionSurplus : null;
  if (leftDecision !== null || rightDecision !== null) {
    if (leftDecision === null) return 1;
    if (rightDecision === null) return -1;
    if (rightDecision !== leftDecision) {
      return rightDecision - leftDecision;
    }
    if (right.capturedValueShare !== left.capturedValueShare) {
      return right.capturedValueShare - left.capturedValueShare;
    }
  }

  const leftMetric =
    left.avgWinExpectancyDelta !== null && hasTrustedModelConfidenceBand(left.winValueConfidence)
      ? left.avgWinExpectancyDelta
      : left.avgRunExpectancyDelta;
  const rightMetric =
    right.avgWinExpectancyDelta !== null && hasTrustedModelConfidenceBand(right.winValueConfidence)
      ? right.avgWinExpectancyDelta
      : right.avgRunExpectancyDelta;

  if (leftMetric !== null || rightMetric !== null) {
    if (leftMetric === null) return 1;
    if (rightMetric === null) return -1;
    if (rightMetric !== leftMetric) {
      return rightMetric - leftMetric;
    }

    const leftShare =
      left.avgWinExpectancyDelta !== null && hasTrustedModelConfidenceBand(left.winValueConfidence)
        ? left.highWinValueShare
        : left.highRunValueShare;
    const rightShare =
      right.avgWinExpectancyDelta !== null && hasTrustedModelConfidenceBand(right.winValueConfidence)
        ? right.highWinValueShare
        : right.highRunValueShare;
    if (rightShare !== leftShare) {
      return rightShare - leftShare;
    }
  }

  return right.overturnRate * (right.avgRemaining + 1) - left.overturnRate * (left.avgRemaining + 1);
}

function formatOrgOperatorValue(team: {
  decisionSurplus: number | null;
  capturedValueShare: number;
  decisionValueConfidence: "high" | "medium" | "low" | null;
  avgWinExpectancyDelta: number | null;
  winValueConfidence: "high" | "medium" | "low" | null;
  avgRunExpectancyDelta: number | null;
}) {
  if (team.decisionSurplus !== null && hasTrustedModelConfidenceBand(team.decisionValueConfidence)) {
    return `${team.decisionSurplus >= 0 ? "+" : ""}${(team.decisionSurplus * 100).toFixed(2)}% Review Surplus`;
  }
  if (team.avgWinExpectancyDelta !== null && hasTrustedModelConfidenceBand(team.winValueConfidence)) {
    return `${team.avgWinExpectancyDelta >= 0 ? "+" : ""}${(team.avgWinExpectancyDelta * 100).toFixed(2)}% WE`;
  }
  if (team.avgRunExpectancyDelta !== null) {
    return `${team.avgRunExpectancyDelta >= 0 ? "+" : ""}${team.avgRunExpectancyDelta.toFixed(3)} RE`;
  }
  return null;
}

function formatCompactShare(value: number) {
  const pct = value * 100;
  if (pct <= 0) return "0%";
  if (pct < 1) return "<1%";
  if (pct < 10) return `${pct.toFixed(1)}%`;
  return `${Math.round(pct)}%`;
}
