"use client";

import { motion } from "framer-motion";

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
    teamColor = "#007aff",
}: {
    data: HeatmapData[];
    teamColor?: string;
}) {
    // Determine the max volume for opacity scaling
    const maxVolume = Math.max(...data.map(d => d.challenges), 1);

    // Create a quick lookup dictionary
    const zoneMap: Record<string, HeatmapData> = {};
    data.forEach(d => {
        zoneMap[d.zone] = d;
    });

    return (
        <div className="relative w-full max-w-[320px] aspect-[4/5] mx-auto p-4 flex flex-col items-center justify-center">
            {/* Visual indicator of the plate at the bottom */}
            <div className="absolute bottom-0 w-3/4 h-4 bg-gray-200" style={{ clipPath: "polygon(0 0, 100% 0, 85% 100%, 15% 100%)" }} />

            <div className="relative w-full h-full border-2 border-[var(--ink-4)] grid grid-rows-3 grid-cols-3 z-10 bg-white/5 backdrop-blur-sm shadow-inner rounded-md overflow-hidden">
                {ZONE_LAYOUT.flatMap((row, r) =>
                    row.map((zoneKey, c) => {
                        const cellData = zoneMap[zoneKey];
                        const volume = cellData?.challenges || 0;
                        const rate = cellData?.overturnRate || 0;

                        // Relative opacity based on volume (min 0.05 so it's visible, max 0.8)
                        const opacity = volume > 0 ? Math.max(0.1, (volume / maxVolume) * 0.8) : 0;

                        // Color scale based on accuracy
                        let gradientClass = "from-gray-400 to-gray-500";
                        if (volume > 0) {
                            if (rate >= 0.6) gradientClass = "from-emerald-400 to-emerald-500";
                            else if (rate >= 0.4) gradientClass = "from-amber-400 to-amber-500";
                            else gradientClass = "from-red-400 to-red-500";
                        }

                        return (
                            <motion.div
                                key={zoneKey}
                                initial={{ opacity: 0, scale: 0.9 }}
                                whileInView={{ opacity: 1, scale: 1 }}
                                viewport={{ once: true }}
                                transition={{ delay: (r * 3 + c) * 0.05 }}
                                className={`relative border border-[var(--ink-4)] flex flex-col items-center justify-center group overflow-hidden ${volume === 0 ? "bg-[var(--ink-5)] text-transparent" : "bg-[var(--ink-5)] cursor-default"}`}
                            >
                                {/* The colored overlay showing heatmap intensity */}
                                <div
                                    className={`absolute inset-0 bg-gradient-to-br ${gradientClass} transition-opacity duration-500 ease-out`}
                                    style={{ opacity }}
                                />

                                {/* Numbers overlaid on top */}
                                {volume > 0 && (
                                    <div className="relative z-10 flex flex-col items-center text-center">
                                        <span className={`text-2xl font-display tracking-tighter ${rate >= 0.5 ? "text-white" : "text-gray-900"} drop-shadow-md`}>
                                            {(rate * 100).toFixed(0)}%
                                        </span>
                                        <span className={`text-[9px] font-black uppercase tracking-widest ${rate >= 0.5 ? "text-white/80" : "text-gray-900/60"}`}>
                                            {volume} CHL
                                        </span>
                                    </div>
                                )}

                                {/* Hover Glass effect for detail */}
                                {volume > 0 && (
                                    <div className="absolute inset-x-0 bottom-0 top-auto translate-y-full group-hover:translate-y-0 transition-transform bg-black/80 backdrop-blur-md p-1.5 flex flex-col items-center justify-center h-1/2">
                                        <span className="text-[8px] font-semibold text-white/50 uppercase tracking-widest leading-tight">Successful</span>
                                        <span className="text-xs font-mono font-bold text-white">{Math.round(rate * volume)}</span>
                                    </div>
                                )}
                            </motion.div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
