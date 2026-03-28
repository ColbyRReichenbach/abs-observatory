"use client";

import { memo, useMemo, useState } from "react";
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
import type { ScatterShapeProps, TooltipContentProps } from "recharts";

import { buildLinearAxis, formatNumberTick, formatPercentTick } from "@/components/analytics/chart-axis";
import { ChartTooltip } from "@/components/ui/chart-tooltip";
import { resolveTeamBranding } from "@/lib/team-branding";

export type SpringTeamIdentityPoint = {
  teamId: number;
  teamName: string;
  challenges: number;
  overturnRate: number;
  lateShare?: number | null;
};

type ChartPoint = SpringTeamIdentityPoint & {
  overturnPct: number;
};

const TeamLogoDot = memo((props: { cx?: number; cy?: number; payload?: ChartPoint; active?: boolean }) => {
  const { cx, cy, payload, active } = props;
  if (cx == null || cy == null || !payload) return null;

  const logoSize = active ? 30 : 18;
  const badgeRadius = active ? 22 : 13;
  const ringRadius = active ? 25.5 : 15.5;
  const logoInset = logoSize / 2;
  const clipId = `spring-team-identity-${payload.teamId}-${active ? "active" : "base"}`;
  const branding = resolveTeamBranding({ teamId: payload.teamId });
  const logoHref = `https://www.mlbstatic.com/team-logos/team-cap-on-dark/${payload.teamId}.svg`;

  return (
    <g transform={`translate(${cx}, ${cy})`} style={{ pointerEvents: "auto" }}>
      <defs>
        <clipPath id={clipId}>
          <circle r={logoInset} />
        </clipPath>
      </defs>
      <circle r={ringRadius} fill={active ? branding.tokens.teamPrimary : "rgba(255,255,255,0.92)"} fillOpacity={active ? 0.16 : 0} />
      <circle
        r={badgeRadius}
        fill={branding.tokens.teamPrimary}
        stroke="rgba(255,255,255,0.96)"
        strokeWidth={active ? 2.5 : 2}
        style={{
          filter: active ? "drop-shadow(0 10px 18px rgba(0,0,0,0.18))" : "drop-shadow(0 4px 8px rgba(0,0,0,0.12))",
        }}
      />
      <image
        href={logoHref}
        x={-logoInset}
        y={-logoInset}
        width={logoSize}
        height={logoSize}
        preserveAspectRatio="xMidYMid meet"
        clipPath={`url(#${clipId})`}
      />
    </g>
  );
});
TeamLogoDot.displayName = "TeamLogoDot";

type SpringTeamIdentityTooltipProps = TooltipContentProps<number, string> & {
  mousePos: { x: number; y: number };
};

function SpringTeamIdentityTooltip({ active, payload, mousePos }: SpringTeamIdentityTooltipProps) {
  if (!active || !payload?.length) return null;
  const point = payload[0]?.payload as ChartPoint | undefined;
  if (!point) return null;

  return (
    <ChartTooltip
      usePortal
      portalProps={mousePos}
      title={point.teamName}
      value={`${point.challenges}`}
      subValueLabel="Challenges"
      extra={[
        { label: "Overturn Rate", value: `${(point.overturnRate * 100).toFixed(1)}%` },
        ...(point.lateShare != null ? [{ label: "Late Share", value: `${(point.lateShare * 100).toFixed(1)}%` }] : []),
      ]}
    />
  );
}

export function SpringTeamIdentityScatter({ data }: { data: SpringTeamIdentityPoint[] }) {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const chartData = useMemo(() => data.map((point) => ({ ...point, overturnPct: point.overturnRate * 100 })), [data]);

  const { avgChallenges, avgOverturnRate, xAxis, yAxis } = useMemo(() => {
    if (!data.length) {
      return {
        avgChallenges: 0,
        avgOverturnRate: 0,
        xAxis: buildLinearAxis([], { step: 10, min: 0, minSpan: 40 }),
        yAxis: buildLinearAxis([], { step: 10, min: 0, max: 100, minSpan: 20 }),
      };
    }

    return {
      avgChallenges: data.reduce((sum, point) => sum + point.challenges, 0) / data.length,
      avgOverturnRate: data.reduce((sum, point) => sum + point.overturnRate, 0) / data.length,
      xAxis: buildLinearAxis(data.map((point) => point.challenges), { step: 10, padding: 5, min: 0, minSpan: 40 }),
      yAxis: buildLinearAxis(data.map((point) => point.overturnRate * 100), { step: 10, padding: 5, min: 0, max: 100, minSpan: 20 }),
    };
  }, [data]);

  if (!data.length) return null;

  return (
    <div className="relative h-[420px] w-full" onMouseMove={(event) => setMousePos({ x: event.clientX, y: event.clientY })}>
      <div className="pointer-events-none absolute inset-0 z-10">
        <span className="absolute left-12 top-2 text-[9px] font-black uppercase tracking-[0.14em] text-blue-500/50">
          Selective Accuracy
        </span>
        <span className="absolute right-4 top-2 text-[9px] font-black uppercase tracking-[0.14em] text-emerald-500/50">
          Heavy And Sharp
        </span>
        <span className="absolute bottom-6 left-12 text-[9px] font-black uppercase tracking-[0.14em] text-red-400/50">
          Passive Or Cold
        </span>
        <span className="absolute bottom-6 right-4 text-[9px] font-black uppercase tracking-[0.14em] text-amber-500/50">
          High Volume, Mixed Return
        </span>
      </div>

      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={420}>
        <ScatterChart margin={{ top: 34, right: 96, bottom: 56, left: 78 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
          <XAxis
            type="number"
            dataKey="challenges"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 10, fill: "#86868b" }}
            tickFormatter={(value) => formatNumberTick(value, 0)}
            domain={xAxis.domain}
            ticks={xAxis.ticks}
          >
            <Label
              value="TOTAL CHALLENGES"
              position="bottom"
              offset={0}
              style={{ fontSize: 10, fill: "#86868b", fontWeight: 900, letterSpacing: "0.08em" }}
            />
          </XAxis>
          <YAxis
            type="number"
            dataKey="overturnPct"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 10, fill: "#86868b" }}
            tickFormatter={(value) => formatPercentTick(value)}
            domain={yAxis.domain}
            ticks={yAxis.ticks}
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
            x={avgChallenges}
            stroke="rgba(0,0,0,0.25)"
            strokeDasharray="4 4"
            label={{
              value: `AVG ${avgChallenges.toFixed(0)}`,
              position: "top",
              style: { fontSize: 10, fill: "#86868b", fontWeight: 900, letterSpacing: "0.08em" },
            }}
          />
          <ReferenceLine
            y={avgOverturnRate * 100}
            stroke="rgba(0,0,0,0.25)"
            strokeDasharray="4 4"
            label={{
              value: `AVG ${(avgOverturnRate * 100).toFixed(0)}%`,
              position: "right",
              style: { fontSize: 10, fill: "#86868b", fontWeight: 900, letterSpacing: "0.08em" },
            }}
          />
          <Scatter data={chartData} shape={(props) => <TeamLogoDot {...props} />} isAnimationActive={false} />
          <Tooltip
            content={(props) => <SpringTeamIdentityTooltip {...(props as TooltipContentProps<number, string>)} mousePos={mousePos} />}
            cursor={false}
            offset={0}
            allowEscapeViewBox={{ x: true, y: true }}
            wrapperStyle={{ visibility: "hidden", pointerEvents: "none" }}
            isAnimationActive={false}
            animationDuration={0}
          />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}
