"use client";

import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { buildLinearAxis, formatPercentTick } from "@/components/analytics/chart-axis";
import { ChartTooltip } from "@/components/ui/chart-tooltip";

export type AbsActorComparisonPoint = {
  actor: "catcher" | "batter" | "pitcher";
  label: string;
  challenges: number;
  overturned: number;
  overturnRate: number;
  ciLow?: number | null;
  ciHigh?: number | null;
};

const COLORS: Record<AbsActorComparisonPoint["actor"], string> = {
  catcher: "#0f766e",
  batter: "#2563eb",
  pitcher: "#92400e",
};

export function AbsActorComparisonChart({ data }: { data: AbsActorComparisonPoint[] }) {
  if (!data.length) return null;

  const chartData = data.map((point) => ({
    ...point,
    overturnPct: point.overturnRate * 100,
    sampleLabel: `n=${point.challenges}`,
  }));
  const yAxis = buildLinearAxis(chartData.map((point) => point.overturnPct), {
    step: 10,
    padding: 6,
    min: 0,
    max: 100,
    minSpan: 30,
  });

  return (
    <div className="h-[340px] w-full">
      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={340}>
        <BarChart data={chartData} margin={{ top: 24, right: 42, bottom: 24, left: 4 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.06)" />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: "#5a554d", fontWeight: 900 }}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 10, fill: "#86868b" }}
            tickFormatter={(value) => formatPercentTick(Number(value))}
            domain={yAxis.domain}
            ticks={yAxis.ticks}
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
                    ...(point.ciLow != null && point.ciHigh != null
                      ? [{ label: "95% Wilson CI", value: `${(point.ciLow * 100).toFixed(1)}-${(point.ciHigh * 100).toFixed(1)}%` }]
                      : []),
                  ]}
                />
              );
            }}
          />
          <Bar dataKey="overturnPct" radius={[8, 8, 0, 0]} maxBarSize={90} isAnimationActive={false}>
            {chartData.map((point) => (
              <Cell key={point.actor} fill={COLORS[point.actor]} />
            ))}
            <LabelList dataKey="sampleLabel" position="top" style={{ fill: "#746b60", fontSize: 10, fontWeight: 900 }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
