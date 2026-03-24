"use client";

import { memo } from "react";
import type { PregameIntel } from "@/lib/types";

const WIDTH = 420;
const HEIGHT = 480;
const ZONE_X = 110;
const ZONE_Y = 110;
const ZONE_W = 200;
const ZONE_H = 230;

export const UmpireHeatmap = memo(function UmpireHeatmap({ intel }: { intel: PregameIntel }) {
    const zoneRate = (bucket: PregameIntel["zoneBriefing"][number]["bucket"]) =>
        intel.zoneBriefing.find((entry) => entry.bucket === bucket)?.overturnRate ?? (1 - intel.umpireTendency.overallAccuracy);

    const topLeft = Math.max(0, zoneRate("up_glove") * 4);
    const topRight = Math.max(0, zoneRate("up_arm") * 4);
    const bottomLeft = Math.max(0, zoneRate("down_glove") * 4);
    const bottomRight = Math.max(0, zoneRate("down_arm") * 4);

    return (
        <div className="flex flex-col w-full bg-slate-50 border border-gray-100 rounded-3xl overflow-hidden shadow-inner">
            <div className="flex-1 p-8 relative flex items-center justify-center">
                <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full max-w-[420px]">
                    <defs>
                        {/* Base Field radial */}
                        <radialGradient id="fieldGlow" cx="50%" cy="50%" r="50%">
                            <stop offset="0%" stopColor="rgba(59,130,246,0.02)" />
                            <stop offset="100%" stopColor="transparent" />
                        </radialGradient>

                        <radialGradient id="topLeftError" cx="30%" cy="20%">
                            <stop offset="0%" stopColor={`rgba(239,68,68,${topLeft})`} />
                            <stop offset="100%" stopColor="transparent" />
                        </radialGradient>
                        <radialGradient id="topRightError" cx="70%" cy="20%">
                            <stop offset="0%" stopColor={`rgba(239,68,68,${topRight})`} />
                            <stop offset="100%" stopColor="transparent" />
                        </radialGradient>
                        <radialGradient id="bottomLeftError" cx="30%" cy="80%">
                            <stop offset="0%" stopColor={`rgba(239,68,68,${bottomLeft})`} />
                            <stop offset="100%" stopColor="transparent" />
                        </radialGradient>
                        <radialGradient id="bottomRightError" cx="70%" cy="80%">
                            <stop offset="0%" stopColor={`rgba(239,68,68,${bottomRight})`} />
                            <stop offset="100%" stopColor="transparent" />
                        </radialGradient>
                    </defs>

                    {/* Background glow */}
                    <rect x="0" y="0" width={WIDTH} height={HEIGHT} fill="url(#fieldGlow)" />

                    {/* Thermal Zones Overlay */}
                    <rect x={ZONE_X} y={ZONE_Y} width={ZONE_W / 2} height={ZONE_H / 2} fill="url(#topLeftError)" />
                    <rect x={ZONE_X + (ZONE_W / 2)} y={ZONE_Y} width={ZONE_W / 2} height={ZONE_H / 2} fill="url(#topRightError)" />
                    <rect x={ZONE_X} y={ZONE_Y + (ZONE_H / 2)} width={ZONE_W / 2} height={ZONE_H / 2} fill="url(#bottomLeftError)" />
                    <rect x={ZONE_X + (ZONE_W / 2)} y={ZONE_Y + (ZONE_H / 2)} width={ZONE_W / 2} height={ZONE_H / 2} fill="url(#bottomRightError)" />

                    {/* Strike zone box outlines */}
                    <rect
                        x={ZONE_X}
                        y={ZONE_Y}
                        width={ZONE_W}
                        height={ZONE_H}
                        fill="none"
                        stroke="rgba(0,0,0,0.15)"
                        strokeWidth="3"
                        rx="8"
                    />

                    {/* Zone grid lines (3x3) */}
                    {[1, 2].map((i) => (
                        <g key={`grid-${i}`}>
                            <line strokeDasharray="4 4" x1={ZONE_X + (ZONE_W / 3) * i} y1={ZONE_Y} x2={ZONE_X + (ZONE_W / 3) * i} y2={ZONE_Y + ZONE_H} stroke="rgba(0,0,0,0.1)" strokeWidth="1" />
                            <line strokeDasharray="4 4" x1={ZONE_X} y1={ZONE_Y + (ZONE_H / 3) * i} x2={ZONE_X + ZONE_W} y2={ZONE_Y + (ZONE_H / 3) * i} stroke="rgba(0,0,0,0.1)" strokeWidth="1" />
                        </g>
                    ))}

                    {/* Home plate marker */}
                    <polygon
                        points={`${WIDTH / 2 - 30},${HEIGHT - 20} ${WIDTH / 2},${HEIGHT} ${WIDTH / 2 + 30},${HEIGHT - 20} ${WIDTH / 2 + 30},${HEIGHT - 35} ${WIDTH / 2 - 30},${HEIGHT - 35}`}
                        fill="white"
                        stroke="rgba(0,0,0,0.2)"
                        strokeWidth="2"
                    />
                </svg>

                {/* Thermal Legend Layer */}
                <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-md px-3 py-2 rounded-xl border border-gray-100 shadow-xl pointer-events-none">
                    <h4 className="text-[9px] font-black uppercase tracking-widest text-gray-500 mb-2 border-b border-gray-100 pb-1">Umpire Miss Tendency</h4>
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded bg-red-500/80" />
                            <span className="text-[10px] font-bold text-gray-700">High Overturn Ratio</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded bg-blue-500/10" />
                            <span className="text-[10px] font-bold text-gray-700">Accurate Ring</span>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
});
