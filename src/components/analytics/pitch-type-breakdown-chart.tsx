"use client";

import type { CSSProperties } from "react";

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

function getColor(code: string): string {
  return PITCH_COLORS[code] ?? "#6b7280";
}

type PositionedPitch = {
  code: string;
  name: string;
  challenged: number;
  overturned: number;
  overturnRate: number;
  color: string;
  left: string;
  top: string;
  radiusPx: number;
  angleDeg: number;
  distancePx: number;
};

export function PitchTypeBreakdownChart({ data }: { data: UmpirePitchTypeBreakdown[] }) {
  if (data.length === 0) {
    return (
      <div className="panel bg-white p-8 text-center text-sm font-medium text-gray-400">
        No pitch type data available for the selected range.
      </div>
    );
  }

  const chartData = [...data]
    .sort((left, right) => right.challengedCount - left.challengedCount)
    .map((entry) => ({
      code: entry.pitchTypeCode,
      name: entry.pitchTypeName,
      challenged: entry.challengedCount,
      overturned: entry.overturnedCount,
      overturnRate: entry.overturnRate,
      color: getColor(entry.pitchTypeCode),
    }));

  const featuredPitches = chartData.slice(0, Math.min(6, chartData.length));
  const totalChallenges = chartData.reduce((sum, entry) => sum + entry.challenged, 0);
  const totalOverturned = chartData.reduce((sum, entry) => sum + entry.overturned, 0);
  const maxChallenges = Math.max(...featuredPitches.map((entry) => entry.challenged), 1);
  const maxRate = Math.max(...featuredPitches.map((entry) => entry.overturnRate), 0.01);

  const positionedPitches: PositionedPitch[] = featuredPitches.map((entry, index, source) => {
    const angle = (-Math.PI / 2) + (index / source.length) * Math.PI * 2;
    const distancePx = 92 + (entry.challenged / maxChallenges) * 46;
    const radiusPx = 16 + (entry.overturnRate / maxRate) * 14;

    return {
      ...entry,
      left: `calc(50% + ${Math.cos(angle) * distancePx}px)`,
      top: `calc(50% + ${Math.sin(angle) * distancePx}px)`,
      radiusPx,
      angleDeg: (angle * 180) / Math.PI,
      distancePx,
    };
  });

  return (
    <section className="panel bg-white p-8">
      <div className="mb-6">
        <h4 className="mb-1 text-[10px] font-bold uppercase tracking-widest text-blue-500">
          Pitch Review Shape
        </h4>
        <p className="text-2xl font-display leading-none text-gray-900">
          Review <span className="text-gray-400 italic">Pressure by Pitch Family</span>
        </p>
        <p className="mt-3 max-w-xl text-sm leading-6 text-gray-500">
          Spoke length tracks review volume. Node size grows with overturn rate so the highest-pressure pitch families
          stand out immediately.
        </p>
      </div>

      <div className="rounded-[2rem] border border-gray-100 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.07),transparent_55%)] p-6">
        <div className="relative mx-auto aspect-square max-w-[360px]">
          <svg className="absolute inset-0 h-full w-full" viewBox="0 0 360 360" aria-hidden="true">
            <circle cx="180" cy="180" r="118" fill="none" stroke="#eef2f7" strokeDasharray="4 8" />
            <circle cx="180" cy="180" r="82" fill="none" stroke="#f5f7fb" />
            {positionedPitches.map((pitch) => {
              const angle = (pitch.angleDeg * Math.PI) / 180;
              const x = 180 + Math.cos(angle) * pitch.distancePx;
              const y = 180 + Math.sin(angle) * pitch.distancePx;
              return (
                <line
                  key={`${pitch.code}-line`}
                  x1="180"
                  y1="180"
                  x2={x}
                  y2={y}
                  stroke={pitch.color}
                  strokeOpacity="0.26"
                  strokeWidth="2"
                />
              );
            })}
          </svg>

          <div className="absolute left-1/2 top-1/2 z-10 flex h-28 w-28 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border border-gray-200 bg-white shadow-xl shadow-black/[0.05]">
            <span className="text-[9px] font-black uppercase tracking-[0.18em] text-gray-400">Review Hub</span>
            <span className="mt-2 text-3xl font-display leading-none text-gray-900">{totalChallenges}</span>
            <span className="mt-1 text-[10px] font-bold uppercase tracking-widest text-gray-500">
              {totalOverturned} overturned
            </span>
          </div>

          {positionedPitches.map((pitch) => {
            const style = {
              width: `${pitch.radiusPx * 2}px`,
              height: `${pitch.radiusPx * 2}px`,
              marginLeft: `-${pitch.radiusPx}px`,
              marginTop: `-${pitch.radiusPx}px`,
              backgroundColor: pitch.color,
              boxShadow: `0 10px 22px -12px ${pitch.color}`,
            } satisfies CSSProperties;

            return (
              <div key={pitch.code} className="absolute" style={{ left: pitch.left, top: pitch.top }}>
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-white" style={style} />
                <div
                  className={`absolute top-1/2 w-max -translate-y-1/2 rounded-2xl border border-gray-100 bg-white/95 px-3 py-2 shadow-lg shadow-black/[0.04] ${
                    pitch.angleDeg > 90 || pitch.angleDeg < -90 ? "right-8 text-right" : "left-8 text-left"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-gray-900">{pitch.code}</span>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{pitch.name}</span>
                  </div>
                  <p className="mt-1 text-[11px] font-medium text-gray-500">
                    {pitch.challenged} reviews • {(pitch.overturnRate * 100).toFixed(1)}% overturned
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {featuredPitches.map((pitch) => {
            const share = totalChallenges > 0 ? pitch.challenged / totalChallenges : 0;
            return (
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
                <div className="mt-3 flex items-end justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Review Share</p>
                    <p className="mt-1 text-lg font-display text-gray-900">{(share * 100).toFixed(0)}%</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">OT Rate</p>
                    <p className="mt-1 text-lg font-display text-gray-900">{(pitch.overturnRate * 100).toFixed(1)}%</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
