export type NormalizedZoneLane = "Top-L" | "Top-M" | "Top-R" | "Mid-L" | "Mid-M" | "Mid-R" | "Bot-L" | "Bot-M" | "Bot-R";
export type ObservedZoneAxisBucket = "heart" | "edge" | "chase";

type ZoneInput = {
  px: number | null;
  pz: number | null;
  strikeZoneTop: number | null;
  strikeZoneBottom: number | null;
};

function getZoneBounds(input: ZoneInput) {
  const top = input.strikeZoneTop;
  const bottom = input.strikeZoneBottom;
  if (
    input.px === null ||
    input.pz === null ||
    top === null ||
    bottom === null ||
    !Number.isFinite(input.px) ||
    !Number.isFinite(input.pz) ||
    !Number.isFinite(top) ||
    !Number.isFinite(bottom) ||
    top <= bottom
  ) {
    return null;
  }

  return {
    left: -0.83,
    right: 0.83,
    top,
    bottom,
  };
}

export function computeObservedZoneMissDistance(input: ZoneInput): number | null {
  const bounds = getZoneBounds(input);
  if (!bounds) return null;

  const dx =
    input.px! < bounds.left ? bounds.left - input.px! : input.px! > bounds.right ? input.px! - bounds.right : 0;
  const dz =
    input.pz! < bounds.bottom ? bounds.bottom - input.pz! : input.pz! > bounds.top ? input.pz! - bounds.top : 0;

  return Math.sqrt(dx * dx + dz * dz);
}

export function classifyObservedZoneAxisBucket(input: ZoneInput): ObservedZoneAxisBucket | null {
  const distance = computeObservedZoneMissDistance(input);
  if (distance === null) return null;
  if (distance <= 0.05) return "heart";
  if (distance <= 0.2) return "edge";
  return "chase";
}

export function classifyNormalizedZoneLane(input: ZoneInput): NormalizedZoneLane | null {
  const bounds = getZoneBounds(input);
  if (!bounds) return null;
  const normalizedY = (input.pz! - bounds.bottom) / (bounds.top - bounds.bottom);
  const normalizedX = (input.px! - bounds.left) / (bounds.right - bounds.left);

  const row = normalizedY < 1 / 3 ? "Bot" : normalizedY < 2 / 3 ? "Mid" : "Top";
  const col = normalizedX < 1 / 3 ? "L" : normalizedX < 2 / 3 ? "M" : "R";

  return `${row}-${col}` as NormalizedZoneLane;
}
