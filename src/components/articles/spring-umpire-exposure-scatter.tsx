"use client";

import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Label,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  XAxis,
  YAxis,
} from "recharts";
import { buildLinearAxis, formatNumberTick, formatPercentTick } from "@/components/analytics/chart-axis";
import { ChartTooltip } from "@/components/ui/chart-tooltip";

export type SpringUmpireExposurePoint = {
  umpireId: number | string;
  umpireName: string;
  challengedCalls: number;
  overturnRate: number;
};

function getScatterMousePosition(state: unknown) {
  if (!state || typeof state !== "object" || !("chartX" in state) || !("chartY" in state)) return null;
  const chartX = (state as { chartX?: unknown }).chartX;
  const chartY = (state as { chartY?: unknown }).chartY;
  if (typeof chartX !== "number" || typeof chartY !== "number") return null;
  return { x: chartX, y: chartY };
}

function getActiveUmpirePoint(state: unknown): SpringUmpireExposurePoint | null {
  if (!state || typeof state !== "object" || !("activePayload" in state)) return null;
  const activePayload = (state as { activePayload?: Array<{ payload?: unknown }> }).activePayload;
  const payload = activePayload?.[0]?.payload;
  if (!payload || typeof payload !== "object") return null;
  const point = payload as Partial<SpringUmpireExposurePoint>;
  return typeof point.umpireId === "number" || typeof point.umpireId === "string"
    ? (point as SpringUmpireExposurePoint)
    : null;
}

export function SpringUmpireExposureScatter({ data }: { data: SpringUmpireExposurePoint[] }) {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [hoveredPoint, setHoveredPoint] = useState<SpringUmpireExposurePoint | null>(null);
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
        <ScatterChart
          margin={{ top: 34, right: 36, bottom: 50, left: 72 }}
          onMouseMove={(state: unknown) => {
            const nextMousePos = getScatterMousePosition(state);
            if (nextMousePos) {
              setMousePos(nextMousePos);
            }
            setHoveredPoint(getActiveUmpirePoint(state));
          }}
          onMouseLeave={() => setHoveredPoint(null)}
        >
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
        </ScatterChart>
      </ResponsiveContainer>
      {hoveredPoint ? (
        <ChartTooltip
          usePortal
          portalProps={mousePos}
          title={hoveredPoint.umpireName}
          value={`${hoveredPoint.challengedCalls}`}
          subValueLabel="Challenged Calls"
          extra={[{ label: "Overturn Rate", value: `${(hoveredPoint.overturnRate * 100).toFixed(1)}%` }]}
        />
      ) : null}
    </div>
  );
}
