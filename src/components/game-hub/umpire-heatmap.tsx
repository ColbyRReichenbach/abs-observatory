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
    // In a real iteration, we'd map intelligence zones directly to matrix coordinates.
    // Using highZoneAccuracy / lowZoneAccuracy heuristics to simulate a thermal overlay here.
    const highRatio = intel.umpireTendency.highZoneAccuracy;
    const lowRatio = intel.umpireTendency.lowZoneAccuracy;

    // We map a "hotter" red opacity if the umpire is less accurate (more blown calls)
    const highGlowIntensity = Math.max(0, (1 - highRatio) * 4); // Max blown
    const lowGlowIntensity = Math.max(0, (1 - lowRatio) * 4);

    return (
        <div className="flex flex-col h-full bg-slate-50 border border-gray-100 rounded-3xl overflow-hidden shadow-inner">
            <div className="flex-1 p-12 relative flex items-center justify-center min-h-[500px]">
                <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full max-w-[420px]">
                    <defs>
                        {/* Base Field radial */}
                        <radialGradient id="fieldGlow" cx="50%" cy="50%" r="50%">
                            <stop offset="0%" stopColor="rgba(59,130,246,0.02)" />
                            <stop offset="100%" stopColor="transparent" />
                        </radialGradient>

                        {/* High Zone Error Glow */}
                        <radialGradient id="highError" cx="50%" cy="10%">
                            <stop offset="0%" stopColor={`rgba(239,68,68,${highGlowIntensity})`} />
                            <stop offset="100%" stopColor="transparent" />
                        </radialGradient>

                        {/* Low Zone Error Glow */}
                        <radialGradient id="lowError" cx="50%" cy="90%">
                            <stop offset="0%" stopColor={`rgba(239,68,68,${lowGlowIntensity})`} />
                            <stop offset="100%" stopColor="transparent" />
                        </radialGradient>
                    </defs>

                    {/* Background glow */}
                    <rect x="0" y="0" width={WIDTH} height={HEIGHT} fill="url(#fieldGlow)" />

                    {/* Thermal Zones Overlay */}
                    <rect x={ZONE_X} y={ZONE_Y - 50} width={ZONE_W} height={ZONE_H / 2} fill="url(#highError)" />
                    <rect x={ZONE_X} y={ZONE_Y + (ZONE_H / 2) + 50} width={ZONE_W} height={ZONE_H / 2} fill="url(#lowError)" />

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
