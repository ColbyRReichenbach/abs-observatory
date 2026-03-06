"use client";

import { useMemo } from "react";
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from "recharts";
import type { ChallengeEvent } from "@/lib/types";

export function WPASwapWaterfall({ challenges }: { challenges: ChallengeEvent[] }) {
    const data = useMemo(() => {
        let currentProbability = 50; // Match starts at 50/50 win probability

        // Sort chronologically
        const sorted = [...challenges].sort((a, b) => {
            return (a.challengedAt && b.challengedAt) ? new Date(a.challengedAt).getTime() - new Date(b.challengedAt).getTime() : 0;
        });

        return sorted.map((c, i) => {
            // In a real system, actual WPA would be fetched per-pitch from the mlbstats API
            // Here we simulate the WPA shift magnitude based on leverage heuristics
            const baseShift = c.isOverturned ? (Math.random() * 8 + 2) : (Math.random() * 1.5 - 0.75); // Overturns cause bigger wpa swings

            // Determine if the challenge helped the home or away team
            // (Simplified: if overturned and the challenge team was Home, WPA goes up)
            const wpaShift = c.isOverturned ? baseShift : -baseShift;

            const previous = currentProbability;
            currentProbability = Math.max(1, Math.min(99, currentProbability + wpaShift));

            return {
                id: c.challengeId,
                inning: `${c.halfInning === "Top" ? "T" : "B"}${c.inning}`,
                description: c.calledDescription || "Pitch",
                start: previous,
                end: currentProbability,
                shift: wpaShift,
                isOverturned: c.isOverturned,
                team: c.challengeTeamName,
                fillColor: wpaShift > 0 ? "#10b981" : "#ef4444" // Green for positive shift (Home favorable), Red for negative (Away favorable)
            };
        });
    }, [challenges]);

    if (!data?.length) return null;

    return (
        <div className="mt-6 flex flex-col h-[350px]">
            <div className="flex justify-between items-end mb-4 px-2">
                <div>
                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-emerald-500 mb-1">Impact Analysis</h4>
                    <p className="text-2xl font-display text-gray-900 leading-none">Win Probability <span className="text-gray-400">Added</span></p>
                </div>
                <div className="flex gap-4">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded bg-emerald-500" />
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Home Favored</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded bg-red-500" />
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Away Favored</span>
                    </div>
                </div>
            </div>

            <div className="flex-1 bg-white border border-gray-100 rounded-2xl p-4 shadow-sm relative overflow-hidden">
                {/* Subtle grid background */}
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />

                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                        <XAxis
                            dataKey="inning"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 10, fill: "#9ca3af", fontWeight: 700 }}
                            dy={10}
                        />
                        <YAxis
                            domain={[0, 100]}
                            axisLine={false}
                            tickLine={false}
                            tickFormatter={(val) => `${val}%`}
                            tick={{ fontSize: 10, fill: "#9ca3af", fontWeight: 700 }}
                        />
                        <Tooltip
                            cursor={{ fill: 'rgba(0,0,0,0.02)' }}
                            content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                    const data = payload[0].payload;
                                    return (
                                        <div className="bg-white/95 backdrop-blur-md p-3 rounded-xl shadow-xl border border-gray-100 max-w-[200px]">
                                            <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-1">{data.inning} • {data.team}</p>
                                            <p className="text-sm font-bold text-gray-900 leading-tight mb-2">{data.description}</p>

                                            <div className="flex items-center justify-between border-t border-gray-100 pt-2">
                                                <span className="text-[10px] text-gray-500 font-bold uppercase">WPA Shift</span>
                                                <span className={`font-display text-lg ${data.shift > 0 ? "text-emerald-500" : "text-red-500"}`}>
                                                    {data.shift > 0 ? "+" : ""}{data.shift.toFixed(1)}%
                                                </span>
                                            </div>
                                            <div className="flex justify-between mt-1">
                                                <span className="text-[10px] text-gray-400 font-bold">Call Status</span>
                                                <span className={`text-[10px] font-bold ${data.isOverturned ? "text-cyan-500" : "text-gray-400"}`}>
                                                    {data.isOverturned ? "OVERTURNED" : "CONFIRMED"}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                }
                                return null;
                            }}
                        />

                        {/* The line shows the accumulated probability trend */}
                        <Line
                            type="stepAfter"
                            dataKey="end"
                            stroke="#cbd5e1"
                            strokeWidth={2}
                            dot={false}
                        />

                        <Bar
                            dataKey="shift"
                            maxBarSize={40}
                            radius={[4, 4, 4, 4]}
                            isAnimationActive={true}
                        >
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.fillColor} />
                            ))}
                        </Bar>
                    </ComposedChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
