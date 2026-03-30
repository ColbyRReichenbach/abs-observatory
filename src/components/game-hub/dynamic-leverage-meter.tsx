"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";

import { formatLeverageBucketLabel, summarizeEstimatedLeverage } from "@/lib/estimated-leverage";

function polarToCartesian(cx: number, cy: number, radius: number, angleInDegrees: number) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
  return {
    x: cx + radius * Math.cos(angleInRadians),
    y: cy + radius * Math.sin(angleInRadians),
  };
}

function describeArc(cx: number, cy: number, radius: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, radius, endAngle);
  const end = polarToCartesian(cx, cy, radius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";

  return ["M", start.x, start.y, "A", radius, radius, 0, largeArcFlag, 0, end.x, end.y].join(" ");
}

export function DynamicLeverageMeter({
  homeScore = 0,
  awayScore = 0,
  inning = 1,
  balls = 0,
  strikes = 0,
  outs = 0,
  basesState = null,
  homeColor = "#3b82f6",
  awayColor = "#8b5cf6",
}: {
  homeScore?: number;
  awayScore?: number;
  inning?: number;
  balls?: number;
  strikes?: number;
  outs?: number;
  basesState?: string | null;
  homeColor?: string;
  awayColor?: string;
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
  const progressAngle = 180 * Math.max(0, Math.min(leverage.estimatedLeverageIndex, 100)) / 100;
  const trackPath = describeArc(180, 176, 118, 180, 0);
  const valuePath = describeArc(180, 176, 118, 180, 180 - progressAngle);

  return (
    <div className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-[2rem] bg-gradient-to-br from-blue-50/20 via-white to-red-50/10">
      <motion.div
        animate={{ opacity: [0.2, 0.45, 0.2], scale: [0.98, 1.02, 0.98] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        className="absolute inset-6 rounded-[2rem] border border-blue-500/10 blur-sm"
      />

      <div className="relative flex h-full w-full max-w-[34rem] flex-col items-center justify-center px-6 pb-8 pt-10">
        <div className="relative w-full max-w-[30rem]">
          <svg viewBox="0 0 360 230" className="h-auto w-full overflow-visible">
            <path d={trackPath} fill="none" stroke="#eef2ff" strokeWidth="24" strokeLinecap="round" />
            <path d={valuePath} fill="none" stroke={homeColor} strokeWidth="24" strokeLinecap="round" />
          </svg>

          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center pt-10 text-center">
            <span className="text-[10px] font-black uppercase tracking-[0.24em] text-gray-400">Estimated Leverage</span>
            <div className="mt-2 flex items-baseline gap-2">
              <motion.span
                key={leverage.estimatedLeverageIndex}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-7xl font-display leading-none text-gray-900"
              >
                {leverage.estimatedLeverageIndex}
              </motion.span>
              <span className="text-2xl font-black uppercase tracking-[0.12em] text-gray-300">ELI</span>
            </div>
            <p className="mt-3 text-sm font-semibold text-gray-500">
              {formatLeverageBucketLabel(leverage.leverageBucket)} through inning {inning}
            </p>
            <p className="mt-2 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
              {leaderLabel} • Count {balls}-{strikes} • {outs} out{outs === 1 ? "" : "s"}
            </p>
          </div>
        </div>

        <div className="mt-1 flex flex-wrap items-center justify-center gap-5">
          <LegendDot color={awayColor} label={`Away (${awayScore})`} />
          <LegendDot color={homeColor} label={`Home (${homeScore})`} />
        </div>
      </div>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
      <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">{label}</span>
    </div>
  );
}
