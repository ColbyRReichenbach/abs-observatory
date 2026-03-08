import Link from "next/link";
import { BroadcastStrip } from "@/components/broadcast-strip";
import { ChallengeMomentCards } from "@/components/challenge-moment-cards";
import { GameStrip } from "@/components/game-strip";
import { HomeExpandableGrid } from "@/components/home-expandable-grid";
import { TeamIcon } from "@/components/team-icon";
import { getHomeChallengeMoments, getLiveGames, getTeamLeaderboard, getUmpireLeaderboard } from "@/lib/data";

export default async function HomePage() {
  const [games, moments, teams, umpires] = await Promise.all([
    getLiveGames(),
    getHomeChallengeMoments(12),
    getTeamLeaderboard("season"),
    getUmpireLeaderboard("season"),
  ]);

  /* ── S2-3: Today's Pulse stats ── */
  const todayGames = games.length;
  const todayChallenges = games.reduce((sum, g) => sum + (g.challengeCount ?? 0), 0);
  const allTeamChallenges = teams.reduce((s, t) => s + t.challengesTotal, 0);
  const allTeamSuccessful = teams.reduce((s, t) => s + t.usedSuccessful, 0);
  const seasonAvgRate = allTeamChallenges > 0 ? (allTeamSuccessful / allTeamChallenges) * 100 : 0;
  const topUmpire = umpires.length > 0
    ? umpires.reduce((worst, u) => (u.overturnRate > worst.overturnRate ? u : worst), umpires[0])
    : null;

  /* ── S2-4: Discovery Rail data ── */
  const topTeams = [...teams].sort((a, b) => b.overturnRate - a.overturnRate).slice(0, 3);
  const spotlightUmps = [...umpires].sort((a, b) => a.overturnRate - b.overturnRate).slice(0, 3);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.03),transparent)] pt-36">
      {/* Broadcast Ticker */}
      <div className="relative z-40 bg-white/50 border-b border-gray-100">
        <BroadcastStrip moments={moments} />
      </div>

      {/* S2-1: Identity Hero Strip */}
      <div className="px-6 py-8 text-center">
        <h1 className="font-display text-5xl uppercase tracking-[-0.04em] text-[var(--ink-0)]">
          ABS Observatory
        </h1>
        <p className="mt-2 text-sm font-medium text-[var(--ink-3)]">
          The home of MLB challenge intelligence.
        </p>
      </div>

      <GameStrip games={games} />

      <main className="mx-auto max-w-7xl px-6 pt-4 pb-40">
        {/* S2-3: Today's Pulse Stat Strip */}
        <div className="mb-6 text-center">
          <p className="text-[11px] font-medium text-[var(--ink-3)]">
            {todayGames} games
            {" · "}
            {todayChallenges} challenges
            {" · "}
            {seasonAvgRate.toFixed(1)}% season success rate
            {topUmpire && (
              <>
                {" · "}
                Most challenged: {topUmpire.umpireName} ({(topUmpire.overturnRate * 100).toFixed(0)}%)
              </>
            )}
          </p>
        </div>

        {/* S2-4: Discovery Rail — Teams & Umpires */}
        <div className="mb-8 grid gap-6 md:grid-cols-2">
          {/* Top Teams This Week */}
          <div>
            <div className="mb-3 flex items-baseline justify-between">
              <h2 className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--ink-3)]">
                Top Teams This Season
              </h2>
              <Link
                href="/teams"
                className="text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--accent-primary)] hover:underline"
              >
                See All Teams →
              </Link>
            </div>
            <div className="flex flex-wrap lg:flex-nowrap gap-4 pb-6 pt-2">
              {topTeams.map((team, idx) => (
                <Link
                  key={team.teamId}
                  href={`/teams/${team.teamId}`}
                  className="flex min-w-[160px] flex-1 items-center gap-3 p-4 bg-white/50 border border-gray-100 rounded-2xl hover:bg-white hover:shadow-2xl hover:border-blue-100 transition-all group/item hover:scale-105 active:scale-95"
                >
                  <TeamIcon teamId={team.teamId} name={team.teamName} size={28} />
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-[var(--ink-0)]">
                      {team.teamName}
                    </p>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-bold text-green-700">
                        {(team.overturnRate * 100).toFixed(1)}%
                      </span>
                      <span className="text-[10px] font-bold text-[var(--ink-3)]">
                        #{idx + 1}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Umpires in the Spotlight */}
          <div>
            <div className="mb-3 flex items-baseline justify-between">
              <h2 className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--ink-3)]">
                Umpires in the Spotlight
              </h2>
              <Link
                href="/umpires"
                className="text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--accent-primary)] hover:underline"
              >
                See All Umpires →
              </Link>
            </div>
            <div className="flex flex-wrap lg:flex-nowrap gap-4 pb-6 pt-2">
              {spotlightUmps.map((u) => (
                <Link
                  key={u.umpireId}
                  href={`/umpires/${u.umpireId}`}
                  className="flex min-w-[160px] flex-1 items-center gap-3 p-4 bg-white/50 border border-gray-100 rounded-2xl hover:bg-white hover:shadow-2xl hover:border-blue-100 transition-all group/item hover:scale-105 active:scale-95"
                >
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--accent-primary-soft)] text-[10px] font-bold text-[var(--accent-primary)]">
                    U
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-[var(--ink-0)]">
                      {u.umpireName}
                    </p>
                    <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                      {(u.overturnRate * 100).toFixed(1)}% OT rate
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>

        <HomeExpandableGrid games={games} />

        {/* S2-5: Reduced gap (mt-16 instead of mt-32) */}
        <section className="mt-16">
          <div className="mb-20 flex flex-col items-center text-center">
            <div className="h-12 w-px bg-blue-200 mb-8" />
            <h2 className="w-full text-5xl md:text-7xl font-display uppercase tracking-tight text-gray-900 mb-6 leading-[1.2] py-4 px-12 overflow-visible">
              Top <span className="opacity-20 italic px-2 pr-5">Leverage</span> Calls
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
