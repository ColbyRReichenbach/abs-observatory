export type MatchupBackdropState = "pregame" | "live" | "final";

export type TeamBackdropSet = {
  pregame: string[];
  live: string[];
  win: string[];
  loss: string[];
};

export type ResolvedMatchupBackdrop = {
  homeImage: string;
  awayImage: string;
};

export type ResolveMatchupBackdropInput = {
  gamePk: number;
  state: MatchupBackdropState;
  homeTeamId: number;
  awayTeamId: number;
  winnerTeamId?: number | null;
};

// Intentionally empty scaffold. Add team assets here as they are curated.
export const TEAM_BACKDROPS: Partial<Record<number, TeamBackdropSet>> = {};

function pickStable(items: string[], seed: number) {
  if (items.length === 0) return null;
  return items[Math.abs(seed) % items.length] ?? null;
}

function getSeed(gamePk: number, teamId: number, state: MatchupBackdropState) {
  const stateOffsets: Record<MatchupBackdropState, number> = {
    pregame: 17,
    live: 43,
    final: 89,
  };

  return gamePk + teamId * 13 + stateOffsets[state];
}

function pickTeamBackdrop(
  set: TeamBackdropSet | undefined,
  state: MatchupBackdropState,
  seed: number,
  isWinner?: boolean | null,
) {
  if (!set) return null;

  if (state === "final") {
    if (isWinner === true) return pickStable(set.win, seed);
    if (isWinner === false) return pickStable(set.loss, seed);
    return pickStable(set.live, seed) ?? pickStable(set.pregame, seed);
  }

  return pickStable(set[state], seed);
}

export function resolveMatchupBackdrop(input: ResolveMatchupBackdropInput): ResolvedMatchupBackdrop | null {
  const homeSet = TEAM_BACKDROPS[input.homeTeamId];
  const awaySet = TEAM_BACKDROPS[input.awayTeamId];

  if (!homeSet || !awaySet) return null;

  const homeImage = pickTeamBackdrop(
    homeSet,
    input.state,
    getSeed(input.gamePk, input.homeTeamId, input.state),
    input.winnerTeamId == null ? null : input.winnerTeamId === input.homeTeamId,
  );
  const awayImage = pickTeamBackdrop(
    awaySet,
    input.state,
    getSeed(input.gamePk, input.awayTeamId, input.state),
    input.winnerTeamId == null ? null : input.winnerTeamId === input.awayTeamId,
  );

  if (!homeImage || !awayImage) return null;

  return { homeImage, awayImage };
}
