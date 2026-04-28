"use client";

import { Bar, BarChart, CartesianGrid, Cell, LabelList, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { buildLinearAxis, formatPercentTick } from "@/components/analytics/chart-axis";
import { ChartTooltip } from "@/components/ui/chart-tooltip";

export type AbsCatcherGameflowPoint = {
  bucket: string;
  label: string;
  challenges: number;
  overturned: number;
  overturnRate: number;
};

const BAR_COLORS: Record<string, string> = {
  "1-3": "#0f766e",
  "4-6": "#b45309",
  "7-9": "#9a3412",
  extras: "#5b6472",
};

export function AbsCatcherGameflowChart({ data }: { data: AbsCatcherGameflowPoint[] }) {
  if (!data.length) return null;

  const chartData = data.map((point) => ({
    ...point,
    overturnPct: point.overturnRate * 100,
    sampleLabel: `n=${point.challenges}`,
  }));
  const weightedRate =
    chartData.reduce((sum, point) => sum + point.overturnRate * point.challenges, 0) /
    chartData.reduce((sum, point) => sum + point.challenges, 0);
  const yAxis = buildLinearAxis(chartData.map((point) => point.overturnPct), {
    step: 10,
    padding: 6,
    min: 0,
    max: 100,
    minSpan: 30,
  });

  return (
    <div className="relative h-[350px] w-full">
      <div className="absolute right-3 top-0 z-10 rounded-full border border-black/10 bg-white/90 px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-[#746b60] shadow-sm">
        Catcher Avg {(weightedRate * 100).toFixed(1)}%
      </div>
      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={350}>
        <BarChart data={chartData} margin={{ top: 30, right: 48, bottom: 24, left: 4 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.06)" />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 10, fill: "#5a554d", fontWeight: 900 }}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 10, fill: "#86868b" }}
            tickFormatter={(value) => formatPercentTick(Number(value))}
            domain={yAxis.domain}
            ticks={yAxis.ticks}
          />
          <ReferenceLine
            y={weightedRate * 100}
            stroke="rgba(0,0,0,0.28)"
            strokeDasharray="4 4"
          />
          <Tooltip
            cursor={{ fill: "rgba(0,0,0,0.03)" }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const point = payload[0]?.payload as (typeof chartData)[number];
              return (
                <ChartTooltip
                  title={point.label}
                  value={`${point.overturnPct.toFixed(1)}%`}
                  subValueLabel="Overturn Rate"
                  extra={[
                    { label: "Challenges", value: point.challenges },
                    { label: "Overturned", value: point.overturned },
                  ]}
                />
              );
            }}
          />
          <Bar dataKey="overturnPct" radius={[8, 8, 0, 0]} maxBarSize={76} isAnimationActive={false}>
            {chartData.map((point) => (
              <Cell key={point.bucket} fill={BAR_COLORS[point.bucket] ?? "#0f766e"} />
            ))}
            <LabelList dataKey="sampleLabel" position="top" style={{ fill: "#746b60", fontSize: 10, fontWeight: 900 }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
