"use client";

import { memo, useMemo } from "react";
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

import { ChartTooltip } from "@/components/ui/chart-tooltip";
import { buildLinearAxis, formatNumberTick, formatRatioPercentTick } from "@/components/analytics/chart-axis";

type UmpireRiskPoint = {
  umpireId: number;
  umpireName: string;
  overturnRate: number;
  overturnRateVariance: number;
  riskTier: "Low" | "Moderate" | "Elevated" | "High";
};

function riskColor(riskTier: UmpireRiskPoint["riskTier"]) {
  switch (riskTier) {
    case "Low":
      return "#16a34a";
    case "Moderate":
      return "#f59e0b";
    case "Elevated":
      return "#f97316";
    case "High":
      return "#dc2626";
  }
}

const RiskDot = memo((props: { cx?: number; cy?: number; payload?: UmpireRiskPoint }) => {
  const { cx, cy, payload } = props;
  if (cx == null || cy == null || !payload) return null;

  return (
    <g>
      <circle
        cx={cx}
        cy={cy}
        r={8}
        fill={riskColor(payload.riskTier)}
        fillOpacity={0.22}
        stroke={riskColor(payload.riskTier)}
        strokeWidth={2}
      />
      <circle cx={cx} cy={cy} r={3.5} fill={riskColor(payload.riskTier)} />
    </g>
  );
});
RiskDot.displayName = "RiskDot";

type UmpireRiskTooltipProps = TooltipContentProps<number, string> & {
  viewBox?: {
    height?: number;
  };
};

function UmpireRiskTooltip({ active, payload, coordinate, viewBox }: UmpireRiskTooltipProps) {
  if (!active || !payload?.length || !coordinate) return null;
  const point = payload[0]?.payload as UmpireRiskPoint | undefined;
  if (!point) return null;

  // Flip logic based on Y coordinate
  const isBottomHalf = (coordinate?.y || 0) > (viewBox?.height || 300) / 2;

  return (
    <div
      className="transition-transform duration-300 ease-out"
      style={{
        transform: isBottomHalf
          ? "translateX(-50%) translateY(-100%) translateY(-20px)"
          : "translateX(-50%) translateY(20px)",
        pointerEvents: "none"
      }}
    >
      <ChartTooltip
        title={point.umpireName}
        value={`${(point.overturnRate * 100).toFixed(2)}%`}
        subValueLabel="Overturn Rate"
        extra={[
          { label: "Variance", value: point.overturnRateVariance.toFixed(2) },
          { label: "Risk Tier", value: point.riskTier, mono: false, color: riskColor(point.riskTier) },
        ]}
      />
    </div>
  );
}

function VarianceAxisLabel({
  viewBox,
}: {
  viewBox?: {
    x?: number;
    y?: number;
    height?: number;
  };
}) {
  if (!viewBox) return null;

  const anchorX = (viewBox.x ?? 0) - 46;
  const anchorY = (viewBox.y ?? 0) + (viewBox.height ?? 0) / 2;

  return (
    <text
      x={anchorX}
      y={anchorY}
      textAnchor="middle"
      fill="#86868b"
      fontSize="10"
      fontWeight="900"
      letterSpacing="0.08em"
      transform={`rotate(-90, ${anchorX}, ${anchorY})`}
    >
      <tspan x={anchorX} dy="-0.45em">GAME-TO-GAME</tspan>
      <tspan x={anchorX} dy="1.2em">VARIANCE</tspan>
    </text>
  );
}

