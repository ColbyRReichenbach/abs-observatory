"use client";

import { useMemo, useState } from "react";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip, Legend } from "recharts";
import type { PregameIntel } from "@/lib/types";
import { ChartTooltip } from "@/components/ui/chart-tooltip";
import { ClientOnly } from "@/components/ui/client-only";

export function MatchupRadarChart({
    intel,
    homeTeamName,
    awayTeamName,
    homeColor = "#3b82f6",
    awayColor = "#8b5cf6",
}: {
    intel: PregameIntel;
    homeTeamName: string;
    awayTeamName: string;
    homeColor?: string;
    awayColor?: string;
}) {
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    const formatValue = (aspect: string, value: unknown) => {
        if (typeof value !== "number") return String(value ?? "");
        if (aspect === "Success Rate %") return `${value.toFixed(1)}%`;
        return value.toFixed(0);
    };

    /* S3-9: Team-only axes — removed duplicated umpire tendency axes.
     * Axes now differentiate the two teams rather than repeating identical umpire data. */
    const data = useMemo(() => {
        return [
            {
                aspect: "Offensive Challenges",
                [homeTeamName]: intel.homeTeam.offensiveChallenges,
                [awayTeamName]: intel.awayTeam.offensiveChallenges,
                fullMark: Math.max(intel.homeTeam.offensiveChallenges, intel.awayTeam.offensiveChallenges, 10),
            },
            {
                aspect: "Defensive Challenges",
                [homeTeamName]: intel.homeTeam.defensiveChallenges,
                [awayTeamName]: intel.awayTeam.defensiveChallenges,
                fullMark: Math.max(intel.homeTeam.defensiveChallenges, intel.awayTeam.defensiveChallenges, 10),
            },
            {
                aspect: "Success Rate %",
                [homeTeamName]: intel.homeTeam.successRate * 100,
                [awayTeamName]: intel.awayTeam.successRate * 100,
                fullMark: 100,
            },
            {
                aspect: "Total Volume",
                [homeTeamName]: intel.homeTeam.offensiveChallenges + intel.homeTeam.defensiveChallenges,
                [awayTeamName]: intel.awayTeam.offensiveChallenges + intel.awayTeam.defensiveChallenges,
                fullMark: Math.max(
                    intel.homeTeam.offensiveChallenges + intel.homeTeam.defensiveChallenges,
                    intel.awayTeam.offensiveChallenges + intel.awayTeam.defensiveChallenges,
                    10,
                ),
            },
        ];
    }, [intel, homeTeamName, awayTeamName]);

    return (
        <div className="mt-4 h-[240px] min-w-0 w-full overflow-hidden sm:h-[250px]" onMouseMove={(event) => setMousePos({ x: event.clientX, y: event.clientY })}>
            <ClientOnly fallback={<div className="h-full w-full" />}>
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={240}>
                    <RadarChart cx="50%" cy="50%" outerRadius="58%" data={data} margin={{ top: 16, right: 12, bottom: 16, left: 12 }}>
                        <PolarGrid stroke="rgba(0,0,0,0.05)" />
                        <PolarAngleAxis
                            dataKey="aspect"
                            tick={{ fill: "#9ca3af", fontSize: 9, fontWeight: 700, letterSpacing: '0.04em' }}
                        />
                        <PolarRadiusAxis angle={30} domain={[0, 'auto']} tick={false} axisLine={false} />
                        <Tooltip
                            wrapperStyle={{ visibility: "hidden", pointerEvents: "none" }}
                            content={({ active, payload, label }) => {
                                if (active && payload && payload.length) {
                                    return (
                                        <ChartTooltip
                                            usePortal
                                            portalProps={mousePos}
                                            title={String(label ?? '')}
                                            extra={payload.map((entry) => ({
                                                label: String(entry.name),
                                                value: formatValue(String(label ?? ""), entry.value),
                                                color: String(entry.color ?? ''),
                                            }))}
                                        />
                                    );
                                }
                                return null;
                            }}
                        />
                        <Legend wrapperStyle={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 800, paddingTop: '6px' }} />
                        <Radar
                            name={homeTeamName}
                            dataKey={homeTeamName}
                            stroke={homeColor}
                            strokeWidth={2}
                            fill={homeColor}
                            fillOpacity={0.2}
                        />
                        <Radar
                            name={awayTeamName}
                            dataKey={awayTeamName}
                            stroke={awayColor}
                            strokeWidth={2}
                            fill={awayColor}
                            fillOpacity={0.2}
                        />
                    </RadarChart>
                </ResponsiveContainer>
            </ClientOnly>
        </div>
    );
}
