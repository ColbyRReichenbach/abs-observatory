"use client";

import { useMemo, memo, useState } from "react";
import {
    ScatterChart,
    Scatter,
    XAxis,
    YAxis,
    CartesianGrid,
    ReferenceLine,
    ResponsiveContainer,
    Label,
} from "recharts";
import type { ScatterShapeProps } from "recharts";
import { useRouter, useSearchParams } from "next/navigation";
import { ChartTooltip } from "@/components/ui/chart-tooltip";
import { buildLinearAxis, formatNumberTick, formatPercentTick } from "@/components/analytics/chart-axis";
import { resolveTeamBranding } from "@/lib/team-branding";
import { ClientOnly } from "@/components/ui/client-only";
import { withViewModeHref } from "@/lib/view-mode-href";

type TeamScatterPoint = {
    teamId: number;
    teamName: string;
    logoUrl: string;
    challengeRatePerGame: number;
    overturnRate: number;
};

type TeamScatterChartPoint = TeamScatterPoint & {
    overturnPct: number;
};

type Props = {
    data: TeamScatterPoint[];
    mode?: "fan" | "org";
};

type TeamLogoDotProps = {
    cx?: number;
    cy?: number;
    payload?: TeamScatterChartPoint;
    active?: boolean;
    onMouseEnter?: () => void;
    onMouseLeave?: () => void;
    onClick?: () => void;
};

