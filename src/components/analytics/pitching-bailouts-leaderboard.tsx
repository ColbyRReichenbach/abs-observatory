"use client";

import { motion } from "framer-motion";

type BailoutData = {
    pitcherName: string;
    bailouts: number;
    totalChallenges: number;
};

export function PitchingBailoutsLeaderboard({
    data,
    teamColor = "#007aff",
}: {
    data: BailoutData[];
    teamColor?: string;
}) {
    // Find highest bailout count for scaling bars
    const maxBailouts = Math.max(...data.map(d => d.bailouts), 1);

    if (data.length === 0) {
        return (
            <div className="flex h-40 items-center justify-center text-[10px] font-black uppercase tracking-widest text-[#a1a1aa]">
                No Data Available
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-4">
            {data.map((pitcher, i) => {
                const barWidth = (pitcher.bailouts / maxBailouts) * 100;

                return (
                    <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: i * 0.1 }}
                        key={pitcher.pitcherName}
                        className="group relative flex flex-col justify-center rounded-2xl bg-white border border-[#f4f4f5] p-4 shadow-sm transition-all hover:shadow-md hover:border-[#e4e4e7] overflow-hidden"
                    >
                        {/* The fill bar */}
                        <div
                            className="absolute left-0 top-0 bottom-0 -z-10 transition-all duration-1000 ease-out opacity-10 group-hover:opacity-20"
                            style={{
                                width: `${barWidth}%`,
                                backgroundColor: teamColor
                            }}
                        />

                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-50 text-[10px] font-black text-[#a1a1aa] group-hover:bg-black group-hover:text-white transition-colors">
                                    {i + 1}
                                </span>
                                <span className="font-bold text-[#18181b] group-hover:text-[#2563eb] transition-colors line-clamp-1">
                                    {pitcher.pitcherName}
                                </span>
                            </div>

                            <div className="flex items-center gap-4">
                                <div className="flex flex-col items-end">
                                    <span className="text-[8px] font-black uppercase tracking-widest text-[#a1a1aa]">Strike Calls Won</span>
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-xl font-display text-[#18181b] leading-none">{pitcher.bailouts}</span>
                                        <span className="text-[10px] font-black text-[#d4d4d8]">/ {pitcher.totalChallenges}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                );
            })}
        </div>
    );
}
