"use client";

import { useMemo } from "react";
import {
    Area,
    AreaChart,
    CartesianGrid,
    Legend,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import { format } from "date-fns";
import type { TeamTrendPoint, UmpireTrendPoint } from "@/lib/types";
import { ChartTooltip } from "@/components/ui/chart-tooltip";
import { ClientOnly } from "@/components/ui/client-only";

const PERCENT_TICKS = [0, 25, 50, 75, 100];

/* ── S3-5: Dual-line Team Trajectory Chart ── */
export function TeamTrendChart({ data, teamColor }: { data: TeamTrendPoint[]; teamColor: string }) {
    const formattedData = useMemo(() => {
        return data
            .map((d) => ({
                date: format(new Date(d.gameDate), "MMM d"),
                successPct: d.challengesTotal > 0 ? (d.usedSuccessful / d.challengesTotal) * 100 : 0,
                failPct: d.challengesTotal > 0 ? (d.usedFailed / d.challengesTotal) * 100 : 0,
                challenges: d.challengesTotal,
                successful: d.usedSuccessful,
                failed: d.usedFailed,
                opponent: d.opponentName,
            }))
            .reverse();
    }, [data]);

    if (!formattedData.length)
        return <div className="text-gray-400 text-sm p-4">No data</div>;

    return (
        <div className="h-[250px] w-full mt-6">
            <ClientOnly fallback={<div className="h-full w-full rounded-[1.5rem] bg-gradient-to-br from-gray-100 via-gray-50 to-white" />}>
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={250}>
                    <LineChart data={formattedData} margin={{ top: 15, right: 15, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                        <XAxis
                            dataKey="date"
                            tickLine={false}
                            axisLine={false}
                            tick={{ fontSize: 10, fill: "#9ca3af" }}
                            dy={10}
                        />
                        <YAxis
                            tickLine={false}
                            axisLine={false}
                            tick={{ fontSize: 10, fill: "#9ca3af" }}
                            dx={-10}
                            tickFormatter={(val) => `${Math.round(val)}%`}
                            domain={[0, 100]}
                            ticks={PERCENT_TICKS}
                        />
                        <Tooltip
                            content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                    const d = payload[0].payload;
                                    return (
                                        <ChartTooltip
                                            title={`${d.date} vs ${d.opponent}`}
                                            extra={[
                                                { label: "Success Rate", value: `${d.successPct.toFixed(0)}%`, color: teamColor },
                                                { label: "Failure Rate", value: `${d.failPct.toFixed(0)}%`, color: "#d70015" },
                                                { label: "Total Challenges", value: d.challenges },
                                            ]}
                                        />
                                    );
                                }
                                return null;
                            }}
                        />
                        <Legend
                            verticalAlign="top"
                            height={28}
                            wrapperStyle={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 800 }}
                        />
                        <Line
                            type="monotone"
                            dataKey="successPct"
                            name="Success %"
                            stroke={teamColor}
                            strokeWidth={2.5}
                            dot={false}
                            activeDot={{ r: 4, strokeWidth: 2, fill: "white" }}
                        />
                        <Line
                            type="monotone"
                            dataKey="failPct"
                            name="Failure %"
                            stroke="#d70015"
                            strokeWidth={1.5}
                            strokeDasharray="4 4"
                            dot={false}
                            activeDot={{ r: 3, strokeWidth: 2, fill: "white" }}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </ClientOnly>
        </div>
    );
}

export function UmpireAccuracyChart({ data }: { data: UmpireTrendPoint[] }) {
    const formattedData = useMemo(() => {
        return data
            .map((d) => ({
                date: format(new Date(d.gameDate), "MMM d"),
                accuracy: d.accuracy * 100,
                overturned: d.overturnedCount,
                challenged: d.challengedCount,
            }))
            .reverse();
    }, [data]);

    if (!formattedData.length)
        return <div className="text-gray-400 text-sm p-4">No data</div>;

    return (
        <div className="h-[250px] w-full mt-6">
            <ClientOnly fallback={<div className="h-full w-full rounded-[1.5rem] bg-gradient-to-br from-gray-100 via-gray-50 to-white" />}>
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={250}>
                    <AreaChart data={formattedData} margin={{ top: 15, right: 15, left: 0, bottom: 5 }}>
                        <defs>
                            <linearGradient id="colorAccuracy" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                        <XAxis
                            dataKey="date"
                            tickLine={false}
                            axisLine={false}
                            tick={{ fontSize: 10, fill: "#9ca3af" }}
                            dy={10}
                        />
                        <YAxis
                            tickLine={false}
                            axisLine={false}
                            tick={{ fontSize: 10, fill: "#9ca3af" }}
                            dx={-10}
                            tickFormatter={(val) => `${Math.round(val)}%`}
                            domain={[0, 100]}
                            ticks={PERCENT_TICKS}
                        />
                        <Tooltip
                            content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                    const d = payload[0].payload;
                                    return (
                                        <ChartTooltip
                                            title={d.date}
                                            value={`${d.accuracy.toFixed(1)}%`}
                                            subValueLabel="Accuracy"
                                            extra={[
                                                { label: "Overturned", value: d.overturned },
                                                { label: "Challenged", value: d.challenged },
                                            ]}
                                        />
                                    );
                                }
                                return null;
                            }}
                        />
                        <Area
                            type="monotone"
                            dataKey="accuracy"
                            stroke="#3b82f6"
                            strokeWidth={2}
                            fillOpacity={1}
                            fill="url(#colorAccuracy)"
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </ClientOnly>
        </div>
    );
}
