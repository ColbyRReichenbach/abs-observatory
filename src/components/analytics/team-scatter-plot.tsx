"use client";

import { useMemo, memo, useRef, useState, useEffect } from "react";
import {
    ScatterChart,
    Scatter,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ReferenceLine,
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

function getActiveScatterPoint(state: unknown): TeamScatterChartPoint | null {
    if (!state || typeof state !== "object" || !("activePayload" in state)) return null;
    const activePayload = (state as { activePayload?: Array<{ payload?: unknown }> }).activePayload;
    const point = activePayload?.[0]?.payload;
    if (!point || typeof point !== "object" || !("teamId" in point)) return null;
    return point as TeamScatterChartPoint;
}

function getTooltipPortalPosition(
    container: HTMLDivElement | null,
    coordinate: unknown,
): { x: number; y: number } | null {
    if (!container || !coordinate || typeof coordinate !== "object") return null;
    const maybeCoordinate = coordinate as { x?: unknown; y?: unknown };
    if (typeof maybeCoordinate.x !== "number" || typeof maybeCoordinate.y !== "number") return null;
    const rect = container.getBoundingClientRect();
    return {
        x: rect.left + maybeCoordinate.x,
        y: rect.top + maybeCoordinate.y,
    };
}

type Props = {
    data: TeamScatterPoint[];
    mode?: "fan" | "org";
};

type TeamLogoDotProps = {
    cx?: number;
    cy?: number;
    payload?: TeamScatterChartPoint;
    active?: boolean;
    compact?: boolean;
    onMouseEnter?: () => void;
    onMouseLeave?: () => void;
    onClick?: () => void;
};

/* ── Custom dot: Team logo image ── */
const TeamLogoDot = memo((props: TeamLogoDotProps) => {
    const { cx, cy, payload, active, compact = false, onMouseEnter, onMouseLeave, onClick } = props;
    if (cx == null || cy == null || !payload) return null;

    const logoSize = active ? (compact ? 24 : 30) : (compact ? 14 : 18);
    const badgeRadius = active ? (compact ? 18 : 22) : (compact ? 10 : 13);
    const ringRadius = active ? (compact ? 21 : 25.5) : (compact ? 12.5 : 15.5);
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
    const [hoveredTeamId, setHoveredTeamId] = useState<number | null>(null);
    const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [containerWidth, setContainerWidth] = useState(0);

    useEffect(() => {
        if (!containerRef.current) return;
        const measure = () => setContainerWidth(containerRef.current?.clientWidth ?? 0);
        measure();
        const observer = new ResizeObserver(() => measure());
        observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, []);

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

    if (data.length === 0) return null;

    const isCompact = containerWidth > 0 && containerWidth < 640;
    const isTablet = containerWidth >= 640 && containerWidth < 900;
    const chartHeight = isCompact ? 440 : 400;
    const chartMargin = isCompact
        ? { top: 42, right: 18, bottom: 62, left: 42 }
        : isTablet
            ? { top: 40, right: 48, bottom: 60, left: 60 }
            : { top: 40, right: 100, bottom: 60, left: 80 };
    const axisLabelStyle = {
        fontSize: isCompact ? 9 : 10,
        fill: "#86868b",
        fontWeight: 900,
        letterSpacing: isCompact ? "0.04em" : "0.08em",
    };

    return (
        <div className="panel mb-8 overflow-visible border-gray-100 bg-white p-5 shadow-2xl shadow-black/[0.03] sm:p-6">
            <div className="mb-6">
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-blue-500 mb-1">
                    {mode === "org" ? "Strategy Map" : "Identity Map"}
                </h4>
                <p className="text-2xl font-display leading-none text-gray-900">
                    Team <span className="text-gray-400">{mode === "org" ? "Review Patterns" : "Review Profiles"}</span>
                </p>
            </div>

            <div
                ref={containerRef}
                className="relative w-full"
                style={{ height: chartHeight }}
                onMouseMove={(event) => setMousePos({ x: event.clientX, y: event.clientY })}
                onMouseLeave={() => {
                    setHoveredTeamId(null);
                }}
            >
                {/* Quadrant labels */}
                <div className="pointer-events-none absolute inset-0 z-10">
                    <span className="absolute top-2 right-1 text-[8px] font-black uppercase tracking-[0.1em] text-emerald-500/50 sm:right-4 sm:text-[9px] sm:tracking-[0.14em]">
                        {mode === "org" ? "Timely" : "High-Impact"}
                    </span>
                    <span className="absolute top-2 left-10 text-[8px] font-black uppercase tracking-[0.1em] text-blue-500/50 sm:left-12 sm:text-[9px] sm:tracking-[0.14em]">
                        Selective
                    </span>
                    <span className="absolute bottom-8 right-1 text-[8px] font-black uppercase tracking-[0.1em] text-amber-500/50 sm:bottom-6 sm:right-4 sm:text-[9px] sm:tracking-[0.14em]">
                        {mode === "org" ? "High-Usage" : "Overactive"}
                    </span>
                    <span className="absolute bottom-8 left-10 text-[8px] font-black uppercase tracking-[0.1em] text-red-400/50 sm:bottom-6 sm:left-12 sm:text-[9px] sm:tracking-[0.14em]">
                        Low-Usage
                    </span>
                </div>

                <ClientOnly fallback={<div className="h-full w-full rounded-[1.5rem] bg-gradient-to-br from-gray-100 via-gray-50 to-white" />}>
                    {containerWidth > 0 ? (
                        <ScatterChart
                            width={containerWidth}
                            height={chartHeight}
                            margin={chartMargin}
                            style={{ overflow: 'visible' }}
                            onMouseMove={(state: unknown) => {
                                const point = getActiveScatterPoint(state);
                                setHoveredTeamId(point?.teamId ?? null);
                            }}
                            onMouseLeave={() => {
                                setHoveredTeamId(null);
                            }}
                        >
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
                            <XAxis
                                type="number"
                                dataKey="challengeRatePerGame"
                                name="Challenge Rate / Game"
                                tickLine={false}
                                axisLine={false}
                                tick={{ fontSize: isCompact ? 9 : 10, fill: "#86868b" }}
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
                                    style={axisLabelStyle}
                                />
                            </XAxis>
                            <YAxis
                                type="number"
                                dataKey="overturnPct"
                                name="Overturn Rate"
                                tickLine={false}
                                axisLine={false}
                                tick={{ fontSize: isCompact ? 9 : 10, fill: "#86868b" }}
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
                                    offset={isCompact ? -2 : 10}
                                    style={axisLabelStyle}
                                />
                            </YAxis>

                            <ReferenceLine
                                x={avgChallengeRate}
                                stroke="rgba(0,0,0,0.25)"
                                strokeDasharray="4 4"
                                label={{ value: `MLB AVG ${avgChallengeRate.toFixed(1)}`, position: "top", style: axisLabelStyle }}
                            />
                            <ReferenceLine
                                y={avgOverturnRate * 100}
                                stroke="rgba(0,0,0,0.25)"
                                strokeDasharray="4 4"
                                label={{ value: isCompact ? `${(avgOverturnRate * 100).toFixed(0)}% AVG` : `MLB AVG ${(avgOverturnRate * 100).toFixed(0)}%`, position: "right", style: axisLabelStyle }}
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
                                            compact={isCompact}
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
                            <Tooltip
                                cursor={false}
                                offset={0}
                                allowEscapeViewBox={{ x: true, y: true }}
                                wrapperStyle={{ visibility: "hidden", pointerEvents: "none" }}
                                isAnimationActive={false}
                                animationDuration={0}
                                content={({ active, payload, coordinate }) => {
                                    const point = payload?.[0]?.payload as TeamScatterChartPoint | undefined;
                                    const tooltipPosition = mousePos ?? getTooltipPortalPosition(containerRef.current, coordinate);
                                    if (!active || !point || !tooltipPosition) return null;
                                    return (
                                        <ChartTooltip
                                            title={point.teamName}
                                            value={`${(point.overturnRate * 100).toFixed(2)}%`}
                                            subValueLabel="Overturn Rate"
                                            extra={[{ label: "Rate / Game", value: point.challengeRatePerGame.toFixed(2) }]}
                                            usePortal
                                            portalProps={tooltipPosition}
                                        />
                                    );
                                }}
                            />
                        </ScatterChart>
                    ) : (
                        <div className="h-full w-full rounded-[1.5rem] bg-gradient-to-br from-gray-100 via-gray-50 to-white" />
                    )}
                </ClientOnly>
            </div>
        </div>
    );
}
