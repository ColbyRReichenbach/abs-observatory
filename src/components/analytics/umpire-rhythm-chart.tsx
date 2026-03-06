"use client";

import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Area, AreaChart } from "recharts";
import { Activity } from "lucide-react";

export function UmpireRhythmChart({ data }: { data: any[] }) {
    return (
        <div className="h-[300px] w-full mt-6">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data}>
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
                        label={{ value: 'INNING', position: 'insideBottom', offset: -10, fontSize: 8, fontWeight: 900, fill: '#cbd5e1' }}
                    />
                    <YAxis
                        domain={[0, 1]}
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 10, fontWeight: 700, fill: "#94a3b8" }}
                        tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
                    />
                    <Tooltip
                        content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                                const d = payload[0].payload;
                                return (
                                    <div className="bg-white/90 backdrop-blur-md p-4 rounded-2xl border border-gray-100 shadow-2xl">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Inning {d.inning}</p>
                                        <p className="text-xl font-display text-gray-900">{(d.accuracy * 100).toFixed(1)}% Accuracy</p>
                                        <p className="text-[10px] font-bold text-blue-600 mt-1">{d.total} Samples</p>
                                    </div>
                                );
                            }
                            return null;
                        }}
                    />
                    <Area
                        type="monotone"
                        dataKey="accuracy"
                        stroke="#3b82f6"
                        strokeWidth={3}
                        fillOpacity={1}
                        fill="url(#rhythmGradient)"
                        animationDuration={1500}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}
