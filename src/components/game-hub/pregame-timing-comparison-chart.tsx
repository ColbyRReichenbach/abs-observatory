"use client";

import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";

import { ChartTooltip } from "@/components/ui/chart-tooltip";
import type { PregameIntel } from "@/lib/types";
import type { ViewMode } from "@/lib/view-mode";

const LEAGUE_COLOR = "#94a3b8";

export function PregameTimingComparisonChart({
  intel,
  homeLabel,
  awayLabel,
  homeColor,
  awayColor,
  viewMode,
}: {
  intel: PregameIntel;
  homeLabel: string;
  awayLabel: string;
  homeColor: string;
  awayColor: string;
  viewMode: ViewMode;
}) {
  const data = Array.from({ length: 9 }, (_, index) => ({
    inning: index + 1,
    home: intel.challengeTiming.home[index] ?? 0,
    away: intel.challengeTiming.away[index] ?? 0,
    league: intel.challengeTiming.leagueAverage[index] ?? 0,
  }));

  return (
    <section className="panel border border-gray-50 bg-white p-6 shadow-2xl shadow-black/[0.02]">
      <div className="mb-5">
        <h4 className="mb-1 text-[10px] font-bold uppercase tracking-widest text-blue-500">
          {viewMode === "org" ? "Timing Pressure" : "Challenge Rhythm"}
        </h4>
        <p className="text-2xl font-display leading-none text-gray-900">
          Inning by Inning <span className="text-gray-400">Shape</span>
        </p>
        <p className="mt-2 text-[11px] font-medium leading-relaxed text-[var(--ink-2)]">
          {viewMode === "org"
            ? "Each line shows where a club tends to allocate its tracked challenge volume by inning, normalized to share instead of raw count."
            : "These lines show when each team tends to use its challenges across the game, normalized so timing preference is easier to compare than sheer volume."}
        </p>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-4 text-[10px] font-black uppercase tracking-widest text-gray-400">
        <Legend color={homeColor} label={homeLabel} />
        <Legend color={awayColor} label={awayLabel} />
        <Legend color={LEAGUE_COLOR} label="League" />
      </div>

      <div className="h-[20rem] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 12, left: -14, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
            <XAxis
              dataKey="inning"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#6b7280", fontSize: 11, fontWeight: 700 }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#9ca3af", fontSize: 10, fontWeight: 700 }}
              tickFormatter={(value) => `${Math.round(Number(value) * 100)}%`}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                return (
                  <ChartTooltip
                    title={`Inning ${label}`}
                    extra={[
                      { label: homeLabel, value: `${Math.round(Number(payload[0]?.value ?? 0) * 100)}%`, color: homeColor },
                      { label: awayLabel, value: `${Math.round(Number(payload[1]?.value ?? 0) * 100)}%`, color: awayColor },
                      { label: "League", value: `${Math.round(Number(payload[2]?.value ?? 0) * 100)}%`, color: LEAGUE_COLOR },
                    ]}
                  />
                );
              }}
            />
            <Line type="monotone" dataKey="home" stroke={homeColor} strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 5 }} />
            <Line type="monotone" dataKey="away" stroke={awayColor} strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 5 }} />
            <Line type="monotone" dataKey="league" stroke={LEAGUE_COLOR} strokeWidth={2} strokeDasharray="4 4" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-3 w-3 rounded-full" style={{ backgroundColor: color }} />
      <span>{label}</span>
    </div>
  );
}
