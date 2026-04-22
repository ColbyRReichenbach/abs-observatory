export function coerceInternalRouteScope(routeScope: string | null | undefined): string | null {
  if (!routeScope) return null;
  return routeScope.startsWith("/") && !routeScope.startsWith("//") ? routeScope : null;
}

export function normalizeInternalRouteScope(
  routeScope: string | null | undefined,
  fallback = "/profile",
): string {
  return coerceInternalRouteScope(routeScope) ?? fallback;
}

export type SharedBarChartScale = {
  min: number;
  max: number;
  range: number;
  baselinePct: number;
};

export function getSharedBarChartScale(values: number[]): SharedBarChartScale {
  const min = Math.min(0, ...values);
  const max = Math.max(0, ...values);
  const range = max - min || 1;
  const baselinePct = ((0 - min) / range) * 100;

  return { min, max, range, baselinePct };
}

export function getSharedBarSegment(
  value: number,
  scale: SharedBarChartScale,
): {
  bottomPct: number;
  heightPct: number;
  isPositive: boolean;
} {
  const positionPct = ((value - scale.min) / scale.range) * 100;
  const isPositive = value >= 0;
  const rawHeight = isPositive
    ? positionPct - scale.baselinePct
    : scale.baselinePct - positionPct;
  const heightPct = value === 0 ? 0 : Math.max(rawHeight, 1.5);
  const bottomPct = isPositive ? scale.baselinePct : positionPct;

  return {
    bottomPct,
    heightPct,
    isPositive,
  };
}
