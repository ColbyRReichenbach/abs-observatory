"use client";

import { memo, useMemo } from "react";

import { mapZoneX, mapZoneY, type ZoneMode } from "@/lib/zone-mapping";
import type { ChallengeEvent } from "@/lib/types";

const WIDTH = 420;
const HEIGHT = 480;
const ZONE_X = 110;
const ZONE_Y = 110;
const ZONE_W = 200;
const ZONE_H = 230;

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function classifyTransition(event: ChallengeEvent):
  | "ball_to_strike"
  | "strike_to_ball"
  | "overturned_other"
  | "confirmed" {
  if (!event.isOverturned) return "confirmed";
  const call = (event.calledDescription ?? "").toLowerCase();
  if (call.includes("called strike") || call === "strike") return "strike_to_ball";
  if (call.includes("ball")) return "ball_to_strike";
  return "overturned_other";
}

const TRANSITION_STYLES = {
  ball_to_strike: { fill: "#10b981", stroke: "#059669", label: "Strike (Corrected)", short: "K" },
  strike_to_ball: { fill: "#f59e0b", stroke: "#d97706", label: "Ball (Corrected)", short: "B" },
  overturned_other: { fill: "#06b6d4", stroke: "#0891b2", label: "Overturned", short: "OT" },
  confirmed: { fill: "#ef4444", stroke: "#dc2626", label: "Confirmed", short: "CFM" },
} as const;

function styleForTransition(t: ReturnType<typeof classifyTransition>) {
  return TRANSITION_STYLES[t];
}

type StrikeZonePlotProps = {
  challenges: ChallengeEvent[];
  selectedChallengeId?: string | null;
  highlightedChallengeId?: string | null;
  zoneMode?: ZoneMode;
  showCountOverlay?: boolean;
  showPitchOverlay?: boolean;
  onSelectChallenge?: (challengeId: string) => void;
  onHoverChallenge?: (challengeId: string | null) => void;
};

