import type { CSSProperties } from "react";

import Link from "next/link";
import { ChallengeHashes } from "@/components/challenge-hashes";
import { resolveTeamBranding } from "@/lib/team-branding";
import { InningIcon } from "@/components/inning-icon";
import { TeamIcon } from "@/components/team-icon";

type InningLine = {
  inning: number;
  awayRuns: number | null;
  homeRuns: number | null;
};

type TeamLine = {
  id: number;
  name: string;
  abbreviation?: string | null;
  runs: number | null;
  hits?: number | null;
  errors?: number | null;
  challengesRemaining: number;
};

type GameScoreboardProps = {
  status: string;
  detailedState?: string | null;
  inning?: number | null;
  halfInning?: string | null;
  balls?: number | null;
  strikes?: number | null;
  outs?: number | null;
  innings?: InningLine[];
  away: TeamLine;
  home: TeamLine;
};

const BASE_INNINGS = 9;

export function GameScoreboard({
  status,
  detailedState,
  inning,
  halfInning,
  balls,
  strikes,
  outs,
  innings,
  away,
  home,
}: GameScoreboardProps) {
  const inningCells = normalizeInnings(innings);
  const isFinal = status.toLowerCase() === "final";
  const isLive = status.toLowerCase() === "live" || status.toLowerCase() === "in progress";
  const homeBrand = resolveTeamBranding({ teamId: home.id, abbreviation: home.abbreviation ?? null });
  const awayBrand = resolveTeamBranding({ teamId: away.id, abbreviation: away.abbreviation ?? null });

  return (
    <section
      className="panel relative overflow-hidden bg-white/[0.02] border-white/5 shadow-2xl"
      style={
        {
          "--home-primary": homeBrand.tokens.teamPrimary,
          "--home-secondary": homeBrand.tokens.teamSecondary,
          "--away-primary": awayBrand.tokens.teamPrimary,
        } as CSSProperties
      }
      aria-label="Game scoreboard"
    >
      {/* Status header */}
      <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-4 bg-white/5 border-b border-white/5">
        <div className="flex items-center gap-4">
          <div className="flex flex-col">
            <span className={`inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.2em] ${isLive ? "text-red-500" : isFinal ? "text-emerald-500" : "text-[var(--ink-3)]"}`}>
              {isLive && <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />}
              {isFinal ? "Final" : "Game Live"}
            </span>
            <div className="flex items-center gap-2 mt-1">
              {isFinal ? (
                <span className="text-xs font-bold text-[var(--ink-1)]">Status: Complete</span>
              ) : (
                <div className="flex items-center gap-2">
                  <InningIcon inning={inning ?? null} half={halfInning ?? null} className="scale-90 origin-left" />
                  <span className="text-xs font-bold text-[var(--ink-1)] uppercase tracking-tight">{detailedState}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex flex-col items-end">
            <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-[var(--ink-3)] mb-1">Count</span>
            <span className="font-mono text-lg font-black text-[var(--ink-0)] leading-none">
              {balls ?? "0"}-{strikes ?? "0"}
            </span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-[var(--ink-3)] mb-2">Outs</span>
            <div className="flex gap-1.5">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className={`h-2.5 w-2.5 rounded-full border-2 transition-all duration-[var(--motion-mid)] ${i < (outs ?? 0)
                    ? "border-amber-500 bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]"
                    : "border-white/10 bg-transparent"
                    }`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Line score table */}
      <div className="overflow-x-auto p-2">
        <table className="min-w-full border-separate border-spacing-y-1">
          <thead>
            <tr>
              <th className="px-4 py-3 text-left text-[9px] font-black uppercase tracking-[0.2em] text-[var(--ink-3)]">
                Matchup
              </th>
              {inningCells.map((val) => (
                <th
                  key={`inn-h-${val}`}
                  className={`w-10 px-1 py-3 text-center font-mono text-[9px] font-black uppercase tracking-wider ${val === inning ? "text-blue-500" : "text-[var(--ink-3)]"
                    }`}
                >
                  {val}
                </th>
              ))}
              <th className="w-10 px-1 py-3 text-center font-mono text-[10px] font-black text-white">R</th>
              <th className="w-10 px-1 py-3 text-center font-mono text-[10px] font-black text-[var(--ink-3)]">H</th>
              <th className="w-10 px-1 py-3 text-center font-mono text-[10px] font-black text-[var(--ink-3)]">E</th>
              <th className="w-20 px-4 py-3 text-center text-[9px] font-black uppercase tracking-[0.2em] text-[var(--ink-3)]">ABS</th>
            </tr>
          </thead>
          <tbody>
            <ScoreRow
              team={away}
              side="away"
              inningCells={inningCells}
              innings={innings ?? []}
              currentInning={inning}
              brand={awayBrand}
            />
            <ScoreRow
              team={home}
              side="home"
              inningCells={inningCells}
              innings={innings ?? []}
              currentInning={inning}
              brand={homeBrand}
            />
          </tbody>
        </table>
      </div>
    </section>
  );
}

type TeamBranding = ReturnType<typeof resolveTeamBranding>;

function ScoreRow({
  team,
  side,
  inningCells,
  innings,
  currentInning,
  brand,
}: {
  team: TeamLine;
  side: "home" | "away";
  inningCells: number[];
  innings: InningLine[];
  currentInning?: number | null;
  brand: TeamBranding;
}) {
  const abbreviation = team.abbreviation?.trim() || team.name;
  const accentColor = brand.tokens.teamPrimary;

  return (
    <tr className="bg-white/5 rounded-lg overflow-hidden transition-all hover:bg-white/[0.08]">
      <th className="px-4 py-4 text-left rounded-l-lg">
        <Link href={`/teams/${team.id}`} className="flex items-center gap-4 group/teamlink">
          <TeamIcon
            teamId={team.id}
            name={team.name}
            size={40}
            className="shadow-2xl border-white/10 transition-transform group-hover/teamlink:scale-110"
          />
          <span className="text-sm font-black tracking-tight text-[var(--ink-0)] group-hover/teamlink:text-blue-500 transition-colors">
            {abbreviation}
          </span>
        </Link>
      </th>
      {inningCells.map((val) => {
        const inningRuns = innings.find((entry) => entry.inning === val);
        const runValue = side === "away" ? inningRuns?.awayRuns : inningRuns?.homeRuns;
        const isCurrent = val === currentInning;
        return (
          <td
            key={`${side}-${val}`}
            className={`px-1 py-4 text-center font-mono text-xs ${isCurrent
              ? "text-blue-500 font-black bg-blue-500/10"
              : "text-[var(--ink-2)]"
              }`}
          >
            {runValue ?? "0"}
          </td>
        );
      })}
      <td className="px-1 py-4 text-center font-display text-2xl text-[var(--ink-0)] font-black">
        {team.runs ?? "0"}
      </td>
      <td className="px-1 py-4 text-center font-mono text-xs text-[var(--ink-3)]">
        {team.hits ?? "0"}
      </td>
      <td className="px-1 py-4 text-center font-mono text-xs text-[var(--ink-3)]">
        {team.errors ?? "0"}
      </td>
      <td className="px-4 py-4 text-center rounded-r-lg">
        <ChallengeHashes remaining={team.challengesRemaining} activeColor={accentColor} />
      </td>
    </tr>
  );
}

function normalizeInnings(innings?: InningLine[]) {
  const maxFromData = innings?.reduce((acc, current) => Math.max(acc, current.inning), BASE_INNINGS) ?? BASE_INNINGS;
  return Array.from({ length: maxFromData }, (_, idx) => idx + 1);
}
