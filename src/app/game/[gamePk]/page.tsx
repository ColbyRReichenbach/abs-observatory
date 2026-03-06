import { notFound } from "next/navigation";

import { ChallengeExplorer } from "@/components/challenge-explorer";
import { ChallengeValueCard } from "@/components/challenge-value-card";
import { GameShell } from "@/components/game-shell";
import { getGame, getGameAbsCounters, getGameChallenges, getGameLiveStatus, getTeamSummary } from "@/lib/data";
import { PregameScoutingReport } from "@/components/game-hub/pregame-hub";
import { LiveWarRoom } from "@/components/game-hub/live-hub";
import { PostgameAAR } from "@/components/game-hub/postgame-hub";
import { GameHubRouter } from "@/components/game-hub/game-hub-router";

export const dynamic = "force-dynamic";

export default async function GamePage({ params }: { params: Promise<{ gamePk: string }> }) {
  const { gamePk } = await params;
  const gameId = Number(gamePk);
  const [game, challenges, counters, liveStatus] = await Promise.all([
    getGame(gameId),
    getGameChallenges(gameId),
    getGameAbsCounters(gameId),
    getGameLiveStatus(gameId),
  ]);

  if (!game) return notFound();
  const [homeSummary, awaySummary] = await Promise.all([
    getTeamSummary(Number(game.hometeamid)),
    getTeamSummary(Number(game.awayteamid)),
  ]);
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
      <GameHubRouter status={game.statusabstract} />
      <GameShell game={game} liveStatus={liveStatus} counters={counters} />

      {isPregame ? (
        <PregameScoutingReport game={game} />
      ) : isFinal ? (
        <PostgameAAR game={game} challenges={challenges} />
      ) : (
        <LiveWarRoom game={game} challenges={challenges} liveStatus={liveStatus} counters={counters} />
      )}
    </main>
  );
}

function PreviewCard({
  title,
  challenges,
  overturnRate,
  avgRemaining,
}: {
  title: string;
  challenges: number;
  overturnRate: number;
  avgRemaining: number;
}) {
  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface-infield)] p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--ink-1)]">{title}</p>
      <div className="mt-3 grid grid-cols-3 gap-3">
        <div>
          <p className="text-[9px] uppercase tracking-[0.08em] text-[var(--ink-3)]">Challenges</p>
          <p className="mt-1 font-display text-xl text-[var(--ink-0)]">{challenges}</p>
        </div>
        <div>
          <p className="text-[9px] uppercase tracking-[0.08em] text-[var(--ink-3)]">Overturn Rate</p>
          <p className="mt-1 font-display text-xl text-[var(--ink-0)]">{(overturnRate * 100).toFixed(1)}%</p>
        </div>
        <div>
          <p className="text-[9px] uppercase tracking-[0.08em] text-[var(--ink-3)]">Avg Remaining</p>
          <p className="mt-1 font-display text-xl text-[var(--ink-0)]">{avgRemaining.toFixed(2)}</p>
        </div>
      </div>
    </div>
  );
}