function StrikeZonePlotComponent({
  challenges,
  selectedChallengeId,
  highlightedChallengeId,
  zoneMode = "actual",
  showCountOverlay = false,
  showPitchOverlay = false,
  onSelectChallenge,
  onHoverChallenge,
}: StrikeZonePlotProps) {
  const plotted = useMemo(
    () =>
      challenges
        .map((event, idx) => {
          if (!isFiniteNumber(event.px) || !isFiniteNumber(event.pz)) return null;
          const x = mapZoneX(event.px);
          const y = mapZoneY(zoneMode, event.pz, event.strikeZoneTop, event.strikeZoneBottom);
          if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
          const stableKey = `${event.challengeId}:${event.challengedAt ?? "na"}:${event.px}:${event.pz}:${idx}`;
          return { event, x, y, stableKey };
        })
        .filter((v): v is { event: ChallengeEvent; x: number; y: number; stableKey: string } => v !== null),
    [challenges, zoneMode],
  );

  return (
    <div className="flex flex-col h-full bg-slate-50 border border-gray-100 rounded-3xl overflow-hidden shadow-inner">
      <div className="flex-1 p-12 relative flex items-center justify-center min-h-[500px]">
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full max-w-[420px]" role="img" aria-label="Strike zone plot">
          <defs>
            <radialGradient id="zoneGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="rgba(59,130,246,0.05)" />
              <stop offset="100%" stopColor="transparent" />
            </radialGradient>
            <filter id="dotShadow">
              <feDropShadow dx="0" dy="2" stdDeviation="4" floodOpacity="0.1" />
            </filter>
          </defs>

          {/* Background glow */}
          <rect x="0" y="0" width={WIDTH} height={HEIGHT} fill="url(#zoneGlow)" />

          {/* Strike zone box */}
          <rect
            x={ZONE_X}
            y={ZONE_Y}
            width={ZONE_W}
            height={ZONE_H}
            fill="white"
            stroke="rgba(0,0,0,0.15)"
            strokeWidth="3"
            rx="8"
            className="shadow-sm"
          />

          {/* Zone grid lines (3x3) */}
          {[1, 2].map((i) => (
            <g key={`grid-${i}`}>
              <line
                x1={ZONE_X + (ZONE_W / 3) * i}
                y1={ZONE_Y}
                x2={ZONE_X + (ZONE_W / 3) * i}
                y2={ZONE_Y + ZONE_H}
                stroke="rgba(0,0,0,0.05)"
                strokeWidth="1"
              />
              <line
                x1={ZONE_X}
                y1={ZONE_Y + (ZONE_H / 3) * i}
                x2={ZONE_X + ZONE_W}
                y2={ZONE_Y + (ZONE_H / 3) * i}
                stroke="rgba(0,0,0,0.05)"
                strokeWidth="1"
              />
            </g>
          ))}

          {/* Home plate */}
          <polygon
            points={`${WIDTH / 2 - 30},${HEIGHT - 20} ${WIDTH / 2},${HEIGHT} ${WIDTH / 2 + 30},${HEIGHT - 20} ${WIDTH / 2 + 30},${HEIGHT - 35} ${WIDTH / 2 - 30},${HEIGHT - 35}`}
            fill="white"
            stroke="rgba(0,0,0,0.1)"
            strokeWidth="2"
          />

          {/* Challenge dots */}
          {plotted.map(({ event, x, y, stableKey }) => {
            const transition = classifyTransition(event);
            const style = styleForTransition(transition);
            const isSelected = selectedChallengeId === event.challengeId;
            const isHighlighted = highlightedChallengeId === event.challengeId;
            const baseR = 10;
            const radius = isSelected ? baseR + 4 : isHighlighted ? baseR + 2 : baseR;

            return (
              <g key={stableKey} className="transition-all duration-300 transform-gpu" filter="url(#dotShadow)">
                {/* Selection / Highlight ring */}
                {(isSelected || isHighlighted) && (
                  <circle
                    cx={x}
                    cy={y}
                    r={radius + 8}
                    fill="none"
                    stroke={style.fill}
                    strokeWidth="3"
                    opacity={isSelected ? "0.3" : "0.15"}
                    className="animate-pulse"
                  />
                )}

                <circle
                  cx={x}
                  cy={y}
                  r={radius}
                  fill={style.fill}
                  stroke="white"
                  strokeWidth="3"
                  opacity={isSelected || isHighlighted ? "1" : "0.95"}
                  className="cursor-pointer transition-all hover:scale-125"
                  onClick={() => onSelectChallenge?.(event.challengeId)}
                  onMouseEnter={() => onHoverChallenge?.(event.challengeId)}
                  onMouseLeave={() => onHoverChallenge?.(null)}
                />

                {/* Short label */}
                <text
                  x={x}
                  y={y + 3.5}
                  textAnchor="middle"
                  className="pointer-events-none select-none font-black"
                  fill="white"
                  fontSize="9"
                >
                  {style.short}
                </text>

                {(showCountOverlay || isSelected) && (
                  <text x={x + 18} y={y - 8} className="pointer-events-none font-black tracking-tight" fill="black" fontSize="10" opacity="0.6">
                    {event.balls}-{event.strikes}
                  </text>
                )}
                {(showPitchOverlay || isSelected) && (
                  <text x={x + 18} y={y + 6} className="pointer-events-none font-bold italic" fill="#2d5a27" fontSize="9">
                    {event.pitchType}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Legend */}
      <div className="bg-white border-t border-gray-100 p-8">
        <div className="max-w-xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-8">
          <LegendDot color="#10b981" label="Strike (Corrected)" description="Challenge Won" />
          <LegendDot color="#f59e0b" label="Ball (Corrected)" description="Challenge Won" />
          <LegendDot color="#ef4444" label="Confirmed" description="Challenge Lost" />
          <LegendDot color="#06b6d4" label="Overturned" description="Success" />
        </div>
      </div>
    </div>
  );
}

export const StrikeZonePlot = memo(StrikeZonePlotComponent);

function LegendDot({ color, label, description }: { color: string; label: string; description: string }) {
  return (
    <div className="flex flex-col gap-1.5 group">
      <div className="flex items-center gap-3">
        <span className="h-3 w-3 rounded-full border-2 border-white ring-1 ring-gray-100 transition-transform group-hover:scale-125 shadow-sm" style={{ backgroundColor: color }} />
        <span className="text-[10px] font-black uppercase tracking-widest text-gray-900 leading-none">{label}</span>
      </div>
      <span className="text-[9px] font-bold text-gray-400 ml-6 uppercase tracking-tight">{description}</span>
    </div>
  );
}


