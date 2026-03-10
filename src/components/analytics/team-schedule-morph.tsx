"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar as CalendarIcon, ChevronRight, Play, CheckCircle2, Clock } from "lucide-react";
import Link from "next/link";
import { isToday, isBefore, isAfter, startOfDay } from "date-fns";

import { TeamIcon } from "@/components/team-icon";
import { LeagueCalendar } from "@/components/analytics/league-calendar";
import { ExpandableAiBSButton } from "@/components/ui/aibs-icon";
import { LocalTime } from "@/components/local-time";

export type ScheduleGame = {
    gamePk: number;
    gameDate: string;
    status: string;
    homeTeamId: number;
    awayTeamId: number;
    homeAbbr: string;
    awayAbbr: string;
    homeLogoUrl: string;
    awayLogoUrl: string;
};

export function TeamScheduleMorph({
    schedule,
    teamId,
    primaryColor = "#007aff"
}: {
    schedule: ScheduleGame[];
    teamId: number;
    primaryColor?: string;
}) {
    const [isExpanded, setIsExpanded] = useState(false);

    // Compute the 5-game window
    const windowGames = useMemo(() => {
        const today = startOfDay(new Date()); // Mocking today to be roughly mid-season for demo, or actual Date

        // For the sake of the MVP presentation, we'll anchor "today" to a date that exists in the mock data, or just use the system Date.
        // Let's assume the system date is valid.

        const pastGames = schedule.filter(g => isBefore(new Date(g.gameDate), today) || g.status === "Final" || g.status === "Completed").reverse();
        const liveGames = schedule.filter(g => g.status === "Live");
        const futureGames = schedule.filter(g => isAfter(new Date(g.gameDate), today) && g.status !== "Final" && g.status !== "Live");

        const selected: ScheduleGame[] = [];

        // Try to get 1 live game
        if (liveGames.length > 0) {
            selected.push(liveGames[0]);
        }

        // Try to get up to 3 past games
        const numPastToTake = Math.min(3, pastGames.length);
        const selectedPast = pastGames.slice(0, numPastToTake).reverse(); // Reverse back to chronological
        selected.unshift(...selectedPast);

        // Fill the rest with future games (to make exactly 5, if possible)
        const numNeeded = 5 - selected.length;
        const selectedFuture = futureGames.slice(0, numNeeded);
        selected.push(...selectedFuture);

        // If we still don't have 5 and we have more past games, fill from past
        if (selected.length < 5 && pastGames.length > numPastToTake) {
            const extraNeeded = 5 - selected.length;
            const extraPast = pastGames.slice(numPastToTake, numPastToTake + extraNeeded).reverse();
            selected.unshift(...extraPast);
        }

        return selected;
    }, [schedule]);

    return (
        <section className="mt-12">
            <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-blue-600 mb-2">Historical Stream</h2>
                    <h3 className="text-3xl font-display uppercase tracking-tight text-gray-900">Schedule</h3>
                </div>

                {!isExpanded && (
                    <motion.button
                        className="h-10 rounded-full bg-black shadow-lg flex items-center text-white focus:outline-none overflow-hidden group hover:scale-105 transition-transform w-[40px] hover:w-[200px]"
                        onClick={() => setIsExpanded(true)}
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
                    {!isExpanded ? (
                        <motion.div
                            key="strip"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20, filter: "blur(10px)" }}
                            className="p-8"
                        >
                            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 relative">
                                {windowGames.map((g, i) => (
                                    <GameCard key={g.gamePk} game={g} teamId={teamId} />
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
                            <LeagueCalendar games={schedule} teamId={teamId} primaryColor={primaryColor} onCollapse={() => setIsExpanded(false)} />
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </section>
    );
}

function GameCard({ game, teamId }: { game: ScheduleGame, teamId: number }) {
    const isLive = game.status === "Live";
    const isPast = game.status === "Final" || game.status === "Completed";
    const date = new Date(game.gameDate);

    return (
        <Link
            href={`/game/${game.gamePk}`}
            className={`block relative p-5 rounded-2xl border transition-all hover:shadow-xl hover:-translate-y-1 group bg-white
                ${isLive ? 'border-red-200 shadow-[0_0_30px_rgba(239,68,68,0.1)] ring-1 ring-red-500/20' : 'border-gray-100 shadow-sm'}
            `}
        >
            {isLive && (
                <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-r from-red-400 via-orange-500 to-red-500 rounded-t-2xl" />
            )}

            <div className="flex justify-between items-start mb-6">
                <span suppressHydrationWarning className={`text-[10px] font-bold uppercase tracking-widest whitespace-nowrap ${isLive ? 'text-red-600' : 'text-gray-400'}`}>
                    {date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </span>

                {isLive ? (
                    <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-red-50 text-red-600 text-[8px] font-black uppercase tracking-widest">
                        <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                        Live
                    </span>
                ) : isPast ? (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-50 text-gray-500 text-[8px] font-black uppercase tracking-widest">
                        <CheckCircle2 size={10} />
                        Final
                    </span>
                ) : (
                    <span suppressHydrationWarning className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 text-[9px] font-mono font-bold tracking-tight whitespace-nowrap">
                        <Clock size={10} />
                        <LocalTime dateStr={game.gameDate} showDate={false} omitTimeZone={true} />
                    </span>
                )}
            </div>

            <div className="flex flex-col items-center justify-center gap-1 py-1">
                <div className="flex items-center justify-center gap-3">
                    <TeamIcon teamId={game.awayTeamId} name={game.awayAbbr} size={48} className="shadow-lg transition-transform group-hover:translate-x-1.5" />
                    <span className="text-[10px] font-black text-gray-300">@</span>
                    <TeamIcon teamId={game.homeTeamId} name={game.homeAbbr} size={48} className="shadow-lg transition-transform group-hover:-translate-x-1.5" />
                </div>
                <span className="text-lg font-display uppercase tracking-tight text-gray-900 mt-2">
                    {game.awayAbbr} <span className="text-gray-300 font-sans text-[11px] mx-1">@</span> {game.homeAbbr}
                </span>
            </div>

            {isPast && (
                <div className="mt-4 pt-4 border-t border-gray-50 flex items-center justify-between">
                    <span className="text-[9px] font-black uppercase tracking-widest text-gray-400 group-hover:text-blue-600 transition-colors">
                        View Box Score
                    </span>
                    <ChevronRight size={14} className="text-gray-300 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
                </div>
            )}
            {!isPast && (
                <div className="mt-4 pt-4 border-t border-gray-50 flex items-center justify-between">
                    <span className="text-[9px] font-black uppercase tracking-widest text-gray-400 group-hover:text-blue-600 transition-colors">
                        Game Intel
                    </span>
                    <ChevronRight size={14} className="text-gray-300 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
                </div>
            )}
        </Link>
    );
}
