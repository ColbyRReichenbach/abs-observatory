import { resolveWelcomeFocusOption, type WelcomeFocusId, type WelcomeFocusInput } from "@/lib/welcome-focus";
import { launchConfig } from "@/lib/launch-config";

export type WelcomeTourStep = {
  id: "live" | "team" | "umpires" | "community";
  phase: "core";
  label: string;
  title: string;
  baseballLine: string;
  description: string;
  ctaLabel: string;
  href: string;
};

export type WelcomeTourOptionalStop = {
  id: "favorite_team" | "public_profile" | "articles" | "query" | "umpires";
  label: string;
  description: string;
  href: string;
};

export type WelcomeTourProgress = {
  currentIndex: number;
  visitedStepIds: WelcomeTourStep["id"][];
};

export type WelcomeTourSummary = {
  currentIndex: number;
  visitedStepIds: WelcomeTourStep["id"][];
  visitedCount: number;
  totalSteps: number;
  isComplete: boolean;
  nextStep: WelcomeTourStep | null;
};

export type WelcomeTourPhase = "core_path" | "extra_innings" | "complete";

const VALID_STEP_IDS: WelcomeTourStep["id"][] = ["live", "team", "umpires", "community"];

export function getWelcomeTourStorageKey(userId: string) {
  return `aibs-welcome-tour:${userId}`;
}

function normalizeVisitedStepIds(value: unknown): WelcomeTourStep["id"][] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((stepId): stepId is WelcomeTourStep["id"] => VALID_STEP_IDS.includes(stepId as WelcomeTourStep["id"])))];
}

export function readWelcomeTourProgress(raw: string | null | undefined, steps: WelcomeTourStep[]): WelcomeTourProgress {
  const empty: WelcomeTourProgress = { currentIndex: 0, visitedStepIds: [] };
  if (!raw) return empty;

  const fallbackFromIndex = (value: number, visitedStepIds: WelcomeTourStep["id"][]): WelcomeTourProgress => {
    const safeIndex =
      steps.length > 0 && Number.isFinite(value) ? Math.max(0, Math.min(steps.length - 1, value)) : 0;
    const firstUnvisitedIndex =
      visitedStepIds.length > 0 ? steps.findIndex((step) => !visitedStepIds.includes(step.id)) : -1;
    return {
      currentIndex: firstUnvisitedIndex === -1 ? safeIndex : firstUnvisitedIndex,
      visitedStepIds,
    };
  };

  const numeric = Number(raw);
  if (Number.isFinite(numeric)) return fallbackFromIndex(numeric, []);

  try {
    const parsed = JSON.parse(raw) as Partial<WelcomeTourProgress> | null;
    return fallbackFromIndex(Number(parsed?.currentIndex ?? 0), normalizeVisitedStepIds(parsed?.visitedStepIds));
  } catch {
    return empty;
  }
}

export function serializeWelcomeTourProgress(progress: WelcomeTourProgress) {
  return JSON.stringify({
    currentIndex: progress.currentIndex,
    visitedStepIds: normalizeVisitedStepIds(progress.visitedStepIds),
  });
}

export function setWelcomeTourCurrentIndex(
  raw: string | null | undefined,
  steps: WelcomeTourStep[],
  nextIndex: number,
): WelcomeTourProgress {
  const progress = readWelcomeTourProgress(raw, steps);
  return {
    currentIndex: Math.max(0, Math.min(steps.length - 1, nextIndex)),
    visitedStepIds: progress.visitedStepIds,
  };
}

export function resetWelcomeTourProgress(): WelcomeTourProgress {
  return { currentIndex: 0, visitedStepIds: [] };
}

export function getWelcomeTourSummary(
  raw: string | null | undefined,
  steps: WelcomeTourStep[],
): WelcomeTourSummary {
  const progress = readWelcomeTourProgress(raw, steps);
  const visitedStepIds = normalizeVisitedStepIds(progress.visitedStepIds);
  const visitedCount = steps.filter((step) => visitedStepIds.includes(step.id)).length;
  const nextStep = steps.find((step) => !visitedStepIds.includes(step.id)) ?? null;
  const isComplete = steps.length > 0 && nextStep === null;

  return {
    currentIndex: isComplete ? Math.max(0, steps.length - 1) : progress.currentIndex,
    visitedStepIds,
    visitedCount,
    totalSteps: steps.length,
    isComplete,
    nextStep,
  };
}

export function getWelcomeTourPhase(
  summary: Pick<WelcomeTourSummary, "isComplete">,
  optionalStopsCount: number,
): WelcomeTourPhase {
  if (!summary.isComplete) return "core_path";
  if (optionalStopsCount > 0) return "extra_innings";
  return "complete";
}

export function markWelcomeTourStepVisited(
  raw: string | null | undefined,
  stepId: WelcomeTourStep["id"],
): WelcomeTourProgress {
  const visitedStepIds = normalizeVisitedStepIds([
    ...readWelcomeTourProgress(raw, []).visitedStepIds,
    stepId,
  ]);

  return {
    currentIndex: 0,
    visitedStepIds,
  };
}

export function markWelcomeTourStepVisitedAndAdvance(
  raw: string | null | undefined,
  steps: WelcomeTourStep[],
  stepId: WelcomeTourStep["id"],
): WelcomeTourProgress {
  const visitedStepIds = normalizeVisitedStepIds([
    ...readWelcomeTourProgress(raw, steps).visitedStepIds,
    stepId,
  ]);
  const nextIndex = steps.findIndex((step) => !visitedStepIds.includes(step.id));

  return {
    currentIndex: nextIndex === -1 ? Math.max(0, steps.length - 1) : nextIndex,
    visitedStepIds,
  };
}

