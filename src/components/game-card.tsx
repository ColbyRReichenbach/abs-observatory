import Image from "next/image";
import Link from "next/link";

import { ChallengeHashes } from "@/components/challenge-hashes";
import { TeamIcon } from "@/components/team-icon";
import { LocalTime } from "@/components/local-time";
import { useMemo } from "react";
import { resolveTeamBranding } from "@/lib/team-branding";

import type { LiveGameCard } from "@/lib/types";

export function GameCard({ game }: { game: LiveGameCard }) {
  const awayAbbr = game.awayTeamAbbreviation ?? game.awayTeamName.slice(0, 3).toUpperCase();
  const homeAbbr = game.homeTeamAbbreviation ?? game.homeTeamName.slice(0, 3).toUpperCase();

  return (

    <Link
      href={`/game/${game.gamePk}`}
      className="group panel panel-interactive relative flex flex-col overflow-hidden p-0 border-gray-100 bg-white"
    >
      {/* Top bar with status */}
      <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 bg-gray-50/50">
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
          MLB • {game.gamePk}
        </span>
        <StatusChip status={game.status} />
      </div>

      {/* Scoreboard body */}
      <div className="flex-1 px-6 py-6 border-b border-gray-100/50">
        {/* Away team */}
        <TeamRow
          teamId={game.awayTeamId}
          abbreviation={awayAbbr}
          name={game.awayTeamName}
          runs={game.awayScore}
          absRemaining={game.awayAbsRemaining}
          teamColor={game.awayTeamColor ?? undefined}
          isWinning={
            game.awayScore !== null &&
            game.homeScore !== null &&
            game.awayScore > game.homeScore
          }
        />

        {/* Divider */}
        <div className="my-4 h-px bg-gray-100 mx-auto w-[90%]" />

        {/* Home team */}
        <TeamRow
          teamId={game.homeTeamId}
          abbreviation={homeAbbr}
          name={game.homeTeamName}
          runs={game.homeScore}
          absRemaining={game.homeAbsRemaining}
          teamColor={game.homeTeamColor ?? undefined}
          isWinning={
            game.homeScore !== null &&
            game.awayScore !== null &&
            game.homeScore > game.awayScore
          }
        />
      </div>

      {/* Footer */}
      <div className="px-6 py-4 flex items-center justify-between bg-gray-50/50 group-hover:bg-blue-50/50 transition-colors">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black uppercase tracking-widest text-[#2d5a27]/60">{game.challengeCount} Challenges</span>
        </div>
        {game.status === "Preview" ? (
          <span className="text-[11px] font-mono font-bold text-gray-500 tracking-tight">
            <LocalTime dateStr={game.gameDate} showDate={true} />
          </span>
        ) : (
          <span className="text-[11px] font-bold text-blue-600 uppercase tracking-tighter">{game.detailedState ?? "Scheduled"}</span>
        )}
      </div>
    </Link>
  );
}

function StatusChip({ status }: { status: string }) {
  const isLive = status === "Live";
  const isFinal = status === "Final";

  return (
    <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border transition-colors ${isLive ? "bg-red-50 text-red-600 border-red-100 shadow-sm shadow-red-500/10" :
      isFinal ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
        "bg-gray-50 text-gray-400 border-gray-100"
      }`}>
      {isLive && <span className="h-1.5 w-1.5 rounded-full bg-red-600 animate-pulse" />}
      {status}
    </span>
  );
}

function TeamRow({
  teamId,
  abbreviation,
  name,
  runs,
  absRemaining,
  teamColor,
  isWinning,
}: {
  teamId: number;
  abbreviation: string;
  name: string;
  runs: number | null;
  absRemaining: number;
  teamColor?: string;
  isWinning: boolean;
}) {
  const branding = useMemo(() => resolveTeamBranding({ teamId, primaryColor: teamColor }), [teamId, teamColor]);
  const activeColor = teamColor ?? branding.tokens.teamPrimary;

  return (
    <div className="flex items-center justify-between py-2.5">
      <div className="flex items-center gap-4">
        <TeamIcon
          teamId={teamId}
          name={name}
          size={44}
          className="shadow-xl opacity-90 group-hover:opacity-100 group-hover:shadow-[0_0_20px_rgba(37,99,235,0.2)]"
        />
        <div className="flex flex-col gap-1">
          <span className={`text-lg font-black tracking-tight leading-none ${isWinning ? "text-gray-900" : "text-gray-400"}`}>
            {name}
          </span>
          <ChallengeHashes remaining={absRemaining} activeColor={activeColor} />
        </div>
      </div>
      <span className={`font-display text-4xl leading-none tracking-tighter ${isWinning ? "text-gray-900" : "text-gray-400"}`}>
        {runs ?? "0"}
      </span>
    </div>
  );
}


