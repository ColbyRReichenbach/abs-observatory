"use client";

import { useMemo } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { TeamTrendPoint, UmpireTrendPoint } from "@/lib/types";
import { format } from "date-fns";

export function TeamTrendChart({ data, teamColor }: { data: TeamTrendPoint[]; teamColor: string }) {
    // We need to map the data so recharts can consume it smoothly
    const formattedData = useMemo(() => {
        return data.map((d) => ({
            date: format(new Date(d.gameDate), "MMM d"),
            successPct: d.challengesTotal > 0 ? (d.usedSuccessful / d.challengesTotal) * 100 : 0,
            challenges: d.challengesTotal,
            successful: d.usedSuccessful,
            opponent: d.opponentName,
        })).reverse(); // oldest to newest usually looks better on charts left-to-right
    }, [data]);

    if (!formattedData.length) return <div className="text-gray-400 text-sm p-4">No data</div>;

    return (
        <div className="h-[250px] w-full mt-6">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={formattedData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                    <defs>
                        <linearGradient id="colorSuccess" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={teamColor} stopOpacity={0.3} />
                            <stop offset="95%" stopColor={teamColor} stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                    <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "#9ca3af" }} dy={10} />
                    <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "#9ca3af" }} dx={-10} tickFormatter={(val) => `${val}%`} />
                    <Tooltip
                        content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                                const data = payload[0].payload;
                                return (
                                    <div className="bg-white p-3 rounded-2xl shadow-xl border border-gray-100">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">{data.date} vs {data.opponent}</p>
                                        <p className="text-2xl font-display" style={{ color: teamColor }}>{data.successPct.toFixed(0)}%</p>
                                        <p className="text-xs font-bold text-gray-500 mt-1">{data.successful} / {data.challenges} Overturns</p>
                                    </div>
                                )
                            }
                            return null;
                        }}
                    />
                    <Area type="monotone" dataKey="successPct" stroke={teamColor} strokeWidth={3} fillOpacity={1} fill="url(#colorSuccess)" />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}

export function UmpireAccuracyChart({ data }: { data: UmpireTrendPoint[] }) {
    const formattedData = useMemo(() => {
        return data.map((d) => ({
            date: format(new Date(d.gameDate), "MMM d"),
            accuracy: d.accuracy * 100,
            overturned: d.overturnedCount,
            challenged: d.challengedCount
        })).reverse();
    }, [data]);

    if (!formattedData.length) return <div className="text-gray-400 text-sm p-4">No data</div>;

    return (
        <div className="h-[250px] w-full mt-6">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={formattedData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                    <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "#9ca3af" }} dy={10} />
                    <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "#9ca3af" }} dx={-10} tickFormatter={(val) => `${val}%`} domain={[0, 100]} />
                    <Tooltip
                        cursor={{ fill: 'rgba(0,0,0,0.02)' }}
                        content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                                const data = payload[0].payload;
                                return (
                                    <div className="bg-white p-3 rounded-2xl shadow-xl border border-gray-100">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">{data.date}</p>
                                        <p className="text-2xl font-display text-blue-600">{data.accuracy.toFixed(1)}%</p>
                                        <p className="text-xs font-bold text-gray-500 mt-1">{data.overturned} Overturned / {data.challenged} Challenges</p>
                                    </div>
                                )
                            }
                            return null;
                        }}
                    />
                    <Bar
                        dataKey="accuracy"
                        fill="#3b82f6"
                        radius={[4, 4, 0, 0]}
                        maxBarSize={40}
                    />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}