export function markWelcomeTourCoreStepVisitedAndAdvance(
  raw: string | null | undefined,
  stepId: WelcomeTourStep["id"],
): WelcomeTourProgress {
  const visitedStepIds = normalizeVisitedStepIds([
    ...readWelcomeTourProgress(raw, []).visitedStepIds,
    stepId,
  ]);
  const nextIndex = VALID_STEP_IDS.findIndex((validStepId) => !visitedStepIds.includes(validStepId));

  return {
    currentIndex: nextIndex === -1 ? Math.max(0, VALID_STEP_IDS.length - 1) : nextIndex,
    visitedStepIds,
  };
}

export function skipWelcomeTour(
  _raw: string | null | undefined,
  steps: WelcomeTourStep[],
): WelcomeTourProgress {
  return {
    currentIndex: Math.max(0, steps.length - 1),
    visitedStepIds: steps.map((step) => step.id),
  };
}

export function buildWelcomeTourHref(
  href: string,
  stepId: WelcomeTourStep["id"],
  nextHref?: string | null,
) {
  const [path, queryString = ""] = href.split("?");
  const params = new URLSearchParams(queryString);
  params.set("tourStep", stepId);
  if (nextHref) params.set("tourNextHref", nextHref);
  return `${path}?${params.toString()}`;
}

export function buildWelcomeTourStepHref(steps: WelcomeTourStep[], index: number): string {
  const step = steps[index];
  if (!step) return "/";
  const nextHref = index < steps.length - 1 ? buildWelcomeTourStepHref(steps, index + 1) : null;
  return buildWelcomeTourHref(step.href, step.id, nextHref);
}

export function getWelcomeTourSteps(
  input: WelcomeFocusInput & { preferredFocus?: WelcomeFocusId | null },
): WelcomeTourStep[] {
  const teamTourHref = input.favoriteTeamHref ?? "/teams/136?view=org";

  const core: WelcomeTourStep[] = [
    {
      id: "live",
      phase: "core",
      label: "Core 1",
      title: "Let's Read The Lineup",
      baseballLine: "Start on the top rail and learn how AiBS calls the game in real time.",
      description: "Open the live slate first so the rest of the product has context: score, challenge pressure, and the AI-guided game path.",
      ctaLabel: "Open Live Slate",
      href: "/",
    },
    {
      id: "team",
      phase: "core",
      label: "Core 2",
      title: "Read The Club Card",
      baseballLine: "Shift from the scoreboard to the dugout and see how a team really uses its challenges.",
      description: "Use a team hub to compare fan story mode and org strategy mode around the same club.",
      ctaLabel: input.favoriteTeamHref ? "Open Favorite Team" : "Open Guided Team Hub",
      href: teamTourHref,
    },
    {
      id: "umpires",
      phase: "core",
      label: "Core 3",
      title: "Scout The Plate",
      baseballLine: "Now read the zone card and see where the human element starts to bend.",
      description: "Use umpire pages for report-card context, risk framing, and challenge-prep reads.",
      ctaLabel: "Open Umpire Desk",
      href: "/umpires",
    },
    {
      id: "community",
      phase: "core",
      label: "Core 4",
      title: "Create Your Player Card",
      baseballLine: "Finish in the clubhouse and set the identity that follows you across comments, follows, and fandom.",
      description: "End the tour on profile so your public handle, favorite team, and community identity all tie back into the features you just learned.",
      ctaLabel: "Open Profile Settings",
      href: "/profile",
    },
  ];

  return core;
}

export function getWelcomeTourOptionalStops(
  input: WelcomeFocusInput & { preferredFocus?: WelcomeFocusId | null },
): WelcomeTourOptionalStop[] {
  const focus = resolveWelcomeFocusOption(input, input.preferredFocus);
  const stops: WelcomeTourOptionalStop[] = [];

  if (input.favoriteTeamHref) {
    stops.push({
      id: "favorite_team",
      label: focus.id === "teams" ? "Extra Innings: Favorite Club" : "Favorite Club",
      description: "Go straight to the team you care about most after the core path is finished.",
      href: input.favoriteTeamHref,
    });
  }

  stops.push({
    id: "articles",
    label: "Extra Innings: Articles",
    description: "Read the editorial layer once you know how to interpret the core widgets.",
    href: "/articles?tourExtra=articles",
  });

  if (launchConfig.publicQueryLabEnabled) {
    stops.push({
      id: "query",
      label: "Extra Innings: Query Lab",
      description: "Ask the AI layer one direct question once the live, team, and umpire surfaces already make sense.",
      href: "/query?tourExtra=query",
    });
  }

  stops.push({
    id: "umpires",
    label: "Extra Innings: Leaderboards",
    description: "Browse the league-wide umpire desk after you finish the guided core path.",
    href: "/umpires",
  });

  if (input.publicProfileHref) {
    stops.push({
      id: "public_profile",
      label: focus.id === "community" ? "Extra Innings: Public Identity" : "Public Identity",
      description: "Open the public-facing profile tied to your comments, follows, and fandom.",
      href: `${input.publicProfileHref}${input.publicProfileHref.includes("?") ? "&" : "?"}tourExtra=public_profile`,
    });
  }

  return stops;
}
