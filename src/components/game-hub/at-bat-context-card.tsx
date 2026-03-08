"use client";

import { motion } from "framer-motion";
import type { ChallengeEvent } from "@/lib/types";

export function AtBatContextCard({ challenge }: { challenge: ChallengeEvent }) {
    const pitchVelocity = challenge.startSpeed ? `${challenge.startSpeed.toFixed(1)} MPH` : "N/A";
    const pitchType = challenge.pitchType || "Unknown";
    const countSnapshot = challenge.countBefore ?? (challenge.balls !== null && challenge.strikes !== null ? `${challenge.balls}-${challenge.strikes}` : "Unavailable");
    const countChange = challenge.umpireCount && challenge.countAfter
        ? challenge.umpireCount === challenge.countAfter
            ? challenge.countAfter
            : `${challenge.umpireCount} → ${challenge.countAfter}`
        : countSnapshot;
    const location = challenge.px !== null && challenge.pz !== null
        ? `${challenge.px.toFixed(2)} x, ${challenge.pz.toFixed(2)} z`
        : "Location unavailable";

    return (
        <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden w-full mt-2"
        >
            <div className="bg-gray-100/50 border border-gray-200/50 rounded-xl p-4 ml-4">
                <h5 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500" /> Challenge Context
                </h5>

                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                    <div className="flex flex-col gap-1 p-2 rounded-lg bg-white/50 border border-gray-200/50">
                        <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold">Pitch</span>
                        <span className="text-xs font-bold text-slate-900">{pitchType}</span>
                    </div>
                    <div className="flex flex-col gap-1 p-2 rounded-lg bg-white/50 border border-gray-200/50">
                        <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold">Velocity</span>
                        <span className="text-xs font-bold text-slate-900">{pitchVelocity}</span>
                    </div>
                    <div className="flex flex-col gap-1 p-2 rounded-lg bg-white/50 border border-gray-200/50">
                        <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold">Count Change</span>
                        <span className="text-xs font-bold text-slate-900">{countChange}</span>
                    </div>
                    <div className="flex flex-col gap-1 p-2 rounded-lg bg-white/50 border border-gray-200/50">
                        <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold">Location</span>
                        <span className="text-xs font-bold text-slate-900">{location}</span>
                    </div>
                </div>

                {challenge.impactSummary ? (
                    <div className="mt-4 border-t border-gray-200/50 pt-3">
                        <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold">Recorded Impact</span>
                        <p className="mt-1 text-xs font-medium leading-relaxed text-slate-600">{challenge.impactSummary}</p>
                    </div>
                ) : null}
            </div>
        </motion.div>
    );
}
