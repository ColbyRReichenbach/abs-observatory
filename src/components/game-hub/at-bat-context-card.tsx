"use client";

import { motion } from "framer-motion";
import type { ChallengeEvent } from "@/lib/types";
import { useMemo } from "react";

export function AtBatContextCard({ challenge }: { challenge: ChallengeEvent }) {
    // Simulate Count Delta metrics that would normally come from the mlb data pipeline
    const shiftMetrics = useMemo(() => {
        const wasOverturned = challenge.isOverturned;
        // Example: A Strike overturned to a Ball
        const previousScore = (Math.random() * -0.05).toFixed(3); // e.g -0.021 expected runs
        const newScore = (Math.random() * 0.15 + 0.05).toFixed(3); // e.g +0.134 expected runs

        return {
            previousRunExp: previousScore,
            newRunExp: newScore,
            delta: (parseFloat(newScore) - parseFloat(previousScore)).toFixed(3),
            pitchCount: `${challenge.balls}-${challenge.strikes}`,
            pitchVelocity: challenge.startSpeed ? `${challenge.startSpeed.toFixed(1)} MPH` : "N/A",
            pitchType: challenge.pitchType || "Unknown",
        };
    }, [challenge]);

    return (
        <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden w-full mt-2"
        >
            <div className="bg-white/[0.03] border border-white/10 rounded-xl p-4 ml-4">
                <h5 className="text-[10px] font-black uppercase tracking-widest text-[#9ca3af] mb-3 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500" /> Count Shift Impact
                </h5>

                <div className="grid grid-cols-3 gap-3">
                    <div className="flex flex-col gap-1 p-2 rounded-lg bg-black/10 border border-white/5">
                        <span className="text-[9px] uppercase tracking-wider text-gray-500 font-bold">Pitch</span>
                        <span className="text-xs font-bold text-gray-200">{shiftMetrics.pitchType}</span>
                    </div>
                    <div className="flex flex-col gap-1 p-2 rounded-lg bg-black/10 border border-white/5">
                        <span className="text-[9px] uppercase tracking-wider text-gray-500 font-bold">Velocity</span>
                        <span className="text-xs font-bold text-gray-200">{shiftMetrics.pitchVelocity}</span>
                    </div>
                    <div className="flex flex-col gap-1 p-2 rounded-lg bg-black/10 border border-white/5">
                        <span className="text-[9px] uppercase tracking-wider text-gray-500 font-bold">Count</span>
                        <span className="text-xs font-bold text-gray-200">{shiftMetrics.pitchCount}</span>
                    </div>
                </div>

                {challenge.isOverturned && (
                    <div className="mt-4 pt-3 border-t border-white/5 flex flex-col gap-2">
                        <div className="flex justify-between items-center w-full">
                            <span className="text-[9px] uppercase tracking-wider text-gray-500 font-bold">Expected Runs Shift</span>
                            <span className="text-sm font-black text-emerald-400">+{shiftMetrics.delta}</span>
                        </div>
                        <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500/80 rounded-full" style={{ width: '100%' }} />
                        </div>
                    </div>
                )}
            </div>
        </motion.div>
    );
}
