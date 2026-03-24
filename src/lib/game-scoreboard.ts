export type GameScoreboardInning = {
  inning: number;
  awayRuns: number | null;
  homeRuns: number | null;
};

export type GameScoreboardData = {
  innings: GameScoreboardInning[];
  awayRuns: number | null;
  homeRuns: number | null;
  awayHits: number | null;
  homeHits: number | null;
  awayErrors: number | null;
  homeErrors: number | null;
};
