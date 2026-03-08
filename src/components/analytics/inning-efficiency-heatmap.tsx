"use client";

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
};

/**
 * 9 rows (innings 1–9) × 2 columns (Offensive / Defensive).
 * Cell background interpolated between teamSecondary (cold) and teamPrimary (hot).
 */
export function InningEfficiencyHeatmap({ data, teamPrimary, teamSecondary }: Props) {
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
        <div className="panel p-6 shadow-2xl shadow-black/[0.02] border border-gray-50">
            <div className="mb-6">
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-blue-500 mb-1">
                    Inning Breakdown
                </h4>
                <p className="text-2xl font-display leading-none text-gray-900">
                    Efficiency <span className="text-gray-400">Heatmap</span>
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
                        const bgColor = cell.overturnRate >= 0.5 ? teamPrimary : teamSecondary;
                        const opacity = getOpacity(cell.overturnRate);
                        return (
                            <div
                                key={cat}
                                className="group relative flex h-8 items-center justify-center rounded-md transition-all hover:scale-105 cursor-default"
                                style={{ backgroundColor: bgColor, opacity }}
                            >
                                <span className="text-[10px] font-mono font-bold text-white drop-shadow-sm">
                                    {(cell.overturnRate * 100).toFixed(0)}%
                                </span>
                                {/* Hover tooltip */}
                                <div className="pointer-events-none absolute -top-20 left-1/2 z-20 -translate-x-1/2 opacity-0 transition-opacity group-hover:opacity-100">
                                    <ChartTooltip
                                        title={`Inning ${inning} — ${cat}`}
                                        value={`${(cell.overturnRate * 100).toFixed(1)}%`}
                                        label={`${cell.sampleSize} challenges`}
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>
            ))}
        </div>
    );
}
