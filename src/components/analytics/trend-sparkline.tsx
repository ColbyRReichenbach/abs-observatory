"use client";

import { LineChart, Line, ResponsiveContainer } from "recharts";

type Props = {
    data: number[];
    color?: string;
    width?: number;
    height?: number;
};

/**
 * Minimal sparkline — no axes, no labels, just a trend line.
 * data: array of numeric values (e.g., overturn rates over last 30 days).
 * Rising = green, falling = red, flat = team color.
 */
export function TrendSparkline({ data, color, width = 60, height = 24 }: Props) {
    if (data.length < 2) return <span className="text-[10px] text-[var(--ink-3)]">—</span>;

    const first = data[0];
    const last = data[data.length - 1];
    const direction = last > first ? "up" : last < first ? "down" : "flat";
    const lineColor =
        color ?? (direction === "up" ? "#2d5a27" : direction === "down" ? "#d70015" : "#86868b");

    const chartData = data.map((value, i) => ({ i, value }));

    return (
        <div style={{ width, height }}>
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
                    <Line
                        type="monotone"
                        dataKey="value"
                        stroke={lineColor}
                        strokeWidth={1.5}
                        dot={false}
                        animationDuration={800}
                        animationEasing="ease-out"
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}
