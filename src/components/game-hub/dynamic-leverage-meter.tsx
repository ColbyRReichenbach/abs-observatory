"use client";

import { useId, useMemo } from "react";
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
    const gradientId = useId().replace(/:/g, "");
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
    const percentage = Math.max(0, Math.min(100, leverage.estimatedLeverageIndex));
    const size = 360;
    const radius = 124;
    const circumference = Math.PI * radius;
    const dashOffset = circumference * (1 - percentage / 100);

    return (
        <div className="relative flex h-full w-full flex-col items-center justify-between px-4 pb-6 pt-4">

            <motion.div
                animate={{ opacity: [0.3, 0.6, 0.3], scale: [0.98, 1.02, 0.98] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="absolute inset-x-10 top-10 h-64 rounded-full border border-blue-500/15 blur-md"
            />

            <div className="relative flex min-h-[280px] w-full flex-1 items-center justify-center">
                <svg
                    viewBox={`0 0 ${size} ${size / 2 + 40}`}
                    className="w-full max-w-[30rem] overflow-visible"
                    aria-hidden="true"
                >
                    <defs>
                        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor={awayColor} />
                            <stop offset="100%" stopColor={homeColor} />
                        </linearGradient>
                    </defs>
                    <path
                        d={describeArc(size / 2, size / 2, radius, 180, 90)}
                        fill="none"
                        stroke={withAlpha(awayColor, 0.16)}
                        strokeWidth="30"
                        strokeLinecap="round"
                    />
                    <path
                        d={describeArc(size / 2, size / 2, radius, 90, 0)}
                        fill="none"
                        stroke={withAlpha(homeColor, 0.16)}
                        strokeWidth="30"
                        strokeLinecap="round"
                    />
                    <path
                        d={describeArc(size / 2, size / 2, radius, 180, 0)}
                        fill="none"
                        stroke="#f8fafc"
                        strokeWidth="30"
                        strokeLinecap="round"
                    />
                    <motion.path
                        d={describeArc(size / 2, size / 2, radius, 180, 0)}
                        fill="none"
                        stroke={`url(#${gradientId})`}
                        strokeWidth="30"
                        strokeLinecap="round"
                        strokeDasharray={circumference}
                        initial={{ strokeDashoffset: circumference }}
                        animate={{ strokeDashoffset: dashOffset }}
                        transition={{ duration: 1.2, ease: "easeOut" }}
                    />
                </svg>
            </div>

            <div className="relative z-10 -mt-4 flex w-full max-w-[26rem] flex-col items-center justify-center rounded-[1.75rem] border border-gray-100 bg-white/95 px-6 py-5 text-center shadow-xl shadow-black/[0.04] backdrop-blur">
                <span className="mb-1 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
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
                <p className="mt-2 text-[12px] font-semibold text-gray-500">
                    {formatLeverageBucketLabel(leverage.leverageBucket)} through inning {inning}
                </p>
                <p className="mt-1 text-[10px] font-black uppercase tracking-[0.16em] text-gray-400">
                    {leaderLabel} • Count {balls}-{strikes} • {outs} out{outs === 1 ? "" : "s"}
                </p>

                <div className="mt-5 flex flex-wrap items-center justify-center gap-4">
                    <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full" style={{ backgroundColor: awayColor }} />
                        <span className="text-[9px] font-bold uppercase tracking-widest text-gray-400">Away ({awayScore})</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full" style={{ backgroundColor: homeColor }} />
                        <span className="text-[9px] font-bold uppercase tracking-widest text-gray-400">Home ({homeScore})</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

function polarToCartesian(centerX: number, centerY: number, radius: number, angleInDegrees: number) {
    const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
    return {
        x: centerX + radius * Math.cos(angleInRadians),
        y: centerY + radius * Math.sin(angleInRadians),
    };
}

function describeArc(x: number, y: number, radius: number, startAngle: number, endAngle: number) {
    const start = polarToCartesian(x, y, radius, endAngle);
    const end = polarToCartesian(x, y, radius, startAngle);
    const largeArcFlag = startAngle - endAngle <= 180 ? "0" : "1";
    return ["M", start.x, start.y, "A", radius, radius, 0, largeArcFlag, 0, end.x, end.y].join(" ");
}

function withAlpha(hex: string, alpha: number) {
    const normalized = hex.trim();
    if (!normalized.startsWith("#") || normalized.length !== 7) return `rgba(59,130,246,${alpha})`;
    const r = Number.parseInt(normalized.slice(1, 3), 16);
    const g = Number.parseInt(normalized.slice(3, 5), 16);
    const b = Number.parseInt(normalized.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