/* ── Custom dot: Team logo image ── */
const TeamLogoDot = memo((props: TeamLogoDotProps) => {
    const { cx, cy, payload, active, onMouseEnter, onMouseLeave, onClick } = props;
    if (cx == null || cy == null || !payload) return null;

    const logoSize = active ? 30 : 18;
    const badgeRadius = active ? 22 : 13;
    const ringRadius = active ? 25.5 : 15.5;
    const logoInset = logoSize / 2;
    const clipId = `team-scatter-logo-${payload.teamId}-${active ? "active" : "base"}`;
    const branding = resolveTeamBranding({ teamId: payload.teamId });
    const logoHref = `https://www.mlbstatic.com/team-logos/team-cap-on-dark/${payload.teamId}.svg`;

    return (
        <g
            transform={`translate(${cx}, ${cy})`}
            style={{
                pointerEvents: "auto",
                transition: "transform 220ms ease-out",
            }}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
            onClick={onClick}
        >
            <defs>
                <clipPath id={clipId}>
                    <circle r={logoInset} />
                </clipPath>
            </defs>
            <circle
                r={ringRadius}
                fill={active ? branding.tokens.teamPrimary : "rgba(255,255,255,0.92)"}
                fillOpacity={active ? 0.16 : 0}
            />
            <circle
                r={badgeRadius}
                fill={branding.tokens.teamPrimary}
                stroke="rgba(255,255,255,0.96)"
                strokeWidth={active ? 2.5 : 2}
                style={{
                    filter: active ? "drop-shadow(0 10px 18px rgba(0,0,0,0.18))" : "drop-shadow(0 4px 8px rgba(0,0,0,0.12))",
                    transition: "all 220ms ease-out",
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

export function TeamScatterPlot({ data, mode = "fan" }: Props) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    const [hoveredTeamId, setHoveredTeamId] = useState<number | null>(null);

    const { xAxis, yAxis, avgChallengeRate, avgOverturnRate, xTickDigits } = useMemo(() => {
        if (data.length === 0) {
            return {
                xAxis: buildLinearAxis([], { step: 0.5, min: 0, minSpan: 2 }),
                yAxis: buildLinearAxis([], { step: 10, min: 0, max: 100, minSpan: 20 }),
                avgChallengeRate: 0,
                avgOverturnRate: 0,
                xTickDigits: 1,
            };
        }

        const xValues = data.map(d => d.challengeRatePerGame);
        const yValues = data.map(d => d.overturnRate * 100);
        const maxX = Math.max(...xValues);
        const xStep = maxX > 4 ? 1 : 0.5;

        const totalChallengeRate = data.reduce((s, d) => s + d.challengeRatePerGame, 0);
        const totalRate = data.reduce((s, d) => s + d.overturnRate, 0);

        return {
            xAxis: buildLinearAxis(xValues, { step: xStep, padding: xStep / 2, min: 0, minSpan: xStep * 4 }),
            yAxis: buildLinearAxis(yValues, { step: 10, padding: 5, min: 0, max: 100, minSpan: 20 }),
            avgChallengeRate: totalChallengeRate / data.length,
            avgOverturnRate: totalRate / data.length,
            xTickDigits: xStep < 1 ? 1 : 0,
        };
    }, [data]);

    const chartData = useMemo(
        () => data.map((d) => ({ ...d, overturnPct: d.overturnRate * 100 })),
        [data],
    );
    const hoveredPoint = useMemo(
        () => chartData.find((point) => point.teamId === hoveredTeamId) ?? null,
        [chartData, hoveredTeamId],
    );

    if (data.length === 0) return null;

    return (
        <div className="panel overflow-visible border-gray-100 bg-white shadow-2xl shadow-black/[0.03] p-6 mb-8">
            <div className="mb-6">
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-blue-500 mb-1">
                    {mode === "org" ? "Strategy Map" : "Identity Map"}
                </h4>
                <p className="text-2xl font-display leading-none text-gray-900">
                    Team <span className="text-gray-400">{mode === "org" ? "Review Patterns" : "Review Profiles"}</span>
                </p>
            </div>

            <div
                className="relative h-[400px] w-full"
                onMouseMove={(event) => setMousePos({ x: event.clientX, y: event.clientY })}
                onMouseLeave={() => setHoveredTeamId(null)}
            >
                {/* Quadrant labels */}
                <div className="pointer-events-none absolute inset-0 z-10">
                    <span className="absolute top-2 right-4 text-[9px] font-black uppercase tracking-[0.14em] text-emerald-500/50">
                        {mode === "org" ? "Timely" : "High-Impact"}
                    </span>
                    <span className="absolute top-2 left-12 text-[9px] font-black uppercase tracking-[0.14em] text-blue-500/50">
                        Selective
                    </span>
                    <span className="absolute bottom-6 right-4 text-[9px] font-black uppercase tracking-[0.14em] text-amber-500/50">
                        {mode === "org" ? "High-Usage" : "Overactive"}
                    </span>
                    <span className="absolute bottom-6 left-12 text-[9px] font-black uppercase tracking-[0.14em] text-red-400/50">
                        Low-Usage
                    </span>
                </div>

                <ClientOnly fallback={<div className="h-full w-full rounded-[1.5rem] bg-gradient-to-br from-gray-100 via-gray-50 to-white" />}>
                    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={400}>
                        <ScatterChart
                            margin={{ top: 40, right: 100, bottom: 60, left: 80 }}
                            style={{ overflow: 'visible' }}
                        >
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
                            <XAxis
                                type="number"
                                dataKey="challengeRatePerGame"
                                name="Challenge Rate / Game"
                                tickLine={false}
                                axisLine={false}
                                tick={{ fontSize: 10, fill: "#86868b" }}
                                tickFormatter={(v) => formatNumberTick(v, xTickDigits)}
                                padding={{ left: 0, right: 0 }}
                                domain={xAxis.domain}
                                ticks={xAxis.ticks}
                                allowDataOverflow={false}
                            >
                                <Label
                                    value="CHALLENGE RATE / GAME"
                                    position="bottom"
                                    offset={0}
                                    style={{ fontSize: 10, fill: "#86868b", fontWeight: 900, letterSpacing: "0.08em" }}
                                />
                            </XAxis>
                            <YAxis
                                type="number"
                                dataKey="overturnPct"
                                name="Overturn Rate"
                                tickLine={false}
                                axisLine={false}
                                tick={{ fontSize: 10, fill: "#86868b" }}
                                tickFormatter={(v) => formatPercentTick(v)}
                                padding={{ top: 0, bottom: 0 }}
                                domain={yAxis.domain}
                                ticks={yAxis.ticks}
                                allowDataOverflow={false}
                            >
                                <Label
                                    value="OVERTURN RATE"
                                    angle={-90}
                                    position="insideLeft"
                                    offset={10}
                                    style={{ fontSize: 10, fill: "#86868b", fontWeight: 900, letterSpacing: "0.08em" }}
                                />
                            </YAxis>

                            <ReferenceLine
                                x={avgChallengeRate}
                                stroke="rgba(0,0,0,0.25)"
                                strokeDasharray="4 4"
                                label={{ value: `MLB AVG ${avgChallengeRate.toFixed(1)}`, position: "top", style: { fontSize: 10, fill: "#86868b", fontWeight: 900, letterSpacing: "0.08em" } }}
                            />
                            <ReferenceLine
                                y={avgOverturnRate * 100}
                                stroke="rgba(0,0,0,0.25)"
                                strokeDasharray="4 4"
                                label={{ value: `MLB AVG ${(avgOverturnRate * 100).toFixed(0)}%`, position: "right", style: { fontSize: 10, fill: "#86868b", fontWeight: 900, letterSpacing: "0.08em" } }}
                            />

                            <Scatter
                                data={chartData}
                                shape={(props: ScatterShapeProps) => {
                                    const payload = props.payload as TeamScatterChartPoint | undefined;
                                    return (
                                        <TeamLogoDot
                                            {...props}
                                            payload={payload}
                                            active={payload?.teamId === hoveredTeamId}
                                            onMouseEnter={() => {
                                                if (payload?.teamId != null) setHoveredTeamId(payload.teamId);
                                            }}
                                            onMouseLeave={() => setHoveredTeamId(null)}
                                            onClick={() => {
                                                const currentMode = searchParams.get("view");
                                                if (payload?.teamId) {
                                                    router.push(
                                                        withViewModeHref(
                                                            `/teams/${payload.teamId}`,
                                                            currentMode === "fan" || currentMode === "org" ? currentMode : undefined,
                                                        ),
                                                    );
                                                }
                                            }}
                                        />
                                    );
                                }}
                                isAnimationActive={false}
                            />
                        </ScatterChart>
                    </ResponsiveContainer>
                </ClientOnly>

                {hoveredPoint ? (
                    <ChartTooltip
                        usePortal
                        portalProps={mousePos}
                        title={hoveredPoint.teamName}
                        value={`${(hoveredPoint.overturnRate * 100).toFixed(2)}%`}
                        subValueLabel="Overturn Rate"
                        extra={[{ label: "Rate / Game", value: hoveredPoint.challengeRatePerGame.toFixed(2) }]}
                    />
                ) : null}
            </div>
        </div>
    );
}
