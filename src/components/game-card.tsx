import { ChallengeHashes } from "@/components/challenge-hashes";
import { TeamIcon } from "@/components/team-icon";
import { LocalTime } from "@/components/local-time";
import { GameTypeBadge } from "@/components/ui/game-type-badge";
import { ModeAwareLink } from "@/components/ui/mode-aware-link";
import { useMemo } from "react";
import { resolveTeamBranding } from "@/lib/team-branding";
import type { ViewMode } from "@/lib/view-mode";

import type { LiveGameCard } from "@/lib/types";

export function GameCard({ game, viewMode }: { game: LiveGameCard; viewMode?: ViewMode | null }) {
  const liveScenarioLabel = getLiveScenarioLabel(game);

  return (

    <ModeAwareLink
      href={`/game/${game.gamePk}`}
      mode={viewMode}
      className="group panel panel-interactive relative flex flex-col overflow-hidden p-0 border-gray-100 bg-white"
    >
      {/* Top bar with status */}
      <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 bg-gray-50/50">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
            MLB • {game.gamePk}
          </span>
          <GameTypeBadge gameType={game.gameType} compact />
        </div>
        <StatusChip status={game.status} />
      </div>

      {/* Scoreboard body */}
      <div className="flex-1 px-6 py-6 border-b border-gray-100/50">
        {/* Away team */}
        <TeamRow
          teamId={game.awayTeamId}
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
          <span className="text-[11px] font-bold text-blue-600 uppercase tracking-tighter">{liveScenarioLabel}</span>
        )}
      </div>
    </ModeAwareLink>
  );
}

function getLiveScenarioLabel(game: LiveGameCard) {
  if (game.status !== "Live") {
    return game.detailedState ?? "Scheduled";
  }

  const normalizedState = game.detailedState?.trim();
  if (normalizedState && normalizedState.toLowerCase() !== "in progress") {
    return normalizedState;
  }

  const inningNumber = typeof game.inning === "number" && Number.isFinite(game.inning) ? ordinalInning(game.inning) : null;
  const half = normalizeHalfInning(game.inningHalf);

  if (half && inningNumber) {
    return `${half} ${inningNumber}`;
  }

  if (inningNumber) {
    return inningNumber;
  }

  return "Live";
}

function normalizeHalfInning(value: string | null | undefined) {
  if (!value) return null;
  const lower = value.trim().toLowerCase();
  if (lower === "top") return "Top";
  if (lower === "bottom" || lower === "bot") return "Bottom";
  return value.trim();
}

function ordinalInning(inning: number) {
  const remainder10 = inning % 10;
  const remainder100 = inning % 100;
  if (remainder10 === 1 && remainder100 !== 11) return `${inning}st`;
  if (remainder10 === 2 && remainder100 !== 12) return `${inning}nd`;
  if (remainder10 === 3 && remainder100 !== 13) return `${inning}rd`;
  return `${inning}th`;
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
  name,
  runs,
  absRemaining,
  teamColor,
  isWinning,
}: {
  teamId: number;
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
