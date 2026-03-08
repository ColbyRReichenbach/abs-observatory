"use client";

import { useMemo, memo } from "react";
import {
    ScatterChart,
    Scatter,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ReferenceLine,
    ResponsiveContainer,
    Label,
} from "recharts";
import { useRouter } from "next/navigation";
import { ChartTooltip } from "@/components/ui/chart-tooltip";
import { TeamIcon } from "@/components/team-icon";

type TeamScatterPoint = {
    teamId: number;
    teamName: string;
    logoUrl: string;
    challenges: number;
    overturnRate: number;
};

type Props = {
    data: TeamScatterPoint[];
};

/* ── Custom dot: Team logo image ── */
const TeamLogoDot = memo((props: { cx?: number; cy?: number; payload?: TeamScatterPoint }) => {
    const { cx, cy, payload } = props;
    if (!cx || !cy || !payload) return null;
    const size = 26;
    const containerSize = size + 20;

    return (
        <foreignObject
            x={cx - containerSize / 2}
            y={cy - containerSize / 2}
            width={containerSize}
            height={containerSize}
            style={{ overflow: 'visible' }}
        >
            <div className="w-full h-full flex items-center justify-center">
                <TeamIcon
                    teamId={payload.teamId}
                    name={payload.teamName}
                    size={size}
                    noShadow
                    loading="eager"
                    className="cursor-pointer"
                />
            </div>
        </foreignObject>
    );
});
TeamLogoDot.displayName = "TeamLogoDot";

const renderDot = (props: any) => <TeamLogoDot {...props} />;

/* ── Custom tooltip using ChartTooltip ── */
function ScatterTooltipContent({ active, payload }: { active?: boolean; payload?: Array<{ payload: TeamScatterPoint }> }) {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload as TeamScatterPoint;
    return (
        <ChartTooltip
            title={d.teamName}
            value={`${(d.overturnRate * 100).toFixed(1)}%`}
            label="Overturn Rate"
            extra={[{ label: "Total Challenges", value: d.challenges }]}
        />
    );
}

export function TeamScatterPlot({ data }: Props) {
    const router = useRouter();

    const { avgChallenges, avgOverturnRate } = useMemo(() => {
        if (data.length === 0) return { avgChallenges: 0, avgOverturnRate: 0 };
        const totalChallenges = data.reduce((s, d) => s + d.challenges, 0);
        const totalRate = data.reduce((s, d) => s + d.overturnRate, 0);
        return {
            avgChallenges: totalChallenges / data.length,
            avgOverturnRate: totalRate / data.length,
        };
    }, [data]);

    const chartData = useMemo(
        () => data.map((d) => ({ ...d, overturnPct: d.overturnRate * 100 })),
        [data],
    );

    if (data.length === 0) return null;

    return (
        <div className="panel overflow-hidden border-gray-100 bg-white shadow-2xl shadow-black/[0.03] p-6 mb-8">
            <div className="mb-6">
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-blue-500 mb-1">
                    Strategy Map
                </h4>
                <p className="text-2xl font-display leading-none text-gray-900">
                    Team <span className="text-gray-400">Positioning</span>
                </p>
            </div>

            <div className="relative h-[400px] w-full">
                {/* Quadrant labels */}
                <div className="pointer-events-none absolute inset-0 z-10">
                    <span className="absolute top-2 right-4 text-[9px] font-black uppercase tracking-[0.14em] text-emerald-500/50">
                        Surgical
                    </span>
                    <span className="absolute top-2 left-4 text-[9px] font-black uppercase tracking-[0.14em] text-blue-500/50">
                        Selective
                    </span>
                    <span className="absolute bottom-8 right-4 text-[9px] font-black uppercase tracking-[0.14em] text-amber-500/50">
                        Reckless
                    </span>
                    <span className="absolute bottom-8 left-4 text-[9px] font-black uppercase tracking-[0.14em] text-red-400/50">
                        Passive
                    </span>
                </div>

                <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart margin={{ top: 30, right: 30, bottom: 30, left: 30 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
                        <XAxis
                            type="number"
                            dataKey="challenges"
                            name="Challenges"
                            tickLine={false}
                            axisLine={false}
                            tick={{ fontSize: 10, fill: "#86868b" }}
                            padding={{ left: 20, right: 20 }}
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
                            name="Overturn Rate"
                            tickLine={false}
                            axisLine={false}
                            tick={{ fontSize: 10, fill: "#86868b" }}
                            tickFormatter={(v) => `${v}%`}
                            padding={{ top: 20, bottom: 20 }}
                        >
                            <Label
                                value="OVERTURN RATE"
                                angle={-90}
                                position="insideLeft"
                                offset={10}
                                style={{ fontSize: 10, fill: "#86868b", fontWeight: 900, letterSpacing: "0.08em" }}
                            />
                        </YAxis>

                        {/* League avg crosshair lines */}
                        <ReferenceLine
                            x={avgChallenges}
                            stroke="rgba(0,0,0,0.25)"
                            strokeDasharray="4 4"
                            label={{ value: "MLB AVG", position: "top", style: { fontSize: 10, fill: "#86868b", fontWeight: 900, letterSpacing: "0.08em" } }}
                        />
                        <ReferenceLine
                            y={avgOverturnRate * 100}
                            stroke="rgba(0,0,0,0.25)"
                            strokeDasharray="4 4"
                        />

                        <Scatter
                            data={chartData}
                            shape={renderDot}
                            activeShape={renderDot}
                            onClick={(entry) => {
                                if (entry?.teamId) router.push(`/teams/${entry.teamId}`);
                            }}
                            isAnimationActive={false}
                        />
                        <Tooltip
                            content={<ScatterTooltipContent />}
                            cursor={false}
                            wrapperStyle={{ zIndex: 1000 }}
                            isAnimationActive={false}
                            animationDuration={0}
                        />
                    </ScatterChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
