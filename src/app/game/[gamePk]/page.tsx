import { notFound } from "next/navigation";

import { GameShell } from "@/components/game-shell";
import { getGame, getGameAbsCounters, getGameChallenges, getGameLiveStatus, getLiveChallengeWindow } from "@/lib/data";
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
  const [game, challenges, counters, liveStatus, liveChallengeWindow] = await Promise.all([
    getGame(gameId),
    getGameChallenges(gameId),
    getGameAbsCounters(gameId),
    getGameLiveStatus(gameId),
    getLiveChallengeWindow(gameId),
  ]);

  if (!game) return notFound();
  // Status router logic
  const isFinal = game.statusabstract === "Final" || game.statusabstract === "Game Over";
  const isPregame = game.statusabstract === "Preview" || game.statusabstract === "Warmup";

  return (
    <main className="mx-auto max-w-7xl px-6 pb-8 pt-32">
      <div className="mb-8">
        <BackPill label="Schedule" useHistory />
      </div>
      <GameHubRouter status={game.statusabstract} />
      <GameShell game={game} liveStatus={liveStatus} counters={counters} />

      {isPregame ? (
        <PregameScoutingReport game={game} viewMode={viewMode} />
      ) : isFinal ? (
        <PostgameAAR game={game} challenges={challenges} initialChallengeId={challengeId} viewMode={viewMode} />
      ) : (
        <LiveWarRoom
          game={game}
          challenges={challenges}
          liveStatus={liveStatus}
          counters={counters}
          liveChallengeWindow={liveChallengeWindow}
          initialChallengeId={challengeId}
          viewMode={viewMode}
        />
      )}
    </main>
  );
}
