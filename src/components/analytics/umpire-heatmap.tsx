"use client";

import { useMemo, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { ChartTooltip } from "@/components/ui/chart-tooltip";

type UmpireZoneBucket = {
    zone: string;
    challenges: number;
    overturnRate: number;
};

const ZONE_CARDS = [
    { zone: "up", label: "Upper Edge" },
    { zone: "arm", label: "Arm Side" },
    { zone: "glove", label: "Glove Side" },
    { zone: "down", label: "Lower Edge" },
] as const;

export function UmpireHeatmap({
    zoneBuckets,
    size = 300
}: {
    zoneBuckets: UmpireZoneBucket[],
    size?: number
}) {
    const [hoveredZone, setHoveredZone] = useState<string | null>(null);
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

    const handleMouseMove = (e: React.MouseEvent) => {
        setMousePos({ x: e.clientX, y: e.clientY });
    };

    const zoneMap = useMemo(() => {
        const map = new Map<string, UmpireZoneBucket>();
        zoneBuckets.forEach((bucket) => {
            map.set(bucket.zone, bucket);
        });
        return map;
    }, [zoneBuckets]);

    const getBucket = (zone: string) =>
        zoneMap.get(zone) ?? { zone, challenges: 0, overturnRate: 0 };

    const getColor = (rate: number) => {
        if (rate >= 0.6) return "rgba(239, 68, 68, 0.4)"; // Red
        if (rate >= 0.4) return "rgba(245, 158, 11, 0.4)"; // Amber
        if (rate >= 0.2) return "rgba(59, 130, 246, 0.4)"; // Blue
        return "rgba(16, 185, 129, 0.2)"; // Green (Low risk)
    };

    return (
        <div
            className="relative flex items-center justify-center p-8 bg-slate-50/50 rounded-[2.5rem] border border-gray-100 shadow-inner overflow-hidden cursor-crosshair"
            onMouseMove={handleMouseMove}
        >
            <div
                className="relative border-4 border-gray-900/10 rounded-2xl bg-white shadow-2xl grid grid-cols-2 gap-2 overflow-hidden p-2"
                style={{ width: size, height: size * 1.2 }}
            >
                {ZONE_CARDS.map(({ zone, label }) => {
                    const bucket = getBucket(zone);
                    return (
                        <div
                            key={zone}
                            className="flex flex-col items-center justify-center rounded-xl transition-colors duration-500 group border border-gray-100/80"
                            style={{ backgroundColor: getColor(bucket.overturnRate) }}
                            onMouseEnter={() => setHoveredZone(zone)}
                            onMouseLeave={() => setHoveredZone(null)}
                        >
                            <span className="text-[10px] font-black opacity-60 group-hover:opacity-100 uppercase text-center px-3">
                                {label}
                            </span>
                            <span className="mt-1 text-xs font-mono font-bold text-gray-900">
                                {(bucket.overturnRate * 100).toFixed(0)}%
                            </span>
                            <span className="mt-1 text-[8px] font-black uppercase tracking-widest text-gray-500">
                                {bucket.challenges} CHL
                            </span>
                        </div>
                    );
                })}

                {/* Home Plate Icon */}
                <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-16 h-8 bg-white border border-gray-200 clip-path-plate shadow-sm" style={{ clipPath: 'polygon(0% 0%, 100% 0%, 100% 60%, 50% 100%, 0% 60%)' }} />
            </div>
            {/* Floating Tooltip Layer */}
            <AnimatePresence>
                {hoveredZone && (
                    <ChartTooltip
                        usePortal
                        portalProps={mousePos}
                        title={`Zone: ${ZONE_CARDS.find((card) => card.zone === hoveredZone)?.label ?? hoveredZone.toUpperCase()}`}
                        value={getBucket(hoveredZone).challenges}
                        subValueLabel="Challenges"
                        extra={[{ label: "Overturn Rate", value: `${(getBucket(hoveredZone).overturnRate * 100).toFixed(2)}%` }]}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}