export function UmpireRiskScatter({ data }: { data: UmpireRiskPoint[] }) {
  const { avgRate, avgVariance, xAxis, yAxis, yTickDigits } = useMemo(() => {
    if (data.length === 0) {
      return {
        avgRate: 0,
        avgVariance: 0,
        xAxis: buildLinearAxis([], { step: 0.1, min: 0, max: 1, minSpan: 0.4 }),
        yAxis: buildLinearAxis([], { step: 0.05, min: 0, minSpan: 0.2 }),
        yTickDigits: 2,
      };
    }

    const varianceValues = data.map((point) => point.overturnRateVariance);
    const maxVariance = Math.max(...varianceValues);
    const yStep = maxVariance > 0.3 ? 0.1 : 0.05;

    return {
      avgRate: data.reduce((sum, point) => sum + point.overturnRate, 0) / data.length,
      avgVariance: data.reduce((sum, point) => sum + point.overturnRateVariance, 0) / data.length,
      xAxis: buildLinearAxis(data.map((point) => point.overturnRate), { step: 0.1, padding: 0.05, min: 0, max: 1, minSpan: 0.4 }),
      yAxis: buildLinearAxis(varianceValues, { step: yStep, padding: yStep / 2, min: 0, minSpan: yStep * 4 }),
      yTickDigits: yStep < 0.1 ? 2 : 1,
    };
  }, [data]);

  if (data.length === 0) return null;

  return (
    <div className="panel h-full flex flex-col overflow-visible border-gray-100 bg-white shadow-2xl shadow-black/[0.03] p-6">
      <div className="mb-6">
        <h4 className="text-[10px] font-bold uppercase tracking-widest text-emerald-500 mb-1">
          Prep Value
        </h4>
        <p className="text-2xl font-display leading-none text-gray-900">
          Umpire <span className="text-gray-400 italic">Risk Map</span>
        </p>
      </div>

      <div className="relative flex-1 min-h-[300px] w-full">
        <div className="pointer-events-none absolute inset-0 z-10">
          <span className="absolute top-2 left-12 text-[9px] font-black uppercase tracking-[0.14em] text-emerald-500/50">
            Volatile Accurate
          </span>
          <span className="absolute top-2 right-4 text-[9px] font-black uppercase tracking-[0.14em] text-red-500/50">
            Reliably Problematic
          </span>
          <span className="absolute bottom-6 left-12 text-[9px] font-black uppercase tracking-[0.14em] text-blue-500/50">
            Reliable Accurate
          </span>
          <span className="absolute bottom-6 right-4 text-[9px] font-black uppercase tracking-[0.14em] text-amber-500/50">
            Volatile Problematic
          </span>
        </div>

        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={300}>
          <ScatterChart margin={{ top: 28, right: 30, bottom: 50, left: 72 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
            <XAxis
              type="number"
              dataKey="overturnRate"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 10, fill: "#86868b" }}
              tickFormatter={(value) => formatRatioPercentTick(value)}
              padding={{ left: 0, right: 0 }}
              domain={xAxis.domain}
              ticks={xAxis.ticks}
            >
              <Label
                value="OVERTURN RATE"
                position="bottom"
                offset={0}
                style={{ fontSize: 10, fill: "#86868b", fontWeight: 900, letterSpacing: "0.08em" }}
              />
            </XAxis>
            <YAxis
              type="number"
              dataKey="overturnRateVariance"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 10, fill: "#86868b" }}
              tickFormatter={(value) => formatNumberTick(value, yTickDigits)}
              padding={{ top: 0, bottom: 0 }}
              domain={yAxis.domain}
              ticks={yAxis.ticks}
            >
              <Label
                content={<VarianceAxisLabel />}
              />
            </YAxis>
            <ReferenceLine
              x={avgRate}
              stroke="rgba(0,0,0,0.25)"
              strokeDasharray="4 4"
              label={{
                value: `LG AVG ${(avgRate * 100).toFixed(0)}%`,
                position: "top",
                style: { fontSize: 10, fill: "#86868b", fontWeight: 900, letterSpacing: "0.08em" },
              }}
            />
            <ReferenceLine
              y={avgVariance}
              stroke="rgba(0,0,0,0.25)"
              strokeDasharray="4 4"
              label={{
                value: `AVG ${avgVariance.toFixed(yTickDigits)}`,
                position: "right",
                style: { fontSize: 10, fill: "#86868b", fontWeight: 900, letterSpacing: "0.08em" },
              }}
            />
            <Scatter data={data} shape={<RiskDot />} isAnimationActive={false} />
            <Tooltip
              content={(props) => <UmpireRiskTooltip {...(props as UmpireRiskTooltipProps)} />}
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
    </div>
  );
}
