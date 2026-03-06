"use client";

import { useMemo } from "react";
import { RadialBarChart, RadialBar, ResponsiveContainer, PolarAngleAxis } from "recharts";
import { motion } from "framer-motion";

export function DynamicLeverageMeter({
    homeScore = 0,
    awayScore = 0,
    inning = 1,
    homeColor = "#3b82f6",
    awayColor = "#8b5cf6"
}: {
    homeScore?: number,
    awayScore?: number,
    inning?: number,
    homeColor?: string,
    awayColor?: string
}) {

    // Simulated active Win Probability calculated from current score diff and inning
    const activeProbability = useMemo(() => {
        const scoreDiff = homeScore - awayScore;
        // Extremely basic mock for probability: base 50, +/- 5% per run diff, accelerated by inning length
        const inningModifier = inning / 9;
        let prob = 50 + (scoreDiff * 5 * (1 + inningModifier));
        return Math.max(5, Math.min(95, prob)); // constrain 5-95%
    }, [homeScore, awayScore, inning]);

    const data = useMemo(() => {
        return [
            { name: 'Away Base', value: 100, fill: '#f3f4f6' }, // Background track
            { name: 'Home Win Prob', value: activeProbability, fill: homeColor },
        ];
    }, [activeProbability, homeColor]);

    return (
        <div className="relative w-full h-full flex flex-col items-center justify-center">

            {/* Decorative Outer Ring Glimmer */}
            <motion.div
                animate={{ opacity: [0.3, 0.6, 0.3], scale: [0.98, 1.02, 0.98] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="absolute inset-x-8 inset-y-8 rounded-full border border-blue-500/20 blur-sm"
            />

            <div className="w-full h-full pb-8">
                <ResponsiveContainer width="100%" height="100%">
                    <RadialBarChart
                        cx="50%"
                        cy="100%"
                        innerRadius="70%"
                        outerRadius="100%"
                        barSize={20}
                        data={data}
                        startAngle={180}
                        endAngle={0}
                    >
                        <PolarAngleAxis
                            type="number"
                            domain={[0, 100]}
                            angleAxisId={0}
                            tick={false}
                        />
                        <RadialBar
                            background={{ fill: '#f8fafc' }}
                            dataKey="value"
                            angleAxisId={0}
                            cornerRadius={10}
                            isAnimationActive={true}
                            animationDuration={1500}
                        />
                    </RadialBarChart>
                </ResponsiveContainer>
            </div>

            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center justify-center text-center">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-1">
                    Live Win Probability
                </span>
                <div className="flex items-baseline gap-1">
                    <motion.span
                        key={activeProbability}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-5xl font-display text-gray-900"
                    >
                        {activeProbability.toFixed(1)}
                    </motion.span>
                    <span className="text-xl font-bold text-gray-400">%</span>
                </div>

                <div className="flex items-center gap-4 mt-6">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: awayColor }} />
                        <span className="text-[9px] font-bold uppercase tracking-widest text-gray-400">Away ({(100 - activeProbability).toFixed(1)}%)</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: homeColor }} />
                        <span className="text-[9px] font-bold uppercase tracking-widest text-gray-400">Home ({activeProbability.toFixed(1)}%)</span>
                    </div>
                </div>
            </div>
        </div>
    )
}
