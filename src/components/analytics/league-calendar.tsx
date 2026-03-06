"use client";

import { useState, useMemo } from "react";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, isToday, parseISO } from "date-fns";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, ExternalLink, Play, Clock, CheckCircle2 } from "lucide-react";
import { TeamIcon } from "@/components/team-icon";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

type Game = {
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

export function LeagueCalendar({
    games,
    teamId,
    primaryColor = "#007aff"
}: {
    games: Game[],
    teamId: number,
    primaryColor?: string
}) {
    const [currentMonth, setCurrentMonth] = useState(new Date(2026, 2)); // March 2026

    const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
    const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const calendarDays = eachDayOfInterval({
        start: startDate,
        end: endDate,
    });

    const gamesByDate = useMemo(() => {
        const map: Record<string, Game> = {};
        games.forEach(g => {
            if (!g.gameDate) return;
            const dateObj = typeof g.gameDate === 'string' ? parseISO(g.gameDate) : new Date(g.gameDate);
            const dateStr = format(dateObj, "yyyy-MM-dd");
            map[dateStr] = g;
        });
        return map;
    }, [games]);

    return (
        <div className="panel p-0 overflow-hidden" style={{ "--calendar-accent": primaryColor } as any}>
            {/* Header */}
            <div className="flex items-center justify-between px-10 py-10 border-b border-gray-100">
                <div className="flex items-center gap-6">
                    <div className="h-14 w-14 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-400">
                        <CalendarIcon size={24} />
                    </div>
                    <div>
                        <h3 className="text-3xl font-display uppercase tracking-tight text-gray-900">
                            {format(currentMonth, "MMMM yyyy")}
                        </h3>
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mt-1">Full Season Interactive Schedule</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={prevMonth}
                        className="h-12 w-12 rounded-xl border border-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-50 transition-all hover:scale-105"
                    >
                        <ChevronLeft size={20} />
                    </button>
                    <button
                        onClick={nextMonth}
                        className="h-12 w-12 rounded-xl border border-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-50 transition-all hover:scale-105"
                    >
                        <ChevronRight size={20} />
                    </button>
                </div>
            </div>

            {/* Days Header */}
            <div className="grid grid-cols-7 bg-gray-50/50 border-b border-gray-100">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
                    <div key={day} className="py-4 text-center">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">{day}</span>
                    </div>
                ))}
            </div>

            {/* Grid */}
            <div className="grid grid-cols-7">
                {calendarDays.map((day, idx) => {
                    const dateKey = format(day, "yyyy-MM-dd");
                    const game = gamesByDate[dateKey];
                    const isCurrentMonth = isSameMonth(day, monthStart);
                    const isTodayDate = isToday(day);

                    return (
                        <div
                            key={idx}
                            className={`min-h-[160px] border-r border-b border-gray-100 last:border-r-0 p-4 transition-all relative group ${!isCurrentMonth ? "bg-gray-50/30" : "bg-white"}`}
                        >
                            <div className="flex justify-between items-start mb-4">
                                <span className={`text-sm font-bold ${isCurrentMonth ? "text-gray-900" : "text-gray-300"} ${isTodayDate ? "h-7 w-7 rounded-full bg-blue-600 text-white flex items-center justify-center -mt-1 -ml-1" : ""}`}>
                                    {format(day, "d")}
                                </span>
                            </div>

                            {game && (
                                <Link
                                    href={`/games/${game.gamePk}`}
                                    className="block p-3 rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-md hover:border-gray-200 transition-all hover:-translate-y-1 group/game"
                                >
                                    <div className="flex items-center gap-3 mb-3">
                                        <TeamIcon
                                            teamId={game.homeTeamId === teamId ? game.awayTeamId : game.homeTeamId}
                                            name={game.homeTeamId === teamId ? game.awayAbbr : game.homeAbbr}
                                            size={28}
                                        />
                                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-900">
                                            {game.homeTeamId === teamId ? "vs" : "@"} {game.homeTeamId === teamId ? game.awayAbbr : game.homeAbbr}
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <GameStatusIndicator status={game.status} />
                                        <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">
                                            {game.status}
                                        </span>
                                    </div>
                                </Link>
                            )}

                            {!game && isCurrentMonth && (
                                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-200">No Game</span>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function GameStatusIndicator({ status }: { status: string }) {
    if (status === "Final" || status === "Completed") return <CheckCircle2 size={12} className="text-green-500" />;
    if (status === "Live") return <Play size={12} className="text-red-500 animate-pulse" />;
    return <Clock size={12} className="text-gray-300" />;
}
