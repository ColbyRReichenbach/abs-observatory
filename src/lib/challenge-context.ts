import type { ChallengeEvent } from "@/lib/types";

export type ScenarioTag =
  | "RISP"
  | "Less Than 2 Outs"
  | "Two Outs"
  | "Late & Close"
  | "Tie Game"
  | "Bases Loaded"
  | "Full Count";

export function parseCountKey(countKey?: string | null) {
  if (!countKey) return null;
  const [balls, strikes] = countKey.split("-").map((value) => Number(value));
  if (!Number.isFinite(balls) || !Number.isFinite(strikes)) return null;
  return { balls, strikes };
}

export function countRunnersOnBase(basesState?: string | null) {
  if (!basesState) return 0;
  const normalized = basesState.trim().toLowerCase();

  if (normalized === "bases loaded" || normalized === "111") return 3;
  if (/^[01]{3}$/.test(normalized)) {
    return normalized.split("").filter((digit) => digit === "1").length;
  }

  return ["1b", "2b", "3b", "first", "second", "third"].reduce(
    (count, needle) => count + (normalized.includes(needle) ? 1 : 0),
    0,
  );
}

export function hasRISP(basesState?: string | null) {
  if (!basesState) return false;
  const normalized = basesState.trim().toLowerCase();
  if (normalized === "bases loaded" || normalized === "111") return true;
  if (/^[01]{3}$/.test(normalized)) {
    return normalized[1] === "1" || normalized[2] === "1";
  }
  return normalized.includes("2b") || normalized.includes("3b") || normalized.includes("second") || normalized.includes("third");
}

export function formatBasesStateLabel(basesState?: string | null) {
  if (!basesState) return "Bases Empty";
  const normalized = basesState.trim().toLowerCase();
  if (normalized === "000" || normalized === "empty" || normalized === "bases empty") return "Bases Empty";
  if (normalized === "111" || normalized === "bases loaded") return "Bases Loaded";
  if (normalized === "100") return "Runner on 1st";
  if (normalized === "010") return "Runner on 2nd";
  if (normalized === "001") return "Runner on 3rd";
  if (normalized === "110") return "1st and 2nd";
  if (normalized === "101") return "1st and 3rd";
  if (normalized === "011") return "2nd and 3rd";
  return basesState;
}

export function formatScoreStateLabel(challenge: Pick<ChallengeEvent, "homeScore" | "awayScore">) {
  if (challenge.homeScore === null || challenge.awayScore === null) return "Score Unavailable";
  if (challenge.homeScore === challenge.awayScore) return `Tie ${challenge.awayScore}-${challenge.homeScore}`;
  return `${challenge.awayScore}-${challenge.homeScore}`;
}

export function getCountStateCategory(countKey?: string | null) {
  const parsed = parseCountKey(countKey);
  if (!parsed) return { key: "unknown", label: "Unknown" };
  if (parsed.balls === 3 && parsed.strikes === 2) return { key: "full", label: "Full Count" };
  if (parsed.balls > parsed.strikes) return { key: "hitter", label: "Hitter Ahead" };
  if (parsed.strikes > parsed.balls) return { key: "pitcher", label: "Pitcher Ahead" };
  return { key: "even", label: "Even Count" };
}

export function getBaseOutScenarioBucket(basesState?: string | null, outs?: number | null) {
  const runnersOnBase = countRunnersOnBase(basesState);
  const outsValue = outs ?? 0;
  if (runnersOnBase >= 3) return { key: "loaded", label: "Bases Loaded" };
  if (hasRISP(basesState) && outsValue < 2) return { key: "risp_lt2", label: "RISP, <2 Outs" };
  if (hasRISP(basesState)) return { key: "risp_2", label: "RISP, 2 Outs" };
  if (runnersOnBase > 0) return { key: "traffic", label: "Runner On" };
  return { key: "empty", label: "Bases Empty" };
}

export function getChallengeScenarioTags(challenge: ChallengeEvent): ScenarioTag[] {
  const tags: ScenarioTag[] = [];

  if (hasRISP(challenge.basesState)) tags.push("RISP");
  if ((challenge.outs ?? 0) < 2) tags.push("Less Than 2 Outs");
  if ((challenge.outs ?? 0) >= 2) tags.push("Two Outs");
  if ((challenge.inning ?? 0) >= 7 && challenge.homeScore !== null && challenge.awayScore !== null && Math.abs(challenge.homeScore - challenge.awayScore) <= 2) {
    tags.push("Late & Close");
  }
  if (challenge.homeScore !== null && challenge.awayScore !== null && challenge.homeScore === challenge.awayScore) {
    tags.push("Tie Game");
  }
  if ((challenge.basesState ?? "").toLowerCase() === "bases loaded" || challenge.basesState === "111") {
    tags.push("Bases Loaded");
  }
  const countState = parseCountKey(challenge.countBefore ?? challenge.umpireCount ?? null);
  if (countState?.balls === 3 && countState.strikes === 2) tags.push("Full Count");

  return tags;
}
