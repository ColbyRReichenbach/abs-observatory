"use client";

import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Line,
    LineChart,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";

interface DynamicChartProps {
    type: "line" | "bar" | "pie";
    data: any[];
    xAxisKey?: string;
    yAxisKey?: string;
    title?: string;
    colors?: string[];
}

export function DynamicChart({ type, data, xAxisKey, yAxisKey, title, colors = ["#001529", "#8b0000", "#d4b483"] }: DynamicChartProps) {
    if (!data || data.length === 0) return null;

    const renderChart = () => {
        switch (type) {
            case "line":
                return (
                    <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                        <XAxis
                            dataKey={xAxisKey}
                            tick={{ fontSize: 10, fill: "#666", fontFamily: "monospace" }}
                            axisLine={false}
                            tickLine={false}
                        />
                        <YAxis
                            tick={{ fontSize: 10, fill: "#666", fontFamily: "monospace" }}
                            axisLine={false}
                            tickLine={false}
                        />
                        <Tooltip
                            contentStyle={{ backgroundColor: "#fffdf8", border: "1px solid rgba(0,0,0,0.1)", borderRadius: "8px", fontFamily: "serif" }}
                        />
                        <Line
                            type="monotone"
                            dataKey={yAxisKey}
                            stroke={colors[0]}
                            strokeWidth={3}
                            dot={{ r: 4, strokeWidth: 2, fill: "#fffdf8" }}
                            activeDot={{ r: 6 }}
                        />
                    </LineChart>
                );
            case "bar":
                return (
                    <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                        <XAxis
                            dataKey={xAxisKey}
                            tick={{ fontSize: 10, fill: "#666", fontFamily: "monospace" }}
                            axisLine={false}
                            tickLine={false}
                        />
                        <YAxis
                            tick={{ fontSize: 10, fill: "#666", fontFamily: "monospace" }}
                            axisLine={false}
                            tickLine={false}
                        />
                        <Tooltip
                            cursor={{ fill: "rgba(0,0,0,0.02)" }}
                            contentStyle={{ backgroundColor: "#fffdf8", border: "1px solid rgba(0,0,0,0.1)", borderRadius: "8px", fontFamily: "serif" }}
                        />
                        <Bar dataKey={yAxisKey} fill={colors[0]} radius={[4, 4, 0, 0]}>
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                            ))}
                        </Bar>
                    </BarChart>
                );
            default:
                return null;
        }
    };

    return (
        <div className="w-full h-full min-h-[300px]">
            {title && (
                <h5 className="text-center text-[10px] font-black uppercase tracking-widest mb-4 opacity-40">
                    {title}
                </h5>
            )}
            <ResponsiveContainer width="100%" height="100%">
                {renderChart()}
            </ResponsiveContainer>
        </div>
    );
}
