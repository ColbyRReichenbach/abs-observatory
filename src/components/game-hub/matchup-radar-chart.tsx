"use client";

import { useMemo } from "react";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip, Legend } from "recharts";
import type { PregameIntel } from "@/lib/types";

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
    const data = useMemo(() => {
        return [
            {
                aspect: "Offensive Aggression",
                [homeTeamName]: intel.homeTeam.offensiveChallenges,
                [awayTeamName]: intel.awayTeam.offensiveChallenges,
                fullMark: Math.max(intel.homeTeam.offensiveChallenges, intel.awayTeam.offensiveChallenges, 10)
            },
            {
                aspect: "Defensive Aggression",
                [homeTeamName]: intel.homeTeam.defensiveChallenges,
                [awayTeamName]: intel.awayTeam.defensiveChallenges,
                fullMark: Math.max(intel.homeTeam.defensiveChallenges, intel.awayTeam.defensiveChallenges, 10)
            },
            {
                aspect: "Challenge Success %",
                [homeTeamName]: intel.homeTeam.successRate * 100,
                [awayTeamName]: intel.awayTeam.successRate * 100,
                fullMark: 100
            },
            {
                aspect: "Ump High-Zone Strike %",
                [homeTeamName]: intel.umpireTendency.highZoneAccuracy * 100,
                [awayTeamName]: intel.umpireTendency.highZoneAccuracy * 100,
                fullMark: 100
            },
            {
                aspect: "Ump Low-Zone Strike %",
                [homeTeamName]: intel.umpireTendency.lowZoneAccuracy * 100,
                [awayTeamName]: intel.umpireTendency.lowZoneAccuracy * 100,
                fullMark: 100
            }
        ];
    }, [intel, homeTeamName, awayTeamName]);

    return (
        <div className="h-[250px] w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
                    <PolarGrid stroke="rgba(0,0,0,0.05)" />
                    <PolarAngleAxis
                        dataKey="aspect"
                        tick={{ fill: "#9ca3af", fontSize: 10, fontWeight: 700, letterSpacing: '0.05em' }}
                    />
                    <PolarRadiusAxis angle={30} domain={[0, 'auto']} tick={false} axisLine={false} />
                    <Tooltip
                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }}
                        itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                        labelStyle={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#9ca3af', marginBottom: '8px' }}
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
