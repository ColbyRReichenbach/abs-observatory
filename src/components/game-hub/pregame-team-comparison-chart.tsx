"use client";

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from "recharts";

import { ChartTooltip } from "@/components/ui/chart-tooltip";
import type { GameChallengeOpportunityBoard, PregameIntel } from "@/lib/types";
import type { ViewMode } from "@/lib/view-mode";

const HOME_COLOR = "#2563eb";
const AWAY_COLOR = "#ef4444";

export function PregameTeamComparisonChart({
  intel,
  opportunityBoard,
  homeLabel,
  awayLabel,
  viewMode,
}: {
  intel: PregameIntel;
  opportunityBoard?: GameChallengeOpportunityBoard | null;
  homeLabel: string;
  awayLabel: string;
  viewMode: ViewMode;
}) {
  const modeledHome = summarizeModeledBoard(opportunityBoard, "home");
  const modeledAway = summarizeModeledBoard(opportunityBoard, "away");
  const data =
    viewMode === "org"
      ? [
          {
            metric: "Avg ELI",
            home: modeledHome.averageLeverage,
            away: modeledAway.averageLeverage,
            formatter: "number" as const,
          },
          {
            metric: "High-Pressure %",
            home: Math.round(modeledHome.highPressureShare * 100),
            away: Math.round(modeledAway.highPressureShare * 100),
            formatter: "percent" as const,
          },
          {
            metric: "Overturn %",
            home: Math.round(intel.homeTeam.successRate * 100),
            away: Math.round(intel.awayTeam.successRate * 100),
            formatter: "percent" as const,
          },
        ]
      : [
          {
            metric: "Offense",
            home: intel.homeTeam.offensiveChallenges,
            away: intel.awayTeam.offensiveChallenges,
            formatter: "count" as const,
          },
          {
            metric: "Defense",
            home: intel.homeTeam.defensiveChallenges,
            away: intel.awayTeam.defensiveChallenges,
            formatter: "count" as const,
          },
          {
            metric: "Overturn %",
            home: Math.round(intel.homeTeam.successRate * 100),
            away: Math.round(intel.awayTeam.successRate * 100),
            formatter: "percent" as const,
          },
        ];

  return (
    <section className="panel border border-gray-50 bg-white p-6 shadow-2xl shadow-black/[0.02]">
      <div className="mb-5">
        <h4 className="mb-1 text-[10px] font-bold uppercase tracking-widest text-blue-500">
          {viewMode === "org" ? "Team Challenge Profile" : "Club Comparison"}
        </h4>
        <p className="text-2xl font-display leading-none text-gray-900">
          Home vs Away <span className="text-gray-400">Profile</span>
        </p>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-4 text-[10px] font-black uppercase tracking-widest text-gray-400">
        <Legend color={HOME_COLOR} label={homeLabel} />
        <Legend color={AWAY_COLOR} label={awayLabel} />
      </div>

      <div className="h-[20rem] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barGap={10} barCategoryGap="20%">
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
            <XAxis
              dataKey="metric"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#6b7280", fontSize: 11, fontWeight: 700 }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#9ca3af", fontSize: 10, fontWeight: 700 }}
            />
            <Tooltip
              cursor={{ fill: "rgba(37, 99, 235, 0.05)" }}
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                const row = data.find((entry) => entry.metric === label);
                return (
                  <ChartTooltip
                    title={String(label)}
                    extra={[
                      {
                        label: homeLabel,
                        value: formatValue(payload[0]?.value, row?.formatter),
                        color: HOME_COLOR,
                      },
                      {
                        label: awayLabel,
                        value: formatValue(payload[1]?.value, row?.formatter),
                        color: AWAY_COLOR,
                      },
                    ]}
                  />
                );
              }}
            />
            <Bar dataKey="home" radius={[10, 10, 0, 0]} maxBarSize={42}>
              {data.map((_, index) => (
                <Cell key={`home-${index}`} fill={HOME_COLOR} />
              ))}
            </Bar>
            <Bar dataKey="away" radius={[10, 10, 0, 0]} maxBarSize={42}>
              {data.map((_, index) => (
                <Cell key={`away-${index}`} fill={AWAY_COLOR} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

function formatValue(value: unknown, mode: "count" | "percent" | "number" | undefined) {
  if (typeof value !== "number") return "N/A";
  if (mode === "percent") return `${value}%`;
  if (mode === "number") return value.toFixed(1);
  return `${value}`;
}

function summarizeModeledBoard(board: GameChallengeOpportunityBoard | null | undefined, side: "home" | "away") {
  if (!board) {
    return { averageLeverage: 0, highPressureShare: 0 };
  }
  const countKey = side === "home" ? "homeChallenges" : "awayChallenges";
  const leverageKey = side === "home" ? "homeAvgEstimatedLeverage" : "awayAvgEstimatedLeverage";
  const pressureKey = side === "home" ? "homeHighPressureShare" : "awayHighPressureShare";

  const totalChallenges = board.cells.reduce((sum, cell) => sum + cell[countKey], 0);
  if (!totalChallenges) {
    return { averageLeverage: 0, highPressureShare: 0 };
  }

  const weightedLeverage =
    board.cells.reduce((sum, cell) => sum + cell[countKey] * cell[leverageKey], 0) / totalChallenges;
  const weightedPressure =
    board.cells.reduce((sum, cell) => sum + cell[countKey] * cell[pressureKey], 0) / totalChallenges;

  return {
    averageLeverage: Number(weightedLeverage.toFixed(1)),
    highPressureShare: Number(weightedPressure.toFixed(4)),
  };
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-3 w-3 rounded-full" style={{ backgroundColor: color }} />
      <span>{label}</span>
    </div>
  );
}
