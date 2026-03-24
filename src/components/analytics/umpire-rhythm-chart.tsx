"use client";

import type { UmpirePerformanceDNA } from "@/lib/types";
import { ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, Area, AreaChart } from "recharts";
import { ChartTooltip } from "@/components/ui/chart-tooltip";
import { ClientOnly } from "@/components/ui/client-only";

export function UmpireRhythmChart({ data }: { data: UmpirePerformanceDNA["rhythm"] }) {
    const chartData = data.map((entry) => ({
        ...entry,
        accuracyPct: entry.accuracy * 100,
    }));

    return (
        <div className="mt-6 h-[280px] min-w-0 w-full overflow-hidden sm:h-[300px]">
            <ClientOnly fallback={<div className="h-full w-full" />}>
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={280}>
                    <AreaChart data={chartData} margin={{ top: 18, right: 10, bottom: 26, left: 4 }}>
                        <defs>
                            <linearGradient id="rhythmGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis
                            dataKey="inning"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 10, fontWeight: 700, fill: "#94a3b8" }}
                            tickMargin={10}
                            label={{ value: 'INNING', position: 'bottom', offset: 4, fontSize: 8, fontWeight: 900, fill: '#cbd5e1' }}
                        />
                        <YAxis
                            domain={[0, 100]}
                            ticks={[0, 25, 50, 75, 100]}
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 10, fontWeight: 700, fill: "#94a3b8" }}
                            tickMargin={8}
                            tickFormatter={(v) => `${Math.round(v)}%`}
                        />
                        <Tooltip
                            wrapperStyle={{ zIndex: 10001 }}
                            allowEscapeViewBox={{ x: true, y: true }}
                            content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                    const d = payload[0].payload;
                                    return (
                                        <ChartTooltip
                                            title={`Inning ${d.inning}`}
                                            value={`${d.accuracyPct.toFixed(1)}%`}
                                            subValueLabel="Accuracy"
                                            extra={[{ label: "Samples", value: d.total }]}
                                        />
                                    );
                                }
                                return null;
                            }}
                        />
                        <Area
                            type="monotone"
                            dataKey="accuracyPct"
                            stroke="#3b82f6"
                            strokeWidth={3}
                            fillOpacity={1}
                            fill="url(#rhythmGradient)"
                            animationDuration={1500}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </ClientOnly>
        </div>
    );
}
