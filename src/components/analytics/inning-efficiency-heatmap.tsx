"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChartTooltip } from "@/components/ui/chart-tooltip";

type HeatmapCell = {
    inning: number;
    category: "Offensive" | "Defensive";
    overturnRate: number;
    sampleSize: number;
};

type Props = {
    data: HeatmapCell[];
    teamPrimary: string;
    teamSecondary: string;
    title?: string;
    accent?: string;
};

/**
 * 9 rows (innings 1–9) × 2 columns (Offensive / Defensive).
 * Cell background interpolated between teamSecondary (cold) and teamPrimary (hot).
 */
export function InningEfficiencyHeatmap({
    data,
    teamPrimary,
    teamSecondary,
    title = "Inning Breakdown",
    accent = "Efficiency Heatmap",
}: Props) {
    const [hoveredCell, setHoveredCell] = useState<{ inning: number; category: "Offensive" | "Defensive" } | null>(null);
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

    const handleMouseMove = (e: React.MouseEvent) => {
        setMousePos({ x: e.clientX, y: e.clientY });
    };

    const innings = [1, 2, 3, 4, 5, 6, 7, 8, 9];

    const getCell = (inning: number, category: "Offensive" | "Defensive") =>
        data.find((d) => d.inning === inning && d.category === category);

    const interpolateColor = (rate: number): string => {
        // 0 = teamSecondary (cold), 1 = teamPrimary (hot)
        const t = Math.max(0, Math.min(1, rate));
        // Simple hex interpolation
        return t > 0.5 ? teamPrimary : teamSecondary;
    };

    const getOpacity = (rate: number): number => {
        return 0.15 + rate * 0.7;
    };

    return (
        <div
            className="panel p-6 shadow-2xl shadow-black/[0.02] border border-gray-50 relative cursor-crosshair"
            onMouseMove={handleMouseMove}
            onMouseLeave={() => setHoveredCell(null)}
        >
            <div className="mb-6">
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-blue-500 mb-1">
                    {title}
                </h4>
                <p className="text-2xl font-display leading-none text-gray-900">
                    {accent.split(" ")[0]} <span className="text-gray-400">{accent.split(" ").slice(1).join(" ") || "Heatmap"}</span>
                </p>
            </div>

            {/* Header */}
            <div className="grid grid-cols-[48px_1fr_1fr] gap-1 mb-1">
                <div />
                <div className="text-center text-[9px] font-black uppercase tracking-[0.14em] text-[var(--ink-3)]">
                    Offensive
                </div>
                <div className="text-center text-[9px] font-black uppercase tracking-[0.14em] text-[var(--ink-3)]">
                    Defensive
                </div>
            </div>

            {/* Grid rows */}
            {innings.map((inning) => (
                <div key={inning} className="grid grid-cols-[48px_1fr_1fr] gap-1 mb-1">
                    <div className="flex items-center justify-center text-[10px] font-bold text-[var(--ink-3)]">
                        {inning}
                    </div>
                    {(["Offensive", "Defensive"] as const).map((cat) => {
                        const cell = getCell(inning, cat);
                        if (!cell || cell.sampleSize === 0) {
                            return (
                                <div
                                    key={cat}
                                    className="flex h-8 items-center justify-center rounded-md border-2 border-dashed border-gray-200"
                                >
                                    <span className="text-[9px] text-[var(--ink-3)]">—</span>
                                </div>
                            );
                        }
                        let bgColor = "rgb(229, 231, 235)"; // gray-200
                        let textColor = "text-gray-900";
                        if (cell.overturnRate >= 0.8) { bgColor = "rgb(5, 150, 105)"; textColor = "text-white"; } // emerald-600
                        else if (cell.overturnRate >= 0.6) { bgColor = "rgb(16, 185, 129)"; textColor = "text-white"; } // emerald-500
                        else if (cell.overturnRate >= 0.4) { bgColor = "rgb(245, 158, 11)"; textColor = "text-white"; } // amber-500
                        else if (cell.overturnRate >= 0.2) { bgColor = "rgb(239, 68, 68)"; textColor = "text-white"; } // red-500
                        else { bgColor = "rgb(185, 28, 28)"; textColor = "text-white"; } // red-700

                        const opacity = 1; // Solid colors for heatmaps as per user request for darker tones
                        return (
                            <div
                                key={cat}
                                onMouseEnter={() => setHoveredCell({ inning, category: cat })}
                                className="group relative flex h-8 items-center justify-center rounded-md transition-all hover:scale-105 hover:z-[10000] cursor-default"
                            >
                                {/* Background layer with dynamic opacity */}
                                <div
                                    className="absolute inset-0 rounded-md"
                                    style={{ backgroundColor: bgColor, opacity }}
                                />
                                {/* Percentage Text */}
                                <span className={`relative z-10 text-[10px] font-mono font-bold drop-shadow-sm ${textColor}`}>
                                    {(cell.overturnRate * 100).toFixed(0)}%
                                </span>
                            </div>
                        );
                    })}
                </div>
            ))}

            {/* Floating Tooltip Layer */}
            <AnimatePresence>
                {hoveredCell && (
                    <>
                        {(() => {
                            const cell = getCell(hoveredCell.inning, hoveredCell.category);
                            if (!cell) return null;
                            return (
                                <ChartTooltip
                                    usePortal
                                    portalProps={mousePos}
                                    title={`Inning ${hoveredCell.inning} — ${hoveredCell.category}`}
                                    value={cell.sampleSize}
                                    subValueLabel="Challenges"
                                    extra={[{ label: "Overturn Rate", value: `${(cell.overturnRate * 100).toFixed(2)}%` }]}
                                />
                            );
                        })()}
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}
