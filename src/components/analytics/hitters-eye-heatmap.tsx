"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChartTooltip } from "@/components/ui/chart-tooltip";

export type HittersEyeZone = "Top-L" | "Top-M" | "Top-R" | "Mid-L" | "Mid-M" | "Mid-R" | "Bot-L" | "Bot-M" | "Bot-R";

type HeatmapData = {
    zone: HittersEyeZone;
    challenges: number;
    overturnRate: number;
};

const ZONE_LAYOUT: HittersEyeZone[][] = [
    ["Top-L", "Top-M", "Top-R"],
    ["Mid-L", "Mid-M", "Mid-R"],
    ["Bot-L", "Bot-M", "Bot-R"]
];

export function HittersEyeHeatmap({
    data,
    viewMode = "fan",
}: {
    data: { all: HeatmapData[]; offense: HeatmapData[]; defense: HeatmapData[] };
    teamColor?: string;
    viewMode?: "fan" | "org";
}) {
    const [viewSide, setViewSide] = useState<"all" | "offense" | "defense">("all");
    const [hoveredZone, setHoveredZone] = useState<HittersEyeZone | null>(null);
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

    const handleMouseMove = (e: React.MouseEvent) => {
        setMousePos({ x: e.clientX, y: e.clientY });
    };

    const activeData = data[viewSide] || [];
    const maxVolume = Math.max(...activeData.map(d => d.challenges), 1);

    const zoneMap: Record<string, HeatmapData> = {};
    activeData.forEach(d => {
        zoneMap[d.zone] = d;
    });

    return (
        <div className="w-full flex flex-col items-center">
            {/* Filter Toggle */}
            <div className="flex bg-gray-50 border border-gray-100 rounded-full p-1 mb-6 mt-2 relative z-10 shadow-inner">
                {["all", "offense", "defense"].map((side) => (
                    <button
                        key={side}
                        onClick={() => setViewSide(side as "all" | "offense" | "defense")}
                        className={`relative px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-full transition-colors z-10 ${viewSide === side ? "text-white" : "text-gray-400 hover:text-gray-900"}`}
                    >
                        {viewSide === side && (
                            <motion.div
                                layoutId="hitter-eye-bubble"
                                className="absolute inset-0 bg-blue-600 rounded-full -z-10 shadow-md"
                                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                            />
                        )}
                        {side}
                    </button>
                ))}
            </div>

            <div
                className="relative w-full max-w-[320px] aspect-[4/5] p-4 flex flex-col items-center justify-center cursor-crosshair"
                onMouseMove={handleMouseMove}
            >
                {/* Visual indicator of the plate at the bottom */}
                <div className="absolute bottom-0 w-3/4 h-4 bg-gray-200" style={{ clipPath: "polygon(0 0, 100% 0, 85% 100%, 15% 100%)" }} />

                <div className="relative w-full h-full border-2 border-[var(--ink-4)] grid grid-rows-3 grid-cols-3 z-0 bg-white shadow-inner rounded-xl overflow-hidden">
                    {ZONE_LAYOUT.map((row, r) =>
                        row.map((zoneKey, c) => {
                            const cellData = zoneMap[zoneKey];
                            const volume = cellData?.challenges || 0;
                            const rate = cellData?.overturnRate || 0;

                            const isHovered = hoveredZone === zoneKey && volume > 0;

                            let gradientClass = "from-gray-200 to-gray-300";
                            if (volume > 0) {
                                if (rate >= 0.8) gradientClass = "from-emerald-600 to-emerald-700 text-white";
                                else if (rate >= 0.6) gradientClass = "from-emerald-400 to-emerald-500 text-white";
                                else if (rate >= 0.4) gradientClass = "from-amber-400 to-amber-500 text-white";
                                else if (rate >= 0.2) gradientClass = "from-red-400 to-red-500 text-white";
                                else gradientClass = "from-red-600 to-red-700 text-white";
                            }

                            return (
                                <div
                                    key={zoneKey}
                                    onMouseEnter={() => setHoveredZone(zoneKey)}
                                    onMouseLeave={() => setHoveredZone(null)}
                                    className={`relative border border-gray-100 flex flex-col items-center justify-center group ${volume === 0 ? "bg-gray-50 text-transparent" : "bg-white cursor-default"} ${isHovered ? "z-[9999]" : "z-10"}`}
                                >
                                    <div
                                        className={`absolute inset-0 bg-gradient-to-br ${gradientClass} transition-all duration-300 ease-out`}
                                    />

                                    {volume > 0 && (
                                        <div className="relative z-10 flex flex-col items-center text-center pointer-events-none">
                                            <span className="text-[13px] font-mono font-bold drop-shadow-sm">
                                                {(rate * 100).toFixed(0)}%
                                            </span>
                                            <span className="text-[8px] font-black uppercase tracking-widest opacity-80">
                                                {volume} CHL
                                            </span>
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Floating Tooltip Layer */}
                <AnimatePresence>
                    {hoveredZone && zoneMap[hoveredZone] && zoneMap[hoveredZone].challenges > 0 && (
                        <ChartTooltip
                            usePortal
                            portalProps={mousePos}
                            title={`Zone: ${hoveredZone}`}
                            value={zoneMap[hoveredZone].challenges}
                            subValueLabel="Challenges"
                            extra={[
                                { label: "Overturn Rate", value: `${(zoneMap[hoveredZone].overturnRate * 100).toFixed(2)}%` },
                                { label: "Successful", value: Math.round(zoneMap[hoveredZone].overturnRate * zoneMap[hoveredZone].challenges), color: "#10b981" },
                                { label: "Failed", value: zoneMap[hoveredZone].challenges - Math.round(zoneMap[hoveredZone].overturnRate * zoneMap[hoveredZone].challenges), color: "#ef4444" },
                            ]}
                        />
                    )}
                </AnimatePresence>
            </div>

            <p className="text-[10px] text-gray-400 text-center uppercase tracking-[0.2em] font-black mt-6">
                {viewMode === "org" ? (
                    <>
                        Where this lineup challenges
                        {viewSide === "offense" ? " while hitting" : viewSide === "defense" ? " while fielding" : " (overall)"}
                    </>
                ) : (
                    <>
                        Pitch locations challenged
                        {viewSide === "offense" ? " while batting" : viewSide === "defense" ? " on defense" : " (all sides)"}
                    </>
                )}
            </p>
        </div >
    );
}
