"use client";

import { useState } from "react";
import {
    RadialBarChart,
    RadialBar,
    ResponsiveContainer,
    Tooltip,
    Cell,
} from "recharts";
import { motion } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import { ChartTooltip } from "@/components/ui/chart-tooltip";

export function ChallengeAggressionRadial({
    data,
    teamColor = "#007aff",
}: {
    data: Array<{ category: string; count: number; rate: number }>;
    teamColor?: string;
}) {
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    const router = useRouter();
    const searchParams = useSearchParams();

    const handleCellClick = (name: string) => {
        const next = new URLSearchParams(searchParams.toString());
        const label = name.toLowerCase();

        if (label.includes("early")) {
            next.set("inningRange", "early");
        } else if (label.includes("middle")) {
            next.set("inningRange", "middle");
        } else if (label.includes("late")) {
            next.set("inningRange", "late");
        } else if (label.includes("extras")) {
            next.set("inningRange", "extras");
        }

        router.push(`?${next.toString()}`, { scroll: false });
    };
    const chartData = data.map((d, i) => ({
        name: d.category,
        value: d.count,
        fill: i % 2 === 0 ? teamColor : `${teamColor}88`,
        rate: (d.rate * 100).toFixed(2) + "%",
    }));

    return (
        <div className="h-full w-full relative flex flex-col justify-center" onMouseMove={(event) => setMousePos({ x: event.clientX, y: event.clientY })}>
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
                        wrapperStyle={{ visibility: "hidden", pointerEvents: "none" }}
                        allowEscapeViewBox={{ x: true, y: true }}
                        content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                                const item = payload[0].payload;
                                return (
                                    <ChartTooltip
                                        usePortal
                                        portalProps={mousePos}
                                        title={item.name}
                                        value={item.value}
                                        subValueLabel="Challenges"
                                        extra={[{ label: "Success Rate", value: item.rate }]}
                                    />
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
