"use client";

import { useMemo, useState } from "react";
import {
  Legend,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

import { ChartTooltip } from "@/components/ui/chart-tooltip";
import { ClientOnly } from "@/components/ui/client-only";
import type { UmpirePitchTypeBreakdown } from "@/lib/types";

const PITCH_COLORS: Record<string, string> = {
  FF: "#ef4444",
  SI: "#f97316",
  FC: "#f59e0b",
  SL: "#3b82f6",
  CU: "#8b5cf6",
  CH: "#10b981",
  FS: "#06b6d4",
  KC: "#a855f7",
  ST: "#ec4899",
  SV: "#6366f1",
  UN: "#9ca3af",
};

const AXES = [
  { key: "reviewShare", label: "Review Share" },
  { key: "overturnRate", label: "OT Rate" },
  { key: "volumeIndex", label: "Volume Index" },
  { key: "overturnedShare", label: "Overturned Share" },
  { key: "pressureIndex", label: "Pressure Index" },
] as const;

function getColor(code: string): string {
  return PITCH_COLORS[code] ?? "#6b7280";
}

export function PitchTypeBreakdownChart({ data }: { data: UmpirePitchTypeBreakdown[] }) {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const featuredPitches = useMemo(() => {
    const sorted = [...data]
      .sort((left, right) => right.challengedCount - left.challengedCount)
      .slice(0, Math.min(5, data.length));

    const totalChallenges = Math.max(1, sorted.reduce((sum, entry) => sum + entry.challengedCount, 0));
    const totalOverturned = Math.max(1, sorted.reduce((sum, entry) => sum + entry.overturnedCount, 0));
    const maxChallenges = Math.max(...sorted.map((entry) => entry.challengedCount), 1);

    return sorted.map((entry) => {
      const reviewShare = (entry.challengedCount / totalChallenges) * 100;
      const overturnRate = entry.overturnRate * 100;
      const volumeIndex = (entry.challengedCount / maxChallenges) * 100;
      const overturnedShare = (entry.overturnedCount / totalOverturned) * 100;
      const pressureIndex = Math.min(100, reviewShare * 0.45 + overturnRate * 0.55);

      return {
        code: entry.pitchTypeCode,
        name: entry.pitchTypeName,
        color: getColor(entry.pitchTypeCode),
        challenged: entry.challengedCount,
        overturned: entry.overturnedCount,
        overturnRate: entry.overturnRate,
        metrics: {
          reviewShare,
          overturnRate,
          volumeIndex,
          overturnedShare,
          pressureIndex,
        },
      };
    });
  }, [data]);

  if (data.length === 0) {
    return (
      <div className="panel bg-white p-8 text-center text-sm font-medium text-gray-400">
        No pitch type data available for the selected range.
      </div>
    );
  }

  const chartData = AXES.map((axis) => {
    const row: Record<string, number | string> = {
      axis: axis.label,
    };
    for (const pitch of featuredPitches) {
      row[pitch.code] = pitch.metrics[axis.key];
    }
    return row;
  });

  return (
    <section className="panel bg-white p-8">
      <div className="mb-6">
        <h4 className="mb-1 text-[10px] font-bold uppercase tracking-widest text-blue-500">
          Pitch Review Shape
        </h4>
        <p className="text-2xl font-display leading-none text-gray-900">
          Pitch-Family <span className="text-gray-400 italic">Radar</span>
        </p>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-500">
          Each polygon is a pitch family. The radar compares review share, overturn rate, normalized volume, and
          how much of the umpire&apos;s overturned sample is tied to that pitch shape.
        </p>
      </div>

      <div
        className="rounded-[2rem] border border-gray-100 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.05),transparent_58%)] p-4 sm:p-6"
        onMouseMove={(event) => setMousePos({ x: event.clientX, y: event.clientY })}
      >
        <div className="h-[420px]">
          <ClientOnly fallback={<div className="h-full w-full" />}>
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={chartData} outerRadius="68%">
                <PolarGrid stroke="rgba(17,24,39,0.14)" />
                <PolarAngleAxis
                  dataKey="axis"
                  tick={{ fill: "#6b7280", fontSize: 11, fontWeight: 800 }}
                />
                <PolarRadiusAxis
                  angle={18}
                  domain={[0, 100]}
                  tick={{ fill: "#9ca3af", fontSize: 10, fontWeight: 700 }}
                  tickCount={6}
                />
                <Tooltip
                  wrapperStyle={{ visibility: "hidden", pointerEvents: "none" }}
                  content={({ active, payload, label }) => {
                    if (!active || !payload || payload.length === 0) return null;
                    return (
                      <ChartTooltip
                        usePortal
                        portalProps={mousePos}
                        title={String(label ?? "")}
                        extra={payload.map((entry) => ({
                          label: String(entry.name ?? ""),
                          value: `${Number(entry.value ?? 0).toFixed(1)}%`,
                          color: String(entry.color ?? ""),
                        }))}
                      />
                    );
                  }}
                />
                <Legend
                  wrapperStyle={{
                    fontSize: "10px",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    fontWeight: 800,
                    paddingTop: "8px",
                  }}
                />
                {featuredPitches.map((pitch) => (
                  <Radar
                    key={pitch.code}
                    name={`${pitch.code} · ${pitch.name}`}
                    dataKey={pitch.code}
                    stroke={pitch.color}
                    fill={pitch.color}
                    fillOpacity={0.16}
                    strokeWidth={2}
                    dot={{ r: 3, fill: pitch.color, strokeWidth: 0 }}
                  />
                ))}
              </RadarChart>
            </ResponsiveContainer>
          </ClientOnly>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {featuredPitches.map((pitch) => (
            <div
              key={`${pitch.code}-summary`}
              className="rounded-[1.25rem] border border-gray-100 bg-white/90 px-4 py-4"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: pitch.color }} />
                  <span className="text-sm font-semibold text-gray-900">{pitch.name}</span>
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">{pitch.code}</span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-4">
                <Metric label="Reviews" value={`${pitch.challenged}`} />
                <Metric label="OT Rate" value={`${(pitch.overturnRate * 100).toFixed(1)}%`} />
                <Metric label="Review Share" value={`${pitch.metrics.reviewShare.toFixed(0)}%`} />
                <Metric label="Pressure" value={`${pitch.metrics.pressureIndex.toFixed(0)}`} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{label}</p>
      <p className="mt-1 text-lg font-display text-gray-900">{value}</p>
    </div>
  );
}
