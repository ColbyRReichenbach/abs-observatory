"use client";

import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import { ChartTooltip } from "@/components/ui/chart-tooltip";

export function ChallengeDistributionTimeline({
    homeTeamName,
    awayTeamName,
    homeData,
    awayData,
    leagueAverage,
    homeColor = "#3b82f6",
    awayColor = "#8b5cf6"
}: {
    homeTeamName: string;
    awayTeamName: string;
    homeData: number[];
    awayData: number[];
    leagueAverage: number[];
    homeColor?: string;
    awayColor?: string;
}) {
    const data = Array.from({ length: 9 }, (_, index) => ({
        inning: `Inning ${index + 1}`,
        [homeTeamName]: homeData[index] ?? 0,
        [awayTeamName]: awayData[index] ?? 0,
        leagueAverage: leagueAverage[index] ?? 0,
    }));

    return (
        <div className="mt-8 panel p-6 shadow-2xl shadow-black/[0.02] border border-gray-50 bg-white">
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-4 flex w-full justify-start items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Historic Challenge Timing
            </h4>
            <p className="text-sm text-gray-500 mb-6 text-balance">
                Aggregated timeline illustrating the typical inning distribution where each team opts to use their ABS challenges.
            </p>

            <div className="h-[300px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
                        <defs>
                            <linearGradient id="colorHome" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={homeColor} stopOpacity={0.8} />
                                <stop offset="95%" stopColor={homeColor} stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="colorAway" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={awayColor} stopOpacity={0.8} />
                                <stop offset="95%" stopColor={awayColor} stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                        <XAxis
                            dataKey="inning"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: "#9ca3af", fontSize: 10, fontWeight: 700, letterSpacing: '0.05em' }}
                            dy={10}
                        />
                        <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: "#9ca3af", fontSize: 10, fontWeight: 700 }}
                        />
                        <Tooltip
                            content={({ active, payload, label }) => {
                                if (!active || !payload?.length) return null;
                                return (
                                    <ChartTooltip
                                        title={String(label ?? "")}
                                        extra={payload.map((item) => ({
                                            label: String(item.name ?? ""),
                                            value: Number(item.value ?? 0).toFixed(1),
                                            color: String(item.color ?? ""),
                                        }))}
                                    />
                                );
                            }}
                        />
                        <Legend wrapperStyle={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 800, marginTop: '20px' }} />
                        <Area
                            type="monotone"
                            dataKey="leagueAverage"
                            stroke="rgba(0,0,0,0.25)"
                            strokeDasharray="4 4"
                            fillOpacity={0}
                            strokeWidth={1.5}
                            name="League Avg"
                        />
                        <Area
                            type="monotone"
                            dataKey={homeTeamName}
                            stroke={homeColor}
                            fillOpacity={1}
                            fill="url(#colorHome)"
                            strokeWidth={3}
                        />
                        <Area
                            type="monotone"
                            dataKey={awayTeamName}
                            stroke={awayColor}
                            fillOpacity={1}
                            fill="url(#colorAway)"
                            strokeWidth={3}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
