import { notFound } from "next/navigation";

import { GameShell } from "@/components/game-shell";
import { getGame, getGameAbsCounters, getGameChallenges, getGameLiveStatus } from "@/lib/data";
import { PregameScoutingReport } from "@/components/game-hub/pregame-hub";
import { LiveWarRoom } from "@/components/game-hub/live-hub";
import { PostgameAAR } from "@/components/game-hub/postgame-hub";
import { GameHubRouter } from "@/components/game-hub/game-hub-router";
import { BackPill } from "@/components/ui/back-pill";

export const dynamic = "force-dynamic";

export default async function GamePage({
  params,
  searchParams,
}: {
  params: Promise<{ gamePk: string }>;
  searchParams: Promise<{ challengeId?: string }>;
}) {
  const { gamePk } = await params;
  const { challengeId } = await searchParams;
  const gameId = Number(gamePk);
  const [game, challenges, counters, liveStatus] = await Promise.all([
    getGame(gameId),
    getGameChallenges(gameId),
    getGameAbsCounters(gameId),
    getGameLiveStatus(gameId),
  ]);

  if (!game) return notFound();
  const latest = challenges.at(-1);
  const defaultRemaining =
    latest?.challengeTeamId && counters
      ? latest.challengeTeamId === counters.homeTeamId
        ? counters.homeRemaining
        : latest.challengeTeamId === counters.awayTeamId
          ? counters.awayRemaining
          : 1
      : 1;
  const initialDecisionContext = {
    inning: latest?.inning ?? 7,
    balls: latest?.balls ?? 1,
    strikes: latest?.strikes ?? 1,
    outs: latest?.outs ?? 1,
    scoreDiffBattingTeam: latest ? (latest.awayScore ?? 0) - (latest.homeScore ?? 0) : 0,
    runnersOnBase: latest?.basesState ? latest.basesState.split("").filter((c) => c === "1").length : 0,
    estimatedOverturnProbability: 0.55,
    challengesRemaining: defaultRemaining,
  };

  // Status router logic
  const isFinal = game.statusabstract === "Final" || game.statusabstract === "Game Over";
  const isPregame = game.statusabstract === "Preview" || game.statusabstract === "Warmup";

  return (
    <main className="mx-auto max-w-7xl px-6 py-8">
      <BackPill label="Schedule" useHistory />
      <GameHubRouter status={game.statusabstract} />
      <GameShell game={game} liveStatus={liveStatus} counters={counters} />

      {isPregame ? (
        <PregameScoutingReport game={game} />
      ) : isFinal ? (
        <PostgameAAR game={game} challenges={challenges} initialChallengeId={challengeId} />
      ) : (
        <LiveWarRoom game={game} challenges={challenges} liveStatus={liveStatus} counters={counters} initialChallengeId={challengeId} />
      )}
    </main>
  );
}
