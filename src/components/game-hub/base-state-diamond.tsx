"use client";

import { countRunnersOnBase } from "@/lib/challenge-context";

function isBaseOccupied(basesState: string | null | undefined, index: 0 | 1 | 2) {
  if (!basesState) return false;
  const normalized = basesState.trim().toLowerCase();
  if (normalized === "bases loaded" || normalized === "111") return true;
  if (/^[01]{3}$/.test(normalized)) {
    return normalized[index] === "1";
  }
  if (index === 0) return normalized.includes("1b") || normalized.includes("first");
  if (index === 1) return normalized.includes("2b") || normalized.includes("second");
  return normalized.includes("3b") || normalized.includes("third");
}

export function BaseStateDiamond({
  basesState,
  size = 54,
  accent = "#2563eb",
}: {
  basesState?: string | null;
  size?: number;
  accent?: string;
}) {
  const baseSize = size * 0.2;
  const occupied = countRunnersOnBase(basesState) > 0;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <div className="absolute inset-[24%] rotate-45 rounded-md border border-gray-200 bg-white/90 shadow-sm" />
      {[
        { key: "first", left: "74%", top: "50%", active: isBaseOccupied(basesState, 0) },
        { key: "second", left: "50%", top: "26%", active: isBaseOccupied(basesState, 1) },
        { key: "third", left: "26%", top: "50%", active: isBaseOccupied(basesState, 2) },
      ].map((base) => (
        <div
          key={base.key}
          className="absolute -translate-x-1/2 -translate-y-1/2 rotate-45 rounded-[4px] border shadow-sm transition-colors"
          style={{
            left: base.left,
            top: base.top,
            width: baseSize,
            height: baseSize,
            borderColor: base.active ? accent : "rgb(209 213 219)",
            backgroundColor: base.active ? accent : "rgba(255,255,255,0.92)",
            boxShadow: base.active ? `0 0 0 3px ${accent}22` : undefined,
          }}
        />
      ))}
      <div
        className="absolute left-1/2 top-[85%] -translate-x-1/2 rounded-sm border border-gray-200 bg-white shadow-sm"
        style={{
          width: baseSize * 1.15,
          height: baseSize * 0.85,
          clipPath: "polygon(0 0, 100% 0, 82% 100%, 18% 100%)",
          backgroundColor: occupied ? "rgba(255,255,255,0.98)" : "rgba(249,250,251,0.98)",
        }}
      />
    </div>
  );
}
