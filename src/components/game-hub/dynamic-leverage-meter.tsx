"use client";

import { useMemo } from "react";
import { RadialBarChart, RadialBar, ResponsiveContainer, PolarAngleAxis } from "recharts";
import { motion } from "framer-motion";
import { formatLeverageBucketLabel, summarizeEstimatedLeverage } from "@/lib/estimated-leverage";

export function DynamicLeverageMeter({
    homeScore = 0,
    awayScore = 0,
    inning = 1,
    balls = 0,
    strikes = 0,
    outs = 0,
    basesState = null,
    homeColor = "#3b82f6",
    awayColor = "#8b5cf6"
}: {
    homeScore?: number,
    awayScore?: number,
    inning?: number,
    balls?: number,
    strikes?: number,
    outs?: number,
    basesState?: string | null,
    homeColor?: string,
    awayColor?: string
}) {
    const leverage = useMemo(
        () =>
            summarizeEstimatedLeverage({
                inning,
                balls,
                strikes,
                outs,
                basesState,
                homeScore,
                awayScore,
                isOverturned: true,
                impactType: "direct_count_impact",
            }),
        [awayScore, balls, basesState, homeScore, inning, outs, strikes],
    );

    const runDifferential = homeScore - awayScore;
    const leaderLabel = runDifferential === 0 ? "Game tied" : runDifferential > 0 ? "Home leads" : "Away leads";

    const data = useMemo(() => {
        return [
            { name: "Away Base", value: 100, fill: "#f3f4f6" },
            { name: "Estimated Leverage", value: leverage.estimatedLeverageIndex, fill: homeColor },
        ];
    }, [homeColor, leverage.estimatedLeverageIndex]);

    return (
        <div className="relative w-full h-full flex flex-col items-center justify-center">

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
                            background={{ fill: "#f8fafc" }}
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
                    Estimated Leverage
                </span>
                <div className="flex items-baseline gap-1">
                    <motion.span
                        key={leverage.estimatedLeverageIndex}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-5xl font-display text-gray-900"
                    >
                        {leverage.estimatedLeverageIndex}
                    </motion.span>
                    <span className="text-xl font-bold text-gray-400">ELI</span>
                </div>
                <p className="mt-2 text-[11px] font-semibold text-gray-500">
                    {formatLeverageBucketLabel(leverage.leverageBucket)} through inning {inning}
                </p>
                <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-gray-400">
                    {leaderLabel} • Count {balls}-{strikes} • {outs} out{outs === 1 ? "" : "s"}
                </p>

                <div className="flex items-center gap-4 mt-6">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: awayColor }} />
                        <span className="text-[9px] font-bold uppercase tracking-widest text-gray-400">Away ({awayScore})</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: homeColor }} />
                        <span className="text-[9px] font-bold uppercase tracking-widest text-gray-400">Home ({homeScore})</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
