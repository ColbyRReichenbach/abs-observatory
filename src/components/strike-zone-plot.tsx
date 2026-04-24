"use client";

import { memo, useMemo } from "react";

import { parseCountKey } from "@/lib/challenge-context";
import { mapZoneX, mapZoneY, STRIKE_ZONE_PLOT, type ZoneMode } from "@/lib/zone-mapping";
import type { ChallengeEvent } from "@/lib/types";

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function classifyFromCounts(event: ChallengeEvent) {
  const umpireCount = parseCountKey(event.umpireCount ?? event.countBefore ?? null);
  const correctedCount = parseCountKey(event.countAfter ?? null);
  if (!umpireCount || !correctedCount) return null;

  if (correctedCount.strikes > umpireCount.strikes || correctedCount.balls < umpireCount.balls) {
    return "ball_to_strike";
  }
  if (correctedCount.balls > umpireCount.balls || correctedCount.strikes < umpireCount.strikes) {
    return "strike_to_ball";
  }
  return null;
}

function classifyTransition(event: ChallengeEvent):
  | "ball_to_strike"
  | "strike_to_ball"
  | "overturned_other"
  | "confirmed" {
  if (!event.isOverturned) return "confirmed";
  if (event.challengeDirection) return event.challengeDirection;
  const countTransition = classifyFromCounts(event);
  if (countTransition) return countTransition;

  // MLB's live feed stores the corrected post-review call, so an overturned
  // Called Strike means the original ball became a strike.
  const call = (event.calledDescription ?? "").toLowerCase();
  if (call.includes("called strike") || call === "strike") return "ball_to_strike";
  if (call.includes("ball")) return "strike_to_ball";
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
  zoneMode = "adjusted",
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
    <div className="flex flex-col h-full">
      <div className="flex-1 p-6 lg:p-12 relative flex items-center justify-center min-h-[400px]">
        <svg
          viewBox={`0 0 ${STRIKE_ZONE_PLOT.width} ${STRIKE_ZONE_PLOT.height}`}
          className="w-full max-w-[420px]"
          role="img"
          aria-label="Strike zone plot"
        >
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
          <rect x="0" y="0" width={STRIKE_ZONE_PLOT.width} height={STRIKE_ZONE_PLOT.height} fill="url(#zoneGlow)" />

          {/* Strike zone box */}
          <rect
            x={STRIKE_ZONE_PLOT.zoneX}
            y={STRIKE_ZONE_PLOT.zoneY}
            width={STRIKE_ZONE_PLOT.zoneW}
            height={STRIKE_ZONE_PLOT.zoneH}
            fill="white"
            stroke="rgba(0,0,0,0.15)"
            strokeWidth="3"
            rx="2"
            className="shadow-sm"
          />

          {/* Zone grid lines (3x3) */}
          {[1, 2].map((i) => (
            <g key={`grid-${i}`}>
              <line
                x1={STRIKE_ZONE_PLOT.zoneX + (STRIKE_ZONE_PLOT.zoneW / 3) * i}
                y1={STRIKE_ZONE_PLOT.zoneY}
                x2={STRIKE_ZONE_PLOT.zoneX + (STRIKE_ZONE_PLOT.zoneW / 3) * i}
                y2={STRIKE_ZONE_PLOT.zoneY + STRIKE_ZONE_PLOT.zoneH}
                stroke="rgba(0,0,0,0.05)"
                strokeWidth="1"
              />
              <line
                x1={STRIKE_ZONE_PLOT.zoneX}
                y1={STRIKE_ZONE_PLOT.zoneY + (STRIKE_ZONE_PLOT.zoneH / 3) * i}
                x2={STRIKE_ZONE_PLOT.zoneX + STRIKE_ZONE_PLOT.zoneW}
                y2={STRIKE_ZONE_PLOT.zoneY + (STRIKE_ZONE_PLOT.zoneH / 3) * i}
                stroke="rgba(0,0,0,0.05)"
                strokeWidth="1"
              />
            </g>
          ))}

          {/* Home plate */}
          <polygon
            points={`${STRIKE_ZONE_PLOT.width / 2 - 30},${STRIKE_ZONE_PLOT.height - 20} ${STRIKE_ZONE_PLOT.width / 2},${STRIKE_ZONE_PLOT.height} ${STRIKE_ZONE_PLOT.width / 2 + 30},${STRIKE_ZONE_PLOT.height - 20} ${STRIKE_ZONE_PLOT.width / 2 + 30},${STRIKE_ZONE_PLOT.height - 35} ${STRIKE_ZONE_PLOT.width / 2 - 30},${STRIKE_ZONE_PLOT.height - 35}`}
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
            const radius = isSelected ? 12 : isHighlighted ? 14 : 9;
            const isFaded = (selectedChallengeId || highlightedChallengeId) && !isSelected && !isHighlighted;

            return (
              <g key={stableKey} style={{ opacity: isFaded ? 0.3 : 1 }} className="transition-opacity duration-300" filter="url(#dotShadow)">
                {(isSelected || isHighlighted) && (
                  <circle
                    cx={x}
                    cy={y}
                    r={radius + 6}
                    fill="none"
                    stroke={style.fill}
                    strokeWidth="2"
                    opacity={isSelected ? "0.4" : "0.2"}
                    className="animate-pulse"
                  />
                )}

                <circle
                  cx={x}
                  cy={y}
                  r={radius}
                  fill={style.fill}
                  stroke="white"
                  strokeWidth="1.5"
                  opacity={isSelected || isHighlighted ? "1" : "0.95"}
                  style={{ transformOrigin: `${x}px ${y}px` }}
                  className="cursor-pointer transition-transform duration-300 hover:scale-[1.3]"
                  onClick={() => onSelectChallenge?.(event.challengeId)}
                  onMouseEnter={() => onHoverChallenge?.(event.challengeId)}
                  onMouseLeave={() => onHoverChallenge?.(null)}
                />

                {/* Short label */}
                <text
                  x={x}
                  y={y + 3}
                  textAnchor="middle"
                  className="pointer-events-none select-none font-black"
                  fill="white"
                  fontSize="8"
                >
                  {style.short}
                </text>

                {(showCountOverlay || isSelected) && (
                  <text x={x + 18} y={y - 8} className="pointer-events-none font-black tracking-tight" fill="black" fontSize="10" opacity="0.6">
                    {event.umpireCount || `${event.balls}-${event.strikes}`}
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
      <div className="border-t border-gray-100 p-8 shadow-inner bg-slate-50/20">
        <div className="mb-6">
          <h4 className="text-[10px] font-bold uppercase tracking-widest text-[var(--surface-4)] mb-1">
            Visual Legend
          </h4>
          <p className="text-xl font-display leading-none text-gray-900">
            Mapping <span className="text-gray-400">Decisions</span>
          </p>
        </div>
        <div className="max-w-6xl grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8">
          <LegendDot color="#10b981" label="Strike (Corrected)" description="Ball → Strike (Won)" />
          <LegendDot color="#f59e0b" label="Ball (Corrected)" description="Strike → Ball (Won)" />
          <LegendDot color="#ef4444" label="Confirmed" description="Call Upheld (Lost)" />
          <LegendDot color="#06b6d4" label="Other OK" description="Misc Overturned" />
        </div>
      </div>
    </div>
  );
}

export const StrikeZonePlot = memo(StrikeZonePlotComponent);

function LegendDot({ color, label, description }: { color: string; label: string; description: string }) {
  return (
    <div className="flex flex-col gap-1 group">
      <div className="flex items-start gap-3">
        <span
          className="block h-3 w-3 rounded-full border-2 border-white ring-1 ring-gray-100 transition-transform group-hover:scale-125 shadow-sm mt-0.5 flex-shrink-0"
          style={{ backgroundColor: color }}
        />
        <div className="flex flex-col">
          <span className="text-[10px] font-black uppercase tracking-widest text-gray-900 leading-tight">{label}</span>
          <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tight mt-0.5">{description}</span>
        </div>
      </div>
    </div>
  );
}
