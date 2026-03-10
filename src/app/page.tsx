import Link from "next/link";
import { BroadcastStrip } from "@/components/broadcast-strip";
import { ChallengeMomentCards } from "@/components/challenge-moment-cards";
import { GameStrip } from "@/components/game-strip";
import { HomeExpandableGrid } from "@/components/home-expandable-grid";
import { TeamIcon } from "@/components/team-icon";
import { getHomeChallengeMoments, getLiveGames, getTeamLeaderboardModel, getUmpireLeaderboardModel } from "@/lib/data";
import { resolveViewMode } from "@/lib/view-mode";
import { ProfileBadge } from "@/components/ui/profile-badge";
import { getHomePageViewCopy } from "@/lib/view-mode-contract";
import { hasTrustedModelConfidenceBand } from "@/lib/server/run-environment";

export default async function HomePage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const sp = await searchParams;
  const viewMode = await resolveViewMode(sp);
  const [games, moments, teams, umpires] = await Promise.all([
    getLiveGames(),
    getHomeChallengeMoments(12),
    getTeamLeaderboardModel("season"),
    getUmpireLeaderboardModel("season"),
  ]);

  const todayGames = games.length;
  const todayChallenges = games.reduce((sum, g) => sum + (g.challengeCount ?? 0), 0);
  const allTeamChallenges = teams.reduce((s, t) => s + t.challengesTotal, 0);
  const allTeamSuccessful = teams.reduce((s, t) => s + t.usedSuccessful, 0);
  const seasonAvgRate = allTeamChallenges > 0 ? (allTeamSuccessful / allTeamChallenges) * 100 : 0;
  const topMoment = moments[0] ?? null;
  const highestRiskUmpire = umpires.length > 0
    ? [...umpires].sort((a, b) => a.reportCardScore - b.reportCardScore)[0]
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
  const spotlightUmps = [...umpires].sort((a, b) => a.reportCardScore - b.reportCardScore).slice(0, 3);
  const mostDisciplinedTeam =
    [...teams].sort((a, b) => (b.avgRemaining * b.overturnRate) - (a.avgRemaining * a.overturnRate))[0] ?? null;
  const copy = getHomePageViewCopy(viewMode);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.03),transparent)] pt-36">
      <div className="relative z-40 bg-white/50 border-b border-gray-100">
        <BroadcastStrip moments={moments} />
      </div>

      <div className="px-6 py-8 text-center">
        <h1 className="font-display text-5xl uppercase tracking-[-0.04em] text-[var(--ink-0)]">
          ABS Observatory
        </h1>
        <p className="mt-2 text-sm font-medium text-[var(--ink-3)]">
          {copy.heroDeck}
        </p>
      </div>

      <GameStrip games={games} />

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
                    href={`/game/${topMoment.gamePk}?challengeId=${topMoment.challengeId}#abs-explorer`}
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
                      {topMoment.leverageScore >= 65 ? "High pressure" : topMoment.leverageScore >= 40 ? "Medium pressure" : "Low pressure"} · {topMoment.playerName ?? "Unknown player"} · {topMoment.gameStatus}
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
                  <Link href="/teams" className="text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--accent-primary)] hover:underline">
                    See All Teams →
                  </Link>
                </div>
                <div className="flex flex-wrap gap-4">
                  {topTeams.map((team, idx) => (
                    <Link key={team.teamId} href={`/teams/${team.teamId}`} className="flex min-w-[160px] flex-1 items-center gap-3 rounded-2xl border border-gray-100 bg-white/50 p-4 transition-all hover:scale-105 hover:border-blue-100 hover:bg-white hover:shadow-2xl">
                      <TeamIcon teamId={team.teamId} name={team.teamName} size={28} />
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
                  <Link href="/umpires" className="text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--accent-primary)] hover:underline">
                    See All Umpires →
                  </Link>
                </div>
                <div className="flex flex-wrap gap-4">
                  {spotlightUmps.map((u) => (
                    <Link key={u.umpireId} href={`/umpires/${u.umpireId}`} className="flex min-w-[160px] flex-1 items-center gap-3 rounded-2xl border border-gray-100 bg-white/50 p-4 transition-all hover:scale-105 hover:border-blue-100 hover:bg-white hover:shadow-2xl">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--accent-primary-soft)] text-[10px] font-bold text-[var(--accent-primary)]">U</div>
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold text-[var(--ink-0)]">{u.umpireName}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          <ProfileBadge
                            label={`${u.grade} ${u.fanDescriptor}`}
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
                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-blue-500">Disciplined Club</p>
                <p className="mt-2 text-lg font-semibold text-[var(--ink-0)]">{mostDisciplinedTeam?.teamName ?? "No signal"}</p>
                <p className="mt-1 text-xs text-[var(--ink-3)]">
                  {mostDisciplinedTeam
                    ? `${mostDisciplinedTeam.orgStyleLabel} · ${formatOrgOperatorValue(mostDisciplinedTeam) ?? `${mostDisciplinedTeam.avgRemaining.toFixed(2)} avg challenges remaining`}`
                    : "No discipline signal available yet."}
                </p>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <div className="mb-3 flex items-baseline justify-between">
                  <h2 className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--ink-3)]">
                    Umpire Watch List
                  </h2>
                  <Link href="/umpires" className="text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--accent-primary)] hover:underline">
                    See All Umpires →
                  </Link>
                </div>
                <div className="space-y-3">
                  {spotlightUmps.map((u) => (
                    <Link key={u.umpireId} href={`/umpires/${u.umpireId}`} className="flex items-center justify-between rounded-2xl border border-gray-100 bg-white/50 p-4 transition hover:border-blue-100 hover:bg-white hover:shadow-xl">
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
                    Challenge Operators
                  </h2>
                  <Link href="/teams" className="text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--accent-primary)] hover:underline">
                    See All Teams →
                  </Link>
                </div>
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-4">
                    {topTeams.map((team, idx) => (
                      <Link key={team.teamId} href={`/teams/${team.teamId}`} className="flex min-w-[160px] flex-1 items-center gap-3 rounded-2xl border border-gray-100 bg-white/50 p-4 transition-all hover:scale-105 hover:border-blue-100 hover:bg-white hover:shadow-2xl">
                        <TeamIcon teamId={team.teamId} name={team.teamName} size={28} />
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
                          <Link key={team.teamId} href={`/teams/${team.teamId}`} className="flex min-w-[160px] flex-1 items-center gap-3 rounded-2xl border border-gray-100 bg-white/50 p-4 transition-all hover:scale-105 hover:border-blue-100 hover:bg-white hover:shadow-2xl">
                            <TeamIcon teamId={team.teamId} name={team.teamName} size={28} />
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

        <HomeExpandableGrid games={games} />

        {/* S2-5: Reduced gap (mt-16 instead of mt-32) */}
        <section className="mt-16">
          <div className="mb-20 flex flex-col items-center text-center">
            <div className="h-12 w-px bg-blue-200 mb-8" />
            <h2 className="w-full text-5xl md:text-7xl font-display uppercase tracking-tight text-gray-900 mb-6 leading-[1.2] py-4 px-12 overflow-visible">
              Top <span className="opacity-20 italic px-2 pr-5">Pressure</span> Calls
            </h2>
            <p className="text-gray-500 text-lg max-w-xl font-medium text-balance">
              Review history-defining overturned calls and critical zone assessments from the last 24 hours.
            </p>
          </div>
          <ChallengeMomentCards moments={moments} />
        </section>

        {/* S2-6: Latest Debrief Bar */}
        <div className="mt-24">
          <Link
            href="/articles"
            className="block w-full rounded-2xl bg-[var(--ink-0)] px-8 py-4 text-center transition-all hover:opacity-90"
          >
            <span className="text-[11px] font-black uppercase tracking-widest text-white">
              📰 The Daily Debrief · Read the latest →
            </span>
          </Link>
        </div>
      </main>
    </div>
  );
}

function compareOrgTeamOperators(
  left: {
    overturnRate: number;
    avgRemaining: number;
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
    avgWinExpectancyDelta: number | null;
    highWinValueShare: number;
    winValueConfidence: "high" | "medium" | "low" | null;
    avgRunExpectancyDelta: number | null;
    highRunValueShare: number;
    runValueConfidence: "high" | "medium" | "low" | null;
  },
) {
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
  avgWinExpectancyDelta: number | null;
  winValueConfidence: "high" | "medium" | "low" | null;
  avgRunExpectancyDelta: number | null;
}) {
  if (team.avgWinExpectancyDelta !== null && hasTrustedModelConfidenceBand(team.winValueConfidence)) {
    return `${team.avgWinExpectancyDelta >= 0 ? "+" : ""}${(team.avgWinExpectancyDelta * 100).toFixed(2)}% WE`;
  }
  if (team.avgRunExpectancyDelta !== null) {
    return `${team.avgRunExpectancyDelta >= 0 ? "+" : ""}${team.avgRunExpectancyDelta.toFixed(3)} RE`;
  }
  return null;
}
