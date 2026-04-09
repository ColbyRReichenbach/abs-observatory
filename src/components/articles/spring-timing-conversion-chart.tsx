"use client";

import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { buildLinearAxis, formatPercentTick } from "@/components/analytics/chart-axis";
import { ChartTooltip } from "@/components/ui/chart-tooltip";

export type SpringTimingConversionPoint = {
  stateBucket: string;
  label: string;
  challenges: number;
  overturnRate: number;
};

const BAR_COLORS = ["#0f766e", "#2563eb", "#c2410c", "#8b0000"];

export function SpringTimingConversionChart({ data }: { data: SpringTimingConversionPoint[] }) {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  if (!data.length) return null;

  const yAxis = buildLinearAxis(
    data.map((point) => point.overturnRate * 100),
    { step: 10, padding: 5, min: 0, max: 100, minSpan: 20 },
  );
  const overallRate = data.reduce((sum, point) => sum + point.overturnRate * point.challenges, 0) / data.reduce((sum, point) => sum + point.challenges, 0);

  const chartData = data.map((point) => ({
    ...point,
    overturnPct: point.overturnRate * 100,
    sampleLabel: `n=${point.challenges}`,
  }));

  return (
    <div className="h-[360px] w-full" onMouseMove={(event) => setMousePos({ x: event.clientX, y: event.clientY })}>
      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={360}>
        <BarChart data={chartData} margin={{ top: 28, right: 72, bottom: 32, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 10, fill: "#86868b", fontWeight: 800 }}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 10, fill: "#86868b" }}
            tickFormatter={(value) => formatPercentTick(value)}
            domain={yAxis.domain}
            ticks={yAxis.ticks}
          />
          <ReferenceLine
            y={overallRate * 100}
            stroke="rgba(0,0,0,0.25)"
            strokeDasharray="4 4"
            label={{
              value: `SPRING AVG ${(overallRate * 100).toFixed(1)}%`,
              position: "insideTopRight",
              offset: 8,
              style: { fontSize: 10, fill: "#86868b", fontWeight: 900, letterSpacing: "0.08em", textAnchor: "end" },
            }}
          />
          <Tooltip
            wrapperStyle={{ visibility: "hidden", pointerEvents: "none" }}
            cursor={{ fill: "rgba(0,0,0,0.02)" }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const point = payload[0]?.payload as (typeof chartData)[number];
              return (
                <ChartTooltip
                  usePortal
                  portalProps={mousePos}
                  title={point.label}
                  value={`${point.overturnPct.toFixed(1)}%`}
                  subValueLabel="Overturn Rate"
                  extra={[{ label: "Sample", value: point.challenges }]}
                />
              );
            }}
          />
          <Bar dataKey="overturnPct" radius={[8, 8, 0, 0]} maxBarSize={76} isAnimationActive={false}>
            {chartData.map((_, index) => (
              <Cell key={index} fill={BAR_COLORS[index % BAR_COLORS.length]} />
            ))}
            <LabelList dataKey="sampleLabel" position="top" style={{ fill: "#86868b", fontSize: 10, fontWeight: 900 }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
