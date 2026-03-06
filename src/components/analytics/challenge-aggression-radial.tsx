"use client";

import {
    RadialBarChart,
    RadialBar,
    Legend,
    ResponsiveContainer,
    Tooltip,
    Cell,
} from "recharts";
import { motion } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";

export function ChallengeAggressionRadial({
    data,
    teamColor = "#007aff",
}: {
    data: Array<{ category: string; count: number; rate: number }>;
    teamColor?: string;
}) {
    const router = useRouter();
    const searchParams = useSearchParams();

    const handleCellClick = (name: string) => {
        const next = new URLSearchParams(searchParams.toString());
        // Map category names to filter values if necessary
        // For now, let's assume we can set leverage or inningRange based on name
        if (name.toLowerCase().includes("leverage")) {
            next.set("leverage", "high");
        } else if (name.toLowerCase().includes("inning")) {
            next.set("inningRange", "late");
        } else if (name.toLowerCase().includes("scoring")) {
            next.set("leverage", "high"); // Approximation for RISP
        }

        router.push(`?${next.toString()}`, { scroll: false });
    };
    const chartData = data.map((d, i) => ({
        name: d.category,
        value: d.count,
        fill: i % 2 === 0 ? teamColor : `${teamColor}88`,
        rate: (d.rate * 100).toFixed(1) + "%",
    }));

    return (
        <div className="h-full w-full relative flex flex-col justify-center">
            <ResponsiveContainer width="100%" height={320}>
                <RadialBarChart
                    cx="50%"
                    cy="50%"
                    innerRadius="30%"
                    outerRadius="100%"
                    barSize={20}
                    data={chartData}
                    startAngle={180}
                    endAngle={-180}
                >
                    <RadialBar
                        label={{ position: "insideStart", fill: "#fff", fontSize: 10, fontWeight: "bold" }}
                        background
                        dataKey="value"
                        cornerRadius={10}
                        onMouseEnter={(_, index) => { }} // dummy to trigger hover
                    >
                        {chartData.map((entry, index) => (
                            <Cell
                                key={`cell-${index}`}
                                fill={entry.fill}
                                onClick={() => handleCellClick(entry.name)}
                                className="cursor-pointer transition-opacity hover:opacity-80"
                            />
                        ))}
                    </RadialBar>
                    <Tooltip
                        content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                                const item = payload[0].payload;
                                return (
                                    <div className="bg-white/95 backdrop-blur-xl border border-gray-100 p-4 rounded-2xl shadow-2xl">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">
                                            {item.name}
                                        </p>
                                        <div className="flex items-end gap-3">
                                            <span className="text-3xl font-display text-gray-900 leading-none">
                                                {item.value}
                                            </span>
                                            <span className="text-sm font-bold text-blue-600 mb-1">
                                                Challenges
                                            </span>
                                        </div>
                                        <div className="mt-3 pt-3 border-t border-gray-50 flex items-center justify-between gap-6">
                                            <span className="text-[10px] font-black uppercase text-gray-400">Success Rate</span>
                                            <span className="text-xs font-black font-mono text-gray-900">{item.rate}</span>
                                        </div>
                                    </div>
                                );
                            }
                            return null;
                        }}
                    />
                </RadialBarChart>
            </ResponsiveContainer>

            <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 px-4">
                {chartData.map((d) => (
                    <div key={d.name} className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: d.fill }} />
                        <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">{d.name}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
