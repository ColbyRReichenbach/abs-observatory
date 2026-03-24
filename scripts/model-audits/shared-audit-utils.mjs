import fs from "node:fs";
import path from "node:path";
import { AUDIT_DATE, AUDIT_END, ROOT, SPRING_START, formatAuditDateLabel } from "./audit-runtime.mjs";

export { AUDIT_DATE, AUDIT_END, ROOT, SPRING_START, formatAuditDateLabel };
export const MIN_EXACT_WIN_EXPECTANCY_SAMPLE_SIZE = 20;
export const WIN_EXPECTANCY_LOW_CONFIDENCE_BLEND_PRIOR_WEIGHT = 100;

export function loadEnvFile(filename) {
  const filePath = path.join(ROOT, filename);
  if (!fs.existsSync(filePath)) return;
  const raw = fs.readFileSync(filePath, "utf8");
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    if (process.env[key]) continue;
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

export function clamp(value, min = 0, max = 100) {
  return Math.min(Math.max(value, min), max);
}

export function mean(values) {
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function median(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

export function percentile(values, pct) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * pct) - 1));
  return sorted[index];
}

export function formatPct(value, digits = 1) {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return `${(value * 100).toFixed(digits)}%`;
}

export function formatSignedPctPoint(value) {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return `${value >= 0 ? "+" : ""}${(value * 100).toFixed(2)} pts`;
}

export function formatMaybeNumber(value, digits = 1) {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return Number(value).toFixed(digits);
}

export function toMarkdownTable(rows, columns) {
  const header = `| ${columns.map((column) => column.label).join(" | ")} |`;
  const separator = `| ${columns.map(() => "---").join(" | ")} |`;
  const body = rows.map(
    (row) => `| ${columns.map((column) => String(column.render(row))).join(" | ")} |`,
  );
  return [header, separator, ...body].join("\n");
}

export function normalizeHalfInning(value) {
  if (!value) return null;
  const normalized = String(value).toLowerCase();
  if (normalized === "top") return "Top";
  if (normalized === "bottom") return "Bottom";
  return value;
}

export function inningBucket(inning) {
  if (inning >= 9) return "9+";
  if (inning >= 7) return "7-8";
  if (inning >= 4) return "4-6";
  return "1-3";
}

export function scoreDiffBucket(halfInning, homeScore, awayScore) {
  if (homeScore === null || homeScore === undefined || awayScore === null || awayScore === undefined) {
    return null;
  }
  const normalizedHalf = normalizeHalfInning(halfInning);
  const battingTeamDiff = normalizedHalf === "Top" ? awayScore - homeScore : homeScore - awayScore;
  if (battingTeamDiff <= -4) return "trail4plus";
  if (battingTeamDiff === -3) return "trail3";
  if (battingTeamDiff === -2) return "trail2";
  if (battingTeamDiff === -1) return "trail1";
  if (battingTeamDiff === 0) return "tied";
  if (battingTeamDiff === 1) return "lead1";
  if (battingTeamDiff === 2) return "lead2";
  if (battingTeamDiff === 3) return "lead3";
  return "lead4plus";
}

export function buildCanonicalPitchState(state) {
  return {
    inning: state.inning ?? null,
    inningBucket: state.inning == null ? null : inningBucket(state.inning),
    halfInning: normalizeHalfInning(state.halfInning),
    scoreDiffBucket: scoreDiffBucket(state.halfInning, state.homeScore, state.awayScore),
    outs: state.outs ?? null,
    basesState: state.basesState ?? null,
  };
}

export function countKey(balls, strikes) {
  if (balls === null || balls === undefined || strikes === null || strikes === undefined) return null;
  return `${balls}-${strikes}`;
}

export function incrementBallCount(balls, strikes) {
  if (balls >= 3) return null;
  return countKey(balls + 1, strikes);
}

export function incrementStrikeCount(balls, strikes) {
  if (strikes >= 2) return null;
  return countKey(balls, strikes + 1);
}

export function getCalledPitch(calledDescription) {
  const normalized = String(calledDescription ?? "").toUpperCase();
  if (normalized.startsWith("CALLED STRIKE")) return "called_strike";
  if (normalized.startsWith("BALL")) return "ball";
  return null;
}

export function getChallengeDirection(calledPitch) {
  return calledPitch === "called_strike" ? "strike_to_ball" : "ball_to_strike";
}

