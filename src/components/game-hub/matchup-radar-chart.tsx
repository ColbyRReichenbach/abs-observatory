"use client";

import { useMemo } from "react";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip, Legend } from "recharts";
import type { PregameIntel } from "@/lib/types";
import { ChartTooltip } from "@/components/ui/chart-tooltip";

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
        <div className="h-[250px] w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="65%" data={data} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                    <PolarGrid stroke="rgba(0,0,0,0.05)" />
                    <PolarAngleAxis
                        dataKey="aspect"
                        tick={{ fill: "#9ca3af", fontSize: 10, fontWeight: 700, letterSpacing: '0.05em' }}
                    />
                    <PolarRadiusAxis angle={30} domain={[0, 'auto']} tick={false} axisLine={false} />
                    <Tooltip
                        content={({ active, payload, label }) => {
                            if (active && payload && payload.length) {
                                return (
                                    <ChartTooltip
                                        title={String(label ?? '')}
                                        extra={payload.map((entry) => ({
                                            label: String(entry.name),
                                            value: typeof entry.value === 'number' ? entry.value.toFixed(1) : String(entry.value ?? ''),
                                            color: String(entry.color ?? ''),
                                        }))}
                                    />
                                );
                            }
                            return null;
                        }}
                    />
                    <Legend wrapperStyle={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 800 }} />
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
        </div>
    );
}
