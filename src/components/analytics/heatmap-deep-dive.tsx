"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Maximize2, X, Info } from "lucide-react";
import { StrikeZonePlot } from "@/components/strike-zone-plot";
import { ChallengeEvent } from "@/lib/types";

export function HeatmapDeepDive({
    challenges,
    umpireName
}: {
    challenges: ChallengeEvent[],
    umpireName: string
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const insight = useMemo(() => buildHeatmapInsight(challenges), [challenges]);

    return (
        <>
            <motion.button
                onClick={() => setIsOpen(true)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full mt-6 py-4 rounded-2xl border border-blue-100 bg-blue-50/50 text-blue-600 text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all flex items-center justify-center gap-3 group"
            >
                <Maximize2 size={14} className="group-hover:rotate-12 transition-transform" />
                Enter Deep Dive Explorer
            </motion.button>

            <AnimatePresence>
                {isOpen && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 md:p-8">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsOpen(false)}
                            className="absolute inset-0 bg-gray-950/80 backdrop-blur-xl"
                        />

                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="relative w-full max-w-6xl h-[90vh] bg-white rounded-[3rem] shadow-2xl flex flex-col md:flex-row overflow-hidden border border-white/20"
                        >
                            <motion.button
                                onClick={() => setIsOpen(false)}
                                whileTap={{ scale: 0.9 }}
                                className="absolute top-6 right-6 p-3 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-black transition-all z-10 shadow-lg"
                            >
                                <X size={20} />
                            </motion.button>

                            {/* Sidebar Info */}
                            <div className="md:w-80 bg-slate-50 border-r border-gray-100 p-8 overflow-y-auto custom-scrollbar">
                                <div className="mb-8">
                                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-blue-500 mb-1">
                                        Deep Dive Analysis
                                    </h4>
                                    <p className="text-3xl font-display leading-tight text-gray-900">
                                        Zone <span className="text-gray-400 italic">Personality</span>
                                    </p>
                                </div>

                                <div className="space-y-6">
                                    <div className="p-5 rounded-2xl bg-white border border-gray-100 shadow-sm">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Dataset Size</p>
                                        <p className="text-2xl font-black text-gray-900">{challenges.length} <span className="text-sm font-bold text-gray-300">Challenges</span></p>
                                    </div>

                                    <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-100 shadow-sm relative overflow-hidden">
                                        <Info size={12} className="absolute top-3 right-3 text-emerald-300" />
                                        <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 mb-2">Zone Summary</p>
                                        <p className="text-xs font-semibold text-emerald-800 leading-relaxed">
                                            {insight}
                                        </p>
                                    </div>
                                </div>

                                <div className="mt-12">
                                    <p className="text-[9px] font-black uppercase tracking-[0.3em] text-gray-400 mb-4">Legend & Toggles</p>
                                    <div className="grid gap-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-3 h-3 rounded-full bg-emerald-500" />
                                            <span className="text-[10px] font-black uppercase text-gray-600">Ball {`->`} Strike OT</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="w-3 h-3 rounded-full bg-amber-500" />
                                            <span className="text-[10px] font-black uppercase text-gray-600">Strike {`->`} Ball OT</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Central Plot */}
                            <div className="flex-1 relative bg-slate-50 p-6 md:p-12 overflow-hidden flex items-center justify-center">
                                <div className="w-full max-w-[500px] h-full">
                                    <StrikeZonePlot
                                        challenges={challenges}
                                        selectedChallengeId={selectedId}
                                        onSelectChallenge={(id) => setSelectedId(id)}
                                    />
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </>
    );
}

function buildHeatmapInsight(challenges: ChallengeEvent[]) {
    const buckets = new Map<string, { label: string; total: number; overturned: number }>();

    for (const challenge of challenges) {
        if (challenge.px === null || challenge.pz === null) continue;
        const zoneMid = challenge.strikeZoneTop !== null && challenge.strikeZoneBottom !== null
            ? (challenge.strikeZoneTop + challenge.strikeZoneBottom) / 2
            : 2.5;
        const vertical = challenge.pz >= zoneMid ? "upper" : "lower";
        const horizontal = challenge.px >= 0 ? "right" : "left";
        const key = `${vertical}-${horizontal}`;
        const existing = buckets.get(key) ?? { label: `${vertical} ${horizontal}`, total: 0, overturned: 0 };
        existing.total += 1;
        if (challenge.isOverturned) existing.overturned += 1;
        buckets.set(key, existing);
    }

    const ranked = [...buckets.values()].sort((a, b) => b.total - a.total);
    const busiest = ranked[0];
    if (!busiest) {
        return "No tracked pitch locations are available for this heatmap yet.";
    }

    const overturnRate = busiest.total > 0 ? (busiest.overturned / busiest.total) * 100 : 0;
    return `Most challenged area: ${busiest.label} quadrant with ${busiest.total} tracked pitches. ${overturnRate.toFixed(0)}% of those challenges were overturned.`;
}
