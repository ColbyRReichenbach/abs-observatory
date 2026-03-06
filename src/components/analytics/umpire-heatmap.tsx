"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";

export function UmpireHeatmap({
    zoneBuckets,
    size = 300
}: {
    zoneBuckets: Array<{ zone: string, challenges: number, overturnRate: number }>,
    size?: number
}) {
    // Map our zones (up, down, glove, arm) to a 2x2 grid for simplicity or a more complex 3x3 if needed
    // Current buckets are: up, down, glove, arm

    const getRate = (z: string) => zoneBuckets.find(b => b.zone === z)?.overturnRate ?? 0;
    const getChallenges = (z: string) => zoneBuckets.find(b => b.zone === z)?.challenges ?? 0;

    const getColor = (rate: number) => {
        if (rate >= 0.6) return "rgba(239, 68, 68, 0.4)"; // Red
        if (rate >= 0.4) return "rgba(245, 158, 11, 0.4)"; // Amber
        if (rate >= 0.2) return "rgba(59, 130, 246, 0.4)"; // Blue
        return "rgba(16, 185, 129, 0.2)"; // Green (Low risk)
    };

    return (
        <div className="relative flex items-center justify-center p-8 bg-slate-50/50 rounded-[2.5rem] border border-gray-100 shadow-inner overflow-hidden">
            <div
                className="relative border-4 border-gray-900/10 rounded-2xl bg-white shadow-2xl flex flex-col"
                style={{ width: size, height: size * 1.2 }}
            >
                {/* Top Half */}
                <div className="flex-1 flex border-b-2 border-dashed border-gray-100">
                    {/* Top Glove (Up-Left) */}
                    <div
                        className="flex-1 flex flex-col items-center justify-center transition-colors duration-500 border-r-2 border-dashed border-gray-100 group"
                        style={{ backgroundColor: getColor(getRate('up') * 0.8 + getRate('glove') * 0.2) }}
                    >
                        <span className="text-[10px] font-black opacity-40 group-hover:opacity-100 uppercase">Up-Glove</span>
                    </div>
                    {/* Top Arm (Up-Right) */}
                    <div
                        className="flex-1 flex flex-col items-center justify-center transition-colors duration-500 group"
                        style={{ backgroundColor: getColor(getRate('up') * 0.8 + getRate('arm') * 0.2) }}
                    >
                        <span className="text-[10px] font-black opacity-40 group-hover:opacity-100 uppercase">Up-Arm</span>
                    </div>
                </div>

                {/* Bottom Half */}
                <div className="flex-1 flex">
                    {/* Bottom Glove (Down-Left) */}
                    <div
                        className="flex-1 flex flex-col items-center justify-center transition-colors duration-500 border-r-2 border-dashed border-gray-100 group"
                        style={{ backgroundColor: getColor(getRate('down') * 0.8 + getRate('glove') * 0.2) }}
                    >
                        <span className="text-[10px] font-black opacity-40 group-hover:opacity-100 uppercase">Down-Glove</span>
                    </div>
                    {/* Bottom Arm (Down-Right) */}
                    <div
                        className="flex-1 flex flex-col items-center justify-center transition-colors duration-500 group"
                        style={{ backgroundColor: getColor(getRate('down') * 0.8 + getRate('arm') * 0.2) }}
                    >
                        <span className="text-[10px] font-black opacity-40 group-hover:opacity-100 uppercase">Down-Arm</span>
                    </div>
                </div>

                {/* Home Plate Icon */}
                <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-16 h-8 bg-white border border-gray-200 clip-path-plate shadow-sm" style={{ clipPath: 'polygon(0% 0%, 100% 0%, 100% 60%, 50% 100%, 0% 60%)' }} />
            </div>

            <div className="absolute bottom-6 right-6 flex flex-col gap-2">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-red-500" />
                    <span className="text-[8px] font-black uppercase text-gray-400 tracking-tighter">High Overturn</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="text-[8px] font-black uppercase text-gray-400 tracking-tighter">Low Overturn</span>
                </div>
            </div>
        </div>
    );
}
