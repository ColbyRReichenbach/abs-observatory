"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import type { UmpireSeasonTrendPoint } from "@/lib/types";

/**
 * D-7: Season-over-season line chart for umpire accuracy trend.
 * Shows overturn rate per season with dot markers and games-worked annotation.
 */
export function SeasonOverSeasonChart({ data }: { data: UmpireSeasonTrendPoint[] }) {
    if (data.length < 2) {
        return (
            <div className="panel bg-white p-8 text-center text-gray-400 text-sm font-medium">
                Insufficient season history for trend analysis.
            </div>
        );
    }

    const chartData = data.map((d) => ({
        season: d.season.toString(),
        overturnRate: Math.round(d.overturnRate * 1000) / 10,
        games: d.gamesWorked,
        challenged: d.challengedCalls,
        overturned: d.overturnedCalls,
    }));

    // Compute average for reference line
    const avgRate = chartData.reduce((s, d) => s + d.overturnRate, 0) / chartData.length;

    return (
        <section className="panel bg-white p-8">
            <div className="mb-6">
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-blue-500 mb-1">
                    Multi-Season
                </h4>
                <p className="text-2xl font-display leading-none text-gray-900">
                    Overturn Rate <span className="text-gray-400 italic">Year-over-Year</span>
                </p>
            </div>

            <ResponsiveContainer width="100%" height={260}>
                <LineChart data={chartData} margin={{ left: 10, right: 30, top: 20, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                    <XAxis
                        dataKey="season"
                        tick={{ fontSize: 11, fill: "#374151", fontWeight: 700 }}
                        axisLine={false}
                        tickLine={false}
                    />
                    <YAxis
                        domain={[0, "auto"]}
                        tickFormatter={(v: number) => `${v}%`}
                        tick={{ fontSize: 10, fill: "#9ca3af" }}
                        axisLine={false}
                        tickLine={false}
                        width={45}
                    />
                    <Tooltip
                        cursor={{ stroke: "#d1d5db", strokeDasharray: "4 4" }}
                        content={({ active, payload }) => {
                            if (!active || !payload?.[0]) return null;
                            const d = payload[0].payload as (typeof chartData)[number];
                            return (
                                <div className="rounded-xl bg-white border border-gray-100 shadow-xl px-4 py-3 text-xs">
                                    <p className="font-black text-gray-900 mb-1">{d.season} Season</p>
                                    <p className="text-gray-500">
                                        Overturn Rate: <span className="font-bold text-blue-600">{d.overturnRate}%</span>
                                    </p>
                                    <p className="text-gray-400 mt-0.5">
                                        {d.overturned}/{d.challenged} overturned · {d.games} games
                                    </p>
                                </div>
                            );
                        }}
                    />
                    <ReferenceLine
                        y={Math.round(avgRate * 10) / 10}
                        stroke="#d1d5db"
                        strokeDasharray="6 4"
                        label={{ value: `Avg ${Math.round(avgRate * 10) / 10}%`, position: "insideTopRight", fill: "#9ca3af", fontSize: 9 }}
                    />
                    <Line
                        type="monotone"
                        dataKey="overturnRate"
                        stroke="#3b82f6"
                        strokeWidth={3}
                        dot={{ r: 5, fill: "#3b82f6", stroke: "white", strokeWidth: 2 }}
                        activeDot={{ r: 7, fill: "#2563eb", stroke: "white", strokeWidth: 3 }}
                    />
                </LineChart>
            </ResponsiveContainer>

            {/* Season summary chips */}
            <div className="mt-4 flex flex-wrap gap-2">
                {chartData.map((d) => (
                    <span
                        key={d.season}
                        className="inline-flex items-center gap-1.5 rounded-full border border-gray-100 bg-gray-50 px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-gray-500"
                    >
                        {d.season} · {d.games}g · {d.overturnRate}%
                    </span>
                ))}
            </div>
        </section>
    );
}
