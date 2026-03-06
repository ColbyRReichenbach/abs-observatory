export type LiveGameCard = {
  gamePk: number;
  gameDate: string;
  status: string;
  detailedState: string | null;
  homeTeamId: number;
  homeTeamName: string;
  homeTeamAbbreviation?: string | null;
  homeTeamLogoUrl?: string | null;
  homeScore: number | null;
  awayTeamId: number;
  awayTeamName: string;
  awayTeamAbbreviation?: string | null;
  awayTeamLogoUrl?: string | null;
  awayScore: number | null;
  homeAbsRemaining: number;
  awayAbsRemaining: number;
  challengeCount: number;
  inning?: number | null;
  inningHalf?: string | null;
};


export type ChallengeEvent = {
  challengeId: string;
  gamePk: number;
  challengedAt: string | null;
  inning: number | null;
  halfInning: string | null;
  balls: number | null;
  strikes: number | null;
  outs: number | null;
  basesState: string | null;
  homeScore: number | null;
  awayScore: number | null;
  challengeTeamId: number | null;
  challengeTeamName: string | null;
  challengePlayerName: string | null;
  batterName: string | null;
  pitcherName: string | null;
  calledDescription: string | null;
  pitchNumber: number | null;
  pitchType: string | null;
  startSpeed: number | null;
  spinRate: number | null;
  isOverturned: boolean;
  px: number | null;
  pz: number | null;
  strikeZoneTop: number | null;
  strikeZoneBottom: number | null;
};

export type UmpireSummary = {
  umpireId: number;
  umpireName: string;
  challengedCalls: number;
  overturnedCalls: number;
  confirmedCalls: number;
  overturnRate: number;
  gamesWorked: number;
};

export type UmpireZoneBucket = {
  zone: "up" | "down" | "glove" | "arm";
  challenges: number;
  overturnRate: number;
};

export type UmpireCountHotspot = {
  countKey: string;
  challenges: number;
  overturnRate: number;
};

export type UmpireProfile = {
  directionalBias: {
    strikeToBall: number;
    ballToStrike: number;
    otherOverturns: number;
    confirmed: number;
  };
  zoneBuckets: UmpireZoneBucket[];
  countHotspots: UmpireCountHotspot[];
};

export type TeamSummary = {
  teamId: number;
  teamName: string;
  gamesTracked: number;
  usedSuccessful: number;
  usedFailed: number;
  challengesTotal: number;
  avgRemaining: number;
  overturnRate: number;
};

export type TeamIdentity = {
  teamId: number;
  teamName: string;
  abbreviation: string;
  primaryColor: string | null;
  secondaryColor: string | null;
  logoSvgUrl: string | null;
};

export type TeamTrendPoint = {
  gamePk: number;
  gameDate: string;
  isHome: boolean;
  homeTeamId: number;
  awayTeamId: number;
  homeTeamAbbr: string;
  awayTeamAbbr: string;
  opponentName: string;
  usedSuccessful: number;
  usedFailed: number;
  challengesTotal: number;
  remaining: number;
};

export type TeamSideSplit = {
  side: "home" | "away";
  games: number;
  usedSuccessful: number;
  usedFailed: number;
  challengesTotal: number;
  avgRemaining: number;
  overturnRate: number;
};

export type AIQueryResponse = {
  answer: string;
  sql: string;
  sources: string[];
  contextWindow?: string;
  metrics?: Record<string, string>;
  confidence: "low" | "medium" | "high";
  rows: unknown[];
};

export type PregameIntel = {
  umpireId: number | null;
  umpireName: string | null;
  awayTeam: {
    offensiveChallenges: number;
    defensiveChallenges: number;
    successRate: number;
  };
  homeTeam: {
    offensiveChallenges: number;
    defensiveChallenges: number;
    successRate: number;
  };
  umpireTendency: {
    lowZoneAccuracy: number;
    highZoneAccuracy: number;
    overallAccuracy: number;
  };
};

export type GameReport = {
  gamePk: number;
  generatedAt: string;
  narrativeMd: string;
  chartSpec: unknown;
};

export type GameLiveStatus = {
  gamePk: number;
  statusAbstract: string | null;
  inning: number | null;
  halfInning: string | null;
  balls: number | null;
  strikes: number | null;
  outs: number | null;
  homeScore: number | null;
  awayScore: number | null;
  homeRemaining: number;
  awayRemaining: number;
  updatedAt: string | null;
  recentChallengeEvents: Array<{
    challengedAt: string | null;
    isOverturned: boolean;
  }>;
};

export type RangeKey = "7d" | "30d" | "season" | "all";

export type SituationalFilters = {
  inningRange?: "early" | "middle" | "late" | "extras";
  leverage?: "low" | "medium" | "high";
  side?: "offense" | "defense";
  result?: "overturned" | "confirmed";
};

export type HomeChallengeMoment = {
  challengeId: string;
  gamePk: number;
  challengedAt: string | null;
  gameLabel: string;
  inning: number | null;
  halfInning: string | null;
  calledDescription: string | null;
  challengeTeamName: string | null;
  isOverturned: boolean;
  leverageScore: number;
};

export interface UmpireTrendPoint {
  gamePk: number;
  gameDate: string;
  homeTeamId: number;
  awayTeamId: number;
  homeTeamAbbr: string;
  awayTeamAbbr: string;
  accuracy: number;
  challengedCount: number;
  overturnedCount: number;
}