export function countRunnersOnBase(basesState) {
  if (!basesState) return 0;
  const normalized = String(basesState).toLowerCase();
  if (/^[01]{3}$/.test(normalized)) {
    return normalized.split("").reduce((count, value) => count + (value === "1" ? 1 : 0), 0);
  }
  if (normalized === "bases loaded") return 3;
  return ["1b", "2b", "3b", "first", "second", "third"].reduce(
    (count, needle) => count + (normalized.includes(needle) ? 1 : 0),
    0,
  );
}

export function getEdgeBucketFromDistance(edgeDistance) {
  if (edgeDistance === null || edgeDistance === undefined || Number.isNaN(edgeDistance)) return null;
  if (edgeDistance <= 0.25) return "edge";
  if (edgeDistance <= 0.75) return "near_edge";
  return "clear_miss";
}

const STRIKE_TO_BALL_EDGE_MAX = 0.015;
const STRIKE_TO_BALL_NEAR_EDGE_MAX = 0.16;
const BALL_TO_STRIKE_EDGE_MAX = 0.003;
const ABS_OPERATIONAL_ZONE_HALF_WIDTH_FEET = (17 / 24) + (1.45 / 12);

export function computeObservedZoneMissDistance(sample) {
  if (
    sample.px === null ||
    sample.pz === null ||
    sample.strikeZoneTop === null ||
    sample.strikeZoneBottom === null ||
    !Number.isFinite(sample.px) ||
    !Number.isFinite(sample.pz) ||
    !Number.isFinite(sample.strikeZoneTop) ||
    !Number.isFinite(sample.strikeZoneBottom)
  ) {
    return null;
  }

  const horizontalOverhang = Math.max(Math.abs(sample.px) - ABS_OPERATIONAL_ZONE_HALF_WIDTH_FEET, 0);
  const verticalBelow = Math.max(sample.strikeZoneBottom - sample.pz, 0);
  const verticalAbove = Math.max(sample.pz - sample.strikeZoneTop, 0);
  const verticalOverhang = Math.max(verticalBelow, verticalAbove, 0);

  if (horizontalOverhang === 0 && verticalOverhang === 0) return 0;
  return Math.hypot(horizontalOverhang, verticalOverhang);
}

export function computeDirectionalZoneDistance(sample) {
  const direction = sample.challengeDirection ?? (
    sample.calledPitch === "called_strike" ? "strike_to_ball" : sample.calledPitch === "ball" ? "ball_to_strike" : null
  );

  if (!direction) return null;
  if (direction === "strike_to_ball") return computeObservedZoneMissDistance(sample);

  if (
    sample.px === null ||
    sample.px === undefined ||
    sample.pz === null ||
    sample.pz === undefined ||
    sample.strikeZoneTop === null ||
    sample.strikeZoneTop === undefined ||
    sample.strikeZoneBottom === null ||
    sample.strikeZoneBottom === undefined ||
    !Number.isFinite(sample.px) ||
    !Number.isFinite(sample.pz) ||
    !Number.isFinite(sample.strikeZoneTop) ||
    !Number.isFinite(sample.strikeZoneBottom)
  ) {
    return null;
  }

  const horizontalInside = ABS_OPERATIONAL_ZONE_HALF_WIDTH_FEET - Math.abs(sample.px);
  const verticalInside = Math.min(sample.pz - sample.strikeZoneBottom, sample.strikeZoneTop - sample.pz);
  if (horizontalInside <= 0 || verticalInside <= 0) return 0;
  return Math.min(horizontalInside, verticalInside);
}

export function getEdgeBucketForChallenge(sample) {
  if (sample.edgeBucket) return sample.edgeBucket;
  const direction = sample.challengeDirection ?? (
    sample.calledPitch === "called_strike" ? "strike_to_ball" : sample.calledPitch === "ball" ? "ball_to_strike" : null
  );
  const directionalDistance = computeDirectionalZoneDistance(sample);
  if (!direction || directionalDistance === null) return null;

  if (direction === "strike_to_ball") {
    if (directionalDistance <= STRIKE_TO_BALL_EDGE_MAX) return "edge";
    if (directionalDistance <= STRIKE_TO_BALL_NEAR_EDGE_MAX) return "near_edge";
    return "clear_miss";
  }

  if (directionalDistance <= BALL_TO_STRIKE_EDGE_MAX) return "edge";
  return "near_edge";
}

