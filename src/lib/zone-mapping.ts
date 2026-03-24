export type ZoneMode = "actual" | "adjusted";

const WIDTH = 420;
const HEIGHT = 480;
const ZONE_TOP_PX = 120;
const ZONE_BOTTOM_PX = 330;

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function mapZoneX(px: number): number {
  const min = -2.2;
  const max = 2.2;
  return ((px - min) / (max - min)) * WIDTH;
}

export function mapZoneYActual(pz: number, top: number | null, bottom: number | null): number {
  const safeTop = isFiniteNumber(top) ? top : 3.5;
  const safeBottom = isFiniteNumber(bottom) ? bottom : 1.5;
  const rangeTop = Math.max(safeTop + 1, 4.5);
  const rangeBottom = Math.min(safeBottom - 1, 0.5);
  const denom = rangeTop - rangeBottom;
  if (!Number.isFinite(denom) || denom <= 0) return HEIGHT / 2;
  const mapped = ((rangeTop - pz) / denom) * HEIGHT;
  if (!Number.isFinite(mapped)) return HEIGHT / 2;
  return mapped;
}

export function mapZoneYAdjusted(pz: number, top: number | null, bottom: number | null): number {
  const safeTop = isFiniteNumber(top) ? top : 3.5;
  const safeBottom = isFiniteNumber(bottom) ? bottom : 1.5;
  const span = safeTop - safeBottom;
  if (!Number.isFinite(span) || span <= 0) return HEIGHT / 2;
  const normalized = (pz - safeBottom) / span;
  const padded = 1.1 - normalized;
  return ZONE_TOP_PX + padded * (ZONE_BOTTOM_PX - ZONE_TOP_PX);
}

export function mapZoneY(mode: ZoneMode, pz: number, top: number | null, bottom: number | null) {
  if (mode === "adjusted") return mapZoneYAdjusted(pz, top, bottom);
  return mapZoneYActual(pz, top, bottom);
}

