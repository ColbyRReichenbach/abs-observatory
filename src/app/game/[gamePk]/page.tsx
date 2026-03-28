import { notFound } from "next/navigation";
import { Suspense } from "react";

import { GameShell } from "@/components/game-shell";
import { getGame, getGameAbsCounters, getGameChallenges, getGameLiveStatus, getGameScoreboardData, getLiveChallengeWindow } from "@/lib/data";
import { PregameScoutingReport } from "@/components/game-hub/pregame-hub";
import { LiveWarRoom } from "@/components/game-hub/live-hub";
import { PostgameAAR } from "@/components/game-hub/postgame-hub";
import { GameHubRouter } from "@/components/game-hub/game-hub-router";
import { BackPill } from "@/components/ui/back-pill";
import { resolveViewMode } from "@/lib/view-mode";

export const dynamic = "force-dynamic";

export default async function GamePage({
  params,
  searchParams,
}: {
  params: Promise<{ gamePk: string }>;
  searchParams: Promise<{ challengeId?: string; view?: string }>;
}) {
  const { gamePk } = await params;
  const sp = await searchParams;
  const challengeId = sp.challengeId;
  const gameId = Number(gamePk);
  const viewMode = await resolveViewMode(sp as Record<string, string | string[] | undefined>);
  const [game, counters, liveStatus, scoreboard] = await Promise.all([
    getGame(gameId),
    getGameAbsCounters(gameId),
    getGameLiveStatus(gameId),
    getGameScoreboardData(gameId),
  ]);

  if (!game) return notFound();

  return (
    <main className="mx-auto max-w-7xl px-6 pb-8 pt-32">
      <div className="mb-8">
        <BackPill label="Schedule" useHistory />
      </div>
      <GameHubRouter status={game.statusabstract} />
      <GameShell game={game} liveStatus={liveStatus} counters={counters} scoreboard={scoreboard} />
      <Suspense fallback={<GameHubSectionFallback />}>
        <GameHubContent
          gameId={gameId}
          game={game}
          counters={counters}
          liveStatus={liveStatus}
          initialChallengeId={challengeId}
          viewMode={viewMode}
        />
      </Suspense>
    </main>
  );
}

async function GameHubContent({
  gameId,
  game,
  counters,
  liveStatus,
  initialChallengeId,
  viewMode,
}: {
  gameId: number;
  game: Awaited<ReturnType<typeof getGame>>;
  counters: Awaited<ReturnType<typeof getGameAbsCounters>>;
  liveStatus: Awaited<ReturnType<typeof getGameLiveStatus>>;
  initialChallengeId?: string | null;
  viewMode: Awaited<ReturnType<typeof resolveViewMode>>;
}) {
  if (!game) return null;

  const isFinal = game.statusabstract === "Final" || game.statusabstract === "Game Over";
  const isPregame = game.statusabstract === "Preview" || game.statusabstract === "Warmup";

  if (isPregame) {
    return <PregameScoutingReport game={game} viewMode={viewMode} />;
  }

  const challenges = await getGameChallenges(gameId);

  if (isFinal) {
    return <PostgameAAR game={game} challenges={challenges} initialChallengeId={initialChallengeId} viewMode={viewMode} />;
  }

  const liveChallengeWindow = await getLiveChallengeWindow(gameId);

  return (
    <LiveWarRoom
      game={game}
      challenges={challenges}
      liveStatus={liveStatus}
      counters={counters}
      liveChallengeWindow={liveChallengeWindow}
      initialChallengeId={initialChallengeId}
      viewMode={viewMode}
    />
  );
}

function GameHubSectionFallback() {
  return (
    <section className="mt-8 space-y-6">
      <div className="panel p-8 shadow-2xl shadow-black/[0.02] border border-gray-50 min-h-[240px]">
        <div className="h-4 w-28 rounded bg-gray-100 animate-pulse mb-4" />
        <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
          <div className="min-h-[220px] rounded-[1.5rem] bg-gradient-to-br from-gray-100 via-gray-50 to-white animate-pulse" />
          <div className="grid gap-4">
            <div className="min-h-[104px] rounded-[1.5rem] bg-gradient-to-br from-gray-100 via-gray-50 to-white animate-pulse" />
            <div className="min-h-[104px] rounded-[1.5rem] bg-gradient-to-br from-gray-100 via-gray-50 to-white animate-pulse" />
          </div>
        </div>
      </div>
      <div className="panel p-8 shadow-2xl shadow-black/[0.02] border border-gray-50 min-h-[320px]">
        <div className="h-full w-full rounded-[1.5rem] bg-gradient-to-br from-gray-100 via-gray-50 to-white animate-pulse" />
      </div>
    </section>
  );
}
