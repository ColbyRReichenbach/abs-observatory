"use client";

import { useState } from "react";
import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import { ChartTooltip } from "@/components/ui/chart-tooltip";

type ChartDatum = Record<string, string | number | null>;

interface DynamicChartProps {
    type: "line" | "bar" | "pie";
    data: ChartDatum[];
    xAxisKey?: string;
    yAxisKey?: string;
    title?: string;
    colors?: string[];
}

export function DynamicChart({ type, data, xAxisKey, yAxisKey, title, colors = ["#001529", "#8b0000", "#d4b483"] }: DynamicChartProps) {
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    if (!data || data.length === 0) return null;

    const numericYValues =
        yAxisKey == null
            ? []
            : data
                .map((datum) => datum[yAxisKey])
                .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
    const allowDecimalTicks = numericYValues.some((value) => !Number.isInteger(value));

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
                            tickCount={5}
                            allowDecimals={allowDecimalTicks}
                        />
                        <Tooltip
                            wrapperStyle={{ visibility: "hidden", pointerEvents: "none" }}
                            content={({ active, payload, label }) => {
                                if (!active || !payload?.length) return null;
                                const value = payload[0]?.value;
                                return (
                                    <ChartTooltip
                                        usePortal
                                        portalProps={mousePos}
                                        title={label != null ? String(label) : title}
                                        value={typeof value === "number" ? value.toFixed(allowDecimalTicks ? 2 : 0) : String(value ?? "")}
                                        subValueLabel={yAxisKey}
                                    />
                                );
                            }}
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
                            tickCount={5}
                            allowDecimals={allowDecimalTicks}
                        />
                        <Tooltip
                            wrapperStyle={{ visibility: "hidden", pointerEvents: "none" }}
                            cursor={{ fill: "rgba(0,0,0,0.02)" }}
                            content={({ active, payload, label }) => {
                                if (!active || !payload?.length) return null;
                                const value = payload[0]?.value;
                                return (
                                    <ChartTooltip
                                        usePortal
                                        portalProps={mousePos}
                                        title={label != null ? String(label) : title}
                                        value={typeof value === "number" ? value.toFixed(allowDecimalTicks ? 2 : 0) : String(value ?? "")}
                                        subValueLabel={yAxisKey}
                                    />
                                );
                            }}
                        />
                        <Bar dataKey={yAxisKey} fill={colors[0]} radius={[4, 4, 0, 0]}>
                            {data.map((_, index) => (
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
        <div className="w-full h-full min-h-[300px]" onMouseMove={(event) => setMousePos({ x: event.clientX, y: event.clientY })}>
            {title && (
                <h5 className="text-center text-[10px] font-black uppercase tracking-widest mb-4 opacity-40">
                    {title}
                </h5>
            )}
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={260}>
                {renderChart()}
            </ResponsiveContainer>
        </div>
    );
}
