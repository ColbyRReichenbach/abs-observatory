"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { GameCard } from "@/components/game-card";
import type { LiveGameCard } from "@/lib/types";

export function HomeExpandableGrid({ games }: { games: LiveGameCard[] }) {
    const [expanded, setExpanded] = useState(false);
    const gameCount = games.length;
    const isEmpty = gameCount === 0;

    return (
        <>
            <div className="flex justify-center mt-4">
                <button
                    onClick={() => !isEmpty && setExpanded(!expanded)}
                    className={`px-6 py-2 rounded-full font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-2 ${isEmpty
                        ? "bg-gray-200 text-gray-400 cursor-default"
                        : "bg-black text-white hover:scale-105 active:scale-95 shadow-xl shadow-black/10"
                        }`}
                    disabled={isEmpty}
                >
                    {isEmpty
                        ? "No Games Today"
                        : expanded
                            ? "Collapse"
                            : `▸ See All ${gameCount} Games`}
                    {!isEmpty && (expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                </button>
            </div>

            {/* Expandable Game Grid */}
            {expanded && (
                <section className="mt-32 mb-40 animate-in fade-in slide-in-from-top-4 duration-500">
                    <div className="mb-14 flex items-end justify-between border-b border-gray-100 pb-8">
                        <div>
                            <h4 className="text-[10px] font-bold uppercase tracking-widest text-blue-500 mb-1">
                                Live Dashboard
                            </h4>
                            <p className="text-5xl font-display leading-none text-gray-900">
                                Active <span className="text-gray-400 italic">Matchups</span>
                            </p>
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
