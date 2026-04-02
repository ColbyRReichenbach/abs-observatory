"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { InningIcon } from "@/components/inning-icon";
import { LocalTime } from "@/components/local-time";
import { GameTypeBadge } from "@/components/ui/game-type-badge";
import { resolveClientViewMode } from "@/lib/view-mode-client";
import { withViewModeHref } from "@/lib/view-mode-href";

import type { LiveGameCard } from "@/lib/types";

type GameStripProps = {
    games: LiveGameCard[];
};

export function GameStrip({ games }: GameStripProps) {
    const searchParams = useSearchParams();
    const activeMode = resolveClientViewMode(searchParams);
    const [scrollIndex, setScrollIndex] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);
    const [containerWidth, setContainerWidth] = useState(0);

    useEffect(() => {
        if (!containerRef.current) return;
        const observer = new ResizeObserver((entries) => {
            setContainerWidth(entries[0].contentRect.width);
        });
        observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, []);

    const itemWidth = 236; // 220px + 16px gap
    const itemsVisible = Math.max(1, (containerWidth - 48) / itemWidth);

    const sortedGames = useMemo(() => {
        return [...games].sort((a, b) => {
            // Live first
            if (a.status === "Live" && b.status !== "Live") return -1;
            if (a.status !== "Live" && b.status === "Live") return 1;

            // Scheduled (by date)
            if (a.status === "Preview" && b.status === "Preview") {
                return new Date(a.gameDate).getTime() - new Date(b.gameDate).getTime();
            }
            if (a.status === "Preview") return -1;
            if (b.status === "Preview") return 1;

            // Finished last
            return 0;
        });
    }, [games]);

    const canPrev = scrollIndex > 0;
    const canNext = scrollIndex + itemsVisible < sortedGames.length;

    const next = () => setScrollIndex(s => Math.min(s + 1, Math.max(0, Math.ceil(sortedGames.length - itemsVisible))));
    const prev = () => setScrollIndex(s => Math.max(s - 1, 0));

    if (sortedGames.length === 0) return null;

    return (
        <div className="relative w-full bg-white/50 backdrop-blur-xl border-y border-gray-100 group py-4 overflow-hidden">
            <div ref={containerRef} className="w-full px-6 flex items-center h-20 relative">
                {/* Navigation Buttons */}
                <div className="absolute inset-x-0 top-0 h-full pointer-events-none z-10">
                    {canPrev && (
                        <button
                            onClick={prev}
                            className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white border border-gray-200 shadow-lg flex items-center justify-center hover:bg-gray-50 transition-all hover:scale-110 pointer-events-auto"
                        >
                            <ChevronLeft size={16} />
                        </button>
                    )}
                    {canNext && (
                        <button
                            onClick={next}
                            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white border border-gray-200 shadow-lg flex items-center justify-center hover:bg-gray-50 transition-all hover:scale-110 pointer-events-auto"
                        >
                            <ChevronRight size={16} />
                        </button>
                    )}
                </div>

                <div className="flex-1 overflow-visible">
                    <motion.div
                        className="flex gap-4"
                        animate={{ x: scrollIndex * -itemWidth }}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    >
                        {sortedGames.map((game) => (
                            <Link
                                key={game.gamePk}
                                href={withViewModeHref(`/game/${game.gamePk}`, activeMode)}
                                prefetch={false}
                                className="flex-shrink-0 w-[220px] h-16 bg-white/50 border border-gray-100 rounded-xl px-4 flex items-center justify-between hover:bg-white hover:shadow-2xl hover:border-blue-100 transition-all group/item hover:scale-105 active:scale-95"
                            >
                                <div className="flex flex-col gap-0.5">
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-black w-6 text-gray-400">{game.awayTeamAbbreviation}</span>
                                        <span className="text-sm font-mono font-bold text-gray-900">{game.awayScore ?? 0}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-black w-6 text-gray-400">{game.homeTeamAbbreviation}</span>
                                        <span className="text-sm font-mono font-bold text-gray-900">{game.homeScore ?? 0}</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="text-right flex flex-col items-end gap-0.5">
                                        <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full ${game.status === 'Live' ? 'bg-red-50 text-red-600' : 'bg-gray-50 text-gray-400'
                                            }`}>
                                            {game.status === 'Live' ? 'Live' : game.status === 'Final' ? 'Final' : 'Scheduled'}
                                        </span>
                                        <GameTypeBadge gameType={game.gameType} compact />
                                        {game.status === 'Preview' && (
                                            <span className="text-[10px] font-mono font-black text-gray-400 whitespace-nowrap">
                                                <LocalTime dateStr={game.gameDate} showDate={false} />
                                            </span>
                                        )}
                                    </div>
                                    {game.status === 'Live' && (
                                        <InningIcon inning={game.inning ?? ""} half={game.inningHalf ?? ""} />
                                    )}
                                </div>
                            </Link>
                        ))}
                    </motion.div>
                </div>
            </div>
        </div>
    );
}
