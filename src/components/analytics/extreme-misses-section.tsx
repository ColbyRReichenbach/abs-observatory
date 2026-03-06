"use client";

import { AlertCircle, Target, ChevronRight } from "lucide-react";
import Link from "next/link";

export function ExtremeMissesSection({ extremes }: { extremes: any[] }) {
    if (!extremes || extremes.length === 0) return null;

    return (
        <section className="mt-12">
            <div className="mb-8 overflow-hidden">
                <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-orange-600 mb-2">Hall of Infamy</h2>
                <p className="text-3xl font-display uppercase tracking-tight text-gray-900">Extreme Miss Highlights</p>
                <p className="text-sm text-gray-500 mt-2">Ranked by distance from the closest point of the strike zone.</p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {extremes.slice(0, 6).map((miss, idx) => (
                    <div
                        key={miss.challengeId}
                        className="panel p-6 bg-white border border-gray-100 shadow-xl shadow-black/[0.02] relative overflow-hidden group hover:scale-[1.02] transition-all"
                    >
                        {/* Heatmap background snippet or just icon */}
                        <div className="absolute -top-4 -right-4 h-24 w-24 rounded-full bg-orange-500/5 blur-xl group-hover:bg-orange-500/10 transition-all" />

                        <div className="flex justify-between items-start mb-6">
                            <div className="flex items-center gap-2">
                                <span className="h-8 w-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center font-black text-xs">#{idx + 1}</span>
                                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Extreme Miss</span>
                            </div>
                            {miss.isOverturned ? (
                                <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 text-[9px] font-black uppercase tracking-widest">Overturned</span>
                            ) : (
                                <span className="px-3 py-1 rounded-full bg-red-50 text-red-600 text-[9px] font-black uppercase tracking-widest">Confirmed</span>
                            )}
                        </div>

                        <div className="mb-6">
                            <p className="text-sm font-bold text-gray-900 mb-1">{miss.calledDescription || "Pitch Event"}</p>
                            <p className="text-[10px] text-gray-400 font-medium">Inning {miss.inning} • {miss.missDistance.toFixed(2)}" from Zone</p>
                        </div>

                        <Link
                            href={`/games/${miss.gamePk}`}
                            className="flex items-center justify-between w-full py-3 px-5 rounded-xl bg-gray-50 text-gray-900 text-[10px] font-black uppercase tracking-widest hover:bg-gray-900 hover:text-white transition-all"
                        >
                            View Breakdown
                            <ChevronRight size={12} />
                        </Link>
                    </div>
                ))}
            </div>
        </section>
    );
}
