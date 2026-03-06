"use client";

import { useMemo } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";

// Simulated historical distribution for PreGame scouting
const INNINGS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

export function ChallengeDistributionTimeline({
    homeTeamName,
    awayTeamName,
    homeColor = "#3b82f6",
    awayColor = "#8b5cf6"
}: {
    homeTeamName: string;
    awayTeamName: string;
    homeColor?: string;
    awayColor?: string;
}) {
    const data = useMemo(() => {
        return INNINGS.map(inning => {
            // Mocking the frequency curve of when teams challenge during the game.
            // Usually challenges spike in the 1st/2nd and 7th-9th innings
            const lateBiasHome = inning >= 7 ? Math.random() * 5 + 5 : Math.random() * 3 + 1;
            const earlyBiasAway = inning <= 3 ? Math.random() * 6 + 4 : Math.random() * 2 + 1;

            return {
                inning: `Inning ${inning}`,
                [homeTeamName]: Math.round(lateBiasHome),
                [awayTeamName]: Math.round(earlyBiasAway),
            };
        });
    }, [homeTeamName, awayTeamName]);

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
                    <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
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
                            contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }}
                            itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                            labelStyle={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#9ca3af', marginBottom: '8px' }}
                        />
                        <Legend wrapperStyle={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 800, marginTop: '20px' }} />
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