export function computeEstimatedLeverageIndex(input) {
  const inning = input.inning ?? 1;
  const scoreDiff =
    input.homeScore === null || input.homeScore === undefined || input.awayScore === null || input.awayScore === undefined
      ? 0
      : Math.abs(input.homeScore - input.awayScore);
  const outs = input.outs ?? 0;
  const runnersOnBase = countRunnersOnBase(input.basesState);
  const balls = input.balls ?? 0;
  const strikes = input.strikes ?? 0;

  const inningScore = inning >= 9 ? 28 : inning >= 7 ? 22 : inning >= 5 ? 14 : 8;
  const scoreScore = scoreDiff === 0 ? 28 : scoreDiff === 1 ? 24 : scoreDiff === 2 ? 18 : scoreDiff === 3 ? 12 : 6;
  const outScore = outs >= 2 ? 14 : outs === 1 ? 9 : 5;
  const baseScore = runnersOnBase >= 3 ? 14 : runnersOnBase === 2 ? 11 : runnersOnBase === 1 ? 8 : 0;
  const countScore = balls === 3 && strikes === 2 ? 16 : strikes >= 2 ? 12 : balls >= 3 ? 10 : 5;

  return Math.max(0, Math.min(100, inningScore + scoreScore + outScore + baseScore + countScore));
}

export function getEstimatedLeverageBucket(index) {
  if (index >= 65) return "high";
  if (index >= 40) return "medium";
  return "low";
}

export function blendLowConfidenceWinExpectancy(exact, bucket) {
  if (!bucket) return exact;
  if (exact.sampleSize <= MIN_EXACT_WIN_EXPECTANCY_SAMPLE_SIZE) return bucket;
  if (exact.confidenceBand !== "low") return exact;
  const exactWeight =
    exact.sampleSize / (exact.sampleSize + WIN_EXPECTANCY_LOW_CONFIDENCE_BLEND_PRIOR_WEIGHT);
  return {
    ...exact,
    battingTeamWinProbability:
      exact.battingTeamWinProbability * exactWeight +
      bucket.battingTeamWinProbability * (1 - exactWeight),
  };
}

export function resolveWinExpectancyWithFallback(state, rows) {
  const canonical = buildCanonicalPitchState(state);
  if (
    canonical.inning === null ||
    canonical.inningBucket === null ||
    canonical.halfInning === null ||
    canonical.scoreDiffBucket === null ||
    canonical.outs === null ||
    canonical.basesState === null
  ) {
    return null;
  }

  const findMatch = (tier, inning, inningBucketValue, countKeyValue) =>
    rows.find(
      (row) =>
        row.fallbackTier === tier &&
        row.inning === inning &&
        row.inningBucket === inningBucketValue &&
        row.halfInning === canonical.halfInning &&
        row.scoreDiffBucket === canonical.scoreDiffBucket &&
        row.outs === canonical.outs &&
        row.basesState === canonical.basesState &&
        row.countKey === countKeyValue,
    ) ?? null;

  const exact = findMatch("exact", canonical.inning, null, state.countKey ?? null);
  const bucket = findMatch("drop_inning_to_bucket", null, canonical.inningBucket, state.countKey ?? null);
  if (exact) return blendLowConfidenceWinExpectancy(exact, bucket);
  if (bucket) return bucket;

  const dropCountExact = findMatch("drop_count_key_exact_inning", canonical.inning, null, null);
  const dropCountBucket = findMatch("drop_count_key_bucketed_inning", null, canonical.inningBucket, null);
  if (dropCountExact) return blendLowConfidenceWinExpectancy(dropCountExact, dropCountBucket);
  if (dropCountBucket) return dropCountBucket;
  return null;
}

export function getWinExpectancyCountSwing(state, heldCountKey, correctedCountKey, rows) {
  const held = resolveWinExpectancyWithFallback(
    {
      ...state,
      countKey: heldCountKey,
    },
    rows,
  );
  const corrected = resolveWinExpectancyWithFallback(
    {
      ...state,
      countKey: correctedCountKey,
    },
    rows,
  );
  if (!held || !corrected) return null;
  return {
    held,
    corrected,
    swing: Number((corrected.battingTeamWinProbability - held.battingTeamWinProbability).toFixed(4)),
  };
}
