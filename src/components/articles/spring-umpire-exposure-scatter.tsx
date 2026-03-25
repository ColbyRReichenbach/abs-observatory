"use client";

import { useMemo } from "react";
import {
  CartesianGrid,
  Label,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TooltipContentProps } from "recharts";

import { buildLinearAxis, formatNumberTick, formatPercentTick } from "@/components/analytics/chart-axis";
import { ChartTooltip } from "@/components/ui/chart-tooltip";

export type SpringUmpireExposurePoint = {
  umpireId: number | string;
  umpireName: string;
  challengedCalls: number;
  overturnRate: number;
};

type UmpireTooltipProps = TooltipContentProps<number, string> & {
  viewBox?: {
    height?: number;
  };
};

function UmpireTooltip({ active, payload, coordinate, viewBox }: UmpireTooltipProps) {
  if (!active || !payload?.length || !coordinate) return null;
  const point = payload[0]?.payload as SpringUmpireExposurePoint | undefined;
  if (!point) return null;

  const isBottomHalf = (coordinate.y || 0) > (viewBox?.height || 320) / 2;

  return (
    <div
      className="transition-transform duration-300 ease-out"
      style={{
        transform: isBottomHalf
          ? "translateX(-50%) translateY(-100%) translateY(-24px)"
          : "translateX(-50%) translateY(22px)",
        pointerEvents: "none",
      }}
    >
      <ChartTooltip
        title={point.umpireName}
        value={`${point.challengedCalls}`}
        subValueLabel="Challenged Calls"
        extra={[{ label: "Overturn Rate", value: `${(point.overturnRate * 100).toFixed(1)}%` }]}
      />
    </div>
  );
}

export function SpringUmpireExposureScatter({ data }: { data: SpringUmpireExposurePoint[] }) {
  const { avgExposure, avgRate, xAxis, yAxis } = useMemo(() => {
    if (!data.length) {
      return {
        avgExposure: 0,
        avgRate: 0,
        xAxis: buildLinearAxis([], { step: 5, min: 0, minSpan: 20 }),
        yAxis: buildLinearAxis([], { step: 10, min: 0, max: 100, minSpan: 20 }),
      };
    }

    return {
      avgExposure: data.reduce((sum, point) => sum + point.challengedCalls, 0) / data.length,
      avgRate: data.reduce((sum, point) => sum + point.overturnRate, 0) / data.length,
      xAxis: buildLinearAxis(data.map((point) => point.challengedCalls), { step: 5, padding: 2, min: 0, minSpan: 20 }),
      yAxis: buildLinearAxis(data.map((point) => point.overturnRate * 100), { step: 10, padding: 5, min: 0, max: 100, minSpan: 20 }),
    };
  }, [data]);

  if (!data.length) return null;

  return (
    <div className="relative h-[360px] w-full">
      <div className="pointer-events-none absolute inset-0 z-10">
        <span className="absolute left-12 top-2 text-[9px] font-black uppercase tracking-[0.14em] text-emerald-500/50">
          High Rate, Low Exposure
        </span>
        <span className="absolute right-4 top-2 text-[9px] font-black uppercase tracking-[0.14em] text-amber-500/50">
          High Rate, Heavy Exposure
        </span>
        <span className="absolute bottom-6 left-12 text-[9px] font-black uppercase tracking-[0.14em] text-blue-500/50">
          Stable Low Exposure
        </span>
        <span className="absolute bottom-6 right-4 text-[9px] font-black uppercase tracking-[0.14em] text-red-400/50">
          Heavy Exposure, Lower Return
        </span>
      </div>

      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={360}>
        <ScatterChart margin={{ top: 34, right: 36, bottom: 50, left: 72 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
          <XAxis
            type="number"
            dataKey="challengedCalls"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 10, fill: "#86868b" }}
            tickFormatter={(value) => formatNumberTick(value, 0)}
            domain={xAxis.domain}
            ticks={xAxis.ticks}
          >
            <Label
              value="CHALLENGED CALLS"
              position="bottom"
              offset={0}
              style={{ fontSize: 10, fill: "#86868b", fontWeight: 900, letterSpacing: "0.08em" }}
            />
          </XAxis>
          <YAxis
            type="number"
            dataKey="overturnRate"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 10, fill: "#86868b" }}
            tickFormatter={(value) => formatPercentTick(value * 100)}
            domain={[yAxis.domain[0] / 100, yAxis.domain[1] / 100]}
            ticks={yAxis.ticks.map((tick) => tick / 100)}
          >
            <Label
              value="OVERTURN RATE"
              angle={-90}
              position="insideLeft"
              offset={12}
              style={{ fontSize: 10, fill: "#86868b", fontWeight: 900, letterSpacing: "0.08em" }}
            />
          </YAxis>
          <ReferenceLine
            x={avgExposure}
            stroke="rgba(0,0,0,0.25)"
            strokeDasharray="4 4"
            label={{
              value: `AVG ${avgExposure.toFixed(0)}`,
              position: "top",
              style: { fontSize: 10, fill: "#86868b", fontWeight: 900, letterSpacing: "0.08em" },
            }}
          />
          <ReferenceLine
            y={avgRate}
            stroke="rgba(0,0,0,0.25)"
            strokeDasharray="4 4"
            label={{
              value: `AVG ${(avgRate * 100).toFixed(0)}%`,
              position: "right",
              style: { fontSize: 10, fill: "#86868b", fontWeight: 900, letterSpacing: "0.08em" },
            }}
          />
          <Scatter data={data} fill="#0f766e" isAnimationActive={false} />
          <Tooltip
            content={(props) => <UmpireTooltip {...(props as UmpireTooltipProps)} />}
            cursor={false}
            offset={0}
            allowEscapeViewBox={{ x: true, y: true }}
            wrapperStyle={{ zIndex: 10001, outline: "none", pointerEvents: "none" }}
            isAnimationActive={false}
            animationDuration={0}
          />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}
