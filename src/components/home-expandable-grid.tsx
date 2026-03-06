"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { GameCard } from "@/components/game-card";
import type { LiveGameCard } from "@/lib/types";

export function HomeExpandableGrid({ games }: { games: LiveGameCard[] }) {
    const [expanded, setExpanded] = useState(false);

    return (
        <>
            <div className="flex justify-center mt-4">
                <button
                    onClick={() => setExpanded(!expanded)}
                    className="px-6 py-2 rounded-full bg-black text-white font-black text-[10px] uppercase tracking-widest transition-all hover:scale-105 active:scale-95 shadow-xl shadow-black/10 flex items-center gap-2"
                >
                    {expanded ? "Collapse" : "Expand Games"}
                    {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                </button>
            </div>

            {/* Expandable Game Grid */}
            {expanded && (
                <section className="mt-32 mb-40 animate-in fade-in slide-in-from-top-4 duration-500">
                    <div className="mb-14 flex items-end justify-between border-b border-gray-100 pb-8">
                        <div>
                            <span className="text-[10px] font-bold uppercase tracking-widest text-blue-600 mb-2 block">Live Dashboard</span>
                            <h2 className="text-5xl font-display uppercase tracking-tighter text-gray-900">
                                Active Matchups
                            </h2>
                        </div>
                    </div>

                    {games.length === 0 ? (
                        <div className="panel p-20 text-center bg-gray-50 border-dashed border-2 border-gray-200 shadow-none">
                            <p className="text-gray-500 font-semibold text-lg">Stadium silence. No live games currently tracking.</p>
                        </div>
                    ) : (
                        <div className="grid gap-8 sm:grid-cols-2 xl:grid-cols-3">
                            {games.map((g) => (
                                <GameCard key={g.gamePk} game={g} />
                            ))}
                        </div>
                    )}
                </section>
            )}
        </>
    );
}
