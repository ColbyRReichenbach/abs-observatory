export type BattingSide = "home" | "away";

export type CanonicalPitchState = {
  inning: number | null;
  inningBucket: string | null;
  halfInning: string | null;
  battingSide: BattingSide | null;
  outs: number | null;
  basesState: string | null;
  countKey: string | null;
  scoreDiffBatting: number | null;
  scoreDiffBucket: string | null;
};

function clampInteger(value: number, minimum: number, maximum: number) {
  return Math.max(minimum, Math.min(maximum, Math.trunc(value)));
}

export function countKey(balls: number | null | undefined, strikes: number | null | undefined) {
  if (balls === null || balls === undefined || strikes === null || strikes === undefined) return null;
  return `${clampInteger(balls, 0, 3)}-${clampInteger(strikes, 0, 2)}`;
}

export function basesState(
  on1b: boolean | number | string | null | undefined,
  on2b: boolean | number | string | null | undefined,
  on3b: boolean | number | string | null | undefined,
) {
  const isOccupied = (value: boolean | number | string | null | undefined) => {
    if (value === null || value === undefined) return false;
    if (typeof value === "boolean") return value;
    if (typeof value === "number") return Number.isFinite(value) && value > 0;
    const normalized = value.trim().toLowerCase();
    return normalized.length > 0 && normalized !== "0" && normalized !== "false" && normalized !== "nan";
  };

  return `${isOccupied(on1b) ? "1" : "0"}${isOccupied(on2b) ? "1" : "0"}${isOccupied(on3b) ? "1" : "0"}`;
}

export function inningBucket(inning: number | null | undefined) {
  if (inning === null || inning === undefined || !Number.isFinite(inning)) return null;
  if (inning >= 9) return "9+";
  if (inning >= 7) return "7-8";
  if (inning >= 4) return "4-6";
  if (inning >= 1) return "1-3";
  return null;
}

export function resolveBattingSide(halfInning: string | null | undefined): BattingSide | null {
  const normalized = normalizeHalfInning(halfInning);
  if (normalized === "Top") return "away";
  if (normalized === "Bottom") return "home";
  return null;
}

function normalizeHalfInning(halfInning: string | null | undefined) {
  if (!halfInning) return null;
  const normalized = halfInning.trim().toLowerCase();
  if (normalized === "top" || normalized === "t") return "Top";
  if (normalized === "bottom" || normalized === "bot" || normalized === "b") return "Bottom";
  return null;
}

export function scoreDiffBucket(scoreDiff: number | null | undefined) {
  if (scoreDiff === null || scoreDiff === undefined || !Number.isFinite(scoreDiff)) return null;
  if (scoreDiff <= -4) return "trail4plus";
  if (scoreDiff === -3) return "trail3";
  if (scoreDiff === -2) return "trail2";
  if (scoreDiff === -1) return "trail1";
  if (scoreDiff === 0) return "tied";
  if (scoreDiff === 1) return "lead1";
  if (scoreDiff === 2) return "lead2";
  if (scoreDiff === 3) return "lead3";
  return "lead4plus";
}

export function buildCanonicalPitchState(input: {
  inning?: number | null;
  halfInning?: string | null;
  outs?: number | null;
  basesState?: string | null;
  balls?: number | null;
  strikes?: number | null;
  homeScore?: number | null;
  awayScore?: number | null;
}) {
  const normalizedHalfInning = normalizeHalfInning(input.halfInning);
  const battingSide = resolveBattingSide(normalizedHalfInning);
  const homeScore = input.homeScore ?? null;
  const awayScore = input.awayScore ?? null;
  const scoreDiffBatting =
    battingSide === "home"
      ? homeScore !== null && awayScore !== null
        ? homeScore - awayScore
        : null
      : battingSide === "away"
        ? awayScore !== null && homeScore !== null
          ? awayScore - homeScore
          : null
        : null;

  return {
    inning: input.inning ?? null,
    inningBucket: inningBucket(input.inning),
    halfInning: normalizedHalfInning,
    battingSide,
    outs: input.outs ?? null,
    basesState: input.basesState ?? null,
    countKey: countKey(input.balls, input.strikes),
    scoreDiffBatting,
    scoreDiffBucket: scoreDiffBucket(scoreDiffBatting),
  } satisfies CanonicalPitchState;
}
