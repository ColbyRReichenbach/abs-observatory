export type ZoneMode = "actual" | "adjusted";

export const STRIKE_ZONE_PLOT = {
  width: 420,
  height: 480,
  zoneX: 110,
  zoneY: 110,
  zoneW: 200,
  zoneH: 230,
  horizontalHalfWidthFt: 0.83,
  referenceTopFt: 3.5,
  referenceBottomFt: 1.5,
} as const;

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function mapToZoneY(pz: number, top: number, bottom: number): number {
  const span = top - bottom;
  if (!Number.isFinite(span) || span <= 0) return STRIKE_ZONE_PLOT.height / 2;
  const normalized = (top - pz) / span;
  const mapped = STRIKE_ZONE_PLOT.zoneY + normalized * STRIKE_ZONE_PLOT.zoneH;
  if (!Number.isFinite(mapped)) return STRIKE_ZONE_PLOT.height / 2;
  return mapped;
}

export function mapZoneX(px: number): number {
  const zoneMid = STRIKE_ZONE_PLOT.zoneX + STRIKE_ZONE_PLOT.zoneW / 2;
  const scale = STRIKE_ZONE_PLOT.zoneW / (STRIKE_ZONE_PLOT.horizontalHalfWidthFt * 2);
  return zoneMid + px * scale;
}

export function mapZoneYActual(pz: number): number {
  return mapToZoneY(pz, STRIKE_ZONE_PLOT.referenceTopFt, STRIKE_ZONE_PLOT.referenceBottomFt);
}

export function mapZoneYAdjusted(pz: number, top: number | null, bottom: number | null): number {
  const safeTop = isFiniteNumber(top) ? top : STRIKE_ZONE_PLOT.referenceTopFt;
  const safeBottom = isFiniteNumber(bottom) ? bottom : STRIKE_ZONE_PLOT.referenceBottomFt;
  return mapToZoneY(pz, safeTop, safeBottom);
}

export function mapZoneY(mode: ZoneMode, pz: number, top: number | null, bottom: number | null) {
  if (mode === "adjusted") return mapZoneYAdjusted(pz, top, bottom);
  return mapZoneYActual(pz);
}
