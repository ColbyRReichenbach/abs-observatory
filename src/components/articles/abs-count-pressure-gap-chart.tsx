"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { buildLinearAxis, formatPercentTick } from "@/components/analytics/chart-axis";
import { ChartTooltip } from "@/components/ui/chart-tooltip";

export type AbsCountPressurePoint = {
  bucket: string;
  label: string;
  catcherChallenges: number;
  catcherOverturned: number;
  catcherRate: number;
  batterChallenges: number;
  batterOverturned: number;
  batterRate: number;
  gap: number;
  zScore?: number | null;
};

export function AbsCountPressureGapChart({ data }: { data: AbsCountPressurePoint[] }) {
  if (!data.length) return null;

  const chartData = data.map((point) => ({
    ...point,
    catcherPct: point.catcherRate * 100,
    batterPct: point.batterRate * 100,
    gapPct: point.gap * 100,
  }));
  const yAxis = buildLinearAxis(
    chartData.flatMap((point) => [point.catcherPct, point.batterPct]),
    { step: 10, padding: 6, min: 0, max: 100, minSpan: 30 },
  );

  return (
    <div className="h-[390px] w-full">
      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={390}>
        <BarChart data={chartData} margin={{ top: 28, right: 34, bottom: 28, left: 4 }} barGap={6}>
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
          <Legend
            verticalAlign="top"
            align="right"
            wrapperStyle={{ top: 0, fontSize: 11, fontWeight: 900, textTransform: "uppercase" }}
          />
          <Tooltip
            cursor={{ fill: "rgba(0,0,0,0.03)" }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const point = payload[0]?.payload as (typeof chartData)[number];
              return (
                <ChartTooltip
                  title={point.label}
                  value={`${point.gapPct >= 0 ? "+" : ""}${point.gapPct.toFixed(1)} pts`}
                  subValueLabel="Catcher Gap"
                  extra={[
                    { label: "Catcher", value: `${point.catcherOverturned}/${point.catcherChallenges} (${point.catcherPct.toFixed(1)}%)` },
                    { label: "Batter", value: `${point.batterOverturned}/${point.batterChallenges} (${point.batterPct.toFixed(1)}%)` },
                    ...(point.zScore != null ? [{ label: "Two-proportion z", value: point.zScore.toFixed(2) }] : []),
                  ]}
                />
              );
            }}
          />
          <Bar name="Catcher" dataKey="catcherPct" fill="#0f766e" radius={[7, 7, 0, 0]} maxBarSize={48} isAnimationActive={false}>
            <LabelList dataKey="catcherChallenges" position="top" style={{ fill: "#746b60", fontSize: 9, fontWeight: 900 }} />
          </Bar>
          <Bar name="Batter" dataKey="batterPct" fill="#2563eb" radius={[7, 7, 0, 0]} maxBarSize={48} isAnimationActive={false}>
            <LabelList dataKey="batterChallenges" position="top" style={{ fill: "#746b60", fontSize: 9, fontWeight: 900 }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
