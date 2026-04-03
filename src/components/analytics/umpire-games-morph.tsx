"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { format } from "date-fns";
import { Calendar as CalendarIcon, CheckCircle2, ChevronRight } from "lucide-react";

import { TeamIcon } from "@/components/team-icon";
import { LeagueCalendar } from "@/components/analytics/league-calendar";
import { GameTypeBadge } from "@/components/ui/game-type-badge";
import { ModeAwareLink } from "@/components/ui/mode-aware-link";
import type { UmpireTrendPoint } from "@/lib/types";

type UmpireGamesMorphProps = {
  games: UmpireTrendPoint[];
};

function dateKey(value: string | Date | null | undefined) {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return value.slice(0, 10);
}

function asDate(value: string | Date | null | undefined) {
  const key = dateKey(value);
  if (!key) return new Date();
  return new Date(`${key}T12:00:00Z`);
}

export function UmpireGamesMorph({ games }: UmpireGamesMorphProps) {
  const [expanded, setExpanded] = useState(false);
  const previewGames = useMemo(
    () =>
      [...games]
        .sort((left, right) => asDate(left.gameDate).getTime() - asDate(right.gameDate).getTime())
        .slice(-5),
    [games],
  );

  return (
    <section className="mt-12 mb-20">
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-blue-600 mb-2">Historical Stream</h2>
          <h3 className="text-3xl font-display uppercase tracking-tight text-gray-900">Schedule</h3>
        </div>

        {!expanded && (
          <motion.button
            className="h-10 rounded-full bg-black shadow-lg flex items-center text-white focus:outline-none overflow-hidden group hover:scale-105 transition-transform w-[40px] hover:w-[200px]"
            onClick={() => setExpanded(true)}
            initial={{ width: 40 }}
            whileHover={{ width: 200 }}
          >
            <div className="shrink-0 flex items-center justify-center w-10 h-10">
              <CalendarIcon size={16} />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              View Full Schedule
            </span>
          </motion.button>
        )}
      </div>

      <motion.div layout className="relative rounded-[2rem] border border-gray-100 bg-white/50 backdrop-blur-sm overflow-hidden shadow-2xl shadow-black/[0.02]">
        <AnimatePresence mode="wait">
          {!expanded ? (
            <motion.div
              key="strip"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20, filter: "blur(10px)" }}
              className="p-8"
            >
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                {previewGames.map((game) => (
                  <ModeAwareLink
                    key={game.gamePk}
                    href={`/game/${game.gamePk}`}
                    className="block relative p-5 rounded-2xl border transition-all hover:shadow-xl hover:-translate-y-1 group bg-white border-gray-100 shadow-sm"
                  >
                    <div className="flex justify-between items-start mb-6">
                      <div className="flex flex-col items-start gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                          {format(asDate(game.gameDate), "MMM d")}
                        </span>
                        <GameTypeBadge gameType={game.gameType} compact />
                      </div>
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-50 text-gray-500 text-[8px] font-black uppercase tracking-widest">
                        <CheckCircle2 size={10} />
                        Final
                      </span>
                    </div>

                    <div className="flex flex-col items-center justify-center gap-1 py-1">
                      <div className="flex items-center justify-center gap-3">
                        <TeamIcon teamId={game.awayTeamId} name={game.awayTeamAbbr} size={48} className="shadow-lg transition-transform group-hover:translate-x-1.5" />
                        <span className="text-[10px] font-black text-gray-300">@</span>
                        <TeamIcon teamId={game.homeTeamId} name={game.homeTeamAbbr} size={48} className="shadow-lg transition-transform group-hover:-translate-x-1.5" />
                      </div>
                      <span className="text-lg font-display uppercase tracking-tight text-gray-900 mt-2">
                        {game.awayTeamAbbr} <span className="text-gray-300 font-sans text-[11px] mx-1">@</span> {game.homeTeamAbbr}
                      </span>
                    </div>

                    <div className="mt-5 grid grid-cols-2 gap-3 border-t border-gray-100 pt-4 text-center">
                      <MiniMetric label="Accuracy" value={`${(game.accuracy * 100).toFixed(1)}%`} />
                      <MiniMetric label="Challenges" value={`${game.challengedCount}`} />
                    </div>

                    <div className="mt-4 pt-4 border-t border-gray-50 flex items-center justify-between">
                      <span className="text-[9px] font-black uppercase tracking-widest text-gray-400 group-hover:text-blue-600 transition-colors">
                        View Box Score
                      </span>
                      <ChevronRight size={14} className="text-gray-300 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
                    </div>
                  </ModeAwareLink>
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="calendar"
              initial={{ opacity: 0, scale: 0.95, filter: "blur(10px)" }}
              animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
              exit={{ opacity: 0, scale: 0.95, filter: "blur(10px)" }}
            >
              <LeagueCalendar
                games={games.map((game) => ({
                  gamePk: game.gamePk,
                  gameDate: asDate(game.gameDate).toISOString(),
                  gameType: game.gameType,
                  status: "Final",
                  homeTeamId: game.homeTeamId,
                  awayTeamId: game.awayTeamId,
                  homeAbbr: game.homeTeamAbbr,
                  awayAbbr: game.awayTeamAbbr,
                  homeLogoUrl: "",
                  awayLogoUrl: "",
                }))}
                primaryColor="#2563eb"
                onCollapse={() => setExpanded(false)}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </section>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[9px] font-black uppercase tracking-[0.14em] text-gray-400">{label}</p>
      <p className="mt-1 text-base font-display text-gray-900">{value}</p>
    </div>
  );
}
