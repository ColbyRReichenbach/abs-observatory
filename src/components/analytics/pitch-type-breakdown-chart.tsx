"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import type { UmpirePitchTypeBreakdown } from "@/lib/types";
import { ChartTooltip } from "@/components/ui/chart-tooltip";
import { buildLinearAxis, formatPercentTick } from "@/components/analytics/chart-axis";

const PITCH_COLORS: Record<string, string> = {
    FF: "#ef4444", // 4-Seam Fastball
    SI: "#f97316", // Sinker
    FC: "#f59e0b", // Cutter
    SL: "#3b82f6", // Slider
    CU: "#8b5cf6", // Curveball
    CH: "#10b981", // Changeup
    FS: "#06b6d4", // Splitter
    KC: "#a855f7", // Knuckle Curve
    ST: "#ec4899", // Sweeper
    SV: "#6366f1", // Slurve
    UN: "#9ca3af", // Unknown
};

function getColor(code: string): string {
    return PITCH_COLORS[code] ?? "#6b7280";
}

/**
 * D-8: Horizontal bar chart showing overturn rate per pitch type.
 */
export function PitchTypeBreakdownChart({ data }: { data: UmpirePitchTypeBreakdown[] }) {
    if (data.length === 0) {
        return (
            <div className="panel bg-white p-8 text-center text-gray-400 text-sm font-medium">
                No pitch type data available for the selected range.
            </div>
        );
    }

    const chartData = data.map((d) => ({
        name: d.pitchTypeName,
        code: d.pitchTypeCode,
        overturnRate: d.overturnRate * 100,
        challenged: d.challengedCount,
        overturned: d.overturnedCount,
    }));
    const xAxis = buildLinearAxis(chartData.map((d) => d.overturnRate), {
        step: 10,
        padding: 5,
        min: 0,
        max: 100,
        minSpan: 20,
    });

    return (
        <section className="panel bg-white p-8">
            <div className="mb-6">
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-blue-500 mb-1">
                    Pitch Breakdown
                </h4>
                <p className="text-2xl font-display leading-none text-gray-900">
                    Overturn Rate <span className="text-gray-400 italic">by Pitch Type</span>
                </p>
            </div>

            <ResponsiveContainer width="100%" height={Math.max(180, chartData.length * 44)}>
                <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 40, top: 4, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
                    <XAxis
                        type="number"
                        domain={xAxis.domain}
                        ticks={xAxis.ticks}
                        tickFormatter={(v: number) => formatPercentTick(v)}
                        tick={{ fontSize: 10, fill: "#9ca3af" }}
                        axisLine={false}
                        tickLine={false}
                    />
                    <YAxis
                        type="category"
                        dataKey="name"
                        width={100}
                        tick={{ fontSize: 11, fill: "#374151", fontWeight: 700 }}
                        axisLine={false}
                        tickLine={false}
                    />
                    <Tooltip
                        wrapperStyle={{ zIndex: 10001 }}
                        allowEscapeViewBox={{ x: true, y: true }}
                        cursor={{ fill: "rgba(59,130,246,0.04)" }}
                        content={({ active, payload }) => {
                            if (!active || !payload?.[0]) return null;
                            const d = payload[0].payload as (typeof chartData)[number];
                            return (
                                <ChartTooltip
                                    title={`${d.name} (${d.code})`}
                                    value={`${d.overturnRate.toFixed(2)}%`}
                                    subValueLabel="Overturn Rate"
                                    extra={[
                                        { label: "Challenged", value: d.challenged },
                                        { label: "Overturned", value: d.overturned },
                                    ]}
                                />
                            );
                        }}
                    />
                    <Bar dataKey="overturnRate" radius={[0, 6, 6, 0]} barSize={22}>
                        {chartData.map((entry) => (
                            <Cell key={entry.code} fill={getColor(entry.code)} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>

            {/* Legend chips */}
            <div className="mt-4 flex flex-wrap gap-2">
                {chartData.map((d) => (
                    <span key={d.code} className="inline-flex items-center gap-1.5 rounded-full border border-gray-100 bg-gray-50 px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-gray-500">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: getColor(d.code) }} />
                        {d.code} · {d.challenged}
                    </span>
                ))}
            </div>
        </section>
    );
}
