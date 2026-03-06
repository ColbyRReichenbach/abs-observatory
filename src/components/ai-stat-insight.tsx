"use client";

import { BarChart2, TrendingDown, TrendingUp, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import { ExpandableAiBSButton } from "@/components/ui/aibs-icon";

type AIStatInsightProps = {
    batterName: string;
    pitcherName: string;
    verdict: string;
    impactDescription: string;
    splitData: {
        label: string;
        before: string;
        after: string;
        trend: "up" | "down";
    };
};

export function AIStatInsight({ batterName, verdict, impactDescription, splitData }: AIStatInsightProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 p-5 rounded-2xl bg-gradient-to-br from-blue-600/10 to-purple-600/10 border border-blue-500/20 shadow-xl"
        >
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <ExpandableAiBSButton
                        size={16}
                        color="#ffffff"
                        bgColor="bg-black"
                        textColor="text-white"
                        direction="right"
                        className="h-8 shadow-lg shadow-black/10 z-10"
                    />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400">AI Contextual Analysis</span>
                </div>
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/10 border border-white/10">
                    <CheckCircle2 size={10} className="text-emerald-400" />
                    <span className="text-[8px] font-bold text-emerald-400 uppercase">Verified Data Tag</span>
                </div>
            </div>

            <p className="text-xs font-serif italic text-gray-300 leading-relaxed mb-6 ps-3 border-s-2 border-blue-500/30">
                "{impactDescription}"
            </p>

            <div className="grid grid-cols-1 gap-3">
                <div className="bg-white/5 rounded-xl p-4 border border-white/5 group hover:bg-white/10 transition-all">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex flex-col">
                            <span className="text-[9px] font-black uppercase tracking-widest text-gray-500">{splitData.label}</span>
                            <span className="text-sm font-black text-white">{batterName}</span>
                        </div>
                        <BarChart2 size={16} className="text-gray-600 group-hover:text-blue-400 transition-colors" />
                    </div>

                    <div className="flex items-end justify-between">
                        <div className="flex flex-col">
                            <span className="text-[8px] font-bold uppercase text-gray-500">Before Call</span>
                            <span className="text-lg font-mono font-bold text-gray-400">{splitData.before}</span>
                        </div>
                        <div className="flex flex-col items-center px-4">
                            <div className={`p-1.5 rounded-full ${splitData.trend === 'up' ? 'bg-emerald-500/20' : 'bg-red-500/20'}`}>
                                {splitData.trend === 'up' ? <TrendingUp size={12} className="text-emerald-400" /> : <TrendingDown size={12} className="text-red-400" />}
                            </div>
                        </div>
                        <div className="text-right flex flex-col">
                            <span className="text-[8px] font-bold uppercase text-gray-500">After {verdict}</span>
                            <span className={`text-2xl font-mono font-black ${splitData.trend === 'up' ? 'text-emerald-400' : 'text-red-400'}`}>{splitData.after}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-6 flex items-center justify-between border-t border-white/5 pt-4">
                <span className="text-[8px] font-black uppercase tracking-widest text-gray-500">Community Accuracy Vote</span>
                <div className="flex gap-2">
                    <button className="px-3 py-1 rounded-lg bg-emerald-500/10 text-emerald-500 text-[9px] font-black border border-emerald-500/20 hover:bg-emerald-500/20 transition-all">ACCURATE • 42</button>
                    <button className="px-3 py-1 rounded-lg bg-red-500/10 text-red-500 text-[9px] font-black border border-red-500/20 hover:bg-red-500/20 transition-all">DISPUTE • 2</button>
                </div>
            </div>

            <button className="mt-4 w-full py-2 bg-blue-600 text-white text-[9px] font-black uppercase tracking-[0.2em] rounded-xl shadow-lg shadow-blue-600/20 hover:bg-blue-500 transition-all">
                Utilize Stat in Draft
            </button>
        </motion.div>
    );
}
