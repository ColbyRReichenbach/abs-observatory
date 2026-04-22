"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { GameCard } from "@/components/game-card";
import type { ViewMode } from "@/lib/view-mode";
import type { LiveGameCard } from "@/lib/types";

export function HomeExpandableGrid({ games, viewMode }: { games: LiveGameCard[]; viewMode: ViewMode }) {
    const [expanded, setExpanded] = useState(false);
    const gameCount = games.length;
    const isEmpty = gameCount === 0;
    const visibleGames = expanded ? games : games.slice(0, 3);
    const hiddenCount = Math.max(0, gameCount - visibleGames.length);

    return (
        <section className="mt-20 mb-40">
            <div className="mb-10 flex items-end justify-between border-b border-gray-100 pb-8">
                <div>
                    <h4 className="mb-1 text-[10px] font-bold uppercase tracking-widest text-blue-500">
                        Live Dashboard
                    </h4>
                    <p className="text-5xl font-display leading-none text-gray-900">
                        Active <span className="text-gray-400 italic">Matchups</span>
                    </p>
                </div>
                <button
                    onClick={() => !isEmpty && setExpanded(!expanded)}
                    className={`rounded-full px-6 py-2 text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${isEmpty
                        ? "cursor-default bg-gray-200 text-gray-400"
                        : "bg-black text-white shadow-xl shadow-black/10 hover:scale-105 active:scale-95"
                        }`}
                    disabled={isEmpty}
                >
                    {isEmpty
                        ? "No Games Today"
                        : expanded
                            ? "Show Fewer"
                            : hiddenCount > 0
                                ? `Show ${hiddenCount} More`
                                : `Show All ${gameCount}`}
                    {!isEmpty && (expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                </button>
            </div>

            {games.length === 0 ? (
                <div className="panel border-2 border-dashed border-gray-200 bg-gray-50 p-20 text-center shadow-none">
                    <p className="text-lg font-semibold text-gray-500">Stadium silence. No live games currently tracking.</p>
                </div>
            ) : (
                <div className="grid gap-8 sm:grid-cols-2 xl:grid-cols-3">
                    {visibleGames.map((g) => (
                        <GameCard key={g.gamePk} game={g} viewMode={viewMode} />
                    ))}
                </div>
            )}
        </section>
    );
}
